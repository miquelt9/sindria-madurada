import type { MelonSize } from '../types';

/**
 * Coarse knock hint: dull, unclear, or tight.
 *
 * Heuristic, engineering judgment, not a calibrated window. Never shown in UI.
 *
 * No shared ripe band exists. Pamungkas 2021 moves only about 162→149 Hz as
 * fruit matures and tracks mass as tightly as soluble solids (R² 0.82 both).
 * Diezma 2005 sound fruit is 194 ± 32.5 Hz and hollow fruit 141 ± 27.4 Hz;
 * low-band energy (about 85–160 Hz) rises with hollows. Abbaszadeh LDV lines
 * scatter from 31 to 963 Hz. Pitch falls as fruit softens or gains mass
 * (Pamungkas; He 1994 via Sun, r ≈ −0.8), so frequency is only a coarse
 * dull-versus-tight lean.
 *
 * A low peak is not a ripe point: it can be hollow (Diezma), and Zeng's phone
 * study found ripe fruit has a smaller low-band energy share (31.7% vs 66.9%).
 * Phones are noisy and hit-dependent (Zeng eq. 1, Jie), so a peak must be
 * clear before its frequency counts. The prominence and second-peak cuts are
 * from synthetic Hann knocks, not from a paper: a damped 160 Hz knock is very
 * prominent, an enveloped noise burst that still passes the shape check is
 * not, and two equal modes are not "one" peak.
 *
 * Search 60–1000 Hz covers the Abbaszadeh lines and the lab peaks near
 * 140–200 Hz, and matches the centroid cap. Dull runs 115–230 Hz: 230 is
 * about Diezma's sound mean plus one standard deviation, and 115 sits below
 * Pamungkas' lowest and Diezma's hollow mean minus one standard deviation.
 * Tight is above 300 Hz (about plus three standard deviations). Small fruit
 * scales those edges by 1.15 because mass lowers pitch. Large fruit is not
 * shifted down; a lower peak is the hollow confound.
 */

/** Lowest bin included in the peak search (Hz). Drops DC and handling rumble. */
export const KNOCK_SEARCH_MIN_HZ = 60;
/** Highest bin included in the peak search (Hz). Same top as the centroid cap. */
export const KNOCK_SEARCH_MAX_HZ = 1000;

/**
 * Peak magnitude divided by the in-band median. Below this the peak is muddy.
 * Engineering judgment from synthetic spectra, not a published sharpness cut.
 */
export const PEAK_PROMINENCE_MIN = 8;

/**
 * A second local maximum at least this fraction of the peak, and more than
 * ±20% away in frequency, makes the peak muddy. Two modes are not one knock.
 */
export const SECOND_PEAK_MAX_RATIO = 0.8;
/** Fractional distance a second local maximum must clear to count. */
export const SECOND_PEAK_OFFSET = 0.2;

/** Inclusive dull edges for medium, large, and unset size (Hz). */
export const DULL_MIN_HZ = 115;
export const DULL_MAX_HZ = 230;
/** Tight is strictly above this. The gap from the dull top through here is unclear. */
export const TIGHT_ABOVE_HZ = 300;
/**
 * Small fruit only. Mass lowers pitch (Pamungkas R² 0.82; He m·fs).
 * 1.15 keeps the old small-melon intent (250/210 ≈ 1.19) without a score lift.
 */
export const SMALL_EDGE_SCALE = 1.15;

/**
 * Acoustic scores are a product choice, not a paper number.
 * Dull leans ripe, tight leans unripe, and unclear stays in the middle.
 * Muddy uses the unclear score. Size does not add a further lift.
 */
export const SCORE_DULL = 0.8;
export const SCORE_UNCLEAR = 0.5;
export const SCORE_TIGHT = 0.25;
export const SCORE_MUDDY = 0.5;

export type KnockHintBand = 'dull' | 'unclear' | 'tight';
export type PeakClarity = 'clear' | 'muddy';

/**
 * What to do when clear knocks span both dull and tight (medium edges).
 * 'borderline' (default): treat the set as muddy so fusion caps the verdict.
 * 'retry': reserved for Miquel. Not wired to the weak-tap retry in this PR.
 * Flip this constant only — the decision is applied in one place
 * (`disagreementEffect`, consumed by `aggregateKnockFeatures`).
 */
export const KNOCK_DISAGREEMENT_POLICY: 'borderline' | 'retry' = 'borderline';

export type DisagreementEffect = 'none' | 'muddy' | 'retry';

export function bandForFrequency(peakHz: number, size?: MelonSize): KnockHintBand {
  const scale = size === 'small' ? SMALL_EDGE_SCALE : 1;
  const dullMin = Math.round(DULL_MIN_HZ * scale);
  const dullMax = Math.round(DULL_MAX_HZ * scale);
  const tightAbove = Math.round(TIGHT_ABOVE_HZ * scale);
  if (peakHz >= dullMin && peakHz <= dullMax) return 'dull';
  if (peakHz > tightAbove) return 'tight';
  return 'unclear';
}

export function acousticScoreFor(clarity: PeakClarity, hint: KnockHintBand): number {
  if (clarity === 'muddy') return SCORE_MUDDY;
  if (hint === 'dull') return SCORE_DULL;
  if (hint === 'tight') return SCORE_TIGHT;
  return SCORE_UNCLEAR;
}

export function isPeakMuddy(prominence: number, secondPeakRatio: number): boolean {
  return prominence < PEAK_PROMINENCE_MIN || secondPeakRatio >= SECOND_PEAK_MAX_RATIO;
}

/**
 * True when the clear knocks include both a dull and a tight band.
 * Always judged on medium edges, including for a small melon.
 */
export function knocksDisagree(clearPeaksHz: readonly number[]): boolean {
  let dull = false;
  let tight = false;
  for (const hz of clearPeaksHz) {
    const band = bandForFrequency(hz);
    if (band === 'dull') dull = true;
    else if (band === 'tight') tight = true;
  }
  return dull && tight;
}

/**
 * Single switch for knock disagreement.
 * 'retry' is returned and then ignored: the weak-tap retry is not extended here.
 */
export function disagreementEffect(disagree: boolean): DisagreementEffect {
  if (!disagree) return 'none';
  return KNOCK_DISAGREEMENT_POLICY === 'borderline' ? 'muddy' : 'retry';
}

export interface KnockHintInput {
  peakFrequencyHz: number;
  peakClarity?: PeakClarity;
  knockCount: number;
}

export interface KnockHintReading {
  /** Null when no knocks were counted. Muddy is reported as unclear. */
  hint: KnockHintBand | null;
  score: number;
}

/** Coarse band plus the product-choice acoustic score. Size scales edges only. */
export function knockHint(audio: KnockHintInput, size?: MelonSize): KnockHintReading {
  if (!(audio.knockCount > 0)) {
    return { hint: null, score: SCORE_UNCLEAR };
  }
  if (audio.peakClarity === 'muddy') {
    return { hint: 'unclear', score: SCORE_MUDDY };
  }
  const hint = bandForFrequency(audio.peakFrequencyHz, size);
  return { hint, score: acousticScoreFor('clear', hint) };
}

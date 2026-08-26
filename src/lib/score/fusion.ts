import {
  VisualFeatures,
  AudioFeatures,
  RipenessResult,
  RipenessVerdict,
  FusionInputs,
  MelonSize,
} from '../types';
import { eatingWindowForVerdict } from './eatingWindow';

/** Default ripe knock band (Hz). Small fruit resonates a bit higher. */
const RIPE_PEAK_MIN_HZ = 115;
const RIPE_PEAK_MAX_HZ = 210;
const SMALL_MELON_RIPE_PEAK_MAX_HZ = 250;
/**
 * audio/features.ts scores 210–320 Hz as 0.60 vs 0.85 in the ripe band.
 * Lift the extended small-melon band back toward the ripe score without editing audio.
 */
const SMALL_MELON_EXTENDED_BAND_LIFT = 0.25;

export function ripePeakMaxHz(size?: MelonSize): number {
  return size === 'small' ? SMALL_MELON_RIPE_PEAK_MAX_HZ : RIPE_PEAK_MAX_HZ;
}

function visualComposite(visual: VisualFeatures, variety: FusionInputs['variety']): number {
  if (variety === 'solid') {
    // Solid rind has no ribbons — do not punish low stripe contrast.
    return visual.groundSpotScore * 0.70 + visual.dullnessScore * 0.30;
  }
  return (
    visual.groundSpotScore * 0.45 +
    visual.stripeContrastScore * 0.35 +
    visual.dullnessScore * 0.20
  );
}

function sizeAdjustedAcousticScore(audio: AudioFeatures, size?: MelonSize): number {
  const score = audio.acousticRipenessScore;
  if (size !== 'small') return score;

  const peak = audio.peakFrequencyHz;
  if (peak > RIPE_PEAK_MAX_HZ && peak <= SMALL_MELON_RIPE_PEAK_MAX_HZ) {
    return Math.min(1, score + SMALL_MELON_EXTENDED_BAND_LIFT);
  }
  return score;
}

/**
 * Fuses visual cues (stripe ribbons, ground spot, surface dullness)
 * and acoustic knocking cues (resonance peak, low/mid ratio, Abbaszadeh moments)
 * into a transparent, honest consumer score.
 */
export function fuseRipenessSignals(
  visual: VisualFeatures,
  audio: AudioFeatures,
  inputs: FusionInputs = {}
): RipenessResult {
  const variety = inputs.variety ?? 'striped';
  const size = inputs.size;

  const visualScoreRaw = visualComposite(visual, variety);
  const visualScore = Math.round(visualScoreRaw * 100);

  const acousticScore = sizeAdjustedAcousticScore(audio, size);
  const audioScore = Math.round(acousticScore * 100);

  // 2. Fusion Weighting
  // If we have valid audio knocks, we combine 50% visual + 50% audio.
  // If audio is noisy / missing knocks, visual gets higher weight.
  let fusedScoreRaw: number;
  let confidence: number;

  if (audio.knockCount >= 2) {
    fusedScoreRaw = visualScoreRaw * 0.50 + acousticScore * 0.50;
    confidence = Math.min(92, 60 + audio.knockCount * 8 + (visual.groundSpotDetected ? 15 : 5));
  } else if (audio.knockCount === 1) {
    fusedScoreRaw = visualScoreRaw * 0.65 + acousticScore * 0.35;
    confidence = 65;
  } else {
    fusedScoreRaw = visualScoreRaw;
    confidence = visual.groundSpotDetected ? 60 : 45;
  }

  const overallScore = Math.round(fusedScoreRaw * 100);

  let verdict: RipenessVerdict;
  if (overallScore >= 68) {
    verdict = 'likely_ripe';
  } else if (overallScore <= 46) {
    verdict = 'likely_unripe';
  } else {
    verdict = 'borderline';
  }

  const eatWindow = eatingWindowForVerdict(verdict);

  let summaryExplanation = '';
  const actionableTips: string[] = [];

  if (verdict === 'likely_ripe') {
    summaryExplanation =
      'Signs indicate this watermelon is ripe and ready to enjoy. External markings show mature rind development and acoustic resonance is deep and hollow.';
  } else if (verdict === 'likely_unripe') {
    summaryExplanation =
      'This watermelon likely needs more time or was harvested too early. Acoustic response was tight or visual markings lack yellow ground spot and stripe contrast.';
  } else {
    summaryExplanation =
      'Mixed signals detected. Some indicators are favorable, but others are borderline. Check the underside for a buttery yellow spot before buying.';
  }

  if (!visual.groundSpotDetected || visual.groundSpotScore < 0.5) {
    actionableTips.push('Turn the melon over to check for a creamy yellow field spot (where it rested on earth).');
  } else {
    actionableTips.push('Field spot shows healthy creamy butter tone, indicating it ripened on the vine.');
  }

  const peakMax = ripePeakMaxHz(size);
  if (audio.peakFrequencyHz > peakMax + 40) {
    actionableTips.push('Knock sound is slightly high-pitched ("pink/pank"). A deep resonant "punk" sound is ideal.');
  } else if (audio.peakFrequencyHz >= RIPE_PEAK_MIN_HZ && audio.peakFrequencyHz <= peakMax) {
    actionableTips.push(
      size === 'small'
        ? 'Acoustic pitch matches the resonant sweet zone for a smaller melon.'
        : 'Acoustic pitch matches the resonant sweet zone (120–200 Hz).'
    );
  }

  if (variety !== 'solid' && visual.stripeContrastScore < 0.4) {
    actionableTips.push('Look for watermelons with clearly defined, deep green contrast between ribbon stripes.');
  }

  if (verdict !== 'likely_ripe') {
    actionableTips.push('Remember: Watermelons do not continue to ripen once picked from the vine.');
  }

  return {
    overallScore,
    verdict,
    confidence,
    visualScore,
    audioScore,
    visualFeatures: visual,
    audioFeatures: audio,
    summaryExplanation,
    actionableTips,
    ...eatWindow,
  };
}

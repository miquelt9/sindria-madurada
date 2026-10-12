import { describe, it, expect } from 'vitest';
import { fuseRipenessSignals, ripePeakMaxHz } from './fusion';
import { VisualFeatures, AudioFeatures, MelonSize } from '../types';

function visual(overrides: Partial<VisualFeatures> = {}): VisualFeatures {
  return {
    stripeContrastScore: 0.8,
    groundSpotScore: 0.85,
    dullnessScore: 0.8,
    groundSpotDetected: true,
    notes: [],
    ...overrides,
  };
}

function audio(overrides: Partial<AudioFeatures> = {}): AudioFeatures {
  return {
    peakFrequencyHz: 155,
    rmsEnergy: 0.12,
    spectralCentroidHz: 210,
    amplitudeStdDev: 0.08,
    skewness: 1.2,
    kurtosis: 3.1,
    lowMidRatio: 2.2,
    knockCount: 3,
    acousticRipenessScore: 0.88,
    notes: [],
    ...overrides,
  };
}

describe('fuseRipenessSignals', () => {
  it('likely_ripe includes a 0–2 day eat-now window', () => {
    const fused = fuseRipenessSignals(visual(), audio());
    expect(fused.verdict).toBe('likely_ripe');
    expect(fused.eatFromDays).toBe(0);
    expect(fused.eatUntilDays).toBe(2);
    expect(fused.willNotRipenOffVine).toBe(false);
    expect(fused.eatWindowLabel.toLowerCase()).toMatch(/eat now/);
    expect(fused.actionableTips.some((t) => /do not continue to ripen/i.test(t))).toBe(false);
  });

  it('borderline includes a 1–3 day window and off-vine reminder', () => {
    const fused = fuseRipenessSignals(
      visual({ stripeContrastScore: 0.45, groundSpotScore: 0.5, dullnessScore: 0.5 }),
      audio({ acousticRipenessScore: 0.55, peakFrequencyHz: 240 })
    );
    expect(fused.verdict).toBe('borderline');
    expect(fused.eatFromDays).toBe(1);
    expect(fused.eatUntilDays).toBe(3);
    expect(fused.willNotRipenOffVine).toBe(true);
    expect(fused.actionableTips.some((t) => /do not continue to ripen/i.test(t))).toBe(true);
  });

  it('likely_unripe: will not ripen off vine, eat within ~2–4 days', () => {
    const fused = fuseRipenessSignals(
      visual({
        stripeContrastScore: 0.2,
        groundSpotScore: 0.2,
        dullnessScore: 0.2,
        groundSpotDetected: false,
      }),
      audio({ acousticRipenessScore: 0.2, peakFrequencyHz: 420, knockCount: 3 })
    );
    expect(fused.verdict).toBe('likely_unripe');
    expect(fused.eatFromDays).toBe(2);
    expect(fused.eatUntilDays).toBe(4);
    expect(fused.willNotRipenOffVine).toBe(true);
    expect(fused.eatWindowLabel.toLowerCase()).toMatch(/will not ripen/);
  });

  it('does not punish solid rind for low stripe contrast', () => {
    const lowStripe = visual({ stripeContrastScore: 0.1, groundSpotScore: 0.9, dullnessScore: 0.85 });
    const ripeAudio = audio();

    const striped = fuseRipenessSignals(lowStripe, ripeAudio, { variety: 'striped' });
    const solid = fuseRipenessSignals(lowStripe, ripeAudio, { variety: 'solid' });

    expect(solid.visualScore).toBeGreaterThan(striped.visualScore);
    expect(solid.overallScore).toBeGreaterThan(striped.overallScore);
    expect(solid.actionableTips.some((t) => /ribbon stripes/i.test(t))).toBe(false);
    expect(striped.actionableTips.some((t) => /ribbon stripes/i.test(t))).toBe(true);
  });

  it('small melons accept a slightly higher knock-frequency band', () => {
    const v = visual();
    const higherPitch = audio({
      peakFrequencyHz: 235,
      acousticRipenessScore: 0.6,
    });

    const small = fuseRipenessSignals(v, higherPitch, { size: 'small' });
    const medium = fuseRipenessSignals(v, higherPitch, { size: 'medium' });

    expect(small.audioScore).toBeGreaterThan(medium.audioScore);
    expect(small.overallScore).toBeGreaterThan(medium.overallScore);
    expect(small.actionableTips.some((t) => /smaller melon/i.test(t))).toBe(true);
    expect(medium.actionableTips.some((t) => /smaller melon/i.test(t))).toBe(false);
  });

  it('defaults to striped / medium-band behaviour when chips are omitted', () => {
    const fused = fuseRipenessSignals(visual(), audio());
    const explicit = fuseRipenessSignals(visual(), audio(), { variety: 'striped', size: 'medium' });
    expect(fused.visualScore).toBe(explicit.visualScore);
    expect(fused.audioScore).toBe(explicit.audioScore);
    expect(fused.overallScore).toBe(explicit.overallScore);
  });
});

describe('ripePeakMaxHz', () => {
  it('widens the dull band only for a small melon', () => {
    expect(ripePeakMaxHz('small')).toBe(250);
    expect(ripePeakMaxHz('medium')).toBe(210);
    expect(ripePeakMaxHz('large')).toBe(210);
    expect(ripePeakMaxHz()).toBe(210);
  });
});

describe('fuseRipenessSignals boundaries', () => {
  function flat(score: number, detected = true) {
    return fuseRipenessSignals(
      visual({
        stripeContrastScore: score,
        groundSpotScore: score,
        dullnessScore: score,
        groundSpotDetected: detected,
      }),
      audio({ knockCount: 0, acousticRipenessScore: 0.1, peakFrequencyHz: 0 }),
    );
  }

  it('cuts likely ripe at 68 and likely unripe at 46', () => {
    expect(flat(0.68).overallScore).toBe(68);
    expect(flat(0.68).verdict).toBe('likely_ripe');
    expect(flat(0.67).overallScore).toBe(67);
    expect(flat(0.67).verdict).toBe('borderline');
    expect(flat(0.47).overallScore).toBe(47);
    expect(flat(0.47).verdict).toBe('borderline');
    expect(flat(0.46).overallScore).toBe(46);
    expect(flat(0.46).verdict).toBe('likely_unripe');
  });

  it('uses the photo alone when fewer than one knock was counted', () => {
    const fused = fuseRipenessSignals(
      visual({ stripeContrastScore: 0.8, groundSpotScore: 0.8, dullnessScore: 0.8 }),
      audio({ knockCount: 0, acousticRipenessScore: 0.1, peakFrequencyHz: 0 }),
    );
    expect(fused.overallScore).toBe(80);
    expect(fused.audioScore).toBe(10);
    expect(fused.confidence).toBe(60);
    expect(fused.actionableTips.some((tip) => /knock/i.test(tip))).toBe(false);

    const missingSpot = fuseRipenessSignals(
      visual({
        stripeContrastScore: 0.2,
        groundSpotScore: 0.2,
        dullnessScore: 0.2,
        groundSpotDetected: false,
      }),
      audio({ knockCount: -1, acousticRipenessScore: 0.9, peakFrequencyHz: 0 }),
    );
    expect(missingSpot.overallScore).toBe(20);
    expect(missingSpot.confidence).toBe(45);
    expect(missingSpot.verdict).toBe('likely_unripe');
  });

  it('weights a single knock at 65/35 and pins its confidence at 65', () => {
    const fused = fuseRipenessSignals(
      visual({ stripeContrastScore: 1, groundSpotScore: 1, dullnessScore: 1 }),
      audio({ knockCount: 1, acousticRipenessScore: 0, peakFrequencyHz: 0 }),
    );
    expect(fused.visualScore).toBe(100);
    expect(fused.audioScore).toBe(0);
    expect(fused.overallScore).toBe(65);
    expect(fused.confidence).toBe(65);
    expect(fused.verdict).toBe('borderline');
  });

  it('caps confidence at 92 once several knocks and a field spot are present', () => {
    expect(fuseRipenessSignals(visual(), audio({ knockCount: 2 })).confidence).toBe(91);
    expect(
      fuseRipenessSignals(visual({ groundSpotDetected: false }), audio({ knockCount: 2 })).confidence,
    ).toBe(81);
    expect(fuseRipenessSignals(visual(), audio({ knockCount: 3 })).confidence).toBe(92);
    expect(fuseRipenessSignals(visual(), audio({ knockCount: 10 })).confidence).toBe(92);
  });

  it('lifts only the small-melon band between 210 and 250 Hz, and stops at 1', () => {
    const extended = audio({ peakFrequencyHz: 250, acousticRipenessScore: 0.6, knockCount: 3 });
    const small = fuseRipenessSignals(visual(), extended, { size: 'small' });
    const large = fuseRipenessSignals(visual(), extended, { size: 'large' });
    expect(small.audioScore).toBe(85);
    expect(large.audioScore).toBe(60);

    const below = fuseRipenessSignals(
      visual(),
      audio({ peakFrequencyHz: 210, acousticRipenessScore: 0.6, knockCount: 3 }),
      { size: 'small' },
    );
    const above = fuseRipenessSignals(
      visual(),
      audio({ peakFrequencyHz: 251, acousticRipenessScore: 0.6, knockCount: 3 }),
      { size: 'small' },
    );
    expect(below.audioScore).toBe(60);
    expect(above.audioScore).toBe(60);

    const capped = fuseRipenessSignals(
      visual(),
      audio({ peakFrequencyHz: 230, acousticRipenessScore: 0.9, knockCount: 3 }),
      { size: 'small' },
    );
    expect(capped.audioScore).toBe(100);
  });

  it.each([
    ['medium', 115, true, false],
    ['medium', 210, true, false],
    ['medium', 211, false, false],
    ['medium', 250, false, false],
    ['medium', 251, false, true],
    ['small', 250, true, false],
    ['small', 290, false, false],
    ['small', 291, false, true],
    ['large', 210, true, false],
    ['large', 251, false, true],
  ] as const)('%s peak %s Hz dull tip %s, tight tip %s', (size, peak, dull, tight) => {
    const fused = fuseRipenessSignals(visual(), audio({ peakFrequencyHz: peak, knockCount: 3 }), {
      size: size as MelonSize,
    });
    expect(fused.actionableTips.some((tip) => /sound dull rather than tight/i.test(tip))).toBe(dull);
    expect(fused.actionableTips.some((tip) => /sound tight rather than dull/i.test(tip))).toBe(tight);
    if (dull && size === 'small') {
      expect(fused.actionableTips.some((tip) => /smaller melon/i.test(tip))).toBe(true);
    }
  });

  it('mentions ribbon stripes only below 0.4 on striped fruit', () => {
    const atBoundary = fuseRipenessSignals(
      visual({ stripeContrastScore: 0.4, groundSpotScore: 0.9, dullnessScore: 0.9 }),
      audio({ peakFrequencyHz: 160 }),
      { variety: 'striped' },
    );
    const below = fuseRipenessSignals(
      visual({ stripeContrastScore: 0.399, groundSpotScore: 0.9, dullnessScore: 0.9 }),
      audio({ peakFrequencyHz: 160 }),
      { variety: 'striped' },
    );
    expect(atBoundary.actionableTips.some((tip) => /ribbon stripes/i.test(tip))).toBe(false);
    expect(below.actionableTips.some((tip) => /ribbon stripes/i.test(tip))).toBe(true);
  });

  it('switches the field-spot tip at a detected score of 0.5', () => {
    const present = fuseRipenessSignals(
      visual({ groundSpotScore: 0.5, groundSpotDetected: true }),
      audio(),
    );
    const faint = fuseRipenessSignals(
      visual({ groundSpotScore: 0.499, groundSpotDetected: true }),
      audio(),
    );
    const missing = fuseRipenessSignals(
      visual({ groundSpotScore: 0.9, groundSpotDetected: false }),
      audio(),
    );
    expect(present.actionableTips[0]).toMatch(/field spot is in frame/i);
    expect(faint.actionableTips[0]).toMatch(/prefer a frame that shows the field spot/i);
    expect(missing.actionableTips[0]).toMatch(/prefer a frame that shows the field spot/i);
  });

  it('sends a non-finite composite to borderline', () => {
    const fused = fuseRipenessSignals(
      visual({
        stripeContrastScore: Number.NaN,
        groundSpotScore: Number.NaN,
        dullnessScore: Number.NaN,
      }),
      audio({ knockCount: Number.NaN }),
    );
    expect(fused.verdict).toBe('borderline');
    expect(fused.confidence).toBe(60);
    expect(fused.eatFromDays).toBe(1);
    expect(fused.eatUntilDays).toBe(3);
  });
});

import { describe, it, expect } from 'vitest';
import { fuseRipenessSignals } from './fusion';
import { VisualFeatures, AudioFeatures } from '../types';

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

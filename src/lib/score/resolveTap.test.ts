import { describe, expect, it } from 'vitest';
import { fuseRipenessSignals } from './fusion';
import { resolveOneTap } from './resolveTap';
import { AudioFeatures, VisualFeatures } from '../types';

const SAMPLE_RATE = 44100;

function ripeVisual(): VisualFeatures {
  return {
    stripeContrastScore: 0.8,
    groundSpotScore: 0.85,
    dullnessScore: 0.8,
    groundSpotDetected: true,
    notes: [],
  };
}

function ripeAudio(overrides: Partial<AudioFeatures> = {}): AudioFeatures {
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

function syntheticTap(options: {
  amplitude: number;
  hz?: number;
  clip?: boolean;
  flat?: boolean;
}): Float32Array {
  const n = Math.round(0.2 * SAMPLE_RATE);
  const pcm = new Float32Array(n);
  if (options.flat) {
    pcm.fill(options.amplitude);
    return pcm;
  }
  const hz = options.hz ?? 160;
  const burst = Math.round(0.02 * SAMPLE_RATE);
  for (let i = 0; i < burst; i += 1) {
    const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (burst - 1)));
    pcm[i] = Math.sin((2 * Math.PI * hz * i) / SAMPLE_RATE) * hann * options.amplitude;
  }
  if (options.clip) pcm[Math.floor(burst / 2)] = 1;
  return pcm;
}

describe('resolveOneTap', () => {
  it('low-peak gives a retry with no result object', () => {
    const outcome = resolveOneTap(ripeVisual(), syntheticTap({ amplitude: 0.002 }), SAMPLE_RATE);
    expect(outcome).toEqual({ kind: 'retry', reason: 'low_peak' });
    expect(outcome).not.toHaveProperty('result');
    expect(outcome).not.toHaveProperty('verdict');
    expect(outcome).not.toHaveProperty('overallScore');
    expect(outcome).not.toHaveProperty('hollow');
    expect(outcome).not.toHaveProperty('hollowWarning');
  });

  it('noisy gives a retry with no result object', () => {
    const cases = [
      syntheticTap({ amplitude: 0.25, flat: true }),
      syntheticTap({ amplitude: 0.4, clip: true }),
      new Float32Array(),
    ];
    for (const pcm of cases) {
      const outcome = resolveOneTap(ripeVisual(), pcm, SAMPLE_RATE);
      expect(outcome.kind).toBe('retry');
      if (outcome.kind === 'retry') expect(outcome.reason).toBe('noisy');
      expect(outcome).not.toHaveProperty('result');
      expect(outcome).not.toHaveProperty('verdict');
    }
  });

  it('a good tap gives a result', () => {
    const outcome = resolveOneTap(ripeVisual(), syntheticTap({ amplitude: 0.4 }), SAMPLE_RATE);
    expect(outcome.kind).toBe('result');
    if (outcome.kind !== 'result') return;
    expect(['likely_ripe', 'borderline', 'likely_unripe']).toContain(outcome.result.verdict);
    expect(outcome.result.audioFeatures.knockCount).toBe(1);
    expect(outcome.result).not.toHaveProperty('hollowScore');
    const again = fuseRipenessSignals(ripeVisual(), outcome.result.audioFeatures);
    expect(again.verdict).toBe(outcome.result.verdict);
    expect(again.overallScore).toBe(outcome.result.overallScore);
  });

  it('the old low-peak rule no longer changes any result', () => {
    const visuals = ripeVisual();
    const ripe = fuseRipenessSignals(visuals, ripeAudio());
    expect(ripe.verdict).toBe('likely_ripe');

    const heldBack = fuseRipenessSignals(
      visuals,
      ripeAudio({
        peakFrequencyHz: 60,
        acousticRipenessScore: 0.45,
        rmsEnergy: 0.001,
      }),
    );
    expect(heldBack.verdict).not.toBe(ripe.verdict);

    const low = resolveOneTap(visuals, syntheticTap({ amplitude: 0.002 }), SAMPLE_RATE);
    expect(low).toEqual({ kind: 'retry', reason: 'low_peak' });
    expect(low).not.toHaveProperty('result');
    expect(low).not.toEqual(expect.objectContaining({ verdict: heldBack.verdict }));
    expect(low).not.toEqual(expect.objectContaining({ overallScore: heldBack.overallScore }));

    const sameEnergy = fuseRipenessSignals(visuals, ripeAudio());
    const quieterEnergy = fuseRipenessSignals(visuals, ripeAudio({ rmsEnergy: 0.0001 }));
    expect(quieterEnergy.verdict).toBe(sameEnergy.verdict);
    expect(quieterEnergy.overallScore).toBe(sameEnergy.overallScore);
    expect(quieterEnergy.audioScore).toBe(sameEnergy.audioScore);
    expect(quieterEnergy.visualScore).toBe(sameEnergy.visualScore);
    expect(quieterEnergy.confidence).toBe(sameEnergy.confidence);
    expect(quieterEnergy.summaryExplanation).toBe(sameEnergy.summaryExplanation);
    expect(quieterEnergy.actionableTips).toEqual(sameEnergy.actionableTips);
  });
});

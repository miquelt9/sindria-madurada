import { describe, it, expect } from 'vitest';
import { extractAbbaszadehFeatures, aggregateKnockFeatures } from './features';

describe('Acoustic Feature Extraction (Abbaszadeh et al. 2013)', () => {
  it('should extract statistical features for simulated ripe resonant knock (150Hz peak)', () => {
    const sampleRate = 44100;
    const fftSize = 1024;
    const amplitudes = new Float32Array(fftSize);

    // Inject peak at ~150Hz (bin index = 150 / (22050 / 1024) = ~7)
    const binSize = (sampleRate / 2) / fftSize;
    const targetBin = Math.round(150 / binSize);
    amplitudes[targetBin] = 1.0;
    amplitudes[targetBin - 1] = 0.6;
    amplitudes[targetBin + 1] = 0.6;

    const features = extractAbbaszadehFeatures(amplitudes, sampleRate);

    expect(features.peakFrequencyHz).toBeGreaterThan(120);
    expect(features.peakFrequencyHz).toBeLessThan(180);
    expect(features.acousticRipenessScore).toBeGreaterThanOrEqual(0.8);
    expect(features.amplitudeStdDev).toBeGreaterThan(0);
    expect(features.rmsEnergy).toBeGreaterThan(0);
  });

  it('should extract low ripeness score for tight/unripe high pitch knock (450Hz peak)', () => {
    const sampleRate = 44100;
    const fftSize = 1024;
    const amplitudes = new Float32Array(fftSize);

    const binSize = (sampleRate / 2) / fftSize;
    const targetBin = Math.round(450 / binSize);
    amplitudes[targetBin] = 1.0;
    amplitudes[targetBin - 1] = 0.5;
    amplitudes[targetBin + 1] = 0.5;

    const features = extractAbbaszadehFeatures(amplitudes, sampleRate);

    expect(features.peakFrequencyHz).toBeGreaterThan(400);
    expect(features.acousticRipenessScore).toBeLessThan(0.4);
  });

  it('should aggregate multiple knocks properly', () => {
    const sampleRate = 44100;
    const fftSize = 512;

    const knock1 = new Float32Array(fftSize);
    const knock2 = new Float32Array(fftSize);
    const knock3 = new Float32Array(fftSize);

    // Inject 160Hz peak
    const binSize = (sampleRate / 2) / fftSize;
    const targetBin = Math.round(160 / binSize);
    knock1[targetBin] = 0.8;
    knock2[targetBin] = 0.9;
    knock3[targetBin] = 0.85;

    const aggregate = aggregateKnockFeatures([knock1, knock2, knock3], sampleRate);

    expect(aggregate.knockCount).toBe(3);
    expect(aggregate.peakFrequencyHz).toBeGreaterThan(130);
    expect(aggregate.peakFrequencyHz).toBeLessThan(190);
    expect(aggregate.acousticRipenessScore).toBeGreaterThanOrEqual(0.8);
  });
});

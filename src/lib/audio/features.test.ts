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

describe('extractAbbaszadehFeatures edges', () => {
  const SAMPLE_RATE = 2000;
  const BINS = 1000;

  function spectrumAt(peakHz: number): Float32Array {
    const amplitudes = new Float32Array(BINS);
    amplitudes[peakHz] = 1;
    const inLow = peakHz >= 110 && peakHz <= 240;
    const inHigh = peakHz >= 320 && peakHz <= 750;
    if (inLow) {
      amplitudes[400] = 0.9;
    } else if (inHigh) {
      amplitudes[150] = 0.9;
    } else {
      amplitudes[150] = 0.9;
      amplitudes[400] = 0.9;
    }
    return amplitudes;
  }

  it('returns a neutral score for an empty or all-zero spectrum', () => {
    const empty = extractAbbaszadehFeatures(new Float32Array(), SAMPLE_RATE);
    expect(empty).toMatchObject({
      peakFrequencyHz: 0,
      rmsEnergy: 0,
      spectralCentroidHz: 0,
      amplitudeStdDev: 0,
      skewness: 0,
      kurtosis: 0,
      lowMidRatio: 1,
      acousticRipenessScore: 0.5,
    });

    const zeros = extractAbbaszadehFeatures(new Float32Array(8), SAMPLE_RATE);
    expect(zeros.peakFrequencyHz).toBe(0);
    expect(zeros.acousticRipenessScore).toBe(0.5);
    expect(zeros.lowMidRatio).toBe(1);
  });

  it('ignores negative bins for the peak and still returns finite moments', () => {
    const features = extractAbbaszadehFeatures(new Float32Array([-2, -1]), 200);
    expect(features.peakFrequencyHz).toBe(0);
    expect(features.rmsEnergy).toBe(0);
    expect(features.acousticRipenessScore).toBe(0.5);
    expect(features.amplitudeStdDev).toBeGreaterThan(0);
    expect(Number.isFinite(features.skewness)).toBe(true);
    expect(Number.isFinite(features.kurtosis)).toBe(true);
  });

  it('does not throw when the sample rate is zero', () => {
    const features = extractAbbaszadehFeatures(new Float32Array([1, 0, 0]), 0);
    expect(features.peakFrequencyHz).toBe(0);
    expect(Number.isFinite(features.acousticRipenessScore)).toBe(true);
  });

  it.each([
    [40, 0.5],
    [41, 0.45],
    [94, 0.45],
    [95, 0.5],
    [114, 0.5],
    [115, 0.85],
    [210, 0.85],
    [211, 0.6],
    [320, 0.6],
    [321, 0.25],
  ] as const)('scores a %s Hz peak as %s when the band ratio is neutral', (peakHz, score) => {
    const features = extractAbbaszadehFeatures(spectrumAt(peakHz), SAMPLE_RATE);
    expect(features.peakFrequencyHz).toBe(peakHz);
    expect(features.acousticRipenessScore).toBe(score);
  });

  it('raises a low-band peak and lowers a high-band peak from the energy ratio', () => {
    const low = new Float32Array(BINS);
    low[115] = 1;
    const lowFeatures = extractAbbaszadehFeatures(low, SAMPLE_RATE);
    expect(lowFeatures.lowMidRatio).toBe(3);
    expect(lowFeatures.acousticRipenessScore).toBe(0.95);

    const high = new Float32Array(BINS);
    high[321] = 1;
    const highFeatures = extractAbbaszadehFeatures(high, SAMPLE_RATE);
    expect(highFeatures.lowMidRatio).toBe(0);
    expect(highFeatures.acousticRipenessScore).toBe(0.1);
  });
});

describe('aggregateKnockFeatures edges', () => {
  it('reports that no knocks were recorded', () => {
    const aggregate = aggregateKnockFeatures([], 44100);
    expect(aggregate.knockCount).toBe(0);
    expect(aggregate.peakFrequencyHz).toBe(0);
    expect(aggregate.acousticRipenessScore).toBe(0.5);
    expect(aggregate.lowMidRatio).toBe(1);
    expect(aggregate.notes).toEqual(['No distinct knocks recorded']);
  });

  it('averages peaks and switches the firmness note on the published cutoffs', () => {
    const sampleRate = 2000;
    const bins = 1000;
    const at = (hz: number) => {
      const amplitudes = new Float32Array(bins);
      amplitudes[hz] = 1;
      return amplitudes;
    };

    expect(aggregateKnockFeatures([at(150)], sampleRate).notes[0]).toBe('Analyzed 1 distinct knock sample');
    expect(aggregateKnockFeatures([at(115), at(211)], sampleRate).peakFrequencyHz).toBe(163);

    const noteFor = (hz: number) => aggregateKnockFeatures([at(hz), at(hz)], sampleRate).notes[1];
    expect(noteFor(115)).toMatch(/dull rather than tight/i);
    expect(noteFor(210)).toMatch(/dull rather than tight/i);
    expect(noteFor(211)).toMatch(/unclear/i);
    expect(noteFor(280)).toMatch(/unclear/i);
    expect(noteFor(281)).toMatch(/tight rather than dull/i);
    expect(aggregateKnockFeatures([at(281), at(281)], sampleRate).notes[0]).toMatch(/samples$/);
  });
});

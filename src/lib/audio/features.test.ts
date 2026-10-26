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

const FFT_BINS = 8192;
const FFT_RATE = 44100;
const FFT_BIN_HZ = (FFT_RATE / 2) / FFT_BINS;

function binFor(hz: number): number {
  return Math.round(hz / FFT_BIN_HZ);
}

/** Floor 0.01, peak 1.0, neighbours 0.6. Prominence is about 100. */
function clearSpectrum(hz: number): Float32Array {
  const amplitudes = new Float32Array(FFT_BINS);
  amplitudes.fill(0.01);
  const bin = binFor(hz);
  amplitudes[bin] = 1;
  if (bin > 0) amplitudes[bin - 1] = 0.6;
  if (bin + 1 < FFT_BINS) amplitudes[bin + 1] = 0.6;
  return amplitudes;
}

/** Floor 0.2 and one peak at 1.0. Prominence is 5. */
function muddyFlatSpectrum(hz: number): Float32Array {
  const amplitudes = new Float32Array(FFT_BINS);
  amplitudes.fill(0.2);
  amplitudes[binFor(hz)] = 1;
  return amplitudes;
}

/** Floor 0.01, peaks 1.0 near 160 Hz and 0.9 near 400 Hz. */
function twoModeSpectrum(): Float32Array {
  const amplitudes = new Float32Array(FFT_BINS);
  amplitudes.fill(0.01);
  amplitudes[binFor(160)] = 1;
  amplitudes[binFor(400)] = 0.9;
  return amplitudes;
}

describe('extractAbbaszadehFeatures edges', () => {
  const SAMPLE_RATE = 2000;

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

  it('T5 scores a clear 160 Hz peak as dull', () => {
    const features = extractAbbaszadehFeatures(clearSpectrum(160), FFT_RATE);
    expect(features.peakFrequencyHz).toBeGreaterThanOrEqual(158);
    expect(features.peakFrequencyHz).toBeLessThanOrEqual(162);
    expect(features.peakClarity).toBe('clear');
    expect(features.acousticRipenessScore).toBe(0.8);
  });

  it('T6 scores a muddy-flat 160 Hz peak as muddy', () => {
    const features = extractAbbaszadehFeatures(muddyFlatSpectrum(160), FFT_RATE);
    expect(features.peakClarity).toBe('muddy');
    expect(features.acousticRipenessScore).toBe(0.5);
  });

  it('T7 treats two modes as muddy when the second peak is at least 0.8', () => {
    const features = extractAbbaszadehFeatures(twoModeSpectrum(), FFT_RATE);
    expect(features.peakClarity).toBe('muddy');
    expect(features.acousticRipenessScore).toBe(0.5);
  });

  it('T8 keeps the peak inside the search band when louder spikes sit outside it', () => {
    const amplitudes = clearSpectrum(160);
    for (let bin = 0; bin <= 5; bin += 1) amplitudes[bin] = 2;
    amplitudes[binFor(1500)] = 2;
    const features = extractAbbaszadehFeatures(amplitudes, FFT_RATE);
    expect(features.peakFrequencyHz).toBeGreaterThanOrEqual(158);
    expect(features.peakFrequencyHz).toBeLessThanOrEqual(162);
    expect(features.peakClarity).toBe('clear');
  });

  it('T9 ignores low-band energy when scoring, and still stores the ratio', () => {
    const baseline = clearSpectrum(160);
    const boosted = clearSpectrum(160);
    for (let i = 0; i < boosted.length; i += 1) {
      const freq = i * FFT_BIN_HZ;
      if (freq >= 110 && freq <= 240) boosted[i] *= 5;
    }
    const before = extractAbbaszadehFeatures(baseline, FFT_RATE);
    const after = extractAbbaszadehFeatures(boosted, FFT_RATE);
    expect(after.acousticRipenessScore).toBe(before.acousticRipenessScore);
    expect(after.lowMidRatio).not.toBe(before.lowMidRatio);

    const lowOnly = new Float32Array(1000);
    lowOnly[115] = 1;
    const lowFeatures = extractAbbaszadehFeatures(lowOnly, 2000);
    expect(lowFeatures.lowMidRatio).toBe(3);
    expect(lowFeatures.acousticRipenessScore).toBe(0.8);

    const highOnly = new Float32Array(1000);
    highOnly[321] = 1;
    const highFeatures = extractAbbaszadehFeatures(highOnly, 2000);
    expect(highFeatures.lowMidRatio).toBe(0);
    expect(highFeatures.acousticRipenessScore).toBe(0.25);
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

  it('picks the firmness note from the hint and does not mention Hz', () => {
    const sampleRate = 2000;
    const bins = 1000;
    const at = (hz: number) => {
      const amplitudes = new Float32Array(bins);
      amplitudes[hz] = 1;
      return amplitudes;
    };

    expect(aggregateKnockFeatures([at(150)], sampleRate).notes[0]).toBe('Analyzed 1 distinct knock sample');

    const noteFor = (hz: number) => aggregateKnockFeatures([at(hz), at(hz)], sampleRate).notes[1];
    expect(noteFor(115)).toMatch(/dull rather than tight/i);
    expect(noteFor(230)).toMatch(/dull rather than tight/i);
    expect(noteFor(231)).toMatch(/unclear/i);
    expect(noteFor(300)).toMatch(/unclear/i);
    expect(noteFor(301)).toMatch(/tight rather than dull/i);
    expect(noteFor(100)).toMatch(/unclear/i);
    expect(aggregateKnockFeatures([at(301), at(301)], sampleRate).notes[0]).toMatch(/samples$/);
    expect(aggregateKnockFeatures([at(160), at(350)], sampleRate).notes.join(' ')).not.toMatch(/\bhz\b/i);
  });

  it('T10 marks clear knocks that span dull and tight as muddy', () => {
    const aggregate = aggregateKnockFeatures(
      [clearSpectrum(150), clearSpectrum(160), clearSpectrum(350)],
      FFT_RATE,
    );
    expect(aggregate.peakClarity).toBe('muddy');
    expect(aggregate.acousticRipenessScore).toBe(0.5);
    expect(aggregate.knockPeaksHz).toHaveLength(3);
    expect(aggregate.notes[1]).toMatch(/unclear/i);
  });

  it('T11 takes the rounded median of an even number of clear peaks', () => {
    const sampleRate = 2000;
    const at = (hz: number) => {
      const amplitudes = new Float32Array(1000);
      amplitudes[hz] = 1;
      return amplitudes;
    };
    const aggregate = aggregateKnockFeatures([at(115), at(211)], sampleRate);
    expect(aggregate.peakFrequencyHz).toBe(163);
    expect(aggregate.peakClarity).toBe('clear');
    expect(aggregate.acousticRipenessScore).toBe(0.8);

    const odd = aggregateKnockFeatures([at(140), at(160), at(200)], sampleRate);
    expect(odd.peakClarity).toBe('clear');
    expect(odd.peakFrequencyHz).toBe(160);

    const rounded = aggregateKnockFeatures([at(160), at(161)], sampleRate);
    expect(rounded.peakFrequencyHz).toBe(161);
  });

  it('T12 counts a tie as muddy and keeps the median of the clear peaks', () => {
    const muddyMajority = aggregateKnockFeatures(
      [clearSpectrum(160), muddyFlatSpectrum(400), muddyFlatSpectrum(500)],
      FFT_RATE,
    );
    expect(muddyMajority.peakClarity).toBe('muddy');
    expect(muddyMajority.peakFrequencyHz).toBeGreaterThanOrEqual(158);
    expect(muddyMajority.peakFrequencyHz).toBeLessThanOrEqual(162);
    expect(muddyMajority.acousticRipenessScore).toBe(0.5);

    const clearMajority = aggregateKnockFeatures(
      [clearSpectrum(160), clearSpectrum(170), muddyFlatSpectrum(400)],
      FFT_RATE,
    );
    expect(clearMajority.peakClarity).toBe('clear');
    expect(clearMajority.peakFrequencyHz).toBe(165);
    expect(clearMajority.acousticRipenessScore).toBe(0.8);
  });

  it('does not treat a mid-band knock as disagreement', () => {
    const sampleRate = 2000;
    const at = (hz: number) => {
      const amplitudes = new Float32Array(1000);
      amplitudes[hz] = 1;
      return amplitudes;
    };
    const aggregate = aggregateKnockFeatures([at(150), at(160), at(250)], sampleRate);
    expect(aggregate.peakClarity).toBe('clear');
    expect(aggregate.peakFrequencyHz).toBe(160);
    expect(aggregate.acousticRipenessScore).toBe(0.8);
    expect(aggregate.notes[1]).toMatch(/dull rather than tight/i);
  });
});

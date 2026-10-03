import { AudioFeatures } from '../types';

/**
 * Computes statistical moments and features from FFT amplitude spectrum
 * Inspired directly by Abbaszadeh et al. (2013) Table 1.
 */
export function extractAbbaszadehFeatures(
  fftAmplitudes: Float32Array,
  sampleRate: number
): Omit<AudioFeatures, 'knockCount' | 'notes'> {
  const n = fftAmplitudes.length;
  if (n === 0) {
    return {
      peakFrequencyHz: 0,
      rmsEnergy: 0,
      spectralCentroidHz: 0,
      amplitudeStdDev: 0,
      skewness: 0,
      kurtosis: 0,
      lowMidRatio: 1,
      acousticRipenessScore: 0.5,
    };
  }

  const binSize = (sampleRate / 2) / n;
  let sum = 0;
  let sumSq = 0;
  let maxVal = 0;
  let maxIdx = 0;
  let weightedFreqSum = 0;
  let totalAmpForCentroid = 0;

  // Band energies:
  // Low resonant ripe band: 100 Hz to 240 Hz
  // High unripe/tight band: 300 Hz to 750 Hz
  let lowBandEnergy = 0;
  let highBandEnergy = 0;

  for (let i = 0; i < n; i++) {
    const val = Math.max(0, fftAmplitudes[i]);
    const freq = i * binSize;

    sum += val;
    sumSq += val * val;

    if (val > maxVal) {
      maxVal = val;
      maxIdx = i;
    }

    // Limit centroid calculation to 0-1000 Hz (relevant acoustic range)
    if (freq <= 1000) {
      weightedFreqSum += freq * val;
      totalAmpForCentroid += val;
    }

    if (freq >= 110 && freq <= 240) {
      lowBandEnergy += val * val;
    } else if (freq >= 320 && freq <= 750) {
      highBandEnergy += val * val;
    }
  }

  const mean = sum / n;
  const rmsEnergy = Math.sqrt(sumSq / n);
  const peakFrequencyHz = Math.round(maxIdx * binSize);
  const spectralCentroidHz =
    totalAmpForCentroid > 0 ? Math.round(weightedFreqSum / totalAmpForCentroid) : peakFrequencyHz;

  // Compute 2nd, 3rd (skewness) and 4th (kurtosis) central moments
  let varSum = 0;
  let skewSum = 0;
  let kurtSum = 0;

  for (let i = 0; i < n; i++) {
    const diff = fftAmplitudes[i] - mean;
    const diff2 = diff * diff;
    varSum += diff2;
    skewSum += diff2 * diff;
    kurtSum += diff2 * diff2;
  }

  const variance = varSum / n;
  const amplitudeStdDev = Math.sqrt(variance);
  const skewness = amplitudeStdDev > 0 ? (skewSum / n) / Math.pow(variance, 1.5) : 0;
  const kurtosis = amplitudeStdDev > 0 ? (kurtSum / n) / Math.pow(variance, 2) : 0;

  const lowMidRatio =
    highBandEnergy > 0 ? lowBandEnergy / (highBandEnergy + 0.0001) : lowBandEnergy > 0 ? 3.0 : 1.0;

  // Heuristic buckets below are unchanged. They are not a sweetness measurement,
  // and a hollow sound is not described here as a ripeness point.
  let acousticRipenessScore = 0.5;

  if (peakFrequencyHz >= 115 && peakFrequencyHz <= 210) {
    acousticRipenessScore = 0.85;
  } else if (peakFrequencyHz > 210 && peakFrequencyHz <= 320) {
    // Borderline / smaller melon pitch
    acousticRipenessScore = 0.60;
  } else if (peakFrequencyHz > 320) {
    // High pitched tight/unripe ping
    acousticRipenessScore = 0.25;
  } else if (peakFrequencyHz < 95 && peakFrequencyHz > 40) {
    acousticRipenessScore = 0.45;
  }

  // Adjust score with low/high energy ratio
  if (lowMidRatio > 1.5) {
    acousticRipenessScore = Math.min(1.0, acousticRipenessScore + 0.1);
  } else if (lowMidRatio < 0.6) {
    acousticRipenessScore = Math.max(0.0, acousticRipenessScore - 0.15);
  }

  return {
    peakFrequencyHz,
    rmsEnergy,
    spectralCentroidHz,
    amplitudeStdDev,
    skewness,
    kurtosis,
    lowMidRatio: Number(lowMidRatio.toFixed(2)),
    acousticRipenessScore: Number(acousticRipenessScore.toFixed(2)),
  };
}

/**
 * Multi-knock aggregator: takes up to 3 detected knocks and aggregates features
 */
export function aggregateKnockFeatures(knocks: Float32Array[], sampleRate: number): AudioFeatures {
  if (knocks.length === 0) {
    return {
      peakFrequencyHz: 0,
      rmsEnergy: 0,
      spectralCentroidHz: 0,
      amplitudeStdDev: 0,
      skewness: 0,
      kurtosis: 0,
      lowMidRatio: 1,
      knockCount: 0,
      acousticRipenessScore: 0.5,
      notes: ['No distinct knocks recorded'],
    };
  }

  const featureList = knocks.map((k) => extractAbbaszadehFeatures(k, sampleRate));

  // Average scalar metrics
  const avgPeak = Math.round(
    featureList.reduce((acc, f) => acc + f.peakFrequencyHz, 0) / featureList.length
  );
  const avgRms = featureList.reduce((acc, f) => acc + f.rmsEnergy, 0) / featureList.length;
  const avgCentroid = Math.round(
    featureList.reduce((acc, f) => acc + f.spectralCentroidHz, 0) / featureList.length
  );
  const avgStd = featureList.reduce((acc, f) => acc + f.amplitudeStdDev, 0) / featureList.length;
  const avgSkew = featureList.reduce((acc, f) => acc + f.skewness, 0) / featureList.length;
  const avgKurt = featureList.reduce((acc, f) => acc + f.kurtosis, 0) / featureList.length;
  const avgRatio = featureList.reduce((acc, f) => acc + f.lowMidRatio, 0) / featureList.length;
  const avgScore =
    featureList.reduce((acc, f) => acc + f.acousticRipenessScore, 0) / featureList.length;

  const notes: string[] = [];
  notes.push(`Analyzed ${knocks.length} distinct knock sample${knocks.length > 1 ? 's' : ''}`);

  if (avgPeak >= 115 && avgPeak <= 210) {
    notes.push('Firmness cue from these knocks: dull rather than tight. Not more bass, and not a sweetness reading.');
  } else if (avgPeak > 280) {
    notes.push('Firmness cue from these knocks: tight rather than dull. Not more bass, and not a sweetness reading.');
  } else {
    notes.push('Firmness cue from these knocks is unclear. A hollow sound is a separate warning, not a ripeness point.');
  }

  return {
    peakFrequencyHz: avgPeak,
    rmsEnergy: Number(avgRms.toFixed(4)),
    spectralCentroidHz: avgCentroid,
    amplitudeStdDev: Number(avgStd.toFixed(4)),
    skewness: Number(avgSkew.toFixed(3)),
    kurtosis: Number(avgKurt.toFixed(3)),
    lowMidRatio: Number(avgRatio.toFixed(2)),
    knockCount: knocks.length,
    acousticRipenessScore: Number(avgScore.toFixed(2)),
    notes,
  };
}

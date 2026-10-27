import { AudioFeatures, MelonSize } from '../types';
import {
  KNOCK_SEARCH_MAX_HZ,
  KNOCK_SEARCH_MIN_HZ,
  LOW_BAND_MAX_HZ,
  LOW_BAND_MIN_HZ,
  SECOND_PEAK_OFFSET,
  UPPER_BAND_MAX_HZ,
  UPPER_BAND_MIN_HZ,
  acousticScoreFor,
  bandForFrequency,
  isPeakMuddy,
  knockHint,
  knocksDisagree,
  resolveKnockDisagreement,
  type PeakClarity,
} from './knockHint';

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

/** Even counts average the two middle values, then round. */
function medianRounded(values: number[]): number {
  return Math.round(median(values));
}

function isLocalMax(mags: Float32Array, index: number): boolean {
  const value = mags[index];
  if (value <= 0) return false;
  const left = index > 0 ? mags[index - 1] : -Infinity;
  const right = index + 1 < mags.length ? mags[index + 1] : -Infinity;
  return value >= left && value >= right && (value > left || value > right);
}

/**
 * Computes statistical moments and features from FFT amplitude spectrum
 * Inspired directly by Abbaszadeh et al. (2013) Table 1.
 * The knock score is the coarse hint in knockHint.ts, not a ripe-frequency bucket.
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
  const mags = new Float32Array(n);
  let sum = 0;
  let sumSq = 0;
  let weightedFreqSum = 0;
  let totalAmpForCentroid = 0;

  // Stored ratio only. It does not change the acoustic score.
  let lowBandEnergy = 0;
  let highBandEnergy = 0;
  const bandMags: number[] = [];
  let peakMag = 0;
  let peakIdx = -1;

  for (let i = 0; i < n; i++) {
    const val = Math.max(0, fftAmplitudes[i]);
    mags[i] = val;
    const freq = i * binSize;

    sum += val;
    sumSq += val * val;

    // Centroid stays capped at the same 1000 Hz top as the knock search.
    if (freq <= KNOCK_SEARCH_MAX_HZ) {
      weightedFreqSum += freq * val;
      totalAmpForCentroid += val;
    }

    if (freq >= LOW_BAND_MIN_HZ && freq <= LOW_BAND_MAX_HZ) {
      lowBandEnergy += val * val;
    } else if (freq >= UPPER_BAND_MIN_HZ && freq <= UPPER_BAND_MAX_HZ) {
      highBandEnergy += val * val;
    }

    if (freq >= KNOCK_SEARCH_MIN_HZ && freq <= KNOCK_SEARCH_MAX_HZ) {
      bandMags.push(val);
      if (val > peakMag) {
        peakMag = val;
        peakIdx = i;
      }
    }
  }

  const mean = sum / n;
  const rmsEnergy = Math.sqrt(sumSq / n);
  const peakFrequencyHz = peakIdx >= 0 && peakMag > 0 ? Math.round(peakIdx * binSize) : 0;
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

  let secondPeak = 0;
  if (peakIdx >= 0 && peakMag > 0) {
    const peakFreq = peakIdx * binSize;
    const nearLow = peakFreq * (1 - SECOND_PEAK_OFFSET);
    const nearHigh = peakFreq * (1 + SECOND_PEAK_OFFSET);
    for (let i = 0; i < n; i++) {
      if (i === peakIdx) continue;
      const freq = i * binSize;
      if (freq < KNOCK_SEARCH_MIN_HZ || freq > KNOCK_SEARCH_MAX_HZ) continue;
      if (freq >= nearLow && freq <= nearHigh) continue;
      if (!isLocalMax(mags, i)) continue;
      if (mags[i] > secondPeak) secondPeak = mags[i];
    }
  }

  const prominence = peakMag / Math.max(median(bandMags), 1e-9);
  const secondPeakRatio = peakMag > 0 ? secondPeak / peakMag : 0;
  const peakClarity: PeakClarity = isPeakMuddy(prominence, secondPeakRatio) ? 'muddy' : 'clear';
  const hint = bandForFrequency(peakFrequencyHz);
  const acousticRipenessScore = acousticScoreFor(peakClarity, hint);

  return {
    peakFrequencyHz,
    rmsEnergy,
    spectralCentroidHz,
    amplitudeStdDev,
    skewness,
    kurtosis,
    lowMidRatio: Number(lowMidRatio.toFixed(2)),
    peakClarity,
    acousticRipenessScore: Number(acousticRipenessScore.toFixed(2)),
  };
}

/**
 * Multi-knock aggregator: takes up to 3 detected knocks and aggregates features.
 * Peak frequency is the median of the knocks that count, not the mean.
 * Size uses the same edges as fusion. Unset size keeps the medium edges.
 */
export function aggregateKnockFeatures(
  knocks: Float32Array[],
  sampleRate: number,
  size?: MelonSize,
): AudioFeatures {
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

  const clearPeaks: number[] = [];
  const allPeaks: number[] = [];
  let muddyCount = 0;
  for (const feature of featureList) {
    allPeaks.push(feature.peakFrequencyHz);
    if (feature.peakClarity === 'muddy') muddyCount += 1;
    else clearPeaks.push(feature.peakFrequencyHz);
  }
  const clearCount = clearPeaks.length;

  const disagreement = resolveKnockDisagreement(knocksDisagree(clearPeaks));
  const peakClarity: PeakClarity =
    muddyCount >= clearCount || disagreement === 'muddy' ? 'muddy' : 'clear';
  const knockPeaksHz = clearPeaks.length > 0 ? clearPeaks : allPeaks;
  const peakFrequencyHz = medianRounded(knockPeaksHz);

  const avgRms = featureList.reduce((acc, f) => acc + f.rmsEnergy, 0) / featureList.length;
  const avgCentroid = Math.round(
    featureList.reduce((acc, f) => acc + f.spectralCentroidHz, 0) / featureList.length
  );
  const avgStd = featureList.reduce((acc, f) => acc + f.amplitudeStdDev, 0) / featureList.length;
  const avgSkew = featureList.reduce((acc, f) => acc + f.skewness, 0) / featureList.length;
  const avgKurt = featureList.reduce((acc, f) => acc + f.kurtosis, 0) / featureList.length;
  const avgRatio = featureList.reduce((acc, f) => acc + f.lowMidRatio, 0) / featureList.length;

  const reading = knockHint(
    {
      peakFrequencyHz,
      peakClarity,
      knockCount: knocks.length,
    },
    size,
  );

  const notes: string[] = [];
  notes.push(`Analyzed ${knocks.length} distinct knock sample${knocks.length > 1 ? 's' : ''}`);

  if (reading.hint === 'dull') {
    notes.push('Firmness cue from these knocks: dull rather than tight. Not more bass, and not a sweetness reading.');
  } else if (reading.hint === 'tight') {
    notes.push('Firmness cue from these knocks: tight rather than dull. Not more bass, and not a sweetness reading.');
  } else {
    notes.push('Firmness cue from these knocks is unclear. A hollow sound is a separate warning, not a ripeness point.');
  }

  return {
    peakFrequencyHz,
    rmsEnergy: Number(avgRms.toFixed(4)),
    spectralCentroidHz: avgCentroid,
    amplitudeStdDev: Number(avgStd.toFixed(4)),
    skewness: Number(avgSkew.toFixed(3)),
    kurtosis: Number(avgKurt.toFixed(3)),
    lowMidRatio: Number(avgRatio.toFixed(2)),
    peakClarity,
    knockPeaksHz,
    knockCount: knocks.length,
    acousticRipenessScore: Number(reading.score.toFixed(2)),
    notes,
  };
}

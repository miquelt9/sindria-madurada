import { describe, it, expect } from 'vitest';
import { FRAME_SIZE, detectKnocksInPcm } from './onset';
import { extractAbbaszadehFeatures } from './features';
import { applyHann, fftMagnitudes } from './fft';

const SAMPLE_RATE = 44100;

/** Quiet 50 Hz hum plus three ~20 ms knocks at ~0.03 RMS, spaced > 400 ms. */
function syntheticThreeKnocks(sampleRate = SAMPLE_RATE): Float32Array {
  const durationS = 2.6;
  const n = Math.floor(durationS * sampleRate);
  const pcm = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    pcm[i] = 0.002 * Math.sin((2 * Math.PI * 50 * i) / sampleRate);
  }

  const knockStartsS = [0.45, 1.05, 1.65];
  const knockDurationS = 0.02;
  const targetRms = 0.03;
  const knockHz = 160;

  for (const t0 of knockStartsS) {
    const start = Math.floor(t0 * sampleRate);
    const len = Math.floor(knockDurationS * sampleRate);
    const burst = new Float32Array(len);
    let sumSq = 0;
    for (let i = 0; i < len; i++) {
      const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (len - 1)));
      burst[i] = Math.sin((2 * Math.PI * knockHz * i) / sampleRate) * hann;
      sumSq += burst[i] * burst[i];
    }
    const scale = targetRms / Math.sqrt(sumSq / len);
    for (let i = 0; i < len; i++) {
      pcm[start + i] += burst[i] * scale;
    }
  }

  return pcm;
}

function burstRms(pcm: Float32Array, startS: number, durationS: number, sampleRate: number): number {
  const start = Math.floor(startS * sampleRate);
  const len = Math.floor(durationS * sampleRate);
  let sumSq = 0;
  for (let i = 0; i < len; i++) {
    const s = pcm[start + i];
    sumSq += s * s;
  }
  return Math.sqrt(sumSq / len);
}

describe('Knock onset detector', () => {
  it('detects three ~0.03 RMS transients that the old 0.08 frame gate would miss', () => {
    const pcm = syntheticThreeKnocks();

    expect(burstRms(pcm, 0.45, 0.02, SAMPLE_RATE)).toBeGreaterThan(0.025);
    expect(burstRms(pcm, 0.45, 0.02, SAMPLE_RATE)).toBeLessThan(0.04);

    // Diluted 46 ms analyser frame around the first knock stays well below 0.08.
    const knockSample = Math.floor(0.45 * SAMPLE_RATE);
    let frameSq = 0;
    for (let i = 0; i < FRAME_SIZE; i++) {
      const s = pcm[knockSample + i];
      frameSq += s * s;
    }
    const frameRms = Math.sqrt(frameSq / FRAME_SIZE);
    expect(frameRms).toBeLessThan(0.08);

    const { knockCount } = detectKnocksInPcm(pcm, SAMPLE_RATE);
    expect(knockCount).toBe(3);
  });

  it('does not count a quiet constant tone as knocks', () => {
    const n = Math.floor(1.5 * SAMPLE_RATE);
    const pcm = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pcm[i] = 0.003 * Math.sin((2 * Math.PI * 50 * i) / SAMPLE_RATE);
    }
    const { knockCount } = detectKnocksInPcm(pcm, SAMPLE_RATE);
    expect(knockCount).toBe(0);
  });
});

describe('Knock window FFT', () => {
  it('recovers a 160 Hz peak from a Hann-windowed 200 ms sine', () => {
    const sampleRate = SAMPLE_RATE;
    const len = Math.round(0.2 * sampleRate);
    const samples = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      samples[i] = Math.sin((2 * Math.PI * 160 * i) / sampleRate);
    }

    const magnitudes = fftMagnitudes(applyHann(samples));
    const features = extractAbbaszadehFeatures(magnitudes, sampleRate);

    expect(features.peakFrequencyHz).toBeGreaterThan(140);
    expect(features.peakFrequencyHz).toBeLessThan(180);
  });
});

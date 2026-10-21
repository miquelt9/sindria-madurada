import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FRAME_SIZE,
  HOP_SIZE,
  KNOCK_DEBOUNCE_MS,
  KNOCK_WINDOW_MS,
  KnockDetector,
  MANUAL_PRESS_SETTLE_MS,
  analyzeFrame,
  detectKnocksInPcm,
} from './onset';
import { KnockRecorder } from './recorder';
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

describe('analyzeFrame', () => {
  it('returns zeros for an empty frame', () => {
    expect(analyzeFrame(new Float32Array())).toEqual({
      frameRms: 0,
      peakHopRms: 0,
      meanHopRms: 0,
    });
  });

  it('uses the whole frame when it is shorter than one hop', () => {
    const stats = analyzeFrame(new Float32Array([0.3, 0.4]));
    expect(stats.frameRms).toBeCloseTo(Math.sqrt(0.125));
    expect(stats.peakHopRms).toBeCloseTo(stats.frameRms);
    expect(stats.meanHopRms).toBeCloseTo(stats.frameRms);
  });

  it('reports the loudest hop separately from the frame average', () => {
    const stats = analyzeFrame(new Float32Array([0, 0, 0.6, 0.8]), 2);
    expect(stats.frameRms).toBeCloseTo(0.5);
    expect(stats.peakHopRms).toBeCloseTo(Math.sqrt(0.5));
    expect(stats.meanHopRms).toBeCloseTo(Math.sqrt(0.5) / 2);
  });

  it('rejects a zero hop instead of looping forever', () => {
    const frame = new Float32Array([0, 0, 0.6, 0.8]);
    expect(() => analyzeFrame(frame, 0)).toThrow(RangeError);
    expect(() => analyzeFrame(frame, -1)).toThrow(RangeError);
  });

  it('rejects a hop that is not a whole number', () => {
    const frame = new Float32Array([0, 0, 0.6, 0.8]);
    expect(() => analyzeFrame(frame, 1.5)).toThrow(RangeError);
    expect(() => analyzeFrame(frame, Number.NaN)).toThrow(RangeError);
  });
});

describe('KnockDetector', () => {
  function spikeFrame(): Float32Array {
    const frame = new Float32Array(FRAME_SIZE);
    for (let i = 0; i < HOP_SIZE; i += 1) {
      frame[i] = 0.2;
    }
    return frame;
  }

  /** Steady hum. Flat hops, so it is not itself a knock. */
  function steadyFrame(): Float32Array {
    const frame = new Float32Array(FRAME_SIZE);
    for (let i = 0; i < FRAME_SIZE; i += 1) {
      frame[i] = 0.02 * Math.sin((2 * Math.PI * 120 * i) / SAMPLE_RATE);
    }
    return frame;
  }

  function knockInNoise(): Float32Array {
    const frame = steadyFrame();
    for (let i = 0; i < HOP_SIZE; i += 1) frame[i] += 0.35;
    return frame;
  }

  it('ignores an empty push and a buffer shorter than one frame', () => {
    const detector = new KnockDetector(SAMPLE_RATE);
    expect(detector.pushFrame(new Float32Array())).toBe(false);
    expect(detector.knockCount).toBe(0);

    const { knockCount, spectra } = detectKnocksInPcm(new Float32Array(FRAME_SIZE - 1), SAMPLE_RATE);
    expect(knockCount).toBe(0);
    expect(spectra).toEqual([]);
  });

  it('ignores spikes during warmup, debounces for 400 ms, and stops at three', () => {
    const detector = new KnockDetector(SAMPLE_RATE);
    for (let i = 0; i < 4; i += 1) {
      expect(detector.pushFrame(spikeFrame())).toBe(false);
    }
    expect(detector.knockCount).toBe(0);

    expect(detector.pushFrame(spikeFrame())).toBe(true);
    for (let i = 5; i < 12; i += 1) {
      expect(detector.pushFrame(new Float32Array(FRAME_SIZE))).toBe(false);
    }
    expect(detector.pushFrame(spikeFrame())).toBe(false);
    expect(detector.knockCount).toBe(1);
    expect(detector.pushFrame(spikeFrame())).toBe(true);
    expect(detector.knockCount).toBe(2);

    const capped = new KnockDetector(1000);
    let accepts = 0;
    for (let i = 0; i < 10; i += 1) {
      if (capped.pushFrame(spikeFrame())) accepts += 1;
    }
    expect(accepts).toBe(3);
    expect(capped.knockCount).toBe(3);
    expect(capped.pushFrame(spikeFrame())).toBe(false);
    expect(capped.captureManualKnock(capped.clockSamples)).toBe(false);
  });

  it('captures one manual knock after a frame of audio and then honors the debounce', () => {
    const silent = new KnockDetector(SAMPLE_RATE);
    expect(silent.captureManualKnock(silent.clockSamples)).toBe(false);
    expect(silent.lastRejection).toBe('noisy');

    silent.pushFrame(new Float32Array(FRAME_SIZE));
    expect(silent.captureManualKnock(silent.clockSamples)).toBe(false);
    expect(silent.lastRejection).toBe('low_peak');
    expect(silent.knockCount).toBe(0);

    const detector = new KnockDetector(SAMPLE_RATE);
    detector.pushFrame(spikeFrame());
    expect(detector.captureManualKnock(detector.clockSamples)).toBe(true);
    expect(detector.lastRejection).toBeNull();
    expect(detector.captureManualKnock(detector.clockSamples)).toBe(false);
    expect(detector.knockCount).toBe(1);
    expect(detector.spectra).toHaveLength(1);
  });

  it('skips a grocery press that lands after the knock window', () => {
    const detector = new KnockDetector(SAMPLE_RATE);
    for (let i = 0; i < 4; i += 1) {
      expect(detector.pushFrame(new Float32Array(FRAME_SIZE))).toBe(false);
    }
    expect(detector.pushFrame(spikeFrame())).toBe(true);
    expect(detector.knockCount).toBe(1);
    expect(detector.lastRejection).toBeNull();
    const kept = detector.spectra[0];

    const frameMs = (FRAME_SIZE / SAMPLE_RATE) * 1000;
    const frames = Math.ceil((KNOCK_DEBOUNCE_MS + 50) / frameMs);
    const elapsed = frames * frameMs;
    expect(elapsed).toBeGreaterThan(KNOCK_WINDOW_MS);
    expect(elapsed).toBeGreaterThan(KNOCK_DEBOUNCE_MS);
    for (let i = 0; i < frames; i += 1) {
      expect(detector.pushFrame(new Float32Array(FRAME_SIZE))).toBe(false);
    }
    expect(detector.lastRejection).toBeNull();

    expect(detector.captureManualKnock(detector.clockSamples)).toBe(false);
    expect(detector.lastRejection).toBeNull();
    expect(detector.knockCount).toBe(1);
    expect(detector.spectra).toHaveLength(1);
    expect(detector.spectra[0]).toBe(kept);

    expect(detector.pushFrame(spikeFrame())).toBe(true);
    expect(detector.knockCount).toBe(2);
    expect(detector.lastRejection).toBeNull();
    expect(detector.spectra[0]).toBe(kept);
  });

  it('accepts a second and a third manual knock while the tap is still in the window', () => {
    const detector = new KnockDetector(SAMPLE_RATE);
    const frameMs = (FRAME_SIZE / SAMPLE_RATE) * 1000;
    const silence = () => new Float32Array(FRAME_SIZE);

    for (let i = 0; i < 4; i += 1) {
      expect(detector.pushFrame(silence())).toBe(false);
    }
    expect(detector.pushFrame(spikeFrame())).toBe(true);
    expect(detector.knockCount).toBe(1);

    const addManualKnock = () => {
      const before = detector.knockCount;
      // The spike lands inside the debounce, so auto-detection does not count it.
      const framesBeforeSpike = 5;
      for (let i = 0; i < framesBeforeSpike; i += 1) {
        expect(detector.pushFrame(silence())).toBe(false);
      }
      expect(detector.pushFrame(spikeFrame())).toBe(false);
      expect(detector.knockCount).toBe(before);

      // Debounce has elapsed, and the spike hop is still inside the knock window.
      const framesAfterSpike = 3;
      for (let i = 0; i < framesAfterSpike; i += 1) {
        expect(detector.pushFrame(silence())).toBe(false);
      }
      const sinceKnock = (framesBeforeSpike + 1 + framesAfterSpike) * frameMs;
      const sinceSpike = framesAfterSpike * frameMs;
      expect(sinceKnock).toBeGreaterThanOrEqual(KNOCK_DEBOUNCE_MS);
      expect(sinceSpike).toBeLessThanOrEqual(KNOCK_WINDOW_MS);
      expect(detector.captureManualKnock(detector.clockSamples)).toBe(true);
      expect(detector.lastRejection).toBeNull();
      expect(detector.knockCount).toBe(before + 1);
    };

    addManualKnock();
    expect(detector.knockCount).toBe(2);
    expect(detector.spectra).toHaveLength(2);
    addManualKnock();
    expect(detector.knockCount).toBe(3);
    expect(detector.spectra).toHaveLength(3);
    expect(detector.captureManualKnock(detector.clockSamples)).toBe(false);
    expect(detector.knockCount).toBe(3);
  });

  it('does not count a grocery press 150 ms after an auto-counted knock in steady noise', () => {
    const detector = new KnockDetector(SAMPLE_RATE);
    for (let i = 0; i < 4; i += 1) {
      expect(detector.pushFrame(steadyFrame())).toBe(false);
    }
    expect(detector.pushFrame(knockInNoise())).toBe(true);
    expect(detector.knockCount).toBe(1);
    const kept = detector.spectra[0];

    const frameMs = (FRAME_SIZE / SAMPLE_RATE) * 1000;
    let elapsed = 0;
    while (elapsed + frameMs <= 150) {
      expect(detector.pushFrame(steadyFrame())).toBe(false);
      elapsed += frameMs;
    }
    const remain = Math.round(((150 - elapsed) / 1000) * SAMPLE_RATE);
    expect(remain).toBeGreaterThan(0);
    expect(detector.pushFrame(steadyFrame().subarray(0, remain))).toBe(false);
    elapsed += (remain / SAMPLE_RATE) * 1000;
    expect(elapsed).toBeGreaterThan(140);
    expect(elapsed).toBeLessThan(KNOCK_DEBOUNCE_MS);
    expect(elapsed).toBeLessThan(KNOCK_WINDOW_MS);

    expect(detector.captureManualKnock(detector.clockSamples)).toBe(false);
    expect(detector.lastRejection).toBeNull();
    expect(detector.knockCount).toBe(1);
    expect(detector.spectra).toHaveLength(1);
    expect(detector.spectra[0]).toBe(kept);
  });

  it('accepts a manual press after the auto-knock debounce window', () => {
    const detector = new KnockDetector(SAMPLE_RATE);
    const frameMs = (FRAME_SIZE / SAMPLE_RATE) * 1000;
    for (let i = 0; i < 4; i += 1) {
      expect(detector.pushFrame(steadyFrame())).toBe(false);
    }
    expect(detector.pushFrame(knockInNoise())).toBe(true);
    expect(detector.knockCount).toBe(1);

    const framesBeforeSpike = 5;
    for (let i = 0; i < framesBeforeSpike; i += 1) {
      expect(detector.pushFrame(steadyFrame())).toBe(false);
    }
    expect(detector.pushFrame(knockInNoise())).toBe(false);
    expect(detector.knockCount).toBe(1);

    const framesAfterSpike = 3;
    for (let i = 0; i < framesAfterSpike; i += 1) {
      expect(detector.pushFrame(steadyFrame())).toBe(false);
    }
    const sinceKnock = (framesBeforeSpike + 1 + framesAfterSpike) * frameMs;
    const sinceSpike = framesAfterSpike * frameMs;
    expect(sinceKnock).toBeGreaterThanOrEqual(KNOCK_DEBOUNCE_MS);
    expect(sinceSpike).toBeLessThanOrEqual(KNOCK_WINDOW_MS);

    expect(detector.captureManualKnock(detector.clockSamples)).toBe(true);
    expect(detector.lastRejection).toBeNull();
    expect(detector.knockCount).toBe(2);
    expect(detector.spectra).toHaveLength(2);
  });

  it('keeps a counted knock when a later quiet spike would have been a low peak', () => {
    const detector = new KnockDetector(SAMPLE_RATE);
    for (let i = 0; i < 4; i += 1) {
      expect(detector.pushFrame(new Float32Array(FRAME_SIZE))).toBe(false);
    }
    expect(detector.pushFrame(spikeFrame())).toBe(true);
    expect(detector.knockCount).toBe(1);
    const kept = detector.spectra[0];

    const frameMs = (FRAME_SIZE / SAMPLE_RATE) * 1000;
    const frames = Math.ceil((KNOCK_DEBOUNCE_MS + 20) / frameMs);
    for (let i = 0; i < frames; i += 1) {
      expect(detector.pushFrame(new Float32Array(FRAME_SIZE))).toBe(false);
    }

    const quiet = new Float32Array(FRAME_SIZE);
    for (let i = 0; i < HOP_SIZE; i += 1) quiet[i] = 0.004;
    expect(detector.pushFrame(quiet)).toBe(false);
    expect(detector.lastRejection).toBeNull();
    expect(detector.knockCount).toBe(1);
    expect(detector.spectra).toHaveLength(1);
    expect(detector.spectra[0]).toBe(kept);
  });

  it('keeps a counted knock when a later loud spike is clipped', () => {
    const detector = new KnockDetector(SAMPLE_RATE);
    for (let i = 0; i < 4; i += 1) {
      expect(detector.pushFrame(new Float32Array(FRAME_SIZE))).toBe(false);
    }
    expect(detector.pushFrame(spikeFrame())).toBe(true);
    const kept = detector.spectra[0];

    const frameMs = (FRAME_SIZE / SAMPLE_RATE) * 1000;
    const frames = Math.ceil((KNOCK_DEBOUNCE_MS + 20) / frameMs);
    for (let i = 0; i < frames; i += 1) {
      expect(detector.pushFrame(new Float32Array(FRAME_SIZE))).toBe(false);
    }

    const clipped = spikeFrame();
    clipped[0] = 1;
    expect(detector.pushFrame(clipped)).toBe(false);
    expect(detector.lastRejection).toBeNull();
    expect(detector.knockCount).toBe(1);
    expect(detector.spectra[0]).toBe(kept);
  });

  it('does not store a quiet spike and marks it as a low peak', () => {
    const detector = new KnockDetector(SAMPLE_RATE);
    for (let i = 0; i < 4; i += 1) {
      expect(detector.pushFrame(new Float32Array(FRAME_SIZE))).toBe(false);
    }
    const quiet = new Float32Array(FRAME_SIZE);
    for (let i = 0; i < HOP_SIZE; i += 1) quiet[i] = 0.004;
    expect(detector.pushFrame(quiet)).toBe(false);
    expect(detector.lastRejection).toBe('low_peak');
    expect(detector.knockCount).toBe(0);
    expect(detector.spectra).toEqual([]);
  });

  it('reset clears knocks, the noise floor, and the live level', () => {
    const detector = new KnockDetector(SAMPLE_RATE);
    detector.pushFrame(spikeFrame());
    detector.liveRms = 0.2;
    detector.reset();
    expect(detector.knockCount).toBe(0);
    expect(detector.spectra).toEqual([]);
    expect(detector.noiseFloor).toBe(0.005);
    expect(detector.liveRms).toBe(0);
    expect(detector.captureManualKnock(detector.clockSamples)).toBe(false);
  });

});

/**
 * Shop noise with one loud knock the detector counts on its own, then two
 * quieter knocks that stay under the live spike check. The presses are the
 * only way those two get stored. Nothing between the first knock and a press
 * is a spike inside that press's debounce, so an uncounted tail cannot refresh
 * the stale stamp on the way in.
 */
describe('a grocery press after an uncounted tail', () => {
  const NOISE_RMS = 0.03;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function msToSamples(ms: number): number {
    return Math.round((ms / 1000) * SAMPLE_RATE);
  }

  function addBurst(pcm: Float32Array, start: number, durationS: number, rms: number): void {
    const len = Math.floor(durationS * SAMPLE_RATE);
    const burst = new Float32Array(len);
    let sumSq = 0;
    for (let i = 0; i < len; i += 1) {
      const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (len - 1)));
      burst[i] = Math.sin((2 * Math.PI * 160 * i) / SAMPLE_RATE) * hann;
      sumSq += burst[i] * burst[i];
    }
    const scale = rms / Math.sqrt(sumSq / len);
    for (let i = 0; i < len; i += 1) {
      const at = start + i;
      if (at >= pcm.length) break;
      pcm[at] += burst[i] * scale;
    }
  }

  /** 0.03 RMS noise, one 0.3 RMS knock across a block edge, then two 0.03 RMS knocks. */
  function shopTailSession(clippedBang: boolean): {
    pcm: Float32Array;
    tailEnd: number;
    bangEnd: number | null;
    presses: number[];
  } {
    const boundary = 16 * FRAME_SIZE;
    const loudLen = Math.floor(0.03 * SAMPLE_RATE);
    const knock2 = boundary + msToSamples(900);
    const bangAt = clippedBang ? boundary + msToSamples(550) : 0;
    const second = clippedBang ? bangAt + msToSamples(800) : knock2;
    const third = second + msToSamples(900);
    const pcm = new Float32Array(third + msToSamples(700));
    const rand = mulberry32(1);
    for (let i = 0; i < pcm.length; i += 1) {
      pcm[i] = NOISE_RMS * (rand() * 2 - 1) * Math.sqrt(3);
    }
    addBurst(pcm, boundary - Math.floor(loudLen / 2), 0.03, 0.3);
    addBurst(pcm, second, 0.02, NOISE_RMS);
    addBurst(pcm, third, 0.02, NOISE_RMS);
    if (clippedBang) {
      for (let i = 0; i < HOP_SIZE * 2; i += 1) pcm[bangAt + i] = 0.45;
      pcm[bangAt] = 1;
    }
    return {
      pcm,
      tailEnd: boundary + FRAME_SIZE,
      bangEnd: clippedBang ? bangAt + FRAME_SIZE : null,
      presses: [second - msToSamples(40), third - msToSamples(40)],
    };
  }

  type RecorderInner = {
    isListening: boolean;
    detector: KnockDetector | null;
    ingestFrame(frame: Float32Array): void;
  };

  function listeningRecorder(): { recorder: KnockRecorder; detector: KnockDetector } {
    const recorder = new KnockRecorder();
    const detector = new KnockDetector(SAMPLE_RATE);
    const inner = recorder as unknown as RecorderInner;
    inner.isListening = true;
    inner.detector = detector;
    return { recorder, detector };
  }

  function ingestThrough(
    recorder: KnockRecorder,
    pcm: Float32Array,
    until: number,
    from = 0,
  ): number {
    let offset = Math.floor(from / FRAME_SIZE) * FRAME_SIZE;
    const end = Math.max(0, Math.floor(until / FRAME_SIZE) * FRAME_SIZE);
    const inner = recorder as unknown as RecorderInner;
    while (offset + FRAME_SIZE <= end && offset + FRAME_SIZE <= pcm.length) {
      inner.ingestFrame(pcm.subarray(offset, offset + FRAME_SIZE));
      offset += FRAME_SIZE;
    }
    return offset;
  }

  function pressQuietKnocks(clippedBang: boolean): void {
    const { pcm, tailEnd, bangEnd, presses } = shopTailSession(clippedBang);
    const { recorder, detector } = listeningRecorder();
    const knocks: number[] = [];
    recorder.onKnockDetected = (count) => knocks.push(count);

    let offset = ingestThrough(recorder, pcm, tailEnd);
    expect(detector.knockCount).toBe(1);
    expect(detector.lastRejection).toBeNull();

    if (bangEnd !== null) {
      offset = ingestThrough(recorder, pcm, bangEnd, offset);
      expect(detector.knockCount).toBe(1);
      expect(detector.lastRejection).toBeNull();
    }

    const settle = msToSamples(MANUAL_PRESS_SETTLE_MS);
    for (const acoustic of presses) {
      const before = detector.knockCount;
      offset = ingestThrough(recorder, pcm, acoustic, offset);
      expect(detector.knockCount).toBe(before);
      const stamp = detector.clockSamples;
      recorder.captureManualKnock();
      const ready = stamp + settle;
      const inner = recorder as unknown as RecorderInner;
      while (detector.clockSamples < ready) {
        expect(detector.knockCount).toBe(before);
        expect(offset + FRAME_SIZE).toBeLessThanOrEqual(pcm.length);
        inner.ingestFrame(pcm.subarray(offset, offset + FRAME_SIZE));
        offset += FRAME_SIZE;
      }
      expect(detector.knockCount).toBe(before + 1);
      expect(detector.lastRejection).toBeNull();
    }

    expect(detector.knockCount).toBe(3);
    expect(knocks).toEqual([1, 2, 3]);
    recorder.stopAndAnalyze();
  }

  it('counts two presses after an auto knock that crosses a block boundary', () => {
    pressQuietKnocks(false);
  });

  it('stores two presses after a clipped bang that followed that knock', () => {
    pressQuietKnocks(true);
  });
});

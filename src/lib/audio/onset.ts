import { applyHann, fftMagnitudes } from './fft';

export const FRAME_SIZE = 2048;
export const KNOCK_WINDOW_MS = 200;
export const KNOCK_PREROLL_MS = 30;
export const KNOCK_DEBOUNCE_MS = 400;
export const MIN_RMS_THRESHOLD = 0.012;
export const NOISE_FLOOR_MULTIPLIER = 4;
export const SPIKE_RATIO = 1.8;
export const HOP_SIZE = 128;
export const MAX_KNOCKS = 3;
export const WARMUP_FRAMES = 4;

const RING_DURATION_MS = 500;

export interface KnockDetectionResult {
  knockCount: number;
  spectra: Float32Array[];
}

interface FrameStats {
  frameRms: number;
  peakHopRms: number;
  meanHopRms: number;
}

/**
 * Ring-buffer onset detector: adaptive noise floor, hop peak-to-mean spike,
 * ~400 ms debounce, then a Hann-windowed 150–250 ms PCM slice + FFT.
 */
export class KnockDetector {
  readonly sampleRate: number;
  liveRms = 0;
  noiseFloor = 0.005;

  private readonly ring: Float32Array;
  private writeIndex = 0;
  private samplesWritten = 0;
  private totalSamples = 0;
  private lastKnockAtMs = Number.NEGATIVE_INFINITY;
  private warmupFrames = 0;
  private readonly knockSpectra: Float32Array[] = [];
  private readonly maxKnocks: number;

  constructor(sampleRate: number, maxKnocks = MAX_KNOCKS) {
    this.sampleRate = sampleRate;
    this.maxKnocks = maxKnocks;
    const ringSamples = Math.max(FRAME_SIZE, Math.ceil((RING_DURATION_MS / 1000) * sampleRate));
    this.ring = new Float32Array(ringSamples);
  }

  get knockCount(): number {
    return this.knockSpectra.length;
  }

  get spectra(): Float32Array[] {
    return this.knockSpectra;
  }

  reset(): void {
    this.ring.fill(0);
    this.writeIndex = 0;
    this.samplesWritten = 0;
    this.totalSamples = 0;
    this.lastKnockAtMs = Number.NEGATIVE_INFINITY;
    this.warmupFrames = 0;
    this.knockSpectra.length = 0;
    this.liveRms = 0;
    this.noiseFloor = 0.005;
  }

  /**
   * Ingest a contiguous PCM frame. Returns true when a new knock spectrum was stored.
   */
  pushFrame(frame: Float32Array): boolean {
    if (frame.length === 0) return false;
    this.writeToRing(frame);

    const stats = analyzeFrame(frame);
    this.liveRms = stats.frameRms;
    this.warmupFrames += 1;

    if (this.warmupFrames <= WARMUP_FRAMES) {
      this.updateNoiseFloor(stats.frameRms, false);
      return false;
    }

    if (this.knockSpectra.length >= this.maxKnocks) {
      this.updateNoiseFloor(stats.frameRms, false);
      return false;
    }

    const threshold = Math.max(this.noiseFloor * NOISE_FLOOR_MULTIPLIER, MIN_RMS_THRESHOLD);
    const isLoud = stats.peakHopRms > threshold;
    const isSpike = stats.peakHopRms > stats.meanHopRms * SPIKE_RATIO;
    const nowMs = this.currentTimeMs();
    const debounced = nowMs - this.lastKnockAtMs >= KNOCK_DEBOUNCE_MS;

    if (isLoud && isSpike && debounced) {
      const spectrum = this.captureKnockSpectrum();
      if (spectrum) {
        this.lastKnockAtMs = nowMs;
        this.knockSpectra.push(spectrum);
        return true;
      }
    }

    this.updateNoiseFloor(stats.frameRms, isLoud);
    return false;
  }

  /** Grocery fallback: treat the current ring window as a knock (skips RMS gate). */
  captureManualKnock(): boolean {
    if (this.knockSpectra.length >= this.maxKnocks) return false;
    const nowMs = this.currentTimeMs();
    if (nowMs - this.lastKnockAtMs < KNOCK_DEBOUNCE_MS) return false;
    const spectrum = this.captureKnockSpectrum();
    if (!spectrum) return false;
    this.lastKnockAtMs = nowMs;
    this.knockSpectra.push(spectrum);
    return true;
  }

  private currentTimeMs(): number {
    return (this.totalSamples / this.sampleRate) * 1000;
  }

  private updateNoiseFloor(frameRms: number, wasLoud: boolean): void {
    if (wasLoud) return;
    if (frameRms < this.noiseFloor * 1.8) {
      this.noiseFloor = this.noiseFloor * 0.9 + frameRms * 0.1;
    } else {
      this.noiseFloor = this.noiseFloor * 0.997 + Math.min(frameRms, 0.01) * 0.003;
    }
    this.noiseFloor = Math.min(0.02, Math.max(0.0004, this.noiseFloor));
  }

  private writeToRing(frame: Float32Array): void {
    const ring = this.ring;
    let idx = this.writeIndex;
    for (let i = 0; i < frame.length; i++) {
      ring[idx] = frame[i];
      idx += 1;
      if (idx >= ring.length) idx = 0;
    }
    this.writeIndex = idx;
    this.samplesWritten = Math.min(this.samplesWritten + frame.length, ring.length);
    this.totalSamples += frame.length;
  }

  private captureKnockSpectrum(): Float32Array | null {
    const windowSamples = Math.round((KNOCK_WINDOW_MS / 1000) * this.sampleRate);
    const prerollSamples = Math.round((KNOCK_PREROLL_MS / 1000) * this.sampleRate);
    const minSamples = Math.min(windowSamples, Math.max(prerollSamples + 256, FRAME_SIZE / 2));
    if (this.samplesWritten < minSamples) return null;

    const captured = this.readLatest(Math.min(windowSamples, this.samplesWritten));
    return fftMagnitudes(applyHann(captured));
  }

  private readLatest(count: number): Float32Array {
    const n = Math.min(count, this.samplesWritten, this.ring.length);
    const out = new Float32Array(n);
    let start = this.writeIndex - n;
    if (start < 0) start += this.ring.length;
    for (let i = 0; i < n; i++) {
      out[i] = this.ring[(start + i) % this.ring.length];
    }
    return out;
  }
}

export function analyzeFrame(frame: Float32Array, hop = HOP_SIZE): FrameStats {
  let sumSq = 0;
  for (let i = 0; i < frame.length; i++) {
    sumSq += frame[i] * frame[i];
  }
  const frameRms = frame.length > 0 ? Math.sqrt(sumSq / frame.length) : 0;

  let peakHopRms = 0;
  let sumHopRms = 0;
  let hops = 0;
  for (let i = 0; i + hop <= frame.length; i += hop) {
    let hopSq = 0;
    for (let j = 0; j < hop; j++) {
      const s = frame[i + j];
      hopSq += s * s;
    }
    const hopRms = Math.sqrt(hopSq / hop);
    if (hopRms > peakHopRms) peakHopRms = hopRms;
    sumHopRms += hopRms;
    hops += 1;
  }

  const meanHopRms = hops > 0 ? sumHopRms / hops : frameRms;
  if (hops === 0) {
    peakHopRms = frameRms;
  }

  return { frameRms, peakHopRms, meanHopRms };
}

/** Run the live detector over a contiguous PCM buffer (non-overlapping frames). */
export function detectKnocksInPcm(
  pcm: Float32Array,
  sampleRate: number
): KnockDetectionResult {
  const detector = new KnockDetector(sampleRate);
  for (let offset = 0; offset + FRAME_SIZE <= pcm.length; offset += FRAME_SIZE) {
    detector.pushFrame(pcm.subarray(offset, offset + FRAME_SIZE));
  }
  return { knockCount: detector.knockCount, spectra: detector.spectra };
}

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

/**
 * Grocery-press shape, not a ripeness or loudness threshold.
 * A knock in the press window is a short attack followed by a decay.
 * Each block is 4 hops, about 12 ms, so it can sit on a ~20 ms tap.
 * The decay block is two blocks later, about 23 ms, after that tap has
 * fallen. Steady noise at any level moves block to block by about
 * 1.02–1.08. The shop knocks in the loud-noise harness (peak-to-mean
 * about 1.74–1.80, under SPIKE_RATIO) still rise by at least 1.40 and
 * fall by at least 1.50. 1.25 sits in that gap. The adaptive noise
 * floor is not the baseline: loud steady noise barely moves it, so a
 * level check alone would store a press with no knock.
 */
export const MANUAL_KNOCK_BLOCK_HOPS = 4;
export const MANUAL_KNOCK_DECAY_BLOCKS = 2;
export const MANUAL_KNOCK_SHAPE_RATIO = 1.25;

/**
 * Wait after a grocery press before reading the ring.
 * ScriptProcessor delivers audio in 2048-sample blocks, about 46 ms at
 * 44.1 kHz, and the browser graph often holds more than one block. The
 * press is stamped on the sample clock at the click. After this wait the
 * read starts about 200 ms before that stamp and runs through the newest
 * sample in the ring. The stamp can lag one 2048-sample block, so an end
 * at the stamp plus this wait stops before a knock that follows the press
 * and the decay fails the shape gate. Debounce and the stale-spike rule
 * use the stamp, not the later read. This is not a ripeness threshold.
 */
export const MANUAL_PRESS_SETTLE_MS = 120;

/** Float PCM reaches full scale at 1. Not a ripeness threshold. */
export const PCM_FULL_SCALE = 1;

export type WeakTapReason = 'low_peak' | 'noisy';

/**
 * One captured tap. A weak or noisy window is a retry and is not a score.
 * Uses the onset thresholds already in this file; they are not retuned here.
 */
function frameIsClipped(frame: Float32Array): boolean {
  for (let i = 0; i < frame.length; i++) {
    if (Math.abs(frame[i]) >= PCM_FULL_SCALE) return true;
  }
  return false;
}

export function classifyTapPcm(
  pcm: Float32Array,
  noiseFloor = 0.005,
): { ok: true } | { ok: false; reason: WeakTapReason } {
  if (pcm.length === 0) return { ok: false, reason: 'noisy' };

  for (let i = 0; i < pcm.length; i++) {
    if (Math.abs(pcm[i]) >= PCM_FULL_SCALE) return { ok: false, reason: 'noisy' };
  }

  const stats = analyzeFrame(pcm);
  const threshold = Math.max(noiseFloor * NOISE_FLOOR_MULTIPLIER, MIN_RMS_THRESHOLD);
  if (stats.peakHopRms <= threshold) return { ok: false, reason: 'low_peak' };
  if (!(stats.peakHopRms > stats.meanHopRms * SPIKE_RATIO)) {
    return { ok: false, reason: 'noisy' };
  }
  return { ok: true };
}

/**
 * Block index of the strongest knock-shaped attack in the window, or null.
 * Scale-free: the comparison is the previous block, not an absolute level.
 * The leading block can count on decay alone, where there is no earlier block.
 */
export function locateKnockShape(pcm: Float32Array): number | null {
  const block = MANUAL_KNOCK_BLOCK_HOPS * HOP_SIZE;
  const blocks: number[] = [];
  for (let i = 0; i + block <= pcm.length; i += block) {
    let sumSq = 0;
    for (let j = 0; j < block; j += 1) {
      const s = pcm[i + j];
      sumSq += s * s;
    }
    blocks.push(Math.sqrt(sumSq / block));
  }

  const decayRatio = (at: number): number => {
    const laterAt = at + MANUAL_KNOCK_DECAY_BLOCKS;
    if (laterAt >= blocks.length) return 0;
    const later = blocks[laterAt];
    if (later <= 0) return blocks[at] > 0 ? Number.POSITIVE_INFINITY : 0;
    return blocks[at] / later;
  };

  const passes = (at: number): boolean => {
    if (decayRatio(at) < MANUAL_KNOCK_SHAPE_RATIO) return false;
    if (at === 0) return true;
    const prev = blocks[at - 1];
    const rise = prev > 0 ? blocks[at] / prev : blocks[at] > 0 ? Number.POSITIVE_INFINITY : 0;
    return rise >= MANUAL_KNOCK_SHAPE_RATIO;
  };

  let best = -1;
  let bestRms = -1;
  for (let i = 0; i < blocks.length; i += 1) {
    if (!passes(i)) continue;
    if (blocks[i] > bestRms) {
      best = i;
      bestRms = blocks[i];
    }
  }
  return best >= 0 ? best : null;
}

/** True when the window has a sharp attack and a later decay. */
export function windowHasKnockShape(pcm: Float32Array): boolean {
  return locateKnockShape(pcm) !== null;
}

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
  /** Last time an auto spike was stored as a counted knock. */
  private lastCountedKnockAtMs = Number.NEGATIVE_INFINITY;
  /**
   * Last auto-detected spike or onset that was not stored as a counted knock.
   * A grocery press is stale against this sound, not against a counted knock.
   */
  private lastUncountedSoundAtMs = Number.NEGATIVE_INFINITY;
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

  /** Samples ingested so far. A grocery press is stamped on this clock. */
  get clockSamples(): number {
    return this.totalSamples;
  }

  get spectra(): Float32Array[] {
    return this.knockSpectra;
  }

  /** Set when the latest tap failed an existing level, clip, or onset check. */
  lastRejection: WeakTapReason | null = null;

  reset(): void {
    this.ring.fill(0);
    this.writeIndex = 0;
    this.samplesWritten = 0;
    this.totalSamples = 0;
    this.lastKnockAtMs = Number.NEGATIVE_INFINITY;
    this.lastCountedKnockAtMs = Number.NEGATIVE_INFINITY;
    this.lastUncountedSoundAtMs = Number.NEGATIVE_INFINITY;
    this.warmupFrames = 0;
    this.knockSpectra.length = 0;
    this.liveRms = 0;
    this.noiseFloor = 0.005;
    this.lastRejection = null;
  }

  /**
   * Ingest a contiguous PCM frame. Returns true when a new knock spectrum was stored.
   */
  pushFrame(frame: Float32Array): boolean {
    if (frame.length === 0) return false;
    this.lastRejection = null;
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
      if (frameIsClipped(frame)) {
        this.noteUncountedSound(nowMs);
        this.lastKnockAtMs = nowMs;
        // A later bad frame must not throw away knocks already stored.
        if (this.knockSpectra.length === 0) this.lastRejection = 'noisy';
        return false;
      }
      const spectrum = this.captureKnockSpectrum();
      if (spectrum) {
        this.lastKnockAtMs = nowMs;
        this.lastCountedKnockAtMs = nowMs;
        this.lastUncountedSoundAtMs = Number.NEGATIVE_INFINITY;
        this.knockSpectra.push(spectrum);
        return true;
      }
      this.noteUncountedSound(nowMs);
    } else if (isSpike && debounced && !isLoud) {
      this.noteUncountedSound(nowMs);
      this.lastKnockAtMs = nowMs;
      if (this.knockSpectra.length === 0) this.lastRejection = 'low_peak';
      return false;
    } else if (isSpike) {
      this.noteUncountedSound(nowMs);
    }

    this.updateNoiseFloor(stats.frameRms, isLoud);
    return false;
  }

  /**
   * Grocery fallback. A press inside the debounce of the last knock is the
   * same window that makes auto detection ignore follow-up spikes, so it is
   * not a second knock. A press is stale only against the last auto-detected
   * spike that was not stored, once that sound is older than one knock window.
   * Debounce and that stale rule use the press stamp, not the later read.
   * Pass the sample-clock stamp from the click. After the capture block has
   * had time to arrive, the read starts KNOCK_WINDOW_MS before that stamp
   * and ends at the newest sample in the ring. The stored spectrum is the
   * knock-shaped peak inside that span. Without a stamp, the read is the
   * latest knock window at the current clock.
   * A quiet window is a weak tap. A loud window still has to show a knock
   * attack and decay; steady noise does not. A failure after a knock is
   * already stored does not reject those knocks.
   */
  captureManualKnock(pressAtSample?: number): boolean {
    if (this.knockSpectra.length >= this.maxKnocks) return false;
    const stamped = pressAtSample !== undefined;
    const pressSample = pressAtSample ?? this.totalSamples;
    const pressMs = this.samplesToMs(pressSample);
    if (pressMs - this.lastKnockAtMs < KNOCK_DEBOUNCE_MS) return false;
    if (this.manualPressIsStale(pressMs)) return false;
    this.lastRejection = null;
    const captured = stamped ? this.readManualPressWindow(pressSample) : this.readKnockPcm();
    if (!captured || frameIsClipped(captured)) {
      if (this.knockSpectra.length === 0) this.lastRejection = 'noisy';
      return false;
    }
    const quality = classifyTapPcm(captured, this.noiseFloor);
    if (!quality.ok && quality.reason === 'low_peak') {
      if (this.knockSpectra.length > 0) return false;
      this.lastKnockAtMs = pressMs;
      this.lastRejection = 'low_peak';
      return false;
    }
    const peakBlock = locateKnockShape(captured);
    if (peakBlock === null) {
      if (this.knockSpectra.length > 0) return false;
      this.lastKnockAtMs = pressMs;
      this.lastRejection = 'noisy';
      return false;
    }
    const toStore = stamped ? this.sliceAroundKnock(captured, peakBlock) : captured;
    this.lastKnockAtMs = pressMs;
    this.lastCountedKnockAtMs = pressMs;
    this.lastUncountedSoundAtMs = Number.NEGATIVE_INFINITY;
    this.knockSpectra.push(fftMagnitudes(applyHann(toStore)));
    return true;
  }

  /** An uncounted auto spike older than the knock window. A counted knock is not a reference. */
  private manualPressIsStale(nowMs: number): boolean {
    if (this.lastUncountedSoundAtMs === Number.NEGATIVE_INFINITY) return false;
    if (this.lastCountedKnockAtMs >= this.lastUncountedSoundAtMs) return false;
    return nowMs - this.lastUncountedSoundAtMs > KNOCK_WINDOW_MS;
  }

  private noteUncountedSound(nowMs: number): void {
    this.lastUncountedSoundAtMs = nowMs;
  }

  private currentTimeMs(): number {
    return this.samplesToMs(this.totalSamples);
  }

  private samplesToMs(samples: number): number {
    return (samples / this.sampleRate) * 1000;
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

  private readKnockPcm(): Float32Array | null {
    const windowSamples = Math.round((KNOCK_WINDOW_MS / 1000) * this.sampleRate);
    const prerollSamples = Math.round((KNOCK_PREROLL_MS / 1000) * this.sampleRate);
    const minSamples = Math.min(windowSamples, Math.max(prerollSamples + 256, FRAME_SIZE / 2));
    if (this.samplesWritten < minSamples) return null;
    return this.readLatest(Math.min(windowSamples, this.samplesWritten));
  }

  /**
   * From one knock window before the press stamp through the newest sample
   * in the ring. Debounce and the stale rule still use the stamp. The stamp
   * can lag by one 2048-sample block, so an end at pressAtSample +
   * MANUAL_PRESS_SETTLE_MS stops before the knock decay already buffered
   * past that point.
   */
  private readManualPressWindow(pressAtSample: number): Float32Array | null {
    const lookbackSamples = Math.round((KNOCK_WINDOW_MS / 1000) * this.sampleRate);
    const start = pressAtSample - lookbackSamples;
    return this.readSampleRange(start, this.totalSamples);
  }

  /** KNOCK_WINDOW_MS centered on the chosen attack, clipped to `pcm`. */
  private sliceAroundKnock(pcm: Float32Array, peakBlock: number): Float32Array {
    const block = MANUAL_KNOCK_BLOCK_HOPS * HOP_SIZE;
    const windowSamples = Math.round((KNOCK_WINDOW_MS / 1000) * this.sampleRate);
    const peakCenter = peakBlock * block + Math.floor(block / 2);
    let start = peakCenter - Math.floor(windowSamples / 2);
    let end = start + windowSamples;
    if (start < 0) {
      end -= start;
      start = 0;
    }
    if (end > pcm.length) {
      start -= end - pcm.length;
      end = pcm.length;
    }
    if (start < 0) start = 0;
    return pcm.subarray(start, end);
  }

  /** Half-open sample-clock range [startSample, endSample), clipped to the ring. */
  private readSampleRange(startSample: number, endSample: number): Float32Array | null {
    const windowSamples = Math.round((KNOCK_WINDOW_MS / 1000) * this.sampleRate);
    const prerollSamples = Math.round((KNOCK_PREROLL_MS / 1000) * this.sampleRate);
    const minSamples = Math.min(windowSamples, Math.max(prerollSamples + 256, FRAME_SIZE / 2));
    const availableStart = this.totalSamples - this.samplesWritten;
    const start = Math.max(startSample, availableStart, 0);
    const end = Math.min(endSample, this.totalSamples);
    if (end - start < minSamples) return null;
    const n = end - start;
    const out = new Float32Array(n);
    let idx = this.writeIndex - (this.totalSamples - start);
    idx %= this.ring.length;
    if (idx < 0) idx += this.ring.length;
    for (let i = 0; i < n; i += 1) {
      out[i] = this.ring[(idx + i) % this.ring.length];
    }
    return out;
  }

  private captureKnockSpectrum(): Float32Array | null {
    const captured = this.readKnockPcm();
    if (!captured) return null;
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
  if (!Number.isInteger(hop) || hop <= 0) {
    throw new RangeError('hop must be a positive whole number');
  }

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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FRAME_SIZE,
  HOP_SIZE,
  KnockDetector,
  MANUAL_PRESS_SETTLE_MS,
  WARMUP_FRAMES,
} from './onset';
import { KnockRecorder } from './recorder';

const SAMPLE_RATE = 44100;
const NOISE_RMS = 0.03;

/**
 * The read waits MANUAL_PRESS_SETTLE_MS (120) after the press.
 * The window is still 200 ms, so a knock up to about 80 ms after the press
 * is inside it, and a knock just before the press is too.
 * A press 40 ms before the knock is stored.
 * A press 180 ms before the knock is not: after the wait the ring still ends
 * before that knock.
 * A second press while the wait is running is ignored. It does not push the timer.
 * If the open block flushes an auto-counted knock during the wait, the delayed
 * read is inside the 400 ms debounce and does not count a second knock.
 */

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

/** Shop noise plus one 20 ms knock. The knock starts on a 2048-sample boundary. */
function frameAlignedKnock(seed: number): { pcm: Float32Array; knockAt: number } {
  const knockAt = 20 * FRAME_SIZE;
  const n = knockAt + msToSamples(400);
  const pcm = new Float32Array(n);
  const rand = mulberry32(seed);
  for (let i = 0; i < n; i += 1) {
    pcm[i] = NOISE_RMS * (rand() * 2 - 1) * Math.sqrt(3);
  }
  const knockLen = Math.floor(0.02 * SAMPLE_RATE);
  const burst = new Float32Array(knockLen);
  let sumSq = 0;
  for (let i = 0; i < knockLen; i += 1) {
    const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (knockLen - 1)));
    burst[i] = Math.sin((2 * Math.PI * 160 * i) / SAMPLE_RATE) * hann;
    sumSq += burst[i] * burst[i];
  }
  const scale = NOISE_RMS / Math.sqrt(sumSq / knockLen);
  for (let i = 0; i < knockLen; i += 1) pcm[knockAt + i] += burst[i] * scale;
  return { pcm, knockAt };
}

/** Push only 2048-sample blocks that have ended by acoustic sample `now`. */
function deliverThrough(detector: KnockDetector, pcm: Float32Array, now: number, from = 0): number {
  let offset = Math.floor(from / FRAME_SIZE) * FRAME_SIZE;
  const end = Math.max(0, Math.floor(now / FRAME_SIZE) * FRAME_SIZE);
  while (offset + FRAME_SIZE <= end && offset + FRAME_SIZE <= pcm.length) {
    detector.pushFrame(pcm.subarray(offset, offset + FRAME_SIZE));
    offset += FRAME_SIZE;
  }
  return offset;
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

describe('grocery press waits for the capture buffer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores a knock pressed 40 ms later exactly once, after the block arrives', () => {
    expect(MANUAL_PRESS_SETTLE_MS).toBe(120);

    const { pcm, knockAt } = frameAlignedKnock(1);
    const pressAt = knockAt + msToSamples(40);

    const immediate = new KnockDetector(SAMPLE_RATE);
    deliverThrough(immediate, pcm, pressAt);
    expect(immediate.captureManualKnock()).toBe(false);
    expect(immediate.knockCount).toBe(0);
    expect(immediate.lastRejection).toBe('noisy');

    const { recorder, detector } = listeningRecorder();
    const knocks: number[] = [];
    const weaks: string[] = [];
    recorder.onKnockDetected = (count) => knocks.push(count);
    recorder.onWeakTap = (reason) => weaks.push(reason);

    deliverThrough(detector, pcm, pressAt);
    expect(recorder.captureManualKnock()).toBe(false);
    expect(recorder.manualPressPending).toBe(true);
    expect(detector.knockCount).toBe(0);
    expect(detector.lastRejection).toBeNull();

    vi.advanceTimersByTime(50);
    expect(recorder.captureManualKnock()).toBe(false);
    expect(recorder.manualPressPending).toBe(true);

    deliverThrough(detector, pcm, pressAt + msToSamples(MANUAL_PRESS_SETTLE_MS), pressAt);
    vi.advanceTimersByTime(69);
    expect(recorder.manualPressPending).toBe(true);
    expect(detector.knockCount).toBe(0);

    vi.advanceTimersByTime(1);
    expect(recorder.manualPressPending).toBe(false);
    expect(detector.knockCount).toBe(1);
    expect(detector.lastRejection).toBeNull();
    expect(knocks).toEqual([1]);
    expect(weaks).toEqual([]);

    vi.advanceTimersByTime(500);
    expect(detector.knockCount).toBe(1);
    expect(knocks).toEqual([1]);
  });

  it('stores a press 40 ms before the knock and skips a press 180 ms before it', () => {
    const early = listeningRecorder();
    const earlyKnocks: number[] = [];
    early.recorder.onKnockDetected = (count) => earlyKnocks.push(count);
    const earlyPcm = frameAlignedKnock(1);
    const earlyPress = earlyPcm.knockAt - msToSamples(40);
    deliverThrough(early.detector, earlyPcm.pcm, earlyPress);
    expect(early.recorder.captureManualKnock()).toBe(false);
    deliverThrough(
      early.detector,
      earlyPcm.pcm,
      earlyPress + msToSamples(MANUAL_PRESS_SETTLE_MS),
      earlyPress,
    );
    vi.advanceTimersByTime(MANUAL_PRESS_SETTLE_MS);
    expect(early.detector.knockCount).toBe(1);
    expect(earlyKnocks).toEqual([1]);
    expect(early.detector.lastRejection).toBeNull();

    const late = listeningRecorder();
    const lateKnocks: number[] = [];
    const lateWeaks: string[] = [];
    late.recorder.onKnockDetected = (count) => lateKnocks.push(count);
    late.recorder.onWeakTap = (reason) => lateWeaks.push(reason);
    const latePcm = frameAlignedKnock(1);
    const latePress = latePcm.knockAt - msToSamples(180);
    deliverThrough(late.detector, latePcm.pcm, latePress);
    expect(late.recorder.captureManualKnock()).toBe(false);
    deliverThrough(
      late.detector,
      latePcm.pcm,
      latePress + msToSamples(MANUAL_PRESS_SETTLE_MS),
      latePress,
    );
    vi.advanceTimersByTime(MANUAL_PRESS_SETTLE_MS);
    expect(late.detector.knockCount).toBe(0);
    expect(lateKnocks).toEqual([]);
    expect(lateWeaks).toEqual(['noisy']);
    expect(late.detector.lastRejection).toBe('noisy');
  });

  it('does not count the press again when the block flushes an auto knock during the wait', () => {
    const { recorder, detector } = listeningRecorder();
    const knocks: number[] = [];
    recorder.onKnockDetected = (count) => knocks.push(count);
    const silence = () => new Float32Array(FRAME_SIZE);
    for (let i = 0; i < WARMUP_FRAMES; i += 1) {
      expect(detector.pushFrame(silence())).toBe(false);
    }

    expect(recorder.captureManualKnock()).toBe(false);
    expect(recorder.manualPressPending).toBe(true);

    const spike = silence();
    for (let i = 0; i < HOP_SIZE; i += 1) spike[i] = 0.2;
    (recorder as unknown as RecorderInner).ingestFrame(spike);
    expect(detector.knockCount).toBe(1);
    expect(knocks).toEqual([1]);

    vi.advanceTimersByTime(MANUAL_PRESS_SETTLE_MS);
    expect(recorder.manualPressPending).toBe(false);
    expect(detector.knockCount).toBe(1);
    expect(detector.lastRejection).toBeNull();
    expect(knocks).toEqual([1]);
  });

  it('drops a pending press when the session stops', () => {
    const { recorder, detector } = listeningRecorder();
    const knocks: number[] = [];
    const weaks: string[] = [];
    recorder.onKnockDetected = (count) => knocks.push(count);
    recorder.onWeakTap = (reason) => weaks.push(reason);

    const { pcm, knockAt } = frameAlignedKnock(1);
    const pressAt = knockAt + msToSamples(40);
    deliverThrough(detector, pcm, pressAt);
    expect(recorder.captureManualKnock()).toBe(false);
    expect(recorder.manualPressPending).toBe(true);

    const features = recorder.stopAndAnalyze();
    expect(recorder.manualPressPending).toBe(false);
    deliverThrough(detector, pcm, pressAt + msToSamples(MANUAL_PRESS_SETTLE_MS), pressAt);
    vi.advanceTimersByTime(500);

    expect(features.knockCount).toBe(0);
    expect(detector.knockCount).toBe(0);
    expect(knocks).toEqual([]);
    expect(weaks).toEqual([]);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FRAME_SIZE,
  HOP_SIZE,
  KnockDetector,
  MANUAL_PRESS_SETTLE_MS,
  MANUAL_PRESS_WALL_CAP_MS,
  WARMUP_FRAMES,
} from './onset';
import { KnockRecorder } from './recorder';

const SAMPLE_RATE = 44100;
const NOISE_RMS = 0.03;

/**
 * The click is stamped on the sample clock. The read waits until that clock
 * is MANUAL_PRESS_SETTLE_MS (200) past the stamp, not until 200 ms of wall
 * time. A batch that is still held back leaves the press pending. Once the
 * batch brings the decay in, the press is stored. That span is what a knock
 * 93–139 ms past the stamp needs for its decay block. A press 180 ms before
 * the knock, with the stamp only a few milliseconds behind, still stores:
 * the knock sits about 186 ms after the stamp, inside the 200 ms of audio.
 * The loud-noise harness refuses that same 180 ms lead when the stamp lags
 * a full capture block. The wall cap (400 ms) reads whatever has arrived.
 * A second press while the wait is running is ignored. If the open block
 * flushes an auto-counted knock during the wait, debounce uses the earlier
 * stamp and does not count a second knock.
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
function frameAlignedKnock(seed: number, noiseRms = NOISE_RMS): { pcm: Float32Array; knockAt: number } {
  return placeKnock(seed, 20 * FRAME_SIZE, noiseRms);
}

/**
 * Shop noise plus one 20 ms knock starting `pastMs` after a frame-aligned stamp.
 * The stamp is where a grocery press is taken once only completed blocks
 * have been delivered.
 */
function knockAfterStamp(
  seed: number,
  pastMs: number,
  noiseRms = 0.2,
): { pcm: Float32Array; stamp: number; knockAt: number } {
  const stamp = 20 * FRAME_SIZE;
  const { pcm, knockAt } = placeKnock(seed, stamp + msToSamples(pastMs), noiseRms, stamp + msToSamples(500));
  return { pcm, stamp, knockAt };
}

function placeKnock(
  seed: number,
  knockAt: number,
  noiseRms: number,
  length = knockAt + msToSamples(500),
): { pcm: Float32Array; knockAt: number } {
  const pcm = new Float32Array(length);
  const rand = mulberry32(seed);
  for (let i = 0; i < pcm.length; i += 1) {
    pcm[i] = noiseRms * (rand() * 2 - 1) * Math.sqrt(3);
  }
  const knockLen = Math.floor(0.02 * SAMPLE_RATE);
  const burst = new Float32Array(knockLen);
  let sumSq = 0;
  for (let i = 0; i < knockLen; i += 1) {
    const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (knockLen - 1)));
    burst[i] = Math.sin((2 * Math.PI * 160 * i) / SAMPLE_RATE) * hann;
    sumSq += burst[i] * burst[i];
  }
  const scale = noiseRms / Math.sqrt(sumSq / knockLen);
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

/** Push 2048-sample blocks through the recorder until the audio clock reaches `ready`. */
function releaseUntilReady(
  recorder: KnockRecorder,
  detector: KnockDetector,
  pcm: Float32Array,
  from: number,
  ready: number,
): void {
  let offset = Math.floor(from / FRAME_SIZE) * FRAME_SIZE;
  const inner = recorder as unknown as RecorderInner;
  while (detector.clockSamples < ready && offset + FRAME_SIZE <= pcm.length) {
    inner.ingestFrame(pcm.subarray(offset, offset + FRAME_SIZE));
    offset += FRAME_SIZE;
  }
}

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
    expect(MANUAL_PRESS_SETTLE_MS).toBe(200);
    expect(MANUAL_PRESS_WALL_CAP_MS).toBe(400);

    const { pcm, knockAt } = frameAlignedKnock(1);
    const pressAt = knockAt + msToSamples(40);

    const immediate = new KnockDetector(SAMPLE_RATE);
    deliverThrough(immediate, pcm, pressAt);
    expect(immediate.captureManualKnock(immediate.clockSamples)).toBe(false);
    expect(immediate.knockCount).toBe(0);
    expect(immediate.lastRejection).toBe('noisy');

    const { recorder, detector } = listeningRecorder();
    const knocks: number[] = [];
    const weaks: string[] = [];
    recorder.onKnockDetected = (count) => knocks.push(count);
    recorder.onWeakTap = (reason) => weaks.push(reason);

    const offset = deliverThrough(detector, pcm, pressAt);
    const stamp = detector.clockSamples;
    recorder.captureManualKnock();
    expect(recorder.manualPressPending).toBe(true);
    expect(detector.knockCount).toBe(0);
    expect(detector.lastRejection).toBeNull();

    vi.advanceTimersByTime(50);
    recorder.captureManualKnock();
    expect(recorder.manualPressPending).toBe(true);

    // Wall time past the old 120 ms timer, but the later batch is still held.
    vi.advanceTimersByTime(MANUAL_PRESS_WALL_CAP_MS - 50 - 1);
    expect(recorder.manualPressPending).toBe(true);
    expect(detector.knockCount).toBe(0);
    expect(knocks).toEqual([]);

    releaseUntilReady(recorder, detector, pcm, offset, stamp + msToSamples(MANUAL_PRESS_SETTLE_MS));
    expect(recorder.manualPressPending).toBe(false);
    expect(detector.knockCount).toBe(1);
    expect(detector.lastRejection).toBeNull();
    expect(knocks).toEqual([1]);
    expect(weaks).toEqual([]);

    vi.advanceTimersByTime(MANUAL_PRESS_WALL_CAP_MS);
    expect(detector.knockCount).toBe(1);
    expect(knocks).toEqual([1]);
  });

  it('stores a press 40 ms before the knock, and a press 180 ms before it when the stamp barely lags', () => {
    const early = listeningRecorder();
    const earlyKnocks: number[] = [];
    early.recorder.onKnockDetected = (count) => earlyKnocks.push(count);
    const earlyPcm = frameAlignedKnock(1);
    const earlyPress = earlyPcm.knockAt - msToSamples(40);
    const earlyOffset = deliverThrough(early.detector, earlyPcm.pcm, earlyPress);
    const earlyStamp = early.detector.clockSamples;
    early.recorder.captureManualKnock();
    vi.advanceTimersByTime(MANUAL_PRESS_SETTLE_MS);
    expect(early.recorder.manualPressPending).toBe(true);
    expect(early.detector.knockCount).toBe(0);
    releaseUntilReady(
      early.recorder,
      early.detector,
      earlyPcm.pcm,
      earlyOffset,
      earlyStamp + msToSamples(MANUAL_PRESS_SETTLE_MS),
    );
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
    const lateOffset = deliverThrough(late.detector, latePcm.pcm, latePress);
    const lateStamp = late.detector.clockSamples;
    late.recorder.captureManualKnock();
    vi.advanceTimersByTime(MANUAL_PRESS_SETTLE_MS);
    expect(late.recorder.manualPressPending).toBe(true);
    releaseUntilReady(
      late.recorder,
      late.detector,
      latePcm.pcm,
      lateOffset,
      lateStamp + msToSamples(MANUAL_PRESS_SETTLE_MS),
    );
    // Stamp lag is only the remainder of the open block (~6 ms), so the knock
    // is ~186 ms after the stamp and its decay is inside the 200 ms wait.
    expect(late.recorder.manualPressPending).toBe(false);
    expect(late.detector.knockCount).toBe(1);
    expect(lateKnocks).toEqual([1]);
    expect(lateWeaks).toEqual([]);
    expect(late.detector.lastRejection).toBeNull();
  });

  it.each([50, 25])(
    'stores a press %s ms before the knock once the held batch brings the decay in',
    (leadMs) => {
      const { pcm, knockAt } = frameAlignedKnock(1, 0.2);
      const acousticPress = knockAt - msToSamples(leadMs);
      const { recorder, detector } = listeningRecorder();
      const knocks: number[] = [];
      recorder.onKnockDetected = (count) => knocks.push(count);

      // The open 2048-sample block has not been pushed, so the stamp lags it.
      const offset = deliverThrough(detector, pcm, acousticPress);
      const pressAtSample = detector.clockSamples;
      const lag = acousticPress - pressAtSample;
      expect(lag).toBeGreaterThan(0);
      expect(lag).toBeLessThanOrEqual(FRAME_SIZE);

      recorder.captureManualKnock();
      expect(detector.clockSamples).toBe(pressAtSample);
      expect(detector.knockCount).toBe(0);

      // The wall clock runs, but the batch that holds the decay does not.
      vi.advanceTimersByTime(MANUAL_PRESS_SETTLE_MS);
      expect(recorder.manualPressPending).toBe(true);
      expect(detector.knockCount).toBe(0);
      expect(knocks).toEqual([]);

      const ready = pressAtSample + msToSamples(MANUAL_PRESS_SETTLE_MS);
      let cursor = Math.floor(offset / FRAME_SIZE) * FRAME_SIZE;
      const inner = recorder as unknown as RecorderInner;
      while (detector.clockSamples < ready) {
        expect(recorder.manualPressPending).toBe(true);
        expect(detector.knockCount).toBe(0);
        expect(cursor + FRAME_SIZE).toBeLessThanOrEqual(pcm.length);
        inner.ingestFrame(pcm.subarray(cursor, cursor + FRAME_SIZE));
        cursor += FRAME_SIZE;
      }

      expect(recorder.manualPressPending).toBe(false);
      expect(detector.knockCount).toBe(1);
      expect(detector.lastRejection).toBeNull();
      expect(knocks).toEqual([1]);

      vi.advanceTimersByTime(MANUAL_PRESS_WALL_CAP_MS);
      expect(detector.knockCount).toBe(1);
      expect(knocks).toEqual([1]);
    },
  );

  it.each([93, 115, 139])(
    'stores a knock %s ms past the stamp once the held batch brings the decay in',
    (pastMs) => {
      // Seed 1 puts the 115 ms knock over the live spike check and splits the
      // 139 ms knock across two shape blocks. Seed 2 keeps both on the manual
      // path: no auto count, and the shape check is what stores them.
      const { pcm, stamp, knockAt } = knockAfterStamp(2, pastMs);
      const { recorder, detector } = listeningRecorder();
      const knocks: number[] = [];
      recorder.onKnockDetected = (count) => knocks.push(count);

      const offset = deliverThrough(detector, pcm, stamp);
      expect(detector.clockSamples).toBe(stamp);
      expect(knockAt - stamp).toBe(msToSamples(pastMs));

      recorder.captureManualKnock();
      expect(recorder.manualPressPending).toBe(true);
      expect(detector.knockCount).toBe(0);

      // Wall time alone does not read. The decay is still in the held batch.
      vi.advanceTimersByTime(MANUAL_PRESS_SETTLE_MS);
      expect(recorder.manualPressPending).toBe(true);
      expect(detector.knockCount).toBe(0);
      expect(knocks).toEqual([]);

      const ready = stamp + msToSamples(MANUAL_PRESS_SETTLE_MS);
      let cursor = offset;
      const inner = recorder as unknown as RecorderInner;
      while (detector.clockSamples < ready) {
        expect(recorder.manualPressPending).toBe(true);
        expect(detector.knockCount).toBe(0);
        expect(cursor + FRAME_SIZE).toBeLessThanOrEqual(pcm.length);
        inner.ingestFrame(pcm.subarray(cursor, cursor + FRAME_SIZE));
        cursor += FRAME_SIZE;
      }

      expect(recorder.manualPressPending).toBe(false);
      expect(detector.knockCount).toBe(1);
      expect(detector.lastRejection).toBeNull();
      expect(knocks).toEqual([1]);

      vi.advanceTimersByTime(MANUAL_PRESS_WALL_CAP_MS);
      expect(detector.knockCount).toBe(1);
      expect(knocks).toEqual([1]);
    },
  );

  it('does not count the press again when the block flushes an auto knock during the wait', () => {
    const { recorder, detector } = listeningRecorder();
    const knocks: number[] = [];
    recorder.onKnockDetected = (count) => knocks.push(count);
    const silence = () => new Float32Array(FRAME_SIZE);
    for (let i = 0; i < WARMUP_FRAMES; i += 1) {
      expect(detector.pushFrame(silence())).toBe(false);
    }

    recorder.captureManualKnock();
    expect(recorder.manualPressPending).toBe(true);

    const spike = silence();
    for (let i = 0; i < HOP_SIZE; i += 1) spike[i] = 0.2;
    (recorder as unknown as RecorderInner).ingestFrame(spike);
    expect(detector.knockCount).toBe(1);
    expect(knocks).toEqual([1]);

    vi.advanceTimersByTime(MANUAL_PRESS_WALL_CAP_MS);
    expect(recorder.manualPressPending).toBe(false);
    expect(detector.knockCount).toBe(1);
    expect(detector.lastRejection).toBeNull();
    expect(knocks).toEqual([1]);
  });

  it.each([40, 150, 200, 250])(
    'stores a press %s ms after the knock once the held capture blocks arrive',
    (offsetMs) => {
      const { pcm, knockAt } = frameAlignedKnock(1, 0.2);
      const pressAt = knockAt + msToSamples(offsetMs);
      const { recorder, detector } = listeningRecorder();
      const knocks: number[] = [];
      recorder.onKnockDetected = (count) => knocks.push(count);
      // The open 2048-sample block, plus one completed block the graph still holds.
      const held = FRAME_SIZE;
      let offset = 0;
      const pump = (acoustic: number) => {
        const end = Math.max(0, Math.floor(acoustic / FRAME_SIZE) * FRAME_SIZE - held);
        while (offset + FRAME_SIZE <= end && offset + FRAME_SIZE <= pcm.length) {
          detector.pushFrame(pcm.subarray(offset, offset + FRAME_SIZE));
          offset += FRAME_SIZE;
        }
      };

      pump(pressAt);
      expect(detector.knockCount).toBe(0);
      recorder.captureManualKnock();
      pump(pressAt + msToSamples(MANUAL_PRESS_SETTLE_MS));
      vi.advanceTimersByTime(MANUAL_PRESS_WALL_CAP_MS);

      expect(detector.knockCount).toBe(1);
      expect(knocks).toEqual([1]);
      expect(detector.lastRejection).toBeNull();
    },
  );

  it('asks for another tap and does not score when audio stays stalled through the wall cap', () => {
    const { recorder, detector } = listeningRecorder();
    const knocks: number[] = [];
    const weaks: string[] = [];
    recorder.onKnockDetected = (count) => knocks.push(count);
    recorder.onWeakTap = (reason) => weaks.push(reason);

    const pcm = new Float32Array(12 * FRAME_SIZE);
    const rand = mulberry32(1);
    for (let i = 0; i < pcm.length; i += 1) {
      pcm[i] = 0.03 * (rand() * 2 - 1) * Math.sqrt(3);
    }
    deliverThrough(detector, pcm, 8 * FRAME_SIZE);
    recorder.captureManualKnock();
    expect(recorder.manualPressPending).toBe(true);
    expect(detector.knockCount).toBe(0);

    vi.advanceTimersByTime(MANUAL_PRESS_WALL_CAP_MS - 1);
    expect(recorder.manualPressPending).toBe(true);
    expect(weaks).toEqual([]);
    expect(knocks).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(recorder.manualPressPending).toBe(false);
    expect(detector.knockCount).toBe(0);
    expect(detector.lastRejection).toBe('noisy');
    expect(weaks).toEqual(['noisy']);
    expect(knocks).toEqual([]);
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
    recorder.captureManualKnock();
    expect(recorder.manualPressPending).toBe(true);

    const features = recorder.stopAndAnalyze();
    expect(recorder.manualPressPending).toBe(false);
    deliverThrough(detector, pcm, pressAt + msToSamples(MANUAL_PRESS_SETTLE_MS), pressAt);
    vi.advanceTimersByTime(MANUAL_PRESS_WALL_CAP_MS);

    expect(features.knockCount).toBe(0);
    expect(detector.knockCount).toBe(0);
    expect(knocks).toEqual([]);
    expect(weaks).toEqual([]);
  });
});

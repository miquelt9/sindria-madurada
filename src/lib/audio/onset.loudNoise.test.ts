import { describe, expect, it } from 'vitest';
import { FRAME_SIZE, KnockDetector } from './onset';

const SAMPLE_RATE = 44100;
const NOISE_RMS = 0.03;
const KNOCK_RMS = 0.03;
const PRESS_AFTER_S = 0.15;
const KNOCK_TIMES_S = [0.55, 1.35, 2.15];
const DURATION_S = 3.2;

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

/** Steady shop noise plus three grocery knocks. Same signal main scores 8/8. */
function shopPcm(seed: number): { pcm: Float32Array; presses: number[] } {
  const n = Math.floor(DURATION_S * SAMPLE_RATE);
  const pcm = new Float32Array(n);
  const rand = mulberry32(seed);
  for (let i = 0; i < n; i += 1) {
    pcm[i] = NOISE_RMS * (rand() * 2 - 1) * Math.sqrt(3);
  }
  const knockLen = Math.floor(0.02 * SAMPLE_RATE);
  for (const t0 of KNOCK_TIMES_S) {
    const start = Math.floor(t0 * SAMPLE_RATE);
    const burst = new Float32Array(knockLen);
    let sumSq = 0;
    for (let i = 0; i < knockLen; i += 1) {
      const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (knockLen - 1)));
      burst[i] = Math.sin((2 * Math.PI * 160 * i) / SAMPLE_RATE) * hann;
      sumSq += burst[i] * burst[i];
    }
    const scale = KNOCK_RMS / Math.sqrt(sumSq / knockLen);
    for (let i = 0; i < knockLen; i += 1) pcm[start + i] += burst[i] * scale;
  }
  return {
    pcm,
    presses: KNOCK_TIMES_S.map((t) => Math.floor((t + PRESS_AFTER_S) * SAMPLE_RATE)),
  };
}

/**
 * Contiguous frames, as ScriptProcessor delivers them. A lastRejection aborts
 * the session the way KnockRecorder does. A grocery press follows each knock
 * by 150 ms.
 */
function shopRun(seed: number): { ok: boolean; knockCount: number; aborted: boolean } {
  const { pcm, presses } = shopPcm(seed);
  const detector = new KnockDetector(SAMPLE_RATE);
  let pi = 0;
  let aborted = false;
  for (let offset = 0; offset + FRAME_SIZE <= pcm.length; offset += FRAME_SIZE) {
    detector.pushFrame(pcm.subarray(offset, offset + FRAME_SIZE));
    if (detector.lastRejection) {
      aborted = true;
      break;
    }
    const end = offset + FRAME_SIZE;
    while (pi < presses.length && presses[pi] < end) {
      detector.captureManualKnock();
      if (detector.lastRejection) {
        aborted = true;
        break;
      }
      pi += 1;
    }
    if (aborted || detector.knockCount >= 3) break;
  }
  return {
    ok: !aborted && detector.knockCount >= 3,
    knockCount: detector.knockCount,
    aborted,
  };
}

describe('loud shop knocks', () => {
  it('reaches a result on all 8 steady-noise knock-and-press runs', () => {
    const runs = Array.from({ length: 8 }, (_, i) => shopRun(i + 1));
    expect(runs.map((run) => run.ok)).toEqual([true, true, true, true, true, true, true, true]);
    expect(runs.every((run) => run.knockCount === 3 && !run.aborted)).toBe(true);
  });
});

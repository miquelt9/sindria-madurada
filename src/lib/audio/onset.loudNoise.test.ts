import { describe, expect, it } from 'vitest';
import { FRAME_SIZE, KnockDetector, MANUAL_PRESS_SETTLE_MS } from './onset';

const SAMPLE_RATE = 44100;
const NOISE_RMS = 0.03;
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

/** Steady shop noise plus three grocery knocks. Pass 0 to leave the knocks out. */
function shopPcm(
  seed: number,
  knockRms: number,
  noiseRms = NOISE_RMS,
  pressAfterS = PRESS_AFTER_S,
): { pcm: Float32Array; presses: number[] } {
  const n = Math.floor(DURATION_S * SAMPLE_RATE);
  const pcm = new Float32Array(n);
  const rand = mulberry32(seed);
  for (let i = 0; i < n; i += 1) {
    pcm[i] = noiseRms * (rand() * 2 - 1) * Math.sqrt(3);
  }
  if (knockRms <= 0) {
    return {
      pcm,
      presses: KNOCK_TIMES_S.map((t) => Math.floor((t + pressAfterS) * SAMPLE_RATE)),
    };
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
    const scale = knockRms / Math.sqrt(sumSq / knockLen);
    for (let i = 0; i < knockLen; i += 1) pcm[start + i] += burst[i] * scale;
  }
  return {
    pcm,
    presses: KNOCK_TIMES_S.map((t) => Math.floor((t + pressAfterS) * SAMPLE_RATE)),
  };
}

/**
 * Pushes each full frame as soon as the loop reaches it, including samples
 * after the press in that frame. A lastRejection aborts the session the way
 * KnockRecorder does. A grocery press follows each knock by 150 ms.
 */
function shopRun(
  seed: number,
  knockRms: number,
  noiseRms = NOISE_RMS,
): { ok: boolean; knockCount: number; aborted: boolean } {
  const { pcm, presses } = shopPcm(seed, knockRms, noiseRms);
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

/**
 * ScriptProcessor publishes 2048-sample blocks. At acoustic time t, only blocks
 * that have ended are in the ring. `heldBlocks` completed blocks stay held as
 * well: the browser graph often keeps more than the one open block, which is
 * the latency a 120 ms settle is there to absorb.
 * The press is stamped on the sample clock at the click, then the read runs
 * after settleMs. Each stored press must add exactly one knock.
 */
function shopRunBuffered(
  seed: number,
  knockRms: number,
  pressAfterS: number,
  settleMs: number,
  noiseRms = NOISE_RMS,
  heldBlocks = 0,
): { ok: boolean; knockCount: number; aborted: boolean; singles: boolean } {
  const { pcm, presses } = shopPcm(seed, knockRms, noiseRms, pressAfterS);
  const settleSamples = Math.round((settleMs / 1000) * SAMPLE_RATE);
  const hold = heldBlocks * FRAME_SIZE;
  const detector = new KnockDetector(SAMPLE_RATE);
  let offset = 0;
  let aborted = false;
  let singles = true;
  const deliveredAt = (acoustic: number) =>
    Math.max(0, Math.floor(acoustic / FRAME_SIZE) * FRAME_SIZE - hold);

  for (const press of presses) {
    const atPress = deliveredAt(press);
    while (offset + FRAME_SIZE <= atPress && offset + FRAME_SIZE <= pcm.length) {
      detector.pushFrame(pcm.subarray(offset, offset + FRAME_SIZE));
      offset += FRAME_SIZE;
      if (detector.lastRejection) {
        aborted = true;
        break;
      }
    }
    if (aborted) break;
    const pressAtSample = detector.clockSamples;
    const atRead = deliveredAt(press + settleSamples);
    while (offset + FRAME_SIZE <= atRead && offset + FRAME_SIZE <= pcm.length) {
      detector.pushFrame(pcm.subarray(offset, offset + FRAME_SIZE));
      offset += FRAME_SIZE;
      if (detector.lastRejection) {
        aborted = true;
        break;
      }
    }
    if (aborted) break;
    const before = detector.knockCount;
    detector.captureManualKnock(pressAtSample);
    if (detector.knockCount !== before + 1) singles = false;
    if (detector.lastRejection) {
      aborted = true;
      break;
    }
    if (detector.knockCount >= 3) break;
  }
  return {
    ok: !aborted && detector.knockCount >= 3 && singles,
    knockCount: detector.knockCount,
    aborted,
    singles,
  };
}

describe('loud shop knocks', () => {
  it('reaches a result on all 8 steady-noise knock-and-press runs', () => {
    const runs = Array.from({ length: 8 }, (_, i) => shopRun(i + 1, 0.03));
    expect(runs.map((run) => run.ok)).toEqual([true, true, true, true, true, true, true, true]);
    expect(runs.every((run) => run.knockCount === 3 && !run.aborted)).toBe(true);
  });

  it('stores nothing when the same presses contain no knock', () => {
    const runs = Array.from({ length: 8 }, (_, i) => shopRun(i + 1, 0));
    expect(runs.every((run) => run.knockCount === 0 && !run.ok)).toBe(true);
  });

  it('still stores nothing when that steady noise is louder', () => {
    const runs = Array.from({ length: 8 }, (_, i) => shopRun(i + 1, 0, 0.15));
    expect(runs.every((run) => run.knockCount === 0 && !run.ok)).toBe(true);
  });

  it('stores nothing when a 40 ms press reads before the 2048-sample block arrives', () => {
    const runs = Array.from({ length: 8 }, (_, i) => shopRunBuffered(i + 1, 0.03, 0.04, 0));
    expect(runs.every((run) => run.knockCount === 0 && !run.ok)).toBe(true);
  });

  it('stores three knocks when that 40 ms press waits for the capture block', () => {
    const runs = Array.from({ length: 8 }, (_, i) =>
      shopRunBuffered(i + 1, 0.03, 0.04, MANUAL_PRESS_SETTLE_MS),
    );
    expect(runs.map((run) => run.ok)).toEqual([true, true, true, true, true, true, true, true]);
    expect(runs.every((run) => run.knockCount === 3 && !run.aborted)).toBe(true);
  });

  it('still stores nothing for no-knock noise when the read waits for the block', () => {
    const quiet = Array.from({ length: 8 }, (_, i) => shopRunBuffered(i + 1, 0, 0.04, MANUAL_PRESS_SETTLE_MS));
    const loud = Array.from({ length: 8 }, (_, i) =>
      shopRunBuffered(i + 1, 0, 0.04, MANUAL_PRESS_SETTLE_MS, 0.15),
    );
    expect(quiet.every((run) => run.knockCount === 0 && !run.ok)).toBe(true);
    expect(loud.every((run) => run.knockCount === 0 && !run.ok)).toBe(true);
  });

  // One held block plus the open block (~93 ms). A single open block lags the
  // stamp by only ~46 ms, which leaves a knock 250 ms before the acoustic press
  // just outside the 200 ms lookback. The extra held block is the latency that
  // still reached a result on ae7ebdf5 at these offsets.
  it.each([40, 150, 200, 250])(
    'stores each knock once when the press is %s ms later in 0.2 RMS noise',
    (offsetMs) => {
      const runs = Array.from({ length: 8 }, (_, i) =>
        shopRunBuffered(i + 1, 0.2, offsetMs / 1000, MANUAL_PRESS_SETTLE_MS, 0.2, 1),
      );
      expect(runs.map((run) => run.ok)).toEqual([true, true, true, true, true, true, true, true]);
      expect(runs.every((run) => run.knockCount === 3 && run.singles && !run.aborted)).toBe(true);
    },
  );

  it('stores nothing for no-knock noise at 0.2 RMS when the read waits', () => {
    const runs = Array.from({ length: 8 }, (_, i) =>
      shopRunBuffered(i + 1, 0, 0.15, MANUAL_PRESS_SETTLE_MS, 0.2, 1),
    );
    expect(runs.every((run) => run.knockCount === 0 && !run.ok)).toBe(true);
  });
});

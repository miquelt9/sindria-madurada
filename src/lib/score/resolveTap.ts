import { applyHann, fftMagnitudes } from '../audio/fft';
import { aggregateKnockFeatures } from '../audio/features';
import { classifyTapPcm, WeakTapReason } from '../audio/onset';
import { AudioFeatures, FusionInputs, RipenessResult, VisualFeatures } from '../types';
import { fuseRipenessSignals } from './fusion';

/** A failed tap. There is no score, verdict, or hollow warning on this object. */
export interface TapRetry {
  kind: 'retry';
  reason: WeakTapReason;
}

export interface TapResult {
  kind: 'result';
  result: RipenessResult;
}

export type TapResolution = TapRetry | TapResult;

/**
 * One tap. A low peak or a noisy window retries and does not change a result.
 * A tap that passes is scored with the existing fusion, weights unchanged.
 */
export function resolveOneTap(
  visual: VisualFeatures,
  pcm: Float32Array,
  sampleRate: number,
  inputs: FusionInputs = {},
  noiseFloor = 0.005,
): TapResolution {
  const quality = classifyTapPcm(pcm, noiseFloor);
  if (!quality.ok) {
    return { kind: 'retry', reason: quality.reason };
  }

  const features: AudioFeatures = aggregateKnockFeatures(
    [fftMagnitudes(applyHann(pcm))],
    sampleRate,
  );
  return { kind: 'result', result: fuseRipenessSignals(visual, features, inputs) };
}

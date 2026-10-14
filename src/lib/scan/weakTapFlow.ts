/** From the third weak tap on, the calmer line and the restart action appear. */
export const WEAK_TAP_CALM_FROM = 3;

export type WeakTapTone = 'firm' | 'calm';

export function weakTapTone(count: number): WeakTapTone {
  return count >= WEAK_TAP_CALM_FROM ? 'calm' : 'firm';
}

export interface WeakTapState {
  step: string;
  knockPhase: 'capture' | 'retry';
  weakTapCount: number;
  knockSession: number;
  croppedPhotoUrl: string | null;
  bellyPhotoUrl?: string | null;
  variety?: string;
  size?: string;
  visualFeatures: unknown;
  framing?: unknown;
  currentResult: unknown;
  currentScanId: string | null;
}

/** A weak tap asks for another try. It does not store a result. There is no cap. */
export function recordWeakTap<T extends WeakTapState>(state: T): T {
  return {
    ...state,
    step: 'knock',
    knockPhase: 'retry',
    weakTapCount: state.weakTapCount + 1,
    currentResult: null,
    currentScanId: null,
  };
}

/** Back to knock capture. The photo and earlier steps stay. The mic session is new. */
export function retryKnockCapture<T extends WeakTapState>(state: T): T {
  return {
    ...state,
    step: 'knock',
    knockPhase: 'capture',
    knockSession: state.knockSession + 1,
    currentResult: null,
    currentScanId: null,
  };
}

/** A good tap clears the weak-tap counter. */
export function noteGoodTap<T extends WeakTapState>(state: T): T {
  if (state.weakTapCount === 0) return state;
  return { ...state, weakTapCount: 0 };
}

/** Start over. The capture is discarded and the counter is cleared. */
export function restartScan<T extends WeakTapState>(state: T): T {
  return {
    ...state,
    step: 'home',
    knockPhase: 'capture',
    weakTapCount: 0,
    knockSession: 0,
    croppedPhotoUrl: null,
    bellyPhotoUrl: null,
    variety: 'striped',
    size: 'medium',
    visualFeatures: null,
    framing: null,
    currentResult: null,
    currentScanId: null,
  };
}

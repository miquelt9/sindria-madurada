import { describe, expect, it } from 'vitest';
import {
  noteGoodTap,
  recordWeakTap,
  restartScan,
  retryKnockCapture,
  weakTapTone,
  WeakTapState,
} from './weakTapFlow';

function draft(overrides: Partial<WeakTapState> = {}): WeakTapState {
  return {
    step: 'knock',
    knockPhase: 'capture',
    weakTapCount: 0,
    knockSession: 0,
    croppedPhotoUrl: 'data:image/jpeg;base64,CROP',
    bellyPhotoUrl: 'data:image/jpeg;base64,BELLY',
    variety: 'solid',
    size: 'large',
    visualFeatures: { notes: ['kept'] },
    framing: { rindImage: 'data:image/jpeg;base64,RIND' },
    currentResult: null,
    currentScanId: null,
    ...overrides,
  };
}

describe('weak tap counter', () => {
  it('uses the firm line for tries 1 and 2, then the calm line with no cap', () => {
    expect(weakTapTone(1)).toBe('firm');
    expect(weakTapTone(2)).toBe('firm');
    expect(weakTapTone(3)).toBe('calm');
    expect(weakTapTone(4)).toBe('calm');

    let state = draft();
    for (let i = 0; i < 12; i += 1) state = recordWeakTap(state);
    expect(state.weakTapCount).toBe(12);
    expect(weakTapTone(state.weakTapCount)).toBe('calm');
    expect(state.currentResult).toBeNull();
    expect(state.croppedPhotoUrl).toBe('data:image/jpeg;base64,CROP');
  });

  it('resets on a good tap or a restart', () => {
    const failed = recordWeakTap(recordWeakTap(draft()));
    expect(failed.weakTapCount).toBe(2);

    const good = noteGoodTap(failed);
    expect(good.weakTapCount).toBe(0);
    expect(recordWeakTap(good).weakTapCount).toBe(1);

    const restarted = restartScan(recordWeakTap(recordWeakTap(recordWeakTap(draft()))));
    expect(restarted.step).toBe('home');
    expect(restarted.weakTapCount).toBe(0);
    expect(restarted.knockSession).toBe(0);
    expect(restarted.knockPhase).toBe('capture');
    expect(restarted.croppedPhotoUrl).toBeNull();
    expect(restarted.visualFeatures).toBeNull();
    expect(restarted.currentResult).toBeNull();
    expect(restarted.currentScanId).toBeNull();
  });

  it('retry keeps the photo and opens a fresh knock session', () => {
    const visual = { notes: ['kept'] };
    const state = draft({ visualFeatures: visual, knockSession: 2, weakTapCount: 3 });
    const next = retryKnockCapture(recordWeakTap(state));
    expect(next.step).toBe('knock');
    expect(next.knockPhase).toBe('capture');
    expect(next.knockSession).toBe(3);
    expect(next.weakTapCount).toBe(4);
    expect(next.croppedPhotoUrl).toBe(state.croppedPhotoUrl);
    expect(next.bellyPhotoUrl).toBe(state.bellyPhotoUrl);
    expect(next.visualFeatures).toBe(visual);
    expect(next.framing).toBe(state.framing);
    expect(next.currentResult).toBeNull();
  });
});

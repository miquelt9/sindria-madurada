import { describe, expect, it } from 'vitest';
import { backFromKnock } from './backFromKnock';

describe('backFromKnock', () => {
  it('returns to photo and keeps the scan draft', () => {
    const visualFeatures = {
      stripeContrastScore: 0.4,
      groundSpotScore: 0.8,
      dullnessScore: 0.5,
      groundSpotDetected: true,
      notes: ['kept'],
    };
    const framing = {
      rindImage: 'data:image/jpeg;base64,RIND',
      bellyImage: 'data:image/jpeg;base64,BELLY',
      cropBox: { x: 0.1, y: 0.2, size: 0.5 },
      groundSpotPoint: { x: 0.4, y: 0.7 },
      variety: 'solid' as const,
      size: 'large' as const,
    };
    const state = {
      step: 'knock' as const,
      croppedPhotoUrl: 'data:image/jpeg;base64,CROP',
      bellyPhotoUrl: 'data:image/jpeg;base64,BELLY',
      variety: 'solid' as const,
      size: 'large' as const,
      visualFeatures,
      framing,
      currentResult: null,
      currentScanId: null,
    };

    const next = backFromKnock(state);

    expect(next.step).toBe('photo');
    expect(next).not.toBe(state);
    expect(next.croppedPhotoUrl).toBe(state.croppedPhotoUrl);
    expect(next.bellyPhotoUrl).toBe(state.bellyPhotoUrl);
    expect(next.variety).toBe('solid');
    expect(next.size).toBe('large');
    expect(next.visualFeatures).toBe(visualFeatures);
    expect(next.framing).toBe(framing);
    expect(next.currentResult).toBeNull();
    expect(next.currentScanId).toBeNull();
  });

  it('does not leave result, home, or history', () => {
    const result = { step: 'result' as const, visualFeatures: { notes: ['done'] } };
    const home = { step: 'home' as const, croppedPhotoUrl: null };
    const history = { step: 'history' as const, croppedPhotoUrl: 'data:image/jpeg;base64,X' };

    expect(backFromKnock(result)).toBe(result);
    expect(backFromKnock(home)).toBe(home);
    expect(backFromKnock(history)).toBe(history);
  });
});

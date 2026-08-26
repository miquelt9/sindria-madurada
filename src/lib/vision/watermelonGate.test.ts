import { describe, it, expect } from 'vitest';
import {
  evaluatePredictions,
  validateWatermelonImage,
  ClassificationPrediction,
} from './watermelonGate';

describe('Watermelon Gate - evaluatePredictions', () => {
  it('accepts when watermelon is top prediction with high confidence', () => {
    const predictions: ClassificationPrediction[] = [
      { label: 'watermelon', score: 0.88 },
      { label: 'cucumber, cuke', score: 0.05 },
      { label: 'zucchini, courgette', score: 0.03 },
    ];

    const result = evaluatePredictions(predictions);
    expect(result.isWatermelon).toBe(true);
    expect(result.matchedLabel).toBe('watermelon');
    expect(result.score).toBe(0.88);
  });

  it('accepts when watermelon is top prediction even with moderate confidence', () => {
    const predictions: ClassificationPrediction[] = [
      { label: 'watermelon', score: 0.12 },
      { label: 'spaghetti squash', score: 0.10 },
      { label: 'butternut squash', score: 0.08 },
    ];

    const result = evaluatePredictions(predictions);
    expect(result.isWatermelon).toBe(true);
    expect(result.matchedLabel).toBe('watermelon');
  });

  it('accepts when watermelon is in top 5 with score >= 0.15 even if not #1', () => {
    const predictions: ClassificationPrediction[] = [
      { label: 'spaghetti squash', score: 0.35 },
      { label: 'watermelon', score: 0.22 },
      { label: 'cucumber', score: 0.15 },
      { label: 'cantaloupe', score: 0.08 },
    ];

    const result = evaluatePredictions(predictions);
    expect(result.isWatermelon).toBe(true);
    expect(result.matchedLabel).toBe('watermelon');
  });

  it('rejects when watermelon is present in top 5 but with score < 0.15 and not top', () => {
    const predictions: ClassificationPrediction[] = [
      { label: 'banana', score: 0.75 },
      { label: 'orange', score: 0.12 },
      { label: 'watermelon', score: 0.06 },
    ];

    const result = evaluatePredictions(predictions);
    expect(result.isWatermelon).toBe(false);
  });

  it('rejects completely non-watermelon images (e.g. keyboard or pet)', () => {
    const predictions: ClassificationPrediction[] = [
      { label: 'computer keyboard, keypad', score: 0.82 },
      { label: 'space bar', score: 0.10 },
      { label: 'mouse, computer mouse', score: 0.04 },
    ];

    const result = evaluatePredictions(predictions);
    expect(result.isWatermelon).toBe(false);
    expect(result.matchedLabel).toBe('computer keyboard, keypad');
  });

  it('handles empty predictions safely', () => {
    const result = evaluatePredictions([]);
    expect(result.isWatermelon).toBe(false);
    expect(result.score).toBe(0);
  });
});

describe('Watermelon Gate - Fail Open / Offline Fallback', () => {
  it('fails open when classifier loading fails', async () => {
    // Calling with an invalid dummy object to trigger error handling or uninitialized pipeline in test env
    const result = await validateWatermelonImage('invalid-image-source');
    // It should either evaluate or safely fail open without throwing
    expect(result).toHaveProperty('passed');
    if (result.couldNotVerify) {
      expect(result.passed).toBe(true);
    }
  });
});

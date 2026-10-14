import { describe, it, expect, vi } from 'vitest';
import {
  evaluatePredictions,
  validateWatermelonImage,
  ClassificationPrediction,
} from './watermelonGate';

vi.mock('@huggingface/transformers', () => ({
  pipeline: () => Promise.reject(new Error('classifier unavailable')),
  env: {},
}));

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

  it('treats a missing list as an empty list', () => {
    const result = evaluatePredictions(undefined as unknown as ClassificationPrediction[]);
    expect(result).toEqual({ isWatermelon: false, score: 0 });
  });

  it('accepts the minimum score exactly and rejects the value just below it', () => {
    const atMinimum = evaluatePredictions([
      { label: 'banana', score: 0.4 },
      { label: 'watermelon', score: 0.15 },
    ]);
    expect(atMinimum.isWatermelon).toBe(true);
    expect(atMinimum.score).toBe(0.15);

    const below = evaluatePredictions([
      { label: 'banana', score: 0.4 },
      { label: 'watermelon', score: 0.149 },
    ]);
    expect(below.isWatermelon).toBe(false);
    expect(below.matchedLabel).toBe('banana');
    expect(below.score).toBe(0.4);
  });

  it('honours a caller-supplied minimum score', () => {
    const predictions: ClassificationPrediction[] = [
      { label: 'squash', score: 0.6 },
      { label: 'watermelon', score: 0.2 },
    ];
    expect(evaluatePredictions(predictions, 0.5).isWatermelon).toBe(false);
    expect(evaluatePredictions(predictions, 0.2).isWatermelon).toBe(true);
  });

  it('matches watermelon case-insensitively, including the ImageNet binomial', () => {
    expect(evaluatePredictions([{ label: 'WATERMELON', score: 0 }])).toMatchObject({
      isWatermelon: true,
      matchedLabel: 'WATERMELON',
      score: 0,
    });
    expect(
      evaluatePredictions([{ label: 'watermelon, Citrullus vulgaris', score: 0.01 }]).isWatermelon,
    ).toBe(true);
  });

  it('uses the first watermelon label when the list repeats it', () => {
    const result = evaluatePredictions([
      { label: 'banana', score: 0.5 },
      { label: 'watermelon', score: 0.01 },
      { label: 'watermelon', score: 0.9 },
    ]);
    expect(result.isWatermelon).toBe(false);
    expect(result.matchedLabel).toBe('banana');
    expect(result.score).toBe(0.5);
  });

  it('does not throw on blank labels', () => {
    const result = evaluatePredictions([
      { label: '', score: 0.8 },
      { label: '   ', score: 0.1 },
    ]);
    expect(result.isWatermelon).toBe(false);
    expect(result.matchedLabel).toBe('');
    expect(result.score).toBe(0.8);
  });
});

describe('Watermelon Gate - Fail Open / Offline Fallback', () => {
  it('fails open when classifier loading fails', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      const result = await validateWatermelonImage('invalid-image-source');
      expect(result).toEqual({
        passed: true,
        confidence: 50,
        couldNotVerify: true,
        error: 'classifier unavailable',
      });
      const contactedHub = fetchSpy.mock.calls.some((call) => String(call[0]).includes('huggingface.co'));
      expect(contactedHub).toBe(false);
    } finally {
      fetchSpy.mockRestore();
    }
  });
});

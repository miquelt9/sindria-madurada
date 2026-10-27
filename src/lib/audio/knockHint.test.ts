import { describe, expect, it } from 'vitest';
import {
  knockHint,
  knocksDisagree,
  resolveKnockDisagreement,
  type KnockHintInput,
} from './knockHint';
import type { MelonSize } from '../types';

function reading(peakHz: number, size?: MelonSize, clarity: KnockHintInput['peakClarity'] = 'clear') {
  return knockHint({ peakFrequencyHz: peakHz, peakClarity: clarity, knockCount: 1 }, size);
}

describe('knockHint', () => {
  it('T1 uses inclusive medium edges', () => {
    expect(reading(114, 'medium').hint).toBe('unclear');
    expect(reading(115, 'medium').hint).toBe('dull');
    expect(reading(230, 'medium').hint).toBe('dull');
    expect(reading(231, 'medium').hint).toBe('unclear');
    expect(reading(300, 'medium').hint).toBe('unclear');
    expect(reading(301, 'medium').hint).toBe('tight');
    expect(reading(160).hint).toBe('dull');
    expect(reading(160, 'large').hint).toBe('dull');
    expect(reading(115, 'medium').score).toBe(0.8);
    expect(reading(260, 'medium').score).toBe(0.5);
    expect(reading(350, 'medium').score).toBe(0.25);
  });

  it('T2 scales the edges by 1.15 for a small melon', () => {
    expect(reading(131, 'small').hint).toBe('unclear');
    expect(reading(132, 'small').hint).toBe('dull');
    expect(reading(265, 'small').hint).toBe('dull');
    expect(reading(266, 'small').hint).toBe('unclear');
    expect(reading(345, 'small').hint).toBe('unclear');
    expect(reading(346, 'small').hint).toBe('tight');
  });

  it('T3 does not shift a large melon down, and a low peak is never dull', () => {
    expect(reading(230, 'large').hint).toBe('dull');
    expect(reading(100, 'large').hint).toBe('unclear');
    expect(reading(100, 'large').score).toBe(0.5);
    expect(reading(100, 'medium').hint).toBe('unclear');
  });

  it('T4 shows a muddy peak as unclear with the middle score', () => {
    const muddy = reading(160, 'medium', 'muddy');
    expect(muddy.hint).toBe('unclear');
    expect(muddy.score).toBe(0.5);
  });

  it('detects clear knocks that span dull and tight', () => {
    expect(knocksDisagree([150, 160, 350])).toBe(true);
    expect(knocksDisagree([150, 160, 250])).toBe(false);
    expect(knocksDisagree([250, 350])).toBe(false);
    expect(knocksDisagree([100, 350])).toBe(false);
  });

  it('treats disagreement as muddy until the keep-tapping follow-up', () => {
    expect(resolveKnockDisagreement(true)).toBe('muddy');
    expect(resolveKnockDisagreement(false)).toBeNull();
  });

  it('returns no hint when no knocks were counted', () => {
    expect(knockHint({ peakFrequencyHz: 160, peakClarity: 'clear', knockCount: 0 }).hint).toBeNull();
  });
});

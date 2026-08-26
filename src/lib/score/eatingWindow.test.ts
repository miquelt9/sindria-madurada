import { describe, it, expect } from 'vitest';
import { eatingWindowForVerdict } from './eatingWindow';

describe('eatingWindowForVerdict', () => {
  it('likely_ripe: eat now, 0–2 days, does not claim off-vine ripening', () => {
    const w = eatingWindowForVerdict('likely_ripe');
    expect(w.eatFromDays).toBe(0);
    expect(w.eatUntilDays).toBe(2);
    expect(w.willNotRipenOffVine).toBe(false);
    expect(w.eatWindowLabel.toLowerCase()).toMatch(/eat now/);
  });

  it('borderline: 1–3 days, texture may soften, sweetness will not increase', () => {
    const w = eatingWindowForVerdict('borderline');
    expect(w.eatFromDays).toBe(1);
    expect(w.eatUntilDays).toBe(3);
    expect(w.willNotRipenOffVine).toBe(true);
    expect(w.eatWindowLabel.toLowerCase()).toMatch(/sweetness will not increase/);
  });

  it('likely_unripe: will not ripen off vine; eat within ~2–4 days', () => {
    const w = eatingWindowForVerdict('likely_unripe');
    expect(w.eatFromDays).toBe(2);
    expect(w.eatUntilDays).toBe(4);
    expect(w.willNotRipenOffVine).toBe(true);
    expect(w.eatWindowLabel.toLowerCase()).toMatch(/will not ripen off the vine/);
  });
});

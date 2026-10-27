import { describe, expect, it } from 'vitest';
import { ca } from './ca';
import { en } from './en';
import { es } from './es';

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === 'string') {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectStrings(item, out);
  }
}

describe('locale claims', () => {
  it('T22 keeps Hz, Brix, and a 90–99% headline accuracy out of every string', () => {
    for (const dict of [ca, es, en]) {
      const values: string[] = [];
      collectStrings(dict, values);
      expect(values.length).toBeGreaterThan(0);
      for (const value of values) {
        expect(value).not.toMatch(/\bHz\b/i);
        expect(value).not.toMatch(/brix/i);
        expect(value).not.toMatch(/\b9[0-9](\.\d)?\s?%/);
      }
    }
  });
});

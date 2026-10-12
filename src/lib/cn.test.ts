import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('drops falsy entries and merges conflicting Tailwind utilities', () => {
    expect(cn('text-ink', null, undefined, false, 'font-display')).toBe('text-ink font-display');
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn()).toBe('');
  });

  it('accepts arrays and conditional class maps', () => {
    expect(cn(['block', 'p-2'], { hidden: false, flex: true })).toBe('p-2 flex');
  });
});

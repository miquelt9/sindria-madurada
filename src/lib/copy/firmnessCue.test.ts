import { describe, expect, it } from 'vitest';
import { firmnessCue } from './firmnessCue';

describe('firmnessCue', () => {
  it('skips the readout when no knocks were registered', () => {
    expect(firmnessCue(160, 0)).toBe('skipped');
    expect(firmnessCue(400, 0)).toBe('skipped');
    expect(firmnessCue(0, -1)).toBe('skipped');
  });

  it('calls the inclusive 115–250 Hz band dull', () => {
    expect(firmnessCue(115, 1)).toBe('dull');
    expect(firmnessCue(160, 3)).toBe('dull');
    expect(firmnessCue(250, 2)).toBe('dull');
  });

  it('calls anything above 250 Hz tight', () => {
    expect(firmnessCue(250.0001, 1)).toBe('tight');
    expect(firmnessCue(420, 3)).toBe('tight');
    expect(firmnessCue(Number.POSITIVE_INFINITY, 1)).toBe('tight');
  });

  it('leaves pitches outside the dull band and the tight cutoff unclear', () => {
    expect(firmnessCue(114.999, 1)).toBe('unclear');
    expect(firmnessCue(0, 3)).toBe('unclear');
    expect(firmnessCue(-20, 1)).toBe('unclear');
    expect(firmnessCue(Number.NaN, 2)).toBe('unclear');
  });
});

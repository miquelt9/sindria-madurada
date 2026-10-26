import { describe, expect, it } from 'vitest';
import { ca } from '../../i18n/ca';
import { firmnessCue, type FirmnessCue } from './firmnessCue';

function label(cue: FirmnessCue): string {
  if (cue === 'dull') return ca.firmnessDull;
  if (cue === 'tight') return ca.firmnessTight;
  if (cue === 'unclear') return ca.firmnessUnclear;
  return ca.audioNotMeasured;
}

describe('firmnessCue', () => {
  it('skips the readout when no knocks were registered', () => {
    expect(firmnessCue({ peakHz: 160, knockCount: 0 })).toBe('skipped');
    expect(firmnessCue({ peakHz: 400, knockCount: 0 })).toBe('skipped');
    expect(firmnessCue({ peakHz: 0, knockCount: -1 })).toBe('skipped');
  });

  it('T20 reads the stored hint and maps it to the existing firmness words', () => {
    expect(label(firmnessCue({ peakHz: 0, knockCount: 3, knockHint: 'dull' }))).toBe('Apagat');
    expect(label(firmnessCue({ peakHz: 0, knockCount: 3, knockHint: 'tight' }))).toBe('Tens');
    expect(label(firmnessCue({ peakHz: 0, knockCount: 3, knockHint: 'unclear' }))).toBe('Poc clar');
    expect(ca.firmnessDull).toBe('Apagat');
    expect(ca.firmnessTight).toBe('Tens');
    expect(ca.firmnessUnclear).toBe('Poc clar');
  });

  it('T20 reads a legacy peak as one clear knock on the medium edges', () => {
    expect(firmnessCue({ peakHz: 160, knockCount: 3 })).toBe('dull');
    expect(label(firmnessCue({ peakHz: 160, knockCount: 1 }))).toBe('Apagat');
    expect(firmnessCue({ peakHz: 114, knockCount: 1 })).toBe('unclear');
    expect(firmnessCue({ peakHz: 115, knockCount: 1 })).toBe('dull');
    expect(firmnessCue({ peakHz: 230, knockCount: 2 })).toBe('dull');
    expect(firmnessCue({ peakHz: 231, knockCount: 1 })).toBe('unclear');
    expect(firmnessCue({ peakHz: 300, knockCount: 1 })).toBe('unclear');
    expect(firmnessCue({ peakHz: 301, knockCount: 1 })).toBe('tight');
    expect(firmnessCue({ peakHz: 420, knockCount: 3 })).toBe('tight');
    expect(firmnessCue({ peakHz: Number.POSITIVE_INFINITY, knockCount: 1 })).toBe('tight');
    expect(firmnessCue({ peakHz: 0, knockCount: 3 })).toBe('unclear');
    expect(firmnessCue({ peakHz: -20, knockCount: 1 })).toBe('unclear');
    expect(firmnessCue({ peakHz: Number.NaN, knockCount: 2 })).toBe('unclear');
    expect(firmnessCue({ peakHz: 160, knockCount: 3, knockHint: 'unclear' })).toBe('unclear');
  });
});

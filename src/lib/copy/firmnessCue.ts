import { bandForFrequency, type KnockHintBand } from '../audio/knockHint';

/**
 * Display words for the knock readout.
 * Reads the stored hint. A legacy record with no hint is one clear knock
 * on the medium edges. Does not change the score, and does not turn a
 * hollow sound into a ripeness point.
 */
export type FirmnessCue = 'dull' | 'tight' | 'unclear' | 'skipped';

export function firmnessCue(input: {
  peakHz: number;
  knockCount: number;
  knockHint?: KnockHintBand | null;
}): FirmnessCue {
  if (!(input.knockCount > 0)) return 'skipped';
  if (input.knockHint === 'dull' || input.knockHint === 'tight' || input.knockHint === 'unclear') {
    return input.knockHint;
  }
  return bandForFrequency(input.peakHz);
}

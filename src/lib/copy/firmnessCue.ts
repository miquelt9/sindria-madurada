/**
 * Display words for the knock readout.
 * Same split the result tips already use. Does not change the score,
 * and does not turn a hollow sound into a ripeness point.
 */
export type FirmnessCue = 'dull' | 'tight' | 'unclear' | 'skipped';

export function firmnessCue(peakHz: number, knockCount: number): FirmnessCue {
  if (knockCount <= 0) return 'skipped';
  if (peakHz > 250) return 'tight';
  if (peakHz >= 115 && peakHz <= 250) return 'dull';
  return 'unclear';
}

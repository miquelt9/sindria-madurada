import { RipenessVerdict } from '../types';

export interface EatingWindow {
  eatFromDays: number;
  eatUntilDays: number;
  eatWindowLabel: string;
  willNotRipenOffVine: boolean;
}

/**
 * Honest best-to-eat window. Watermelons do not sweeten after harvest —
 * never promise "ripe in N days."
 */
export function eatingWindowForVerdict(verdict: RipenessVerdict): EatingWindow {
  switch (verdict) {
    case 'likely_ripe':
      return {
        eatFromDays: 0,
        eatUntilDays: 2,
        eatWindowLabel: 'Eat now; peak in the next couple of days',
        willNotRipenOffVine: false,
      };
    case 'borderline':
      return {
        eatFromDays: 1,
        eatUntilDays: 3,
        eatWindowLabel: 'Texture may soften slightly; sweetness will not increase',
        willNotRipenOffVine: true,
      };
    case 'likely_unripe':
      return {
        eatFromDays: 2,
        eatUntilDays: 4,
        eatWindowLabel:
          'Will not ripen off the vine; eat within ~2–4 days and expect less sweetness',
        willNotRipenOffVine: true,
      };
  }
}

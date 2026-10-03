export type RipenessVerdict = 'likely_ripe' | 'borderline' | 'likely_unripe';
export type TasteFeedback = 'ripe' | 'unripe' | 'overripe' | 'unrated';

/** Rind pattern chip: solid cultivars must not be punished for low stripe contrast. */
export type MelonVariety = 'striped' | 'solid';
/** Fruit size chip: small melons use a slightly higher acceptable knock-frequency band. */
export type MelonSize = 'small' | 'medium' | 'large';

/** Optional fusion inputs from the variety/size chips. */
export interface FusionInputs {
  variety?: MelonVariety;
  size?: MelonSize;
}

export interface VisualFeatures {
  stripeContrastScore: number;    // 0 to 1 (high contrast ribbons = better)
  groundSpotScore: number;        // 0 to 1 stage cue; copy must not call this sweetness or absolute yellow
  dullnessScore: number;          // 0 to 1 (matte/dull = mature, ultra shiny = unripe)
  groundSpotDetected: boolean;
  notes: string[];
}

export interface AudioFeatures {
  peakFrequencyHz: number;        // Dominant resonant frequency
  rmsEnergy: number;              // Root Mean Square energy
  spectralCentroidHz: number;     // Weighted center of mass of spectrum
  amplitudeStdDev: number;        // Variance in FFT amplitude (Abbaszadeh et al.)
  skewness: number;               // 3rd central moment (Abbaszadeh Table 1)
  kurtosis: number;               // 4th moment (Abbaszadeh Table 1)
  lowMidRatio: number;            // Ratio of resonant ripe band (100-250Hz) to upper band (350-900Hz)
  knockCount: number;             // Valid detected thumps (aiming for 3)
  acousticRipenessScore: number;  // 0 to 1
  notes: string[];
}

export interface RipenessResult {
  overallScore: number;           // 0 to 100
  verdict: RipenessVerdict;
  confidence: number;             // 0 to 100
  visualScore: number;            // 0 to 100
  audioScore: number;             // 0 to 100
  visualFeatures: VisualFeatures;
  audioFeatures: AudioFeatures;
  summaryExplanation: string;
  actionableTips: string[];
  /** Inclusive start of the best-to-eat window, in whole days from now. */
  eatFromDays: number;
  /** Inclusive end of the best-to-eat window, in whole days from now. */
  eatUntilDays: number;
  /** Honest consumer copy for the eat window (no off-vine ripening claim). */
  eatWindowLabel: string;
  /** True when the fruit will not sweeten/ripen after harvest (unripe or borderline). */
  willNotRipenOffVine: boolean;
}

export interface MelonScanRecord {
  id: string;
  createdAt: number;
  photoDataUrl: string;           // Compressed / thumbnail image data URL
  bellyPhotoDataUrl?: string;     // Dedicated belly photo data URL if captured
  cropBox?: { x: number; y: number; width: number; height: number };
  groundSpotPoint?: { x: number; y: number };
  variety?: MelonVariety;
  size?: MelonSize;
  result: RipenessResult;
  userNote?: string;
  feedback: TasteFeedback;
  feedbackAt?: number;
}

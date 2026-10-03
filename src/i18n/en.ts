import { Translations } from './types';

export const en: Translations = {
  // Common & Navigation
  appTitle: 'Síndria Madurada',
  appSubtitle: 'Coarse stage and texture hint',
  privacyFooter: 'All photo analysis and audio processing runs 100% locally on your device.',
  history: 'History',
  newScan: 'New scan',
  back: 'Back',
  cancel: 'Cancel',
  delete: 'Delete',
  clearAll: 'Clear all',
  offlineNotice: 'Offline mode. 100% on-device.',
  scanStepperLabel: 'Scan progress',
  scanStepPhoto: 'Photo',
  scanStepKnock: 'Knock',
  scanStepResult: 'Result',

  // Landing Page
  landingTagline:
    'A coarse three-way hint from a photo and several knocks: likely ripe, borderline, or likely unripe. Not a sweetness test. A hollow sound is a separate warning.',
  landingHeroBadge: '100% On-Device • No Login • Full Privacy',
  landingStep1Title: '1. Photo and field spot',
  landingStep1Desc:
    'Prefer a frame that shows the field spot. The cue is loss of green against the rest of the rind, not absolute yellow.',
  landingStep2Title: '2. Several knocks',
  landingStep2Desc:
    'Knock several times (three firm knocks). Dull versus tight is a firmness cue, not more bass. A noisy room or an extreme size lowers confidence.',
  landingStep3Title: '3. Three-way hint',
  landingStep3Desc:
    'Likely ripe, borderline, or likely unripe. The fruit does not ripen or sweeten after picking. A hollow sound is its own warning, not a ripeness point.',
  landingCheckCta: 'Check a watermelon',
  landingHistoryCta: 'View history',
  landingShareConsent: 'Share anonymous scans to improve the model (photo + features)',
  landingInstallApp: 'Install as app',
  landingInstalled: 'App installed',

  // Photo Capture
  captureGuideRind: 'Frame the whole watermelon',
  captureGuideBelly: 'Prefer a frame that shows the field spot',
  cameraInactive: 'Camera inactive or permission pending.',
  cameraActivate: 'Start camera',
  cameraRestart: 'Restart camera',
  uploadFromGallery: 'Upload from gallery',
  takePhoto: 'Take photo',
  cropStepRind: '1. Tap watermelon to center crop',
  cropStepBelly: '2. (Optional) Tap the field spot',
  cropModeCrop: 'Framing',
  cropModeSpot: 'Field Spot',
  bellyShotButton: '+ Add underside / belly photo',
  bellyShotAdded: 'Underside photo added',
  bellyShotRetake: 'Retake underside photo',
  bellyShotOptional:
    'Optional: photograph the field spot so loss of green can be compared with the rest of the rind',
  varietyLabel: 'Rind',
  varietyStriped: 'Striped',
  varietySolid: 'Solid / Dark',
  sizeLabel: 'Size',
  sizeSmall: 'Small (<4kg)',
  sizeMedium: 'Medium (4-7kg)',
  sizeLarge: 'Large (>7kg)',
  gateChecking: 'Verifying watermelon with AI...',
  gateWarning: 'This photo does not look like a watermelon.',
  gateRetake: 'Retake photo',
  gateBypass: 'Use anyway',
  retake: 'Retake',
  continueKnocks: 'Continue to knocks',
  torchOn: 'Turn torch off',
  torchOff: 'Turn torch on',

  // Knock Recording
  knockTitle: 'Knock firmness',
  knockDesc:
    'Rest the phone on the rind and knock several times (three). Dull versus tight is a firmness cue, not more bass. A noisy room or an extreme size lowers confidence.',
  knockMicHearing: 'Microphone is hearing you. Knock #1…',
  knockDetected: 'Detected knock #{count}! Knock #{next}…',
  knockListening: 'Listening for knock #1…',
  knockPressStart: 'Tap "Start knock test" to begin',
  knockMicHint: 'Microphone may be muted or too far. Move closer or tap manually when knocking.',
  knockMicError: 'Microphone access denied or unavailable.',
  knockStartBtn: 'Start knock test',
  knockTapManual: 'Tap when knocking',
  knockFinishWithCount: 'Finish with {count} knock{plural}',
  knockSkip: 'Skip acoustic test (visual analysis only)',

  // Result & Verdict
  verdictRipe: 'Likely ripe',
  verdictBorderline: 'Unsure / Borderline',
  verdictUnripe: 'Likely unripe',
  scoreIndex: 'Index',
  visualSignals: 'Visual cues',
  ribbonStripes: 'Stripe contrast',
  groundSpot: 'Field spot (less green)',
  acousticKnock: 'Knock firmness',
  resonantTone: 'Firmness',
  firmnessDull: 'Dull',
  firmnessTight: 'Tight',
  firmnessUnclear: 'Unclear',
  knocksRegistered: 'Knocks registered',
  detailedObservations: 'Detailed observations',
  eatingWindow: 'Best eating window',
  willNotRipenWarning: 'Remember: Watermelons do not continue to ripen or sweeten after harvest.',
  feedbackTitle: 'After you cut it',
  feedbackDesc:
    'Mark likely ripe, borderline, or likely unripe. The note stays on this device. This is not a sweetness test.',
  feedbackRipe: 'Likely ripe',
  feedbackUnripe: 'Likely unripe',
  feedbackOverripe: 'Overripe',
  feedbackSaved: 'Thank you! Feedback saved to local history.',
  anotherScan: 'Scan another watermelon',

  // Compare & Share
  compareTitle: 'Compare with previous',
  compareCurrent: 'This melon',
  comparePrevious: 'Previous',
  compareBetter: 'Higher score than your previous melon!',
  compareWorse: 'Lower score than your previous melon',
  compareEqual: 'Similar score to your previous melon',
  compareEatWindow: 'Eat window',
  comparePitch: 'Firmness',
  shareTitle: 'Share hint',
  shareSummary:
    'Coarse stage and texture hint. Not a sweetness test. A hollow sound is a separate warning, not a ripeness point.',
  shareCopied: 'Summary copied to clipboard!',
  downloadCard: 'Download image card',

  // History
  historyTitle: 'Watermelon History',
  historyEmptyTitle: 'No watermelons scanned yet',
  historyEmptyDesc: 'Take a photo and tap 3 times to log your first watermelon analysis.',
  historyStartScan: 'Start analysis',
  historyClearConfirm: 'Do you want to clear all watermelon scan history on this device?',
  historyTaste: 'After cutting',
  historyDeleteAria: 'Delete this scan',
  historyClearAria: 'Clear all history',

  // Localized Explanations & UI
  eatWindowRipe: 'Eat now; it will not ripen or sweeten after picking',
  eatWindowBorderline: 'Texture may soften slightly; sweetness will not increase',
  eatWindowUnripe: 'Will not ripen off the vine; eat within ~2–4 days and expect less sweetness',
  eatImmediate: 'Immediate',
  eatDaysRange: '{from}–{until} days',
  summaryRipe:
    'Likely ripe — a coarse stage and texture hint, not a sweetness reading. If the field spot is in frame, it is loss of green against the rind. Several knocks that sound dull rather than tight are a firmness cue, not more bass. A hollow sound is a separate warning, not a ripeness point. The fruit does not ripen or sweeten after picking.',
  summaryBorderline:
    'Borderline. The stage and texture cues disagree. Prefer a frame that shows the field spot, and take several knocks. A hollow sound is a separate warning, not a ripeness point. The fruit does not ripen or sweeten after picking.',
  summaryUnripe:
    'Likely unripe. Knocks sound tight, or the field spot is missing or still green against the rind. A hollow sound is a separate warning, not a ripeness point. The fruit does not ripen or sweeten after picking.',
  tipSpotMissing:
    'Prefer a frame that shows the field spot. Score loss of green against the rest of the rind, not absolute yellow.',
  tipSpotPresent:
    'The field spot is in frame. It is a stage cue — loss of green against the rind — not proof of sweetness.',
  tipKnockHigh: 'Knocks sound tight rather than dull. That is a firmness cue, not more bass.',
  tipKnockSweetZone: 'Several knocks sound dull rather than tight. That is a firmness cue, not more bass.',
  tipKnockSweetZoneSmall:
    'Several knocks on this smaller melon sound dull rather than tight. That is a firmness cue, not more bass.',
  tipStripeLow:
    'On striped fruit, look for contrast between ribbon stripes. A dull rind does not mean ripe for every cultivar.',
  tipOffVineReminder: 'The fruit does not ripen or sweeten after picking.',
  audioNotMeasured: 'Not measured',
  audioNotMeasuredDesc: 'Acoustic test skipped by user',
  confidenceLabel: 'Estimated confidence',
  confidenceNotice:
    'Coarse hint. Treat it as low confidence when the field spot is missing, the room is noisy, or the fruit is extreme in size.',
  themeLight: 'Theme: Light (switch to dark)',
  themeDark: 'Theme: Dark (switch to system)',
  themeSystem: 'Theme: Automatic ({resolved}) (switch to light)',
  themeToggleAria: 'Switch visual theme (light/dark/system)',
};

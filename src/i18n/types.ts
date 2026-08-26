export type Language = 'ca' | 'es' | 'en';

export interface Translations {
  // Common & Navigation
  appTitle: string;
  appSubtitle: string;
  privacyFooter: string;
  history: string;
  newScan: string;
  back: string;
  cancel: string;
  delete: string;
  clearAll: string;
  offlineNotice: string;

  // Landing Page
  landingTagline: string;
  landingHeroBadge: string;
  landingStep1Title: string;
  landingStep1Desc: string;
  landingStep2Title: string;
  landingStep2Desc: string;
  landingStep3Title: string;
  landingStep3Desc: string;
  landingCheckCta: string;
  landingHistoryCta: string;
  landingShareConsent: string;
  landingInstallApp: string;
  landingInstalled: string;

  // Photo Capture
  captureGuideRind: string;
  captureGuideBelly: string;
  cameraInactive: string;
  cameraActivate: string;
  cameraRestart: string;
  uploadFromGallery: string;
  takePhoto: string;
  cropStepRind: string;
  cropStepBelly: string;
  cropModeCrop: string;
  cropModeSpot: string;
  bellyShotButton: string;
  bellyShotAdded: string;
  bellyShotRetake: string;
  bellyShotOptional: string;
  varietyLabel: string;
  varietyStriped: string;
  varietySolid: string;
  sizeLabel: string;
  sizeSmall: string;
  sizeMedium: string;
  sizeLarge: string;
  gateChecking: string;
  gateWarning: string;
  gateRetake: string;
  gateBypass: string;
  retake: string;
  continueKnocks: string;
  torchOn: string;
  torchOff: string;

  // Knock Recording
  knockTitle: string;
  knockDesc: string;
  knockMicHearing: string;
  knockDetected: string;
  knockListening: string;
  knockPressStart: string;
  knockMicHint: string;
  knockMicError: string;
  knockStartBtn: string;
  knockTapManual: string;
  knockFinishWithCount: string;
  knockSkip: string;

  // Result & Verdict
  verdictRipe: string;
  verdictBorderline: string;
  verdictUnripe: string;
  scoreIndex: string;
  visualSignals: string;
  ribbonStripes: string;
  groundSpot: string;
  acousticKnock: string;
  resonantTone: string;
  knocksRegistered: string;
  detailedObservations: string;
  eatingWindow: string;
  willNotRipenWarning: string;
  feedbackTitle: string;
  feedbackDesc: string;
  feedbackRipe: string;
  feedbackUnripe: string;
  feedbackOverripe: string;
  feedbackSaved: string;
  anotherScan: string;

  // Compare & Share
  compareTitle: string;
  compareCurrent: string;
  comparePrevious: string;
  compareBetter: string;
  compareWorse: string;
  compareEqual: string;
  compareEatWindow: string;
  comparePitch: string;
  shareTitle: string;
  shareSummary: string;
  shareCopied: string;
  downloadCard: string;

  // History
  historyTitle: string;
  historyEmptyTitle: string;
  historyEmptyDesc: string;
  historyStartScan: string;
  historyClearConfirm: string;
  historyTaste: string;
  historyDeleteAria: string;
  historyClearAria: string;

  // Localized Explanations & UI
  eatWindowRipe: string;
  eatWindowBorderline: string;
  eatWindowUnripe: string;
  eatImmediate: string;
  eatDaysRange: string;
  summaryRipe: string;
  summaryBorderline: string;
  summaryUnripe: string;
  tipSpotMissing: string;
  tipSpotPresent: string;
  tipKnockHigh: string;
  tipKnockSweetZone: string;
  tipKnockSweetZoneSmall: string;
  tipStripeLow: string;
  tipOffVineReminder: string;
  audioNotMeasured: string;
  audioNotMeasuredDesc: string;
  confidenceLabel: string;
  confidenceNotice: string;
  themeLight: string;
  themeDark: string;
  themeSystem: string;
  themeToggleAria: string;
}

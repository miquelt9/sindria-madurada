import { Translations } from './types';

export const ca: Translations = {
  // Common & Navigation
  appTitle: 'Síndria Madurada',
  appSubtitle: 'Pista grollera d’estadi i textura',
  privacyFooter: "Totes les anàlisis i mostres d'àudio es processen 100% en local al teu dispositiu.",
  history: 'Historial',
  newScan: 'Nova anàlisi',
  back: 'Enrere',
  cancel: 'Cancel·lar',
  delete: 'Eliminar',
  clearAll: 'Esborrar tot',
  offlineNotice: 'Sense connexió. Funciona 100% en local.',
  scanStepperLabel: "Progrés de l'anàlisi",
  scanStepPhoto: 'Foto',
  scanStepKnock: 'Cops',
  scanStepResult: 'Resultat',

  // Landing Page
  landingTagline:
    'Una pista grollera en tres vies, amb una foto i diversos cops: probablement madura, al límit, o probablement verda. No és un test de dolçor. Un so buit és un avís a part.',
  landingHeroBadge: '100% en local • Sense registre • Privacitat total',
  landingStep1Title: '1. Foto i taca de terra',
  landingStep1Desc:
    'Prefereix un enquadrament on es vegi la taca de terra. La pista és la pèrdua de verd respecte a la resta de la pell, no el groc absolut.',
  landingStep2Title: '2. Diversos cops',
  landingStep2Desc:
    'Dóna diversos cops (tres de ferms). Apagat o tens és una pista de fermesa, no més greu. Una sala sorollosa o una mida extrema abaixa la confiança.',
  landingStep3Title: '3. Pista en tres vies',
  landingStep3Desc:
    'Probablement madura, al límit, o probablement verda. La fruita no madura ni s’endolceix després de collir-la. Un so buit és un avís a part, no un punt de maduresa.',
  landingCheckCta: 'Comprovar una síndria',
  landingHistoryCta: 'Veure historial',
  landingShareConsent: 'Compartir anàlisis anònimes per millorar el model (foto + dades)',
  landingInstallApp: 'Instal·lar com a app',
  landingInstalled: 'App instal·lada',

  // Photo Capture
  captureGuideRind: 'Enquadra la síndria sencera',
  captureGuideBelly: 'Prefereix un enquadrament amb la taca de terra',
  cameraInactive: 'Càmera inactiva o pendent de permís.',
  cameraActivate: 'Activar càmera',
  cameraRestart: 'Reiniciar càmera',
  uploadFromGallery: 'Pujar foto de la galeria',
  takePhoto: 'Fer foto',
  cropStepRind: '1. Toca la síndria per centrar',
  cropStepBelly: '2. (Opcional) Toca la taca de terra',
  cropModeCrop: 'Enquadrament',
  cropModeSpot: 'Taca',
  bellyShotButton: '+ Afegir foto de la panxa/taca',
  bellyShotAdded: 'Foto de la panxa afegida',
  bellyShotRetake: 'Repetir foto de la panxa',
  bellyShotOptional:
    'Opcional: fotografia la taca de terra per comparar la pèrdua de verd amb la resta de la pell',
  varietyLabel: 'Pell',
  varietyStriped: 'Ratllada',
  varietySolid: 'Llisa / Fosca',
  sizeLabel: 'Mida',
  sizeSmall: 'Petita (<4kg)',
  sizeMedium: 'Mitjana (4-7kg)',
  sizeLarge: 'Gran (>7kg)',
  gateChecking: 'Verificant síndria amb IA...',
  gateWarning: 'Aquesta imatge no sembla una síndria.',
  gateRetake: 'Repetir foto',
  gateBypass: 'Utilitzar igualment',
  retake: 'Tornar a fer',
  continueKnocks: 'Continuar als cops',
  torchOn: 'Apagar llanterna',
  torchOff: 'Encendre llanterna',

  // Knock Recording
  knockTitle: 'Fermesa dels cops',
  knockDesc:
    'Recolza el telèfon a la pell i dóna diversos cops (tres). Apagat o tens és una pista de fermesa, no més greu. El soroll o una mida extrema abaixen la confiança.',
  knockMicHearing: 'El micròfon t’escolta. Cop #1…',
  knockDetected: 'Detectat el cop #{count}! Dóna el cop #{next}…',
  knockListening: 'Escoltant el cop #1…',
  knockPressStart: 'Prem "Començar el test" per activar el micròfon',
  knockMicHint: 'El micròfon pot estar bloquejat o massa lluny. Apropa el telèfon a la pell, o toca quan piquis.',
  knockMicError: 'Accés al micròfon denegat o no disponible.',
  knockStartBtn: 'Començar el test de cops',
  knockTapManual: 'Toca quan piquis',
  knockFinishWithCount: 'Finalitzar amb {count} cop{plural}',
  knockSkip: 'Ometre test acústic (només anàlisi visual)',

  // Result & Verdict
  verdictRipe: 'Probablement madura',
  verdictBorderline: 'Dubitativa / al límit',
  verdictUnripe: 'Probablement verda',
  scoreIndex: 'Índex',
  visualSignals: 'Senyals visuals',
  ribbonStripes: 'Vetllat / Ratlles',
  groundSpot: 'Taca (menys verd)',
  acousticKnock: 'Fermesa dels cops',
  resonantTone: 'Fermesa',
  firmnessDull: 'Apagat',
  firmnessTight: 'Tens',
  firmnessUnclear: 'Poc clar',
  knocksRegistered: 'Cops registrats',
  detailedObservations: 'Observacions detallades',
  eatingWindow: 'Finestra òptima de consum',
  willNotRipenWarning: 'Recorda: Les síndries no continuen madurant ni s’endolceixen un cop collides.',
  feedbackTitle: 'Després de tallar-la',
  feedbackDesc:
    'Marca probablement madura, al límit, o probablement verda. La nota queda al dispositiu. No és un test de dolçor.',
  feedbackRipe: 'Probablement madura',
  feedbackUnripe: 'Probablement verda',
  feedbackOverripe: 'Passada',
  feedbackSaved: "Gràcies! Feedback desat a l'historial del dispositiu.",
  anotherScan: 'Analitzar una altra síndria',

  // Compare & Share
  compareTitle: "Comparativa amb l'anterior",
  compareCurrent: 'Aquesta síndria',
  comparePrevious: 'Anterior',
  compareBetter: 'Millor puntuació que la darrera!',
  compareWorse: 'Puntuació inferior a la darrera',
  compareEqual: 'Puntuació similar a la darrera',
  compareEatWindow: 'Consum',
  comparePitch: 'Fermesa',
  shareTitle: 'Compartir la pista',
  shareSummary:
    'Pista grollera d’estadi i textura. No és un test de dolçor. Un so buit és un avís a part, no un punt de maduresa.',
  shareCopied: 'Resum copiat al porta-retalls!',
  downloadCard: 'Descarregar imatge',

  // History
  historyTitle: 'Historial de síndries',
  historyEmptyTitle: 'Cap síndria registrada',
  historyEmptyDesc: "Fes una foto i dóna 3 cops a una síndria per veure el resultat i l'historial aquí.",
  historyStartScan: 'Començar anàlisi',
  historyClearConfirm: "Vols eliminar tot l'historial d'anàlisis d'aquest dispositiu?",
  historyTaste: 'Després de tallar',
  historyDeleteAria: 'Esborrar aquesta anàlisi',
  historyClearAria: "Esborrar tot l'historial",

  // Localized Explanations & UI
  eatWindowRipe: 'Menja-la ara; no madura ni s’endolceix després de collir-la',
  eatWindowBorderline: 'La textura es pot estovar lleugerament; la dolçor no augmentarà',
  eatWindowUnripe: 'No madurarà fora de la mata; menja-la en uns 2–4 dies, sense esperar més dolçor',
  eatImmediate: 'Immediat',
  eatDaysRange: '{from}–{until} dies',
  summaryRipe:
    'Probablement madura: una pista grollera d’estadi i textura, no una lectura de dolçor. Si es veu la taca de terra, es llegeix com a pèrdua de verd respecte a la pell. Diversos cops apagats, i no tensos, són una pista de fermesa, no més greu. Un so buit és un avís a part, no un punt de maduresa. La fruita no madura ni s’endolceix després de collir-la.',
  summaryBorderline:
    'Al límit. Les pistes d’estadi i de textura no coincideixen. Prefereix un enquadrament amb la taca de terra i dóna diversos cops. Un so buit és un avís a part, no un punt de maduresa. La fruita no madura ni s’endolceix després de collir-la.',
  summaryUnripe:
    'Probablement verda. Els cops sonen tensos, o la taca de terra no es veu o encara és verda respecte a la pell. Un so buit és un avís a part, no un punt de maduresa. La fruita no madura ni s’endolceix després de collir-la.',
  tipSpotMissing:
    'Prefereix un enquadrament on es vegi la taca de terra. Valora la pèrdua de verd respecte a la resta de la pell, no el groc absolut.',
  tipSpotPresent:
    'La taca de terra es veu. És una pista d’estadi — pèrdua de verd respecte a la pell — no una prova de dolçor.',
  tipKnockHigh: 'Els cops sonen tensos, no apagats. És una pista de fermesa, no més greu.',
  tipKnockSweetZone: 'Diversos cops sonen apagats, no tensos. És una pista de fermesa, no més greu.',
  tipKnockSweetZoneSmall:
    'Diversos cops en aquesta síndria més petita sonen apagats, no tensos. És una pista de fermesa, no més greu.',
  tipStripeLow:
    'En la fruita ratllada, busca contrast entre les vetes. Una pell apagada no vol dir madura en totes les varietats.',
  tipOffVineReminder: 'La fruita no madura ni s’endolceix després de collir-la.',
  audioNotMeasured: 'No mesurat',
  audioNotMeasuredDesc: 'Test acústic omès per l’usuari',
  confidenceLabel: 'Confiança estimada',
  confidenceNotice:
    'Pista grollera. Tracta-la amb confiança baixa si falta la taca de terra, la sala és sorollosa o la fruita té una mida extrema.',
  themeLight: 'Tema: Clar (canviar a fosc)',
  themeDark: 'Tema: Fosc (canviar a sistema)',
  themeSystem: 'Tema: Automàtic ({resolved}) (canviar a clar)',
  themeToggleAria: 'Canviar mode visual (clar/fosc/sistema)',
};

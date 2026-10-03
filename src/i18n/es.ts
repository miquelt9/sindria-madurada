import { Translations } from './types';

export const es: Translations = {
  // Common & Navigation
  appTitle: 'Sandía Madurada',
  appSubtitle: 'Pista gruesa de estadio y textura',
  privacyFooter: 'Todos los análisis y muestras de audio se procesan 100% en local en tu dispositivo.',
  history: 'Historial',
  newScan: 'Nuevo análisis',
  back: 'Atrás',
  cancel: 'Cancelar',
  delete: 'Eliminar',
  clearAll: 'Borrar todo',
  offlineNotice: 'Sin conexión. Funciona 100% en local.',
  scanStepperLabel: 'Progreso del análisis',
  scanStepPhoto: 'Foto',
  scanStepKnock: 'Golpes',
  scanStepResult: 'Resultado',

  // Landing Page
  landingTagline:
    'Una pista gruesa en tres vías, con una foto y varios golpes: probablemente madura, en el límite, o probablemente verde. No es un test de dulzor. Un sonido hueco es un aviso aparte.',
  landingHeroBadge: '100% en local • Sin registro • Privacidad total',
  landingStep1Title: '1. Foto y mancha de tierra',
  landingStep1Desc:
    'Prefiere un encuadre que muestre la mancha de tierra. La pista es la pérdida de verde frente al resto de la corteza, no el amarillo absoluto.',
  landingStep2Title: '2. Varios golpes',
  landingStep2Desc:
    'Da varios golpes (tres firmes). Apagado o tenso es una pista de firmeza, no más graves. Una sala ruidosa o un tamaño extremo bajan la confianza.',
  landingStep3Title: '3. Pista en tres vías',
  landingStep3Desc:
    'Probablemente madura, en el límite, o probablemente verde. La fruta no madura ni se endulza después de cortarla. Un sonido hueco es un aviso aparte, no un punto de madurez.',
  landingCheckCta: 'Comprobar una sandía',
  landingHistoryCta: 'Ver historial',
  landingShareConsent: 'Compartir análisis anónimos para mejorar el modelo (foto + datos)',
  landingInstallApp: 'Instalar como app',
  landingInstalled: 'App instalada',

  // Photo Capture
  captureGuideRind: 'Encuadra la sandía entera',
  captureGuideBelly: 'Prefiere un encuadre que muestre la mancha de tierra',
  cameraInactive: 'Cámara inactiva o pendiente de permiso.',
  cameraActivate: 'Activar cámara',
  cameraRestart: 'Reiniciar cámara',
  uploadFromGallery: 'Subir foto de la galería',
  takePhoto: 'Hacer foto',
  cropStepRind: '1. Toca la sandía para centrar',
  cropStepBelly: '2. (Opcional) Toca la mancha de tierra',
  cropModeCrop: 'Encuadre',
  cropModeSpot: 'Mancha',
  bellyShotButton: '+ Añadir foto de la mancha/vientre',
  bellyShotAdded: 'Foto del vientre añadida',
  bellyShotRetake: 'Repetir foto del vientre',
  bellyShotOptional:
    'Opcional: fotografía la mancha de tierra para comparar la pérdida de verde con el resto de la corteza',
  varietyLabel: 'Corteza',
  varietyStriped: 'Rayada',
  varietySolid: 'Lisa / Oscura',
  sizeLabel: 'Tamaño',
  sizeSmall: 'Pequeña (<4kg)',
  sizeMedium: 'Mediana (4-7kg)',
  sizeLarge: 'Grande (>7kg)',
  gateChecking: 'Verificando sandía con IA...',
  gateWarning: 'Esta imagen no parece una sandía.',
  gateRetake: 'Repetir foto',
  gateBypass: 'Usar de todos modos',
  retake: 'Volver a hacer',
  continueKnocks: 'Continuar a los golpes',
  torchOn: 'Apagar linterna',
  torchOff: 'Encender linterna',

  // Knock Recording
  knockTitle: 'Firmeza de los golpes',
  knockDesc:
    'Apoya el teléfono en la corteza y da varios golpes (tres). Apagado o tenso es una pista de firmeza, no más graves. El ruido o un tamaño extremo bajan la confianza.',
  knockMicHearing: 'El micrófono te escucha. Golpe #1…',
  knockDetected: '¡Detectado el golpe #{count}! Da el golpe #{next}…',
  knockListening: 'Escuchando el golpe #1…',
  knockPressStart: 'Pulsa "Empezar el test" para activar el micrófono',
  knockMicHint: 'El micrófono puede estar bloqueado o demasiado lejos. Acerca el teléfono o pulsa al golpear.',
  knockMicError: 'Acceso al micrófono denegado o no disponible.',
  knockStartBtn: 'Empezar el test de golpes',
  knockTapManual: 'Toca al golpear',
  knockFinishWithCount: 'Finalizar con {count} golpe{plural}',
  knockSkip: 'Omitir test acústico (solo análisis visual)',

  // Result & Verdict
  verdictRipe: 'Probablemente madura',
  verdictBorderline: 'Dudosa / en el límite',
  verdictUnripe: 'Probablemente verde',
  scoreIndex: 'Índice',
  visualSignals: 'Señales visuales',
  ribbonStripes: 'Contraste de vetas',
  groundSpot: 'Mancha (menos verde)',
  acousticKnock: 'Firmeza de los golpes',
  resonantTone: 'Firmeza',
  firmnessDull: 'Apagado',
  firmnessTight: 'Tenso',
  firmnessUnclear: 'Poco claro',
  knocksRegistered: 'Golpes registrados',
  detailedObservations: 'Observaciones detalladas',
  eatingWindow: 'Ventana óptima de consumo',
  willNotRipenWarning: 'Recuerda: Las sandías no continúan madurando ni se endulzan una vez recolectadas.',
  feedbackTitle: 'Después de cortarla',
  feedbackDesc:
    'Marca probablemente madura, en el límite, o probablemente verde. La nota se queda en el dispositivo. No es un test de dulzor.',
  feedbackRipe: 'Probablemente madura',
  feedbackUnripe: 'Probablemente verde',
  feedbackOverripe: 'Pasada',
  feedbackSaved: '¡Gracias! Feedback guardado en el historial de tu dispositivo.',
  anotherScan: 'Analizar otra sandía',

  // Compare & Share
  compareTitle: 'Comparativa con la anterior',
  compareCurrent: 'Esta sandía',
  comparePrevious: 'Anterior',
  compareBetter: '¡Mejor puntuación que la última!',
  compareWorse: 'Puntuación inferior a la última',
  compareEqual: 'Puntuación similar a la última',
  compareEatWindow: 'Consumo',
  comparePitch: 'Firmeza',
  shareTitle: 'Compartir la pista',
  shareSummary:
    'Pista gruesa de estadio y textura. No es un test de dulzor. Un sonido hueco es un aviso aparte, no un punto de madurez.',
  shareCopied: '¡Resumen copiado al portapapeles!',
  downloadCard: 'Descargar imagen',

  // History
  historyTitle: 'Historial de sandías',
  historyEmptyTitle: 'Ninguna sandía registrada',
  historyEmptyDesc: 'Haz una foto y da 3 golpes a una sandía para ver el resultado y el historial aquí.',
  historyStartScan: 'Empezar análisis',
  historyClearConfirm: '¿Quieres eliminar todo el historial de análisis de este dispositivo?',
  historyTaste: 'Después de cortar',
  historyDeleteAria: 'Borrar este análisis',
  historyClearAria: 'Borrar todo el historial',

  // Localized Explanations & UI
  eatWindowRipe: 'Cómela ahora; no madura ni se endulza después de cortarla',
  eatWindowBorderline: 'La textura puede ablandarse ligeramente; el dulzor no aumentará',
  eatWindowUnripe: 'No madurará fuera de la mata; cómela en unos 2–4 días, sin esperar más dulzor',
  eatImmediate: 'Inmediato',
  eatDaysRange: '{from}–{until} días',
  summaryRipe:
    'Probablemente madura: una pista gruesa de estadio y textura, no una lectura de dulzor. La mancha de tierra, cuando se ve, es pérdida de verde frente a la corteza. Apagado o tenso, con varios golpes, es una pista de firmeza, no más graves. Un sonido hueco es un aviso aparte, no un punto de madurez. La fruta no madura ni se endulza después de cortarla.',
  summaryBorderline:
    'En el límite. Las pistas de estadio y de textura no coinciden. Prefiere un encuadre con la mancha de tierra y da varios golpes. Un sonido hueco es un aviso aparte, no un punto de madurez. La fruta no madura ni se endulza después de cortarla.',
  summaryUnripe:
    'Probablemente verde. La mancha de tierra puede faltar o seguir verde frente a la corteza, o los golpes pueden sonar tensos en lugar de apagados. Un sonido hueco es un aviso aparte, no un punto de madurez. La fruta no madura ni se endulza después de cortarla.',
  tipSpotMissing:
    'Prefiere un encuadre que muestre la mancha de tierra. Valora la pérdida de verde frente al resto de la corteza, no el amarillo absoluto. Las palabras son solo probablemente madura, en el límite, o probablemente verde. Un sonido hueco es un aviso aparte, no un punto de madurez.',
  tipSpotPresent:
    'La mancha de tierra se ve. Es una pista de estadio — pérdida de verde frente a la corteza — no una prueba de dulzor. Las palabras son solo probablemente madura, en el límite, o probablemente verde. Un sonido hueco es un aviso aparte, no un punto de madurez.',
  tipKnockHigh:
    'Los golpes suenan tensos, no apagados. Es una pista de firmeza, no más graves. Las palabras son solo probablemente madura, en el límite, o probablemente verde. Un sonido hueco es un aviso aparte, no un punto de madurez.',
  tipKnockSweetZone:
    'Varios golpes suenan apagados, no tensos. Es una pista de firmeza, no más graves. Las palabras son solo probablemente madura, en el límite, o probablemente verde. Un sonido hueco es un aviso aparte, no un punto de madurez.',
  tipKnockSweetZoneSmall:
    'Varios golpes en esta sandía más pequeña suenan apagados, no tensos. Es una pista de firmeza, no más graves. Las palabras son solo probablemente madura, en el límite, o probablemente verde. Un sonido hueco es un aviso aparte, no un punto de madurez.',
  tipStripeLow:
    'En la fruta rayada, busca contraste entre las vetas. Una corteza apagada no significa madura en todos los cultivares. Las palabras son solo probablemente madura, en el límite, o probablemente verde. Un sonido hueco es un aviso aparte, no un punto de madurez.',
  tipOffVineReminder:
    'La fruta no madura ni se endulza después de cortarla. Las palabras son solo probablemente madura, en el límite, o probablemente verde. Un sonido hueco es un aviso aparte, no un punto de madurez.',
  audioNotMeasured: 'No medido',
  audioNotMeasuredDesc: 'Test acústico omitido por el usuario',
  confidenceLabel: 'Confianza estimada',
  confidenceNotice:
    'Pista gruesa. Trátala con confianza baja si falta la mancha de tierra, la sala es ruidosa o la fruta tiene un tamaño extremo.',
  themeLight: 'Tema: Claro (cambiar a oscuro)',
  themeDark: 'Tema: Oscuro (cambiar a sistema)',
  themeSystem: 'Tema: Automático ({resolved}) (cambiar a claro)',
  themeToggleAria: 'Cambiar modo visual (claro/oscuro/sistema)',
};

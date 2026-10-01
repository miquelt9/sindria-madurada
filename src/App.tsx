import React, { useRef, useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { PhotoCapture, PhotoCaptureResult, PhotoFraming } from './components/PhotoCapture';
import { KnockRecorderView } from './components/KnockRecorderView';
import { ResultCard } from './components/ResultCard';
import { HistoryView } from './components/HistoryView';
import { AppShell, AppStep } from './components/ui/AppShell';
import { analyzeWatermelonImage } from './lib/vision/analyzer';
import { fuseRipenessSignals } from './lib/score/fusion';
import { saveScanRecord, updateScanFeedback } from './lib/history/storage';
import { backFromKnock } from './lib/scan/backFromKnock';
import {
  VisualFeatures,
  AudioFeatures,
  RipenessResult,
  MelonScanRecord,
  TasteFeedback,
  MelonVariety,
  MelonSize,
} from './lib/types';

interface FlowState {
  step: AppStep;
  croppedPhotoUrl: string | null;
  bellyPhotoUrl: string | null;
  variety: MelonVariety;
  size: MelonSize;
  visualFeatures: VisualFeatures | null;
  framing: PhotoFraming | null;
  currentResult: RipenessResult | null;
  currentScanId: string | null;
}

function freshFlow(step: AppStep): FlowState {
  return {
    step,
    croppedPhotoUrl: null,
    bellyPhotoUrl: null,
    variety: 'striped',
    size: 'medium',
    visualFeatures: null,
    framing: null,
    currentResult: null,
    currentScanId: null,
  };
}

export const App: React.FC = () => {
  const [flow, setFlow] = useState<FlowState>(() => freshFlow('home'));
  const flowRef = useRef(flow);
  const stepRef = useRef(flow.step);
  flowRef.current = flow;
  stepRef.current = flow.step;

  const handlePhotoCaptured = (result: PhotoCaptureResult) => {
    const framing: PhotoFraming = result.framing ?? {
      rindImage: result.photoDataUrl,
      bellyImage: result.bellyPhotoDataUrl,
      cropBox: { x: 0.2, y: 0.2, size: 0.6 },
      variety: result.variety,
      size: result.size,
    };

    setFlow((current) => ({
      ...current,
      croppedPhotoUrl: result.photoDataUrl,
      bellyPhotoUrl: result.bellyPhotoDataUrl ?? null,
      variety: result.variety,
      size: result.size,
      framing,
    }));

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const mainImgData = ctx.getImageData(0, 0, img.width, img.height);

      const publishVisual = (visual: VisualFeatures) => {
        stepRef.current = 'knock';
        setFlow((current) => ({
          ...current,
          visualFeatures: visual,
          step: 'knock',
        }));
      };

      if (result.bellyPhotoDataUrl) {
        const bellyImg = new Image();
        bellyImg.onload = () => {
          const bellyCanvas = document.createElement('canvas');
          bellyCanvas.width = bellyImg.width;
          bellyCanvas.height = bellyImg.height;
          const bellyCtx = bellyCanvas.getContext('2d');
          if (bellyCtx) {
            bellyCtx.drawImage(bellyImg, 0, 0);
            const bellyImgData = bellyCtx.getImageData(0, 0, bellyImg.width, bellyImg.height);
            publishVisual(
              analyzeWatermelonImage(mainImgData, {
                groundSpotImage: bellyImgData,
              })
            );
          } else {
            publishVisual(analyzeWatermelonImage(mainImgData, result.groundSpotPoint));
          }
        };
        bellyImg.onerror = () => {
          publishVisual(analyzeWatermelonImage(mainImgData, result.groundSpotPoint));
        };
        bellyImg.src = result.bellyPhotoDataUrl;
      } else {
        publishVisual(analyzeWatermelonImage(mainImgData, result.groundSpotPoint));
      }
    };
    img.onerror = () => {
      console.warn('Failed to decode main cropped watermelon image');
      stepRef.current = 'photo';
      setFlow((current) => ({ ...current, step: 'photo' }));
    };
    img.src = result.photoDataUrl;
  };

  const commitAssessment = async (audioFeats: AudioFeatures) => {
    if (stepRef.current !== 'knock') return;
    const current = flowRef.current;
    if (!current.visualFeatures || !current.croppedPhotoUrl) return;

    const result = fuseRipenessSignals(current.visualFeatures, audioFeats, {
      variety: current.variety,
      size: current.size,
    });

    const scanId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record: MelonScanRecord = {
      id: scanId,
      createdAt: Date.now(),
      photoDataUrl: current.croppedPhotoUrl,
      bellyPhotoDataUrl: current.bellyPhotoUrl || undefined,
      variety: current.variety,
      size: current.size,
      result,
      feedback: 'unrated',
    };

    setFlow((prev) => ({
      ...prev,
      currentResult: result,
      currentScanId: scanId,
    }));

    try {
      await saveScanRecord(record);
    } catch (err) {
      console.warn('Failed to persist scan record to IndexedDB:', err);
    }

    if (stepRef.current !== 'knock') return;
    stepRef.current = 'result';
    setFlow((prev) => ({ ...prev, step: 'result' }));
  };

  const handleSkipKnock = () => {
    const fallbackAudio: AudioFeatures = {
      peakFrequencyHz: 0,
      rmsEnergy: 0,
      spectralCentroidHz: 0,
      amplitudeStdDev: 0,
      skewness: 0,
      kurtosis: 0,
      lowMidRatio: 1,
      knockCount: 0,
      acousticRipenessScore: 0.5,
      notes: ['Audio knock skipped by user'],
    };
    void commitAssessment(fallbackAudio);
  };

  const handleSaveFeedback = async (feedback: TasteFeedback, note?: string) => {
    const scanId = flowRef.current.currentScanId;
    if (scanId) {
      await updateScanFeedback(scanId, feedback, note);
    }
  };

  const startNewScan = () => {
    stepRef.current = 'photo';
    setFlow(freshFlow('photo'));
  };

  const navigateHome = () => {
    stepRef.current = 'home';
    setFlow(freshFlow('home'));
  };

  const handleBackToPhoto = () => {
    if (stepRef.current !== 'knock') return;
    stepRef.current = 'photo';
    setFlow((current) => backFromKnock(current));
  };

  const {
    step,
    croppedPhotoUrl,
    currentResult,
    currentScanId,
    framing,
  } = flow;

  return (
    <AppShell
      currentStep={step}
      onNavigateHome={navigateHome}
      onToggleHistory={() => {
        const next = step === 'history' ? 'home' : 'history';
        stepRef.current = next;
        setFlow((current) => ({
          ...current,
          step: current.step === 'history' ? 'home' : 'history',
        }));
      }}
    >
      {step === 'home' && (
        <LandingPage
          onStartScan={startNewScan}
          onOpenHistory={() => setFlow((current) => ({ ...current, step: 'history' }))}
        />
      )}

      {step === 'photo' && (
        <PhotoCapture
          onPhotoCropped={handlePhotoCaptured}
          onBack={navigateHome}
          initialFraming={framing}
        />
      )}

      {step === 'knock' && (
        <KnockRecorderView
          onKnockComplete={commitAssessment}
          onSkipKnock={handleSkipKnock}
          onBack={handleBackToPhoto}
        />
      )}

      {step === 'result' && currentResult && (
        <ResultCard
          result={currentResult}
          photoUrl={croppedPhotoUrl || undefined}
          currentScanId={currentScanId || undefined}
          onSaveAndFeedback={handleSaveFeedback}
          onNewScan={startNewScan}
        />
      )}

      {step === 'history' && <HistoryView onBack={navigateHome} />}
    </AppShell>
  );
};

export default App;

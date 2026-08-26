import React, { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { PhotoCapture, PhotoCaptureResult } from './components/PhotoCapture';
import { KnockRecorderView } from './components/KnockRecorderView';
import { ResultCard } from './components/ResultCard';
import { HistoryView } from './components/HistoryView';
import { AppShell, AppStep } from './components/ui/AppShell';
import { analyzeWatermelonImage } from './lib/vision/analyzer';
import { fuseRipenessSignals } from './lib/score/fusion';
import { saveScanRecord, updateScanFeedback } from './lib/history/storage';
import {
  VisualFeatures,
  AudioFeatures,
  RipenessResult,
  MelonScanRecord,
  TasteFeedback,
  MelonVariety,
  MelonSize,
} from './lib/types';

export const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('home');
  const [croppedPhotoUrl, setCroppedPhotoUrl] = useState<string | null>(null);
  const [bellyPhotoUrl, setBellyPhotoUrl] = useState<string | null>(null);
  const [variety, setVariety] = useState<MelonVariety>('striped');
  const [size, setSize] = useState<MelonSize>('medium');
  const [visualFeatures, setVisualFeatures] = useState<VisualFeatures | null>(null);
  const [currentResult, setCurrentResult] = useState<RipenessResult | null>(null);
  const [currentScanId, setCurrentScanId] = useState<string | null>(null);

  const handlePhotoCaptured = (result: PhotoCaptureResult) => {
    setCroppedPhotoUrl(result.photoDataUrl);
    setBellyPhotoUrl(result.bellyPhotoDataUrl || null);
    setVariety(result.variety);
    setSize(result.size);

    // Analyze image on canvas
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const mainImgData = ctx.getImageData(0, 0, img.width, img.height);

      if (result.bellyPhotoDataUrl) {
        // Also load dedicated belly photo if present
        const bellyImg = new Image();
        bellyImg.onload = () => {
          const bellyCanvas = document.createElement('canvas');
          bellyCanvas.width = bellyImg.width;
          bellyCanvas.height = bellyImg.height;
          const bellyCtx = bellyCanvas.getContext('2d');
          if (bellyCtx) {
            bellyCtx.drawImage(bellyImg, 0, 0);
            const bellyImgData = bellyCtx.getImageData(0, 0, bellyImg.width, bellyImg.height);
            const visual = analyzeWatermelonImage(mainImgData, {
              groundSpotImage: bellyImgData,
            });
            setVisualFeatures(visual);
            setStep('knock');
          } else {
            const visual = analyzeWatermelonImage(mainImgData, result.groundSpotPoint);
            setVisualFeatures(visual);
            setStep('knock');
          }
        };
        bellyImg.onerror = () => {
          // Fallback if belly image fails to decode
          const visual = analyzeWatermelonImage(mainImgData, result.groundSpotPoint);
          setVisualFeatures(visual);
          setStep('knock');
        };
        bellyImg.src = result.bellyPhotoDataUrl;
      } else {
        const visual = analyzeWatermelonImage(mainImgData, result.groundSpotPoint);
        setVisualFeatures(visual);
        setStep('knock');
      }
    };
    img.onerror = () => {
      console.warn('Failed to decode main cropped watermelon image');
      setStep('photo');
    };
    img.src = result.photoDataUrl;
  };

  const handleKnockComplete = async (audioFeats: AudioFeatures) => {
    if (!visualFeatures || !croppedPhotoUrl) return;

    const result = fuseRipenessSignals(visualFeatures, audioFeats, { variety, size });
    setCurrentResult(result);

    const scanId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setCurrentScanId(scanId);

    const record: MelonScanRecord = {
      id: scanId,
      createdAt: Date.now(),
      photoDataUrl: croppedPhotoUrl,
      bellyPhotoDataUrl: bellyPhotoUrl || undefined,
      variety,
      size,
      result,
      feedback: 'unrated',
    };

    try {
      await saveScanRecord(record);
    } catch (err) {
      console.warn('Failed to persist scan record to IndexedDB:', err);
    }
    setStep('result');
  };

  const handleSkipKnock = async () => {
    if (!visualFeatures || !croppedPhotoUrl) return;
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

    const result = fuseRipenessSignals(visualFeatures, fallbackAudio, { variety, size });
    setCurrentResult(result);

    const scanId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setCurrentScanId(scanId);

    const record: MelonScanRecord = {
      id: scanId,
      createdAt: Date.now(),
      photoDataUrl: croppedPhotoUrl,
      bellyPhotoDataUrl: bellyPhotoUrl || undefined,
      variety,
      size,
      result,
      feedback: 'unrated',
    };

    try {
      await saveScanRecord(record);
    } catch (err) {
      console.warn('Failed to persist scan record to IndexedDB:', err);
    }
    setStep('result');
  };

  const handleSaveFeedback = async (feedback: TasteFeedback, note?: string) => {
    if (currentScanId) {
      await updateScanFeedback(currentScanId, feedback, note);
    }
  };

  const startNewScan = () => {
    setCroppedPhotoUrl(null);
    setBellyPhotoUrl(null);
    setVisualFeatures(null);
    setCurrentResult(null);
    setCurrentScanId(null);
    setStep('photo');
  };

  const navigateHome = () => {
    setCroppedPhotoUrl(null);
    setBellyPhotoUrl(null);
    setVisualFeatures(null);
    setCurrentResult(null);
    setCurrentScanId(null);
    setStep('home');
  };

  return (
    <AppShell
      currentStep={step}
      onNavigateHome={navigateHome}
      onToggleHistory={() => setStep(step === 'history' ? 'home' : 'history')}
    >
      {step === 'home' && (
        <LandingPage
          onStartScan={startNewScan}
          onOpenHistory={() => setStep('history')}
        />
      )}

      {step === 'photo' && (
        <PhotoCapture
          onPhotoCropped={handlePhotoCaptured}
          onBack={navigateHome}
        />
      )}

      {step === 'knock' && (
        <KnockRecorderView
          onKnockComplete={handleKnockComplete}
          onSkipKnock={handleSkipKnock}
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

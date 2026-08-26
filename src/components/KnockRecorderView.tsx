import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, Hand } from 'lucide-react';
import { KnockRecorder } from '../lib/audio/recorder';
import { AudioFeatures } from '../lib/types';
import { Button, Card, ProgressDots } from './ui';
import { useI18n } from '../i18n';
import { cn } from '../lib/cn';

interface KnockRecorderViewProps {
  onKnockComplete: (features: AudioFeatures) => void;
  onSkipKnock?: () => void;
}

const FLAT_MIC_RMS = 0.0012;
const FLAT_MIC_DELAY_MS = 2000;

export const KnockRecorderView: React.FC<KnockRecorderViewProps> = ({
  onKnockComplete,
  onSkipKnock,
}) => {
  const { t } = useI18n();
  const [isRecording, setIsRecording] = useState(false);
  const [knockCount, setKnockCount] = useState(0);
  const [volume, setVolume] = useState(0);
  const [liveRms, setLiveRms] = useState(0);
  const [noiseFloor, setNoiseFloor] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [micHint, setMicHint] = useState<string | null>(null);

  const recorderRef = useRef<KnockRecorder | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onKnockCompleteRef = useRef(onKnockComplete);
  const finishingRef = useRef(false);
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatMicTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeLockRef = useRef<any>(null);
  const peakRmsRef = useRef(0);

  onKnockCompleteRef.current = onKnockComplete;

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {}
      wakeLockRef.current = null;
    }
  }, []);

  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator && (navigator as any).wakeLock) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch {
      // ignore
    }
  }, []);

  const clearTimers = () => {
    if (finishTimeoutRef.current !== null) {
      clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = null;
    }
    if (flatMicTimeoutRef.current !== null) {
      clearTimeout(flatMicTimeoutRef.current);
      flatMicTimeoutRef.current = null;
    }
  };

  const handleFinish = useCallback(() => {
    if (finishingRef.current) return;
    const recorder = recorderRef.current;
    if (!recorder) return;
    finishingRef.current = true;
    clearTimers();
    void releaseWakeLock();
    const features = recorder.stopAndAnalyze();
    setIsRecording(false);
    setMicHint(null);
    onKnockCompleteRef.current(features);
  }, [releaseWakeLock]);

  const handleFinishRef = useRef(handleFinish);
  handleFinishRef.current = handleFinish;

  useEffect(() => {
    const recorder = new KnockRecorder();
    recorderRef.current = recorder;

    recorder.onKnockDetected = (count) => {
      setKnockCount(count);
      if (count >= 3) {
        finishTimeoutRef.current = setTimeout(() => {
          handleFinishRef.current();
        }, 500);
      }
    };

    recorder.onVolumeUpdate = (vol) => {
      setVolume(vol);
      setLiveRms(recorder.liveRms);
      setNoiseFloor(recorder.noiseFloor);
      peakRmsRef.current = Math.max(peakRmsRef.current, recorder.liveRms);
    };

    recorder.onSpectrumUpdate = (spectrum) => {
      drawSpectrum(spectrum);
    };

    return () => {
      clearTimers();
      void releaseWakeLock();
      recorder.stopAndAnalyze();
    };
  }, [releaseWakeLock]);

  const drawSpectrum = (data: Uint8Array) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = canvas.width / 48;
    let x = 0;

    const computed = getComputedStyle(document.documentElement);
    const primaryColor = computed.getPropertyValue('--color-primary').trim() || '#1B7A3D';
    const spotColor = computed.getPropertyValue('--color-spot').trim() || '#C4920A';
    const accentColor = computed.getPropertyValue('--color-accent').trim() || '#E11D48';

    for (let i = 0; i < 48; i++) {
      const barHeight = (data[i * 2] / 255) * canvas.height;

      const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
      grad.addColorStop(0, primaryColor);
      grad.addColorStop(0.65, spotColor);
      grad.addColorStop(1, accentColor);

      ctx.fillStyle = grad;
      ctx.fillRect(x, canvas.height - barHeight, Math.max(1, barWidth - 2), barHeight);
      x += barWidth;
    }
  };

  const handleStart = async () => {
    try {
      clearTimers();
      setErrorMessage(null);
      setMicHint(null);
      setKnockCount(0);
      setLiveRms(0);
      setNoiseFloor(0);
      peakRmsRef.current = 0;
      finishingRef.current = false;
      if (recorderRef.current) {
        await recorderRef.current.startListening();
        setIsRecording(true);
        void requestWakeLock();
        flatMicTimeoutRef.current = setTimeout(() => {
          if (peakRmsRef.current < FLAT_MIC_RMS) {
            setMicHint(t('knockMicHint'));
          }
        }, FLAT_MIC_DELAY_MS);
      }
    } catch {
      setErrorMessage(t('knockMicError'));
      setIsRecording(false);
    }
  };

  const handleManualKnock = () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorder.captureManualKnock();
    setKnockCount(recorder.getKnockCount());
  };

  const micIsHearing = isRecording && liveRms > Math.max(noiseFloor * 1.15, 0.0018);

  const getStatusText = () => {
    if (!isRecording) return t('knockPressStart');
    if (micIsHearing) {
      if (knockCount === 0) return t('knockMicHearing');
      return t('knockDetected', { count: knockCount, next: Math.min(3, knockCount + 1) });
    }
    if (knockCount === 0) return t('knockListening');
    return t('knockDetected', { count: knockCount, next: Math.min(3, knockCount + 1) });
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto space-y-5 animate-in fade-in pb-6">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-ink font-display">{t('knockTitle')}</h2>
        <p className="text-xs text-ink-muted max-w-xs">
          {t('knockDesc')}
        </p>
      </div>

      <div className="py-2">
        <ProgressDots current={knockCount} total={3} isActive={isRecording} />
      </div>

      <Card variant="default" className="w-full flex flex-col items-center space-y-3.5">
        <div className="w-full h-20 rounded-xl overflow-hidden bg-surface-subtle border border-border flex items-center justify-center p-1">
          <canvas ref={canvasRef} width={320} height={80} className="w-full h-full rounded-lg" />
        </div>

        <div className="w-full flex items-center space-x-2.5 px-1">
          <Volume2 className="w-4 h-4 text-ink-muted shrink-0" />
          <div className="flex-1 h-2 bg-surface-subtle rounded-full overflow-hidden border border-border/70">
            <div
              className="h-full bg-primary transition-all duration-75 rounded-full"
              style={{ width: `${Math.min(100, volume * 100)}%` }}
            />
          </div>
        </div>

        <p
          className={cn(
            'text-xs text-center font-medium',
            micIsHearing ? 'text-ripe' : 'text-ink-muted'
          )}
        >
          {getStatusText()}
        </p>
      </Card>

      {errorMessage && (
        <p className="text-xs text-unripe bg-unripe-bg border border-unripe-border px-3.5 py-2.5 rounded-xl text-center font-medium w-full">
          {errorMessage}
        </p>
      )}

      {isRecording && micHint && (
        <p className="text-xs text-borderline bg-borderline-bg border border-borderline-border px-3.5 py-2.5 rounded-xl text-center font-medium w-full">
          {micHint}
        </p>
      )}

      <div className="w-full flex flex-col space-y-2 pt-1">
        {!isRecording ? (
          <Button onClick={handleStart} variant="primary" size="lg" fullWidth className="gap-2 shadow-md shadow-primary/20">
            <Mic className="w-5 h-5" />
            <span>{t('knockStartBtn')}</span>
          </Button>
        ) : (
          <>
            <Button
              onClick={handleManualKnock}
              variant="secondary"
              size="md"
              fullWidth
              className="gap-2"
              disabled={knockCount >= 3}
            >
              <Hand className="w-5 h-5" />
              <span>{t('knockTapManual')}</span>
            </Button>
            <Button onClick={handleFinish} variant="spot" size="lg" fullWidth className="gap-2">
              <MicOff className="w-5 h-5" />
              <span>
                {t('knockFinishWithCount', {
                  count: knockCount,
                  plural: knockCount === 1 ? '' : 's',
                })}
              </span>
            </Button>
          </>
        )}

        {onSkipKnock && (
          <Button onClick={onSkipKnock} variant="ghost" size="sm" fullWidth className="text-xs">
            {t('knockSkip')}
          </Button>
        )}
      </div>
    </div>
  );
};

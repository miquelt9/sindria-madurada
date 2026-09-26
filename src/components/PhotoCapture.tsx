import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera,
  Image as ImageIcon,
  RotateCw,
  Check,
  Crosshair,
  Flashlight,
  AlertTriangle,
  Sparkles,
  ArrowLeft,
  X,
  CheckCircle2,
} from 'lucide-react';
import { Button, IconButton, Card } from './ui';
import { useI18n } from '../i18n';
import { validateWatermelonImage, WatermelonGateResult } from '../lib/vision/watermelonGate';
import { MelonVariety, MelonSize } from '../lib/types';
import { cn } from '../lib/cn';

export interface PhotoCaptureResult {
  photoDataUrl: string;
  groundSpotPoint?: { x: number; y: number };
  bellyPhotoDataUrl?: string;
  variety: MelonVariety;
  size: MelonSize;
}

interface PhotoCaptureProps {
  onPhotoCropped: (result: PhotoCaptureResult) => void;
  onBack?: () => void;
}

type CaptureTarget = 'rind' | 'belly';

const VARIETY_STORAGE_KEY = 'sindria.variety';
const SIZE_STORAGE_KEY = 'sindria.size';

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({ onPhotoCropped, onBack }) => {
  const { t } = useI18n();

  // Target being captured (rind photo or optional belly photo)
  const [target, setTarget] = useState<CaptureTarget>('rind');

  // Captured images
  const [capturedRindImage, setCapturedRindImage] = useState<string | null>(null);
  const [capturedBellyImage, setCapturedBellyImage] = useState<string | null>(null);

  // Crop & Ground spot tap
  const [cropBox, setCropBox] = useState<{ x: number; y: number; size: number }>({
    x: 0.2,
    y: 0.2,
    size: 0.6,
  });
  const [groundSpotPoint, setGroundSpotPoint] = useState<{ x: number; y: number } | undefined>(
    undefined
  );
  const [mode, setMode] = useState<'center_crop' | 'mark_spot'>('center_crop');

  // Variety & Size chips
  const [variety, setVariety] = useState<MelonVariety>(() => {
    try {
      const saved = localStorage.getItem(VARIETY_STORAGE_KEY);
      if (saved === 'striped' || saved === 'solid') return saved;
    } catch {}
    return 'striped';
  });

  const [size, setSize] = useState<MelonSize>(() => {
    try {
      const saved = localStorage.getItem(SIZE_STORAGE_KEY);
      if (saved === 'small' || saved === 'medium' || saved === 'large') return saved;
    } catch {}
    return 'medium';
  });

  // Camera & Torch
  const [cameraActive, setCameraActive] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // Watermelon gate status
  const [isGateChecking, setIsGateChecking] = useState(false);
  const [gateWarning, setGateWarning] = useState<WatermelonGateResult | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isMountedRef = useRef(true);
  const cameraRequestIdRef = useRef(0);

  const handleVarietyChange = (val: MelonVariety) => {
    setVariety(val);
    try {
      localStorage.setItem(VARIETY_STORAGE_KEY, val);
    } catch {}
  };

  const handleSizeChange = (val: MelonSize) => {
    setSize(val);
    try {
      localStorage.setItem(SIZE_STORAGE_KEY, val);
    } catch {}
  };

  // Start back camera
  const startCamera = useCallback(async () => {
    const reqId = ++cameraRequestIdRef.current;
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setTorchOn(false);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (!isMountedRef.current || cameraRequestIdRef.current !== reqId) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
        setTorchSupported(Boolean(capabilities && 'torch' in capabilities));
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
    } catch {
      if (!isMountedRef.current || cameraRequestIdRef.current !== reqId) return;
      setCameraActive(false);
      setTorchSupported(false);
    }
  }, []);

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextState = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setTorchOn(nextState);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    startCamera();
    return () => {
      isMountedRef.current = false;
      cameraRequestIdRef.current++;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [startCamera]);

  const stopCameraStream = () => {
    cameraRequestIdRef.current++;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  };

  const processCapturedImage = async (dataUrl: string, forTarget: CaptureTarget) => {
    if (forTarget === 'rind') {
      setCapturedRindImage(dataUrl);
      stopCameraStream();

      // Run watermelon gate check on rind photo
      setIsGateChecking(true);
      setGateWarning(null);
      try {
        const result = await validateWatermelonImage(dataUrl);
        if (!result.passed && !result.couldNotVerify) {
          setGateWarning(result);
        }
      } catch {
        // Fail-open
      } finally {
        setIsGateChecking(false);
      }
    } else {
      setCapturedBellyImage(dataUrl);
      setTarget('rind');
      stopCameraStream();
    }
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    void processCapturedImage(dataUrl, target);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Use createImageBitmap to automatically handle EXIF orientation
      let imgBitmap: ImageBitmap | null = null;
      try {
        imgBitmap = await createImageBitmap(file);
      } catch {
        // Fallback for older browsers
      }

      if (imgBitmap) {
        const maxDim = 1200;
        let w = imgBitmap.width;
        let h = imgBitmap.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(imgBitmap, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          void processCapturedImage(dataUrl, target);
          return;
        }
      }

      // FileReader fallback
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          void processCapturedImage(event.target.result, target);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      // ignore
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const clickY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    if (mode === 'center_crop') {
      const sizeRatio = 0.55;
      const x = Math.max(0, Math.min(1 - sizeRatio, clickX - sizeRatio / 2));
      const y = Math.max(0, Math.min(1 - sizeRatio, clickY - sizeRatio / 2));
      setCropBox({ x, y, size: sizeRatio });
    } else {
      setGroundSpotPoint({ x: clickX, y: clickY });
    }
  };

  const confirmAndProceed = () => {
    if (!capturedRindImage) return;

    // Render cropped portion to ~800px JPEG quality ~0.75
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const minDim = Math.min(img.width, img.height);
      const visX = (img.width - minDim) / 2;
      const visY = (img.height - minDim) / 2;
      const cropX = visX + cropBox.x * minDim;
      const cropY = visY + cropBox.y * minDim;
      const cropW = cropBox.size * minDim;
      const cropH = cropBox.size * minDim;

      const outputSize = 800;
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, outputSize, outputSize);
        const croppedUrl = canvas.toDataURL('image/jpeg', 0.75);

        // Convert ground spot to crop relative if present
        let relativeSpot: { x: number; y: number } | undefined;
        if (groundSpotPoint) {
          relativeSpot = {
            x: Math.max(0, Math.min(1, (groundSpotPoint.x - cropBox.x) / cropBox.size)),
            y: Math.max(0, Math.min(1, (groundSpotPoint.y - cropBox.y) / cropBox.size)),
          };
        }

        onPhotoCropped({
          photoDataUrl: croppedUrl,
          groundSpotPoint: relativeSpot,
          bellyPhotoDataUrl: capturedBellyImage || undefined,
          variety,
          size,
        });
      }
    };
    img.onerror = () => {
      onPhotoCropped({
        photoDataUrl: capturedRindImage,
        bellyPhotoDataUrl: capturedBellyImage || undefined,
        variety,
        size,
      });
    };
    img.src = capturedRindImage;
  };

  const startBellyCapture = () => {
    setTarget('belly');
    startCamera();
  };

  const removeBellyPhoto = () => {
    setCapturedBellyImage(null);
  };

  const resetAllPhotos = () => {
    setCapturedRindImage(null);
    setCapturedBellyImage(null);
    setGroundSpotPoint(undefined);
    setGateWarning(null);
    setTarget('rind');
    startCamera();
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto space-y-4 animate-in fade-in pb-8">
      {/* Back button header when in capture step */}
      {onBack && !capturedRindImage && (
        <div className="w-full flex items-center justify-between px-1">
          <Button onClick={onBack} variant="secondary" size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            <span>{t('back')}</span>
          </Button>
          <div className="text-xs font-bold text-ink-muted uppercase tracking-wider">
            {target === 'belly' ? t('cropStepBelly') : t('cropStepRind')}
          </div>
          <div className="w-12" />
        </div>
      )}

      {/* Variety & Size Selector Chips (always accessible for fast grocery tweaking) */}
      <Card variant="subtle" className="w-full p-2.5 space-y-2">
        {/* Stack below 360px so three size chips stay ≥44px beside the app-shell padding. */}
        <div className="flex flex-col gap-2 min-[360px]:flex-row min-[360px]:items-stretch">
          {/* Variety Chip Group */}
          <div className="w-full min-w-0 space-y-1 min-[360px]:flex-1">
            <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block px-1">
              {t('varietyLabel')}
            </span>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => handleVarietyChange('striped')}
                className={cn(
                  'touch-target w-full px-2 text-xs font-bold leading-tight rounded-lg border transition-all text-center',
                  variety === 'striped'
                    ? 'bg-primary text-primary-fg border-primary shadow-xs'
                    : 'bg-surface-raised border-border text-ink-muted hover:text-ink'
                )}
              >
                {t('varietyStriped')}
              </button>
              <button
                type="button"
                onClick={() => handleVarietyChange('solid')}
                className={cn(
                  'touch-target w-full px-2 text-xs font-bold leading-tight rounded-lg border transition-all text-center',
                  variety === 'solid'
                    ? 'bg-primary text-primary-fg border-primary shadow-xs'
                    : 'bg-surface-raised border-border text-ink-muted hover:text-ink'
                )}
              >
                {t('varietySolid')}
              </button>
            </div>
          </div>

          {/* Size Chip Group */}
          <div className="w-full min-w-0 space-y-1 min-[360px]:flex-1">
            <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block px-1">
              {t('sizeLabel')}
            </span>
            <div className="grid grid-cols-3 gap-1">
              {(['small', 'medium', 'large'] as MelonSize[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSizeChange(s)}
                  className={cn(
                    'touch-target w-full px-1 text-xs font-bold rounded-lg border transition-all text-center',
                    size === s
                      ? 'bg-spot text-spot-fg border-spot shadow-xs'
                      : 'bg-surface-raised border-border text-ink-muted hover:text-ink'
                  )}
                >
                  {s === 'small' ? 'P' : s === 'medium' ? 'M' : 'G'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Camera Live Viewfinder Mode */}
      {(!capturedRindImage || target === 'belly') ? (
        <div className="w-full flex flex-col items-center space-y-4">
          <div className="relative w-full aspect-square bg-surface-raised rounded-card overflow-hidden border-2 border-primary/40 shadow-card flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Viewfinder Guide Overlay */}
            <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-primary/60 rounded-full m-8 flex items-center justify-center shadow-inner">
              <span className="text-xs bg-black/75 text-white font-bold px-3.5 py-1.5 rounded-full backdrop-blur-md border border-white/20 shadow-lg text-center max-w-[220px]">
                {target === 'belly' ? t('captureGuideBelly') : t('captureGuideRind')}
              </span>
            </div>

            {/* Torch toggle button if supported */}
            {torchSupported && cameraActive && (
              <button
                type="button"
                onClick={toggleTorch}
                className={cn(
                  'absolute top-4 right-4 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center backdrop-blur-md border shadow-md transition-colors',
                  torchOn
                    ? 'bg-spot text-spot-fg border-spot'
                    : 'bg-black/60 text-white border-white/20 hover:bg-black/80'
                )}
                title={torchOn ? t('torchOn') : t('torchOff')}
              >
                <Flashlight className="w-5 h-5" />
              </button>
            )}

            {!cameraActive && (
              <div className="absolute inset-0 bg-surface-raised/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-3">
                <Camera className="w-12 h-12 text-ink-muted" />
                <p className="text-sm text-ink-muted">{t('cameraInactive')}</p>
                <Button onClick={startCamera} variant="primary" size="md">
                  {t('cameraActivate')}
                </Button>
              </div>
            )}
          </div>

          {/* Shutter & Gallery Controls */}
          <div className="flex items-center justify-around w-full px-4 pt-1">
            <label
              className="min-w-[48px] min-h-[48px] rounded-full cursor-pointer transition border border-border bg-surface-raised hover:bg-surface-subtle text-ink shadow-sm flex items-center justify-center focus-within:ring-2 focus-within:ring-primary"
              title={t('uploadFromGallery')}
            >
              <ImageIcon className="w-5 h-5 text-ink-muted" />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={takeSnapshot}
              className="w-20 h-20 bg-primary hover:bg-primary-hover text-primary-fg rounded-full p-1.5 flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-transform border-4 border-surface-raised ring-2 ring-primary"
              title={t('takePhoto')}
              aria-label={t('takePhoto')}
            >
              <div className="w-full h-full bg-primary-fg/20 rounded-full border border-primary-fg/40" />
            </button>

            <IconButton
              onClick={startCamera}
              variant="secondary"
              size="md"
              title={t('cameraRestart')}
              aria-label={t('cameraRestart')}
            >
              <RotateCw className="w-5 h-5 text-ink-muted" />
            </IconButton>
          </div>

          {target === 'belly' && (
            <Button
              onClick={() => {
                setTarget('rind');
                stopCameraStream();
              }}
              variant="ghost"
              size="sm"
            >
              {t('cancel')}
            </Button>
          )}
        </div>
      ) : (
        /* Image Crop & Spot Marking View */
        <div className="w-full flex flex-col space-y-3 animate-in fade-in">
          {/* Watermelon Gate Warning Banner */}
          {gateWarning && (
            <div className="p-3 bg-unripe-bg border border-unripe-border rounded-xl space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 text-unripe font-bold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{t('gateWarning')}</span>
              </div>
              {gateWarning.detectedLabel && (
                <p className="text-[11px] text-ink-muted">
                  Detectat / Detected:{' '}
                  <span className="font-semibold text-ink">
                    {gateWarning.detectedLabel} ({gateWarning.confidence}%)
                  </span>
                </p>
              )}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  onClick={resetAllPhotos}
                  variant="secondary"
                  size="sm"
                  className="flex-1 text-xs"
                >
                  {t('gateRetake')}
                </Button>
                <Button
                  onClick={() => setGateWarning(null)}
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-xs text-ink-muted hover:text-ink underline"
                >
                  {t('gateBypass')}
                </Button>
              </div>
            </div>
          )}

          {isGateChecking && (
            <div className="flex items-center justify-center gap-2 p-2 bg-surface-subtle border border-border rounded-xl text-xs font-semibold text-ink-muted animate-pulse">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>{t('gateChecking')}</span>
            </div>
          )}

          <Card variant="default" className="p-3 space-y-3">
            <div className="flex flex-wrap justify-between items-center gap-2 px-1">
              <h3 className="text-xs font-bold text-ink flex items-center gap-1.5">
                {mode === 'center_crop' ? t('cropStepRind') : t('cropStepBelly')}
              </h3>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => setMode('center_crop')}
                  className={cn(
                    'touch-target shrink-0 text-xs px-3 rounded-lg font-bold transition',
                    mode === 'center_crop'
                      ? 'bg-primary text-primary-fg'
                      : 'bg-surface-subtle text-ink-muted hover:text-ink'
                  )}
                >
                  {t('cropModeCrop')}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('mark_spot')}
                  className={cn(
                    'touch-target shrink-0 text-xs px-3 rounded-lg font-bold transition inline-flex items-center gap-1',
                    mode === 'mark_spot'
                      ? 'bg-spot text-spot-fg'
                      : 'bg-surface-subtle text-ink-muted hover:text-ink'
                  )}
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>{t('cropModeSpot')}</span>
                </button>
              </div>
            </div>

            <div
              className="relative w-full aspect-square bg-black rounded-xl overflow-hidden cursor-crosshair select-none border border-border"
              onClick={handleImageClick}
            >
              <img
                ref={imageRef}
                src={capturedRindImage}
                alt="Síndria capturada"
                className="w-full h-full object-cover pointer-events-none"
              />

              {/* Crop Box Overlay */}
              <div
                className="absolute border-2 border-primary bg-primary/15 rounded-xl pointer-events-none shadow-lg transition-all"
                style={{
                  left: `${cropBox.x * 100}%`,
                  top: `${cropBox.y * 100}%`,
                  width: `${cropBox.size * 100}%`,
                  height: `${cropBox.size * 100}%`,
                }}
              />

              {/* Yellow Ground Spot Pin */}
              {groundSpotPoint && (
                <div
                  className="absolute w-6 h-6 -ml-3 -mt-3 bg-spot border-2 border-black rounded-full flex items-center justify-center shadow-lg animate-bounce pointer-events-none"
                  style={{
                    left: `${groundSpotPoint.x * 100}%`,
                    top: `${groundSpotPoint.y * 100}%`,
                  }}
                >
                  <div className="w-1.5 h-1.5 bg-black rounded-full" />
                </div>
              )}
            </div>
          </Card>

          {/* Dedicated Belly Photo Card / Button */}
          {capturedBellyImage ? (
            <Card variant="subtle" className="p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={capturedBellyImage}
                  alt="Panxa"
                  className="w-11 h-11 rounded-lg object-cover border border-border"
                />
                <div>
                  <div className="flex items-center gap-1 text-xs font-bold text-ripe">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t('bellyShotAdded')}</span>
                  </div>
                  <span className="text-[10px] text-ink-muted">
                    S'utilitzarà per a la taca de terra
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={startBellyCapture}
                  className="p-1.5 text-ink-muted hover:text-ink text-xs font-bold"
                  title={t('bellyShotRetake')}
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={removeBellyPhoto}
                  className="p-1.5 text-ink-muted hover:text-accent"
                  title={t('delete')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ) : (
            <button
              type="button"
              onClick={startBellyCapture}
              className="w-full min-h-[44px] py-2 px-3 border border-dashed border-spot/60 hover:border-spot bg-spot/5 hover:bg-spot/10 text-ink rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
            >
              <Sparkles className="w-4 h-4 text-spot" />
              <span>{t('bellyShotButton')}</span>
            </button>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 w-full pt-1">
            <Button
              onClick={resetAllPhotos}
              variant="secondary"
              size="md"
              className="flex-1"
            >
              {t('retake')}
            </Button>
            <Button
              onClick={confirmAndProceed}
              variant="primary"
              size="md"
              className="flex-1 gap-2 shadow-md shadow-primary/20"
            >
              <span>{t('continueKnocks')}</span>
              <Check className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

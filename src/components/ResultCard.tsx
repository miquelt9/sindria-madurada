import React, { useState, useEffect } from 'react';
import {
  RipenessResult,
  TasteFeedback,
  MelonScanRecord,
} from '../lib/types';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Activity,
  Eye,
  Info,
  RotateCcw,
  Calendar,
  Share2,
  Check,
  TrendingUp,
  TrendingDown,
  Equal,
} from 'lucide-react';
import { Button, Card, ScoreRing } from './ui';
import { useI18n } from '../i18n';
import { getAllScanRecords } from '../lib/history/storage';
import { generateShareCardBlob } from '../lib/share/shareCard';
import { firmnessCue } from '../lib/copy/firmnessCue';
import { cn } from '../lib/cn';

interface ResultCardProps {
  result: RipenessResult;
  photoUrl?: string;
  currentScanId?: string;
  onSaveAndFeedback?: (feedback: TasteFeedback, note?: string) => void;
  onNewScan: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  result,
  photoUrl,
  currentScanId,
  onSaveAndFeedback,
  onNewScan,
}) => {
  const { t } = useI18n();
  const [feedback, setFeedback] = useState<TasteFeedback>('unrated');
  const [saved, setSaved] = useState(false);
  const [previousScan, setPreviousScan] = useState<MelonScanRecord | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Load previous scan from history to enable side-by-side comparison
  useEffect(() => {
    async function loadPrevious() {
      try {
        const records = await getAllScanRecords();
        // Exclude current scan if present in list
        const older = records.filter((r) => r.id !== currentScanId);
        if (older.length > 0) {
          setPreviousScan(older[0]);
        }
      } catch {
        // ignore
      }
    }
    void loadPrevious();
  }, [currentScanId]);

  const getVerdictDetails = () => {
    switch (result.verdict) {
      case 'likely_ripe':
        return {
          title: t('verdictRipe'),
          color: 'text-ripe',
          bannerBg: 'bg-ripe-bg',
          bannerBorder: 'border-ripe-border',
          icon: CheckCircle2,
        };
      case 'likely_unripe':
        return {
          title: t('verdictUnripe'),
          color: 'text-unripe',
          bannerBg: 'bg-unripe-bg',
          bannerBorder: 'border-unripe-border',
          icon: XCircle,
        };
      case 'borderline':
      default:
        return {
          title: t('verdictBorderline'),
          color: 'text-borderline',
          bannerBg: 'bg-borderline-bg',
          bannerBorder: 'border-borderline-border',
          icon: AlertTriangle,
        };
    }
  };

  const details = getVerdictDetails();
  const Icon = details.icon;

  const firmnessLabelFor = (peakHz: number, knockCount: number) => {
    const cue = firmnessCue(peakHz, knockCount);
    if (cue === 'dull') return t('firmnessDull');
    if (cue === 'tight') return t('firmnessTight');
    if (cue === 'unclear') return t('firmnessUnclear');
    return t('audioNotMeasured');
  };

  const eatLine =
    result.verdict === 'likely_ripe'
      ? t('eatWindowRipe')
      : result.verdict === 'likely_unripe'
        ? t('eatWindowUnripe')
        : t('eatWindowBorderline');

  const handleFeedback = (val: TasteFeedback) => {
    setFeedback(val);
    if (onSaveAndFeedback) {
      onSaveAndFeedback(val);
      setSaved(true);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    setShareSuccess(false);
    try {
      const blob = await generateShareCardBlob(result, photoUrl, {
        appTitle: t('appTitle'),
        scoreLabel: t('scoreIndex'),
        verdictLabel: details.title,
        eatWindow: t('eatingWindow'),
        eatWindowValue: eatLine,
        visualLabel: t('visualSignals'),
        audioLabel: t('resonantTone'),
        firmnessLabel: firmnessLabelFor(
          result.audioFeatures.peakFrequencyHz,
          result.audioFeatures.knockCount
        ),
        cardSubtitle: t('appSubtitle'),
        shareNote: t('shareSummary'),
      });

      if (blob && navigator.share && navigator.canShare) {
        const file = new File([blob], 'sindria-madurada.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: t('shareTitle'),
            text: `${t('appTitle')}: ${details.title}. ${eatLine} ${t('shareSummary')}`,
          });
          setShareSuccess(true);
          return;
        }
      }

      // Fallback: Download image file
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sindria-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setShareSuccess(true);
      } else if (navigator.share) {
        await navigator.share({
          title: t('shareTitle'),
          text: `${t('appTitle')}: ${details.title}. ${eatLine} ${t('shareSummary')}`,
        });
        setShareSuccess(true);
      }
    } catch {
      // User cancelled share or share failed
    } finally {
      setIsSharing(false);
    }
  };

  // Difference with previous scan
  const scoreDiff = previousScan ? result.overallScore - previousScan.result.overallScore : 0;

  return (
    <div className="w-full max-w-md mx-auto space-y-4 animate-in fade-in pb-12">
      {/* Primary Score & Verdict Banner */}
      <div
        className={cn(
          'p-5 rounded-card border flex flex-col items-center text-center space-y-3 shadow-card relative overflow-hidden transition-colors',
          details.bannerBorder,
          details.bannerBg
        )}
      >
        {photoUrl && (
          <img
            src={photoUrl}
            alt="Síndria analitzada"
            className="w-20 h-20 rounded-2xl object-cover border border-border shadow-md mb-1 bg-surface-subtle"
          />
        )}
        <div className="flex items-center space-x-2">
          <Icon className={cn('w-7 h-7', details.color)} />
          <h2 className={cn('text-2xl font-black font-display', details.color)}>
            {details.title}
          </h2>
        </div>

        {/* Score Ring Gauge */}
        <div className="my-1">
          <ScoreRing score={result.overallScore} verdict={result.verdict} size={120} />
        </div>

        {/* Confidence Indicator */}
        <div className="flex flex-col items-center gap-1 text-[11px] text-ink-muted bg-surface-subtle/80 px-3 py-1.5 rounded-xl border border-border/70 w-full max-w-xs">
          <div className="flex items-center justify-between w-full">
            <span>{t('confidenceLabel')}:</span>
            <strong className="text-ink font-bold">{result.confidence}%</strong>
          </div>
          <span className="text-[10px] text-ink-muted/80">{t('confidenceNotice')}</span>
        </div>

        <p className="text-xs text-ink-muted leading-relaxed max-w-xs font-medium">
          {result.verdict === 'likely_ripe'
            ? t('summaryRipe')
            : result.verdict === 'likely_unripe'
            ? t('summaryUnripe')
            : t('summaryBorderline')}
        </p>
      </div>

      {/* Eating Window & Ripening Honesty Banner */}
      <Card variant="default" className="p-4 space-y-2.5 border-l-4 border-l-primary">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink uppercase tracking-wider">
            <Calendar className="w-4 h-4 text-primary" />
            <span>{t('eatingWindow')}</span>
          </div>
          <span className="text-xs font-black font-display px-2.5 py-0.5 rounded-full bg-surface-subtle border border-border">
            {result.eatFromDays === 0 && result.eatUntilDays === 0
              ? t('eatImmediate')
              : t('eatDaysRange', { from: result.eatFromDays, until: result.eatUntilDays })}
          </span>
        </div>

        <p className="text-sm font-bold text-ink leading-snug">
          {result.verdict === 'likely_ripe'
            ? t('eatWindowRipe')
            : result.verdict === 'likely_unripe'
            ? t('eatWindowUnripe')
            : t('eatWindowBorderline')}
        </p>

        {result.willNotRipenOffVine && (
          <div className="p-2.5 rounded-xl bg-surface-subtle/80 border border-border/70 flex items-start gap-2 text-[11px] text-ink-muted leading-relaxed">
            <Info className="w-4 h-4 text-borderline shrink-0 mt-0.5" />
            <span>{t('willNotRipenWarning')}</span>
          </div>
        )}
      </Card>

      {/* Multimodal Component Breakdown */}
      <div className="grid grid-cols-2 gap-3">
        {/* Visual Cues */}
        <Card variant="default" className="p-3.5 space-y-2">
          <div className="flex items-center space-x-2 text-primary font-bold">
            <Eye className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">{t('visualSignals')}</span>
          </div>
          <div className="text-2xl font-black text-ink font-display">{result.visualScore}%</div>
          <div className="space-y-1 text-[11px] text-ink-muted font-medium">
            <div className="flex justify-between">
              <span>{t('ribbonStripes')}:</span>
              <span className="text-ink font-bold">
                {Math.round(result.visualFeatures.stripeContrastScore * 100)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>{t('groundSpot')}:</span>
              <span className="text-ink font-bold">
                {Math.round(result.visualFeatures.groundSpotScore * 100)}%
              </span>
            </div>
          </div>
        </Card>

        {/* Audio Cues */}
        <Card variant="default" className="p-3.5 space-y-2">
          <div className="flex items-center space-x-2 text-spot font-bold">
            <Activity className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">{t('acousticKnock')}</span>
          </div>
          {result.audioFeatures.knockCount > 0 ? (
            <>
              <div className="text-2xl font-black text-ink font-display">{result.audioScore}%</div>
              <div className="space-y-1 text-[11px] text-ink-muted font-medium">
                <div className="flex justify-between">
                  <span>{t('resonantTone')}:</span>
                  <span className="text-ink font-bold">
                    {firmnessLabelFor(
                      result.audioFeatures.peakFrequencyHz,
                      result.audioFeatures.knockCount
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{t('knocksRegistered')}:</span>
                  <span className="text-ink font-bold">{result.audioFeatures.knockCount}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-1 py-1">
              <div className="text-sm font-bold text-ink-muted font-display">{t('audioNotMeasured')}</div>
              <div className="text-[10px] text-ink-muted leading-tight">
                {t('audioNotMeasuredDesc')}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Detailed Observations */}
      <Card variant="subtle" className="p-4 space-y-2.5">
        <div className="flex items-center space-x-2 text-spot font-bold text-xs uppercase tracking-wide">
          <Info className="w-4 h-4" />
          <span>{t('detailedObservations')}</span>
        </div>
        <ul className="space-y-1.5 text-xs text-ink">
          {(() => {
            const tips: string[] = [];
            if (!result.visualFeatures.groundSpotDetected || result.visualFeatures.groundSpotScore < 0.5) {
              tips.push(t('tipSpotMissing'));
            } else {
              tips.push(t('tipSpotPresent'));
            }

            if (result.audioFeatures.knockCount > 0) {
              if (result.audioFeatures.peakFrequencyHz > 250) {
                tips.push(t('tipKnockHigh'));
              } else if (result.audioFeatures.peakFrequencyHz >= 115 && result.audioFeatures.peakFrequencyHz <= 250) {
                tips.push(t('tipKnockSweetZone'));
              }
            }

            if (result.visualFeatures.stripeContrastScore < 0.4) {
              tips.push(t('tipStripeLow'));
            }

            if (result.verdict !== 'likely_ripe') {
              tips.push(t('tipOffVineReminder'));
            }

            const activeTips = tips.length > 0 ? tips : result.actionableTips;
            return activeTips.map((tip, idx) => (
              <li key={idx} className="flex items-start space-x-2">
                <span className="text-primary font-bold">•</span>
                <span className="leading-relaxed">{tip}</span>
              </li>
            ));
          })()}
        </ul>
      </Card>

      {/* Side-by-Side Comparison with Previous Scan */}
      {previousScan && (
        <Card variant="default" className="p-4 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-ink uppercase tracking-wider">
              <span>{t('compareTitle')}</span>
            </div>
            <div
              className={cn(
                'flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full',
                scoreDiff > 0
                  ? 'text-ripe bg-ripe-bg'
                  : scoreDiff < 0
                  ? 'text-unripe bg-unripe-bg'
                  : 'text-ink-muted bg-surface-subtle'
              )}
            >
              {scoreDiff > 0 ? (
                <>
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>+{scoreDiff} pts</span>
                </>
              ) : scoreDiff < 0 ? (
                <>
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>{scoreDiff} pts</span>
                </>
              ) : (
                <>
                  <Equal className="w-3.5 h-3.5" />
                  <span>{t('compareEqual')}</span>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Current */}
            <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2 text-center">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
                {t('compareCurrent')}
              </span>
              {photoUrl && (
                <img
                  src={photoUrl}
                  alt="Actual"
                  className="w-12 h-12 rounded-lg object-cover mx-auto border border-border"
                />
              )}
              <div className="text-xl font-black text-ink font-display">
                {result.overallScore}%
              </div>
              <div className="text-[10px] text-ink-muted font-semibold">
                {firmnessLabelFor(
                  result.audioFeatures.peakFrequencyHz,
                  result.audioFeatures.knockCount
                )}
              </div>
            </div>

            {/* Previous */}
            <div className="p-2.5 rounded-xl bg-surface-subtle border border-border space-y-2 text-center">
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
                {t('comparePrevious')}
              </span>
              <img
                src={previousScan.photoDataUrl}
                alt="Anterior"
                className="w-12 h-12 rounded-lg object-cover mx-auto border border-border opacity-80"
              />
              <div className="text-xl font-black text-ink font-display">
                {previousScan.result.overallScore}%
              </div>
              <div className="text-[10px] text-ink-muted font-semibold">
                {firmnessLabelFor(
                  previousScan.result.audioFeatures.peakFrequencyHz,
                  previousScan.result.audioFeatures.knockCount
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Taste Feedback Loop */}
      <Card variant="default" className="p-4 space-y-3">
        <div className="flex items-center space-x-2 text-accent font-bold text-xs uppercase tracking-wide">
          <Sparkles className="w-4 h-4" />
          <span>{t('feedbackTitle')}</span>
        </div>
        <p className="text-xs text-ink-muted leading-relaxed">
          {t('feedbackDesc')}
        </p>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleFeedback('ripe')}
            className={cn(
              'min-h-[44px] py-2 px-1 text-xs font-bold rounded-xl border transition-all',
              feedback === 'ripe'
                ? 'bg-primary text-primary-fg border-primary shadow-sm'
                : 'bg-surface-subtle border-border text-ink hover:bg-surface-subtle/80'
            )}
          >
            {t('feedbackRipe')}
          </button>
          <button
            type="button"
            onClick={() => handleFeedback('unripe')}
            className={cn(
              'min-h-[44px] py-2 px-1 text-xs font-bold rounded-xl border transition-all',
              feedback === 'unripe'
                ? 'bg-accent text-accent-fg border-accent shadow-sm'
                : 'bg-surface-subtle border-border text-ink hover:bg-surface-subtle/80'
            )}
          >
            {t('feedbackUnripe')}
          </button>
          <button
            type="button"
            onClick={() => handleFeedback('overripe')}
            className={cn(
              'min-h-[44px] py-2 px-1 text-xs font-bold rounded-xl border transition-all',
              feedback === 'overripe'
                ? 'bg-spot text-spot-fg border-spot shadow-sm'
                : 'bg-surface-subtle border-border text-ink hover:bg-surface-subtle/80'
            )}
          >
            {t('feedbackOverripe')}
          </button>
        </div>

        {saved && (
          <p className="text-xs text-primary font-bold text-center animate-in fade-in">
            {t('feedbackSaved')}
          </p>
        )}
      </Card>

      {/* Share / Export Action */}
      <div className="flex gap-2">
        <Button
          onClick={handleShare}
          variant="secondary"
          size="md"
          className="flex-1 gap-2"
          disabled={isSharing}
        >
          {shareSuccess ? (
            <>
              <Check className="w-4 h-4 text-ripe" />
              <span>{t('downloadCard')}</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 text-ink-muted" />
              <span>{t('shareTitle')}</span>
            </>
          )}
        </Button>
      </div>

      {/* Bottom Action Button */}
      <Button
        onClick={onNewScan}
        variant="primary"
        size="lg"
        fullWidth
        className="gap-2 shadow-md shadow-primary/20"
      >
        <RotateCcw className="w-5 h-5" />
        <span>{t('anotherScan')}</span>
      </Button>
    </div>
  );
};

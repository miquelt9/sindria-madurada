import React, { useState, useEffect } from 'react';
import { MelonScanRecord, TasteFeedback } from '../lib/types';
import { getAllScanRecords, updateScanFeedback, deleteScanRecord, clearAllScans } from '../lib/history/storage';
import { Calendar, Trash2, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button, Card, EmptyState, VerdictBadge } from './ui';
import { useI18n } from '../i18n';
import { firmnessCue } from '../lib/copy/firmnessCue';
import { cn } from '../lib/cn';

interface HistoryViewProps {
  onBack: () => void;
  onSelectScan?: (scan: MelonScanRecord) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onBack }) => {
  const { t } = useI18n();

  const firmnessLabelFor = (peakHz: number, knockCount: number) => {
    const cue = firmnessCue(peakHz, knockCount);
    if (cue === 'dull') return t('firmnessDull');
    if (cue === 'tight') return t('firmnessTight');
    if (cue === 'unclear') return t('firmnessUnclear');
    return t('audioNotMeasured');
  };

  const feedbackLabel = (feedback: TasteFeedback) => {
    if (feedback === 'ripe') return t('feedbackRipe');
    if (feedback === 'unripe') return t('feedbackUnripe');
    if (feedback === 'overripe') return t('feedbackOverripe');
    return feedback;
  };
  const [records, setRecords] = useState<MelonScanRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<MelonScanRecord | null>(null);

  const loadHistory = async () => {
    const list = await getAllScanRecords();
    setRecords(list);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleFeedback = async (id: string, feedback: TasteFeedback) => {
    await updateScanFeedback(id, feedback);
    await loadHistory();
    if (selectedRecord && selectedRecord.id === id) {
      setSelectedRecord((prev) => (prev ? { ...prev, feedback } : null));
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteScanRecord(id);
    await loadHistory();
    if (selectedRecord && selectedRecord.id === id) {
      setSelectedRecord(null);
    }
  };

  const handleClear = async () => {
    if (confirm(t('historyClearConfirm'))) {
      await clearAllScans();
      await loadHistory();
      setSelectedRecord(null);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 pb-12 animate-in fade-in">
      <div className="flex items-center justify-between">
        <Button
          onClick={selectedRecord ? () => setSelectedRecord(null) : onBack}
          variant="secondary"
          size="sm"
          className="gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('back')}</span>
        </Button>

        <h2 className="text-lg font-bold text-ink font-display">{t('historyTitle')}</h2>

        {records.length > 0 && !selectedRecord ? (
          <button
            type="button"
            onClick={handleClear}
            className="min-w-[44px] min-h-[44px] p-2 text-ink-muted hover:text-accent transition rounded-lg flex items-center justify-center"
            title={t('historyClearAria')}
            aria-label={t('historyClearAria')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ) : (
          <div className="w-8" />
        )}
      </div>

      {!selectedRecord ? (
        records.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-7 h-7" />}
            title={t('historyEmptyTitle')}
            description={t('historyEmptyDesc')}
            action={
              <Button onClick={onBack} variant="primary" size="md">
                {t('historyStartScan')}
              </Button>
            }
          />
        ) : (
          <div className="space-y-2.5">
            {records.map((scan) => (
              <Card
                key={scan.id}
                variant="default"
                onClick={() => setSelectedRecord(scan)}
                className="p-3 transition cursor-pointer flex items-center justify-between hover:border-primary/40 active:scale-[0.99]"
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={scan.photoDataUrl}
                    alt="Miniatura"
                    className="w-14 h-14 rounded-xl object-cover bg-surface-subtle border border-border shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-ink font-display">
                        {t('scoreIndex')} {scan.result.overallScore}
                      </span>
                      <VerdictBadge verdict={scan.result.verdict} />
                    </div>
                    <span className="text-[11px] text-ink-muted block mt-0.5 font-medium">
                      {new Date(scan.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {scan.variety && ` • ${scan.variety === 'striped' ? t('varietyStriped') : t('varietySolid')}`}
                    </span>
                    {scan.feedback !== 'unrated' && (
                      <div className="text-[10px] text-primary font-bold mt-0.5">
                        {t('historyTaste')}: {feedbackLabel(scan.feedback)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={(e) => handleDelete(scan.id, e)}
                    className="min-w-[44px] min-h-[44px] p-2 text-ink-muted hover:text-accent transition rounded-lg flex items-center justify-center"
                    title={t('historyDeleteAria')}
                    aria-label={t('historyDeleteAria')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-5 h-5 text-ink-muted/50" />
                </div>
              </Card>
            ))}
          </div>
        )
      ) : (
        /* Detailed Scan View */
        <Card variant="default" className="p-4 space-y-4">
          <img
            src={selectedRecord.photoDataUrl}
            alt="Foto de la síndria"
            className="w-full aspect-square rounded-2xl object-cover bg-black border border-border"
          />

          <div className="flex justify-between items-center px-1">
            <div>
              <div className="text-2xl font-black text-ink font-display">
                {t('scoreIndex')}: {selectedRecord.result.overallScore}
              </div>
              <div className="text-xs text-ink-muted font-medium">
                {new Date(selectedRecord.createdAt).toLocaleString()}
              </div>
            </div>
            <VerdictBadge verdict={selectedRecord.result.verdict} />
          </div>

          {/* Eat Window Detail */}
          <div className="p-3 rounded-xl bg-surface-subtle border border-border space-y-1">
            <div className="text-xs font-bold text-primary flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{t('eatingWindow')}</span>
            </div>
            <p className="text-xs font-semibold text-ink">
              {selectedRecord.result.verdict === 'likely_ripe'
                ? t('eatWindowRipe')
                : selectedRecord.result.verdict === 'likely_unripe'
                  ? t('eatWindowUnripe')
                  : t('eatWindowBorderline')}
            </p>
          </div>

          <Card variant="subtle" className="p-3.5 space-y-1.5 text-xs text-ink">
            <div>
              <strong>{t('visualSignals')}:</strong> {selectedRecord.result.visualScore}% ({t('ribbonStripes')}:{' '}
              {Math.round(selectedRecord.result.visualFeatures.stripeContrastScore * 100)}%)
            </div>
            <div>
              {selectedRecord.result.audioFeatures.knockCount > 0 ? (
                <>
                  <strong>{t('resonantTone')}:</strong>{' '}
                  {firmnessLabelFor(
                    selectedRecord.result.audioFeatures.peakFrequencyHz,
                    selectedRecord.result.audioFeatures.knockCount
                  )}{' '}
                  ({selectedRecord.result.audioFeatures.knockCount} {t('knocksRegistered').toLowerCase()})
                </>
              ) : (
                <>
                  <strong>{t('acousticKnock')}:</strong> {t('audioNotMeasured')}
                </>
              )}
            </div>
            <p className="text-ink-muted italic pt-1 border-t border-border/70 mt-2">
              {selectedRecord.result.verdict === 'likely_ripe'
                ? t('summaryRipe')
                : selectedRecord.result.verdict === 'likely_unripe'
                ? t('summaryUnripe')
                : t('summaryBorderline')}
            </p>
          </Card>

          {/* Feedback section */}
          <div className="space-y-2 pt-2 border-t border-border">
            <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wide">
              {t('feedbackTitle')}
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleFeedback(selectedRecord.id, 'ripe')}
                className={cn(
                  'min-h-[44px] py-2 text-xs font-bold rounded-xl border transition-all',
                  selectedRecord.feedback === 'ripe'
                    ? 'bg-primary text-primary-fg border-primary shadow-sm'
                    : 'bg-surface-subtle border-border text-ink hover:bg-surface-subtle/80'
                )}
              >
                {t('feedbackRipe')}
              </button>
              <button
                type="button"
                onClick={() => handleFeedback(selectedRecord.id, 'unripe')}
                className={cn(
                  'min-h-[44px] py-2 text-xs font-bold rounded-xl border transition-all',
                  selectedRecord.feedback === 'unripe'
                    ? 'bg-accent text-accent-fg border-accent shadow-sm'
                    : 'bg-surface-subtle border-border text-ink hover:bg-surface-subtle/80'
                )}
              >
                {t('feedbackUnripe')}
              </button>
              <button
                type="button"
                onClick={() => handleFeedback(selectedRecord.id, 'overripe')}
                className={cn(
                  'min-h-[44px] py-2 text-xs font-bold rounded-xl border transition-all',
                  selectedRecord.feedback === 'overripe'
                    ? 'bg-spot text-spot-fg border-spot shadow-sm'
                    : 'bg-surface-subtle border-border text-ink hover:bg-surface-subtle/80'
                )}
              >
                {t('feedbackOverripe')}
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

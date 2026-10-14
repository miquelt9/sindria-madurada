import React from 'react';
import { Button } from './ui';
import { useI18n } from '../i18n';
import { weakTapTone } from '../lib/scan/weakTapFlow';

interface WeakTapRetryProps {
  count: number;
  onRetry: () => void;
  onRestart: () => void;
}

/**
 * Calm ask for another tap. No meter, no numbers, no warning colour.
 */
export const WeakTapRetry: React.FC<WeakTapRetryProps> = ({ count, onRetry, onRestart }) => {
  const { t } = useI18n();
  const calm = weakTapTone(count) === 'calm';

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto space-y-6 text-center px-1 animate-in fade-in pb-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-ink font-display">{t('weakTapTitle')}</h2>
        <p className="text-sm text-ink-muted leading-relaxed max-w-xs mx-auto">
          {calm ? t('weakTapSublineCalm') : t('weakTapSubline')}
        </p>
      </div>

      <div className="w-full flex flex-col space-y-1">
        <Button
          type="button"
          onClick={onRetry}
          variant="primary"
          size="lg"
          fullWidth
          className="touch-target shadow-md shadow-primary/20"
        >
          {t('weakTapRetry')}
        </Button>
        {calm && (
          <Button
            type="button"
            onClick={onRestart}
            variant="ghost"
            size="md"
            fullWidth
            className="touch-target text-ink-muted font-medium"
          >
            {t('weakTapRestart')}
          </Button>
        )}
      </div>
    </div>
  );
};

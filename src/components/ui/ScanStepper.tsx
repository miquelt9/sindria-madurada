import React from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { useI18n } from '../../i18n';
import type { Translations } from '../../i18n';
import { cn } from '../../lib/cn';
import { ScanFlowStep, scanStepperItems } from './scanStepperState';

const STEP_LABEL_KEYS: Record<ScanFlowStep, keyof Translations> = {
  photo: 'scanStepPhoto',
  knock: 'scanStepKnock',
  result: 'scanStepResult',
};

export interface ScanStepperProps {
  currentStep: ScanFlowStep;
  className?: string;
}

/** Display-only scan progress. Steps are not navigation controls. */
export const ScanStepper: React.FC<ScanStepperProps> = ({ currentStep, className }) => {
  const { t } = useI18n();
  const items = scanStepperItems(currentStep);

  return (
    <nav
      aria-label={t('scanStepperLabel')}
      data-scan-stepper=""
      className={cn('mb-3', className)}
    >
      <ol className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1">
        {items.map((item, index) => {
          const previous = index > 0 ? items[index - 1] : null;
          return (
            <React.Fragment key={item.step}>
              {previous && (
                <li aria-hidden="true" className="flex items-center justify-center">
                  <ChevronRight
                    className={cn(
                      'w-3.5 h-3.5',
                      previous.status === 'completed' ? 'text-primary' : 'text-ink-muted'
                    )}
                  />
                </li>
              )}
              <li
                data-step={item.step}
                data-status={item.status}
                aria-current={item.status === 'current' ? 'step' : undefined}
                className={cn(
                  'flex min-w-0 items-center justify-center gap-1 rounded-lg border px-1.5 py-1 text-xs font-bold',
                  item.status === 'current' && 'bg-primary text-primary-fg border-primary',
                  item.status === 'completed' && 'bg-ripe-bg text-ripe border-ripe-border',
                  item.status === 'upcoming' && 'bg-surface-raised text-ink-muted border-border'
                )}
              >
                {item.status === 'completed' && (
                  <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                )}
                <span className="truncate">{t(STEP_LABEL_KEYS[item.step])}</span>
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

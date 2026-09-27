import React from 'react';
import { History, Sparkles } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { ScanStepper } from './ScanStepper';
import { isScanFlowStep } from './scanStepperState';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/cn';

export type AppStep = 'home' | 'photo' | 'knock' | 'result' | 'history';

export interface AppShellProps {
  currentStep: AppStep;
  onNavigateHome: () => void;
  onToggleHistory: () => void;
  children: React.ReactNode;
  className?: string;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentStep,
  onNavigateHome,
  onToggleHistory,
  children,
  className,
}) => {
  const { t } = useI18n();

  return (
    <div
      className={cn(
        'min-h-screen bg-surface text-ink flex flex-col justify-between p-4 max-w-lg mx-auto selection:bg-primary selection:text-primary-fg',
        className
      )}
    >
      {/* App Header */}
      <header className="flex items-center justify-between py-2.5 mb-3 border-b border-border/70">
        <button
          type="button"
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 cursor-pointer group text-left focus:outline-none focus:ring-2 focus:ring-primary rounded-xl p-1"
          title={t('newScan')}
        >
          <div className="w-10 h-10 rounded-full bg-surface-raised border border-border shadow-sm flex items-center justify-center p-1.5 group-hover:scale-105 transition-transform">
            <img src="/watermelon.svg" alt="Síndria" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-ink font-display flex items-center gap-1 leading-none">
              <span>{t('appTitle')}</span>
              <Sparkles className="w-3.5 h-3.5 text-spot" />
            </h1>
            <p className="text-[11px] text-ink-muted font-medium mt-0.5">
              {t('appSubtitle')}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={onToggleHistory}
            className={cn(
              'min-w-[44px] min-h-[44px] px-3 py-2 border rounded-xl transition flex items-center gap-1.5 shadow-sm text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary',
              currentStep === 'history'
                ? 'bg-primary text-primary-fg border-primary'
                : 'bg-surface-raised hover:bg-surface-subtle border-border text-ink'
            )}
            title={t('history')}
          >
            <History className="w-4 h-4" />
            <span className="hidden xs:inline">{t('history')}</span>
          </button>
        </div>
      </header>

      {isScanFlowStep(currentStep) && <ScanStepper currentStep={currentStep} />}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center py-2">{children}</main>

      {/* Footer Info */}
      <footer className="text-center py-3 text-[11px] text-ink-muted border-t border-border/70 mt-4 space-y-1">
        <p>{t('privacyFooter')}</p>
      </footer>
    </div>
  );
};

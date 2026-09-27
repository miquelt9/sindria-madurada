import React, { useState, useEffect } from 'react';
import {
  Camera,
  Activity,
  Sparkles,
  History,
  ShieldCheck,
  Download,
  Globe,
  Radio,
  Calendar,
} from 'lucide-react';
import { Button, Card } from './ui';
import { useI18n, Language } from '../i18n';
import { isBackendConfigured } from '../lib/history/sync';
import { hasShareConsent, setShareConsent } from '../lib/history/consent';
import { warmupWatermelonGate } from '../lib/vision/watermelonGate';
import { cn } from '../lib/cn';

interface LandingPageProps {
  onStartScan: () => void;
  onOpenHistory: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartScan, onOpenHistory }) => {
  const { t, language, setLanguage } = useI18n();
  const [shareConsent, setConsentState] = useState(hasShareConsent);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const backendAvailable = isBackendConfigured();

  useEffect(() => {
    // Check if already in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleStart = () => {
    // Warm up the ML model in the background as the user enters the photo capture screen
    void warmupWatermelonGate();
    onStartScan();
  };

  const handleToggleConsent = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setShareConsent(checked);
    setConsentState(checked);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const languages: { code: Language; label: string }[] = [
    { code: 'ca', label: 'Català' },
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'English' },
  ];

  return (
    <div className="w-full max-w-md mx-auto space-y-5 animate-in fade-in pb-10">
      {/* Language Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 text-xs text-ink-muted">
          <Globe className="w-3.5 h-3.5" />
          <span className="font-semibold uppercase tracking-wider text-[10px]">Idioma / Language</span>
        </div>
        <div className="flex shrink-0 items-center bg-surface-raised border border-border rounded-xl p-0.5 shadow-sm">
          {languages.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => setLanguage(item.code)}
              className={cn(
                'touch-target inline-flex shrink-0 items-center justify-center px-2.5 text-xs font-bold rounded-lg transition-colors',
                language === item.code
                  ? 'bg-primary text-primary-fg shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              )}
            >
              {item.code.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Hero Section */}
      <div className="text-center space-y-3 pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-raised border border-primary/20 rounded-full text-[11px] font-bold text-primary shadow-xs">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{t('landingHeroBadge')}</span>
        </div>

        <div className="relative inline-block my-2">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-surface-raised border-2 border-primary/30 p-3.5 shadow-card flex items-center justify-center relative overflow-hidden">
            <img
              src="/watermelon.svg"
              alt="Síndria"
              className="w-full h-full object-contain animate-in zoom-in-50"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-spot rounded-full border-2 border-surface flex items-center justify-center shadow-md">
            <Sparkles className="w-4 h-4 text-spot-fg" />
          </div>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-3xl font-black text-ink font-display tracking-tight">
            {t('appTitle')}
          </h1>
          <p className="text-sm text-ink-muted leading-relaxed max-w-sm mx-auto font-medium">
            {t('landingTagline')}
          </p>
        </div>
      </div>

      {/* 3-Step Visual Explanation */}
      <Card variant="default" className="p-4 space-y-3.5">
        <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider px-1">
          Com funciona / How it works
        </h3>

        <div className="space-y-3">
          {/* Step 1 */}
          <div className="flex items-start gap-3 p-2.5 rounded-xl bg-surface-subtle/70 border border-border/60">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
              <Camera className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-ink">{t('landingStep1Title')}</h4>
              <p className="text-[11px] text-ink-muted leading-relaxed">{t('landingStep1Desc')}</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3 p-2.5 rounded-xl bg-surface-subtle/70 border border-border/60">
            <div className="w-9 h-9 rounded-xl bg-spot/15 border border-spot/30 flex items-center justify-center text-spot-fg shrink-0 mt-0.5">
              <Activity className="w-5 h-5 text-spot" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-ink">{t('landingStep2Title')}</h4>
              <p className="text-[11px] text-ink-muted leading-relaxed">{t('landingStep2Desc')}</p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3 p-2.5 rounded-xl bg-surface-subtle/70 border border-border/60">
            <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0 mt-0.5">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-ink">{t('landingStep3Title')}</h4>
              <p className="text-[11px] text-ink-muted leading-relaxed">{t('landingStep3Desc')}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Optional Backend Sync Consent Toggle */}
      {backendAvailable && (
        <Card variant="subtle" className="p-3.5">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={shareConsent}
              onChange={handleToggleConsent}
              className="w-5 h-5 mt-0.5 rounded border-border text-primary focus:ring-primary shrink-0 cursor-pointer"
            />
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                <Radio className="w-3.5 h-3.5 text-spot" />
                <span>Millora col·lectiva / Shared research</span>
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                {t('landingShareConsent')}
              </p>
            </div>
          </label>
        </Card>
      )}

      {/* Primary Actions */}
      <div className="space-y-2.5 pt-1">
        <Button
          onClick={handleStart}
          variant="primary"
          size="lg"
          fullWidth
          className="gap-2 text-base shadow-lg shadow-primary/25 active:scale-[0.99]"
        >
          <Camera className="w-5 h-5" />
          <span>{t('landingCheckCta')}</span>
        </Button>

        <Button
          onClick={onOpenHistory}
          variant="secondary"
          size="md"
          fullWidth
          className="gap-2"
        >
          <History className="w-4 h-4 text-ink-muted" />
          <span>{t('landingHistoryCta')}</span>
        </Button>

        {/* PWA Install Action / Banner */}
        {deferredPrompt && !isInstalled && (
          <Button
            onClick={handleInstallClick}
            variant="ghost"
            size="sm"
            fullWidth
            className="gap-1.5 text-xs text-primary font-bold border border-primary/20 bg-primary/5 hover:bg-primary/10 mt-1 min-h-[44px]"
          >
            <Download className="w-4 h-4" />
            <span>{t('landingInstallApp')}</span>
          </Button>
        )}
      </div>
    </div>
  );
};

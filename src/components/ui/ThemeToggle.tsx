import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/cn';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, resolvedTheme, cycleTheme } = useTheme();
  const { t } = useI18n();

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return t('themeLight');
      case 'dark':
        return t('themeDark');
      case 'system':
      default:
        return t('themeSystem', {
          resolved: resolvedTheme === 'dark' ? t('themeDark').toLowerCase() : t('themeLight').toLowerCase(),
        });
    }
  };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={getLabel()}
      title={getLabel()}
      className={cn(
        'min-w-[44px] min-h-[44px] p-2.5 rounded-xl border border-border bg-surface-raised hover:bg-surface-subtle text-ink transition flex items-center justify-center shadow-sm focus:outline-none focus:ring-2 focus:ring-primary',
        className
      )}
    >
      {theme === 'system' ? (
        <Laptop className="w-4 h-4 text-primary" />
      ) : theme === 'dark' ? (
        <Moon className="w-4 h-4 text-spot" />
      ) : (
        <Sun className="w-4 h-4 text-spot" />
      )}
    </button>
  );
};

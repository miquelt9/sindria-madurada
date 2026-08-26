import React from 'react';
import { cn } from '../../lib/cn';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { RipenessVerdict } from '../../lib/types';
import { useI18n } from '../../i18n';

export type BadgeVariant = 'neutral' | 'ripe' | 'unripe' | 'borderline' | 'spot';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  className,
  children,
  ...props
}) => {
  const variants: Record<BadgeVariant, string> = {
    neutral: 'bg-surface-subtle text-ink-muted border-border',
    ripe: 'bg-ripe-bg text-ripe border-ripe-border',
    unripe: 'bg-unripe-bg text-unripe border-unripe-border',
    borderline: 'bg-borderline-bg text-borderline border-borderline-border',
    spot: 'bg-spot/15 text-spot border-spot/40',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full border',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export interface VerdictBadgeProps {
  verdict: RipenessVerdict;
  className?: string;
}

export const VerdictBadge: React.FC<VerdictBadgeProps> = ({ verdict, className }) => {
  const { t } = useI18n();

  switch (verdict) {
    case 'likely_ripe':
      return (
        <Badge variant="ripe" className={className}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{t('verdictRipe')}</span>
        </Badge>
      );
    case 'likely_unripe':
      return (
        <Badge variant="unripe" className={className}>
          <XCircle className="w-3.5 h-3.5" />
          <span>{t('verdictUnripe')}</span>
        </Badge>
      );
    case 'borderline':
    default:
      return (
        <Badge variant="borderline" className={className}>
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{t('verdictBorderline')}</span>
        </Badge>
      );
  }
};

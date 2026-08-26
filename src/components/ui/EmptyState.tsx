import React from 'react';
import { cn } from '../../lib/cn';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'text-center py-12 px-6 rounded-card bg-surface-raised border border-border shadow-card space-y-3 flex flex-col items-center justify-center',
        className
      )}
    >
      <div className="w-14 h-14 rounded-full bg-surface-subtle border border-border flex items-center justify-center text-ink-muted shadow-inner">
        {icon}
      </div>
      <h3 className="text-base font-bold text-ink font-display">{title}</h3>
      {description && (
        <p className="text-xs text-ink-muted max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};

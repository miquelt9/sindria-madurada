import React from 'react';
import { cn } from '../../lib/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'highlight';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  className,
  children,
  ...props
}) => {
  const variants = {
    default: 'bg-surface-raised border border-border text-ink shadow-card',
    subtle: 'bg-surface-subtle border border-border/70 text-ink',
    highlight: 'bg-surface-raised border-2 border-primary/40 text-ink shadow-card',
  };

  return (
    <div
      className={cn('rounded-card p-4 transition-colors', variants[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
};

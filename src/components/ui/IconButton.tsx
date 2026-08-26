import React from 'react';
import { cn } from '../../lib/cn';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const IconButton: React.FC<IconButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center rounded-full transition-all select-none disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary';

  const variants = {
    primary: 'bg-primary text-primary-fg hover:opacity-95 shadow-md shadow-primary/25',
    secondary: 'bg-surface-raised hover:bg-surface-subtle text-ink border border-border shadow-sm',
    ghost: 'bg-transparent text-ink-muted hover:text-ink hover:bg-surface-subtle',
    danger: 'bg-accent text-accent-fg hover:opacity-95 shadow-md shadow-accent/25',
  };

  const sizes = {
    sm: 'w-9 h-9 min-w-[36px] min-h-[36px]',
    md: 'w-11 h-11 min-w-[44px] min-h-[44px]',
    lg: 'w-14 h-14 min-w-[56px] min-h-[56px]',
  };

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
};

import React from 'react';
import { cn } from '../../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'spot';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  children,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-semibold transition-all select-none disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary';

  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-primary text-primary-fg hover:opacity-95 active:scale-[0.99] rounded-pill shadow-lg shadow-primary/20',
    secondary:
      'bg-surface-raised hover:bg-surface-subtle text-ink border border-border rounded-xl active:scale-[0.99] shadow-sm',
    ghost: 'bg-transparent text-ink-muted hover:text-ink hover:bg-surface-subtle rounded-xl',
    danger:
      'bg-accent text-accent-fg hover:opacity-95 active:scale-[0.99] rounded-pill shadow-lg shadow-accent/20',
    spot:
      'bg-spot text-spot-fg hover:opacity-95 active:scale-[0.99] rounded-pill font-bold shadow-md shadow-spot/20',
  };

  const sizes: Record<ButtonSize, string> = {
    sm: 'text-xs px-3 py-1.5 min-h-[36px] gap-1.5',
    md: 'text-sm px-4 py-3 min-h-[44px] gap-2',
    lg: 'text-base px-6 py-4 min-h-[52px] gap-2.5 font-bold',
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {children}
    </button>
  );
};

import React from 'react';
import { cn } from '../../lib/cn';
import { Check } from 'lucide-react';

export interface ProgressDotsProps {
  current: number;
  total?: number;
  isActive?: boolean;
  className?: string;
}

export const ProgressDots: React.FC<ProgressDotsProps> = ({
  current,
  total = 3,
  isActive = false,
  className,
}) => {
  const steps = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <div className={cn('flex items-center justify-center gap-3', className)}>
      {steps.map((num) => {
        const isDone = current >= num;
        const isCurrent = isActive && current + 1 === num;

        return (
          <div
            key={num}
            className={cn(
              'flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-200 select-none font-bold text-sm',
              isDone &&
                'bg-primary border-primary text-primary-fg scale-105 shadow-md shadow-primary/20',
              isCurrent &&
                'border-primary bg-primary/15 text-primary animate-pulse ring-4 ring-primary/20',
              !isDone && !isCurrent && 'border-border bg-surface-raised text-ink-muted/60'
            )}
          >
            {isDone ? <Check className="w-5 h-5 stroke-[3]" /> : <span>#{num}</span>}
          </div>
        );
      })}
    </div>
  );
};

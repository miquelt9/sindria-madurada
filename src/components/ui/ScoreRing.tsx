import React from 'react';
import { cn } from '../../lib/cn';
import { RipenessVerdict } from '../../lib/types';

export interface ScoreRingProps {
  score: number;
  verdict?: RipenessVerdict;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  verdict = 'borderline',
  size = 120,
  strokeWidth = 3.5,
  className,
}) => {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  const getVerdictStrokeColor = () => {
    switch (verdict) {
      case 'likely_ripe':
        return 'text-ripe';
      case 'likely_unripe':
        return 'text-unripe';
      case 'borderline':
      default:
        return 'text-borderline';
    }
  };

  return (
    <div
      className={cn('relative flex items-center justify-center select-none', className)}
      style={{ width: size, height: size }}
    >
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
        {/* Background track */}
        <path
          className="text-border/60"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="none"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
        {/* Progress stroke */}
        <path
          className={cn('transition-all duration-700 ease-out', getVerdictStrokeColor())}
          strokeDasharray={`${clampedScore}, 100`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          stroke="currentColor"
          fill="none"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-ink tracking-tight">{clampedScore}</span>
        <span className="text-[10px] uppercase font-bold text-ink-muted tracking-wider">Index</span>
      </div>
    </div>
  );
};

import { useMemo } from 'react';

export function PerformanceDial({ score, teamAverage }: { score: number; teamAverage?: number }) {
  const label = useMemo(() => getPerformanceLabel(score), [score]);
  const color = useMemo(() => getPerformanceColor(score), [score]);

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border/70 p-4">
      <div className="relative h-16 w-16">
        <svg viewBox="0 0 36 36" className="h-16 w-16">
          <path className="text-muted" stroke="currentColor" strokeWidth="3.5" fill="none" d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831" opacity="0.2" />
          <path className={strokeClass(score)} strokeWidth="3.5" strokeLinecap="round" fill="none"
            strokeDasharray={`${Math.max(0, Math.min(100, score))}, 100`} d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold">{score.toFixed(0)}</div>
      </div>
      <div>
        <div className="text-sm font-semibold">{label}</div>
        {typeof teamAverage === 'number' && (
          <div className="text-xs text-muted-foreground">Team avg: {teamAverage.toFixed(1)}</div>
        )}
      </div>
    </div>
  );
}

function strokeClass(score: number) {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
}

export function getPerformanceColor(score: number) {
  if (score >= 80) return 'green';
  if (score >= 60) return 'yellow';
  if (score >= 40) return 'orange';
  return 'red';
}

export function getPerformanceLabel(score: number) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Average';
  return 'Needs Improvement';
}



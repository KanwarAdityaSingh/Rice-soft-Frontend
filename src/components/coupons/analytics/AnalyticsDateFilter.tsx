import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import {
  presetRange,
  PRESET_LABELS,
  formatRangeLabel,
  type DatePreset,
} from '../../../utils/analyticsDateFilter';

export type { DatePreset };

export function useAnalyticsPreset(defaultPreset: DatePreset = '30d') {
  const [searchParams, setSearchParams] = useSearchParams();
  const preset = (searchParams.get('period') as DatePreset) || defaultPreset;

  const range = useMemo(() => presetRange(preset), [preset]);

  const setPreset = (p: DatePreset) => {
    const next = new URLSearchParams(searchParams);
    if (p === defaultPreset) next.delete('period');
    else next.set('period', p);
    setSearchParams(next, { replace: true });
  };

  return {
    preset,
    range,
    setPreset,
    presetLabels: PRESET_LABELS,
    rangeLabel: formatRangeLabel(range, preset),
  };
}

interface AnalyticsDateFilterProps {
  preset: DatePreset;
  onPresetChange: (p: DatePreset) => void;
  hint?: string;
  rangeLabel?: string;
  extra?: React.ReactNode;
}

export function AnalyticsDateFilter({
  preset,
  onPresetChange,
  hint,
  rangeLabel,
  extra,
}: AnalyticsDateFilterProps) {
  return (
    <div className="coupon-card p-4 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-violet-600">
          <Calendar className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wide">Period</span>
        </div>
        <div className="flex gap-1 p-1 bg-violet-100/80 rounded-xl">
          {(['7d', '30d', '90d', 'all'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPresetChange(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                preset === p
                  ? 'bg-white text-violet-800 shadow-sm'
                  : 'text-violet-500 hover:text-violet-700'
              }`}
            >
              {PRESET_LABELS[p]}
            </button>
          ))}
        </div>
        {rangeLabel && (
          <span className="text-[11px] text-violet-500 font-medium ml-auto">{rangeLabel}</span>
        )}
        {extra}
      </div>
      {hint && <p className="text-xs text-violet-500 mt-3">{hint}</p>}
    </div>
  );
}

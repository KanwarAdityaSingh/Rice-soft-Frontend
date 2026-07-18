/**
 * Analytics date filters — three layers (keep them separate):
 *
 * 1. UI sends     → YYYY-MM-DD (no timezone in the string)
 * 2. Postgres     → IST calendar days (Asia/Kolkata)
 * 3. JSON returns → UTC ISO instants (Z label is misleading for bucket keys)
 *
 * Send local calendar dates; trust counts; format chart labels in IST.
 */

import { formatIstDate } from './couponFormat';

export type DatePreset = '7d' | '30d' | '90d' | 'all';

export const PRESET_LABELS: Record<DatePreset, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  all: 'All time',
};

export interface AnalyticsDateRange {
  fromDate?: string;
  toDate?: string;
}

/** Local calendar date for API query params — matches IST days sent to backend. */
export function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Inclusive day count: "last N days" = today plus the previous N−1 days. */
const PRESET_LOOKBACK: Record<Exclude<DatePreset, 'all'>, number> = {
  '7d': 6,
  '30d': 29,
  '90d': 89,
};

export function presetRange(preset: DatePreset): AnalyticsDateRange {
  if (preset === 'all') return {};
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - PRESET_LOOKBACK[preset]);
  return { fromDate: toLocalIsoDate(from), toDate: toLocalIsoDate(to) };
}

export function presetLabel(preset: DatePreset): string {
  return PRESET_LABELS[preset];
}

export function formatRangeLabel(range: AnalyticsDateRange, preset: DatePreset): string {
  if (preset === 'all' || (!range.fromDate && !range.toDate)) return PRESET_LABELS.all;
  if (range.fromDate && range.toDate) {
    return `${formatIstDate(range.fromDate)} → ${formatIstDate(range.toDate)}`;
  }
  return PRESET_LABELS[preset];
}

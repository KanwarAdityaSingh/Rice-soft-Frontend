import { IST_TIMEZONE } from './couponFormat';
import type { RedemptionTrendPoint } from '../types/coupons';

/** Normalize API bucket to YYYY-MM-DD on the IST calendar. */
export function trendBucketKey(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: IST_TIMEZONE });
}

function parseCalendarDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function toCalendarIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Insert zero-value days so the x-axis spans the full selected period. */
export function fillDailyTrendGaps(
  trends: RedemptionTrendPoint[],
  fromDate?: string,
  toDate?: string
): RedemptionTrendPoint[] {
  if (!fromDate || !toDate) return trends;

  const byKey = new Map<string, RedemptionTrendPoint>();
  for (const t of trends) {
    byKey.set(trendBucketKey(t.date), t);
  }

  const start = parseCalendarDate(fromDate);
  const end = parseCalendarDate(toDate);
  const filled: RedemptionTrendPoint[] = [];

  for (let d = start; d <= end; d = addDays(d, 1)) {
    const key = toCalendarIso(d);
    filled.push(
      byKey.get(key) ?? {
        date: key,
        redemptionCount: 0,
        totalAmountPaise: 0,
      }
    );
  }

  return filled;
}

export interface TrendChartSummary {
  totalCount: number;
  totalPaise: number;
  activeBuckets: number;
  totalBuckets: number;
  peak?: RedemptionTrendPoint;
}

export function summarizeTrends(trends: RedemptionTrendPoint[]): TrendChartSummary {
  const totalCount = trends.reduce((s, t) => s + t.redemptionCount, 0);
  const totalPaise = trends.reduce((s, t) => s + t.totalAmountPaise, 0);
  const active = trends.filter((t) => t.redemptionCount > 0);
  const peak = active.reduce<RedemptionTrendPoint | undefined>(
    (best, t) => (!best || t.redemptionCount > best.redemptionCount ? t : best),
    undefined
  );
  return {
    totalCount,
    totalPaise,
    activeBuckets: active.length,
    totalBuckets: trends.length,
    peak,
  };
}

/** Reduce x-axis label clutter on long ranges. */
export function trendTickInterval(pointCount: number): number | 'preserveStartEnd' {
  if (pointCount <= 14) return 0;
  if (pointCount <= 31) return 2;
  if (pointCount <= 60) return 6;
  return Math.floor(pointCount / 8);
}

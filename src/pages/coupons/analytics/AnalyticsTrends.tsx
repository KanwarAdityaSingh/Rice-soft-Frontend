import { useEffect, useState } from 'react';
import { CouponLoading } from '../../../components/coupons/shared/CouponUi';
import {
  AnalyticsDateFilter,
  useAnalyticsPreset,
} from '../../../components/coupons/analytics/AnalyticsDateFilter';
import { AnalyticsPageHeader } from '../../../components/coupons/analytics/AnalyticsHub';
import { RedemptionTrendsChart } from '../../../components/coupons/analytics/AnalyticsPanels';
import { couponsAnalyticsAPI } from '../../../services/coupons.analytics.api';
import type { RedemptionTrendPoint } from '../../../types/coupons';
import type { TrendGranularity } from '../../../hooks/useCouponAnalytics';

export default function AnalyticsTrendsPage() {
  const { preset, range, setPreset, rangeLabel } = useAnalyticsPreset();
  const [granularity, setGranularity] = useState<TrendGranularity>('day');
  const [trends, setTrends] = useState<RedemptionTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    couponsAnalyticsAPI
      .getRedemptionTrends(range.fromDate, range.toDate, granularity)
      .then((r) => {
        if (!cancelled) setTrends(r.trends ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range.fromDate, range.toDate, granularity, preset]);

  if (loading && trends.length === 0) return <CouponLoading />;

  return (
    <div className="coupon-page coupon-analytics-page">
      <AnalyticsPageHeader
        badge="Analytics"
        title="Redemption trends"
        subtitle="Redemption volume and payout value over time"
      />
      <AnalyticsDateFilter
        preset={preset}
        onPresetChange={setPreset}
        rangeLabel={rangeLabel}
        extra={
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs font-bold uppercase text-violet-500">Granularity</span>
            <div className="flex gap-1 p-0.5 bg-violet-50 rounded-lg">
              {(['day', 'week', 'month'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGranularity(g)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold capitalize ${
                    granularity === g ? 'bg-violet-600 text-white' : 'text-violet-500'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        }
      />
      {loading && <p className="text-xs text-violet-500 mb-4">Loading trends…</p>}
      <RedemptionTrendsChart
        trends={trends}
        granularity={granularity}
        fromDate={range.fromDate}
        toDate={range.toDate}
      />
    </div>
  );
}

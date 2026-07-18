import { useCallback, useEffect, useState } from 'react';
import { couponsAnalyticsAPI } from '../services/coupons.analytics.api';
import type {
  AnalyticsOverview,
  BatchPerformanceRow,
  RedemptionTrendPoint,
  PayoutSummary,
  FraudSignals,
  PromotionRulePerformanceRow,
  RedeemerLeaderboardEntry,
} from '../types/coupons';

export type { RedeemerLeaderboardEntry };

export interface CouponAnalyticsBundle {
  overview: AnalyticsOverview;
  batches: BatchPerformanceRow[];
  trends: RedemptionTrendPoint[];
  payoutSummary: PayoutSummary;
  leaderboard: RedeemerLeaderboardEntry[];
  fraud: FraudSignals;
  rulePerformance: PromotionRulePerformanceRow[];
}

export type TrendGranularity = 'day' | 'week' | 'month';

export interface CouponAnalyticsFilters {
  fromDate?: string;
  toDate?: string;
  granularity: TrendGranularity;
  leaderboardSort: 'count' | 'amount';
}

export function useCouponAnalytics(filters: CouponAnalyticsFilters) {
  const [data, setData] = useState<CouponAnalyticsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { fromDate, toDate, granularity, leaderboardSort } = filters;
    try {
      const [
        overview,
        batchRes,
        trendRes,
        payoutSummary,
        leaderboardRes,
        fraud,
        ruleRes,
      ] = await Promise.all([
        couponsAnalyticsAPI.getOverview(fromDate, toDate),
        couponsAnalyticsAPI.getBatchPerformance({ page: 1, limit: 50 }),
        couponsAnalyticsAPI.getRedemptionTrends(fromDate, toDate, granularity),
        couponsAnalyticsAPI.getPayoutSummary(),
        couponsAnalyticsAPI.getRedeemerLeaderboard(15, leaderboardSort),
        couponsAnalyticsAPI.getFraudSignals(fromDate, toDate),
        couponsAnalyticsAPI.getPromotionRulePerformance(fromDate, toDate),
      ]);

      setData({
        overview,
        batches: batchRes.rows ?? [],
        trends: trendRes.trends ?? [],
        payoutSummary,
        leaderboard: leaderboardRes.redeemers ?? [],
        fraud,
        rulePerformance: ruleRes.rules ?? [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [filters.fromDate, filters.toDate, filters.granularity, filters.leaderboardSort]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, refetch: load };
}

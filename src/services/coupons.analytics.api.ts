import { apiService } from './api';
import type {
  AnalyticsOverview,
  BatchPerformanceRow,
  RedemptionTrendPoint,
  PayoutSummary,
  FraudSignals,
  PromotionRulePerformanceRow,
  RedeemerLeaderboardEntry,
} from '../types/coupons';
import {
  normalizeOverview,
  normalizeBatch,
  normalizeTrend,
  normalizePayoutSummary,
  normalizeRedeemerLeaderboard,
  normalizeFraudSignals,
  normalizeRulePerformance,
} from '../utils/couponAnalyticsNormalize';

const ANALYTICS = '/coupons/analytics';

export const couponsAnalyticsAPI = {
  getOverview: async (fromDate?: string, toDate?: string) => {
    const q = new URLSearchParams();
    if (fromDate) q.set('fromDate', fromDate);
    if (toDate) q.set('toDate', toDate);
    const qs = q.toString();
    const raw = await apiService.get<Record<string, unknown>>(
      `${ANALYTICS}/getOverview${qs ? `?${qs}` : ''}`
    );
    return normalizeOverview(raw);
  },

  getBatchPerformance: async (params?: {
    batchId?: string;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.batchId) q.set('batchId', params.batchId);
    q.set('page', String(params?.page ?? 1));
    q.set('limit', String(params?.limit ?? 50));
    const res = await apiService.get<{
      rows?: (BatchPerformanceRow & {
        batchId?: string;
        pendingPayoutPaise?: number;
        paidOutPaise?: number;
      })[];
      /** @deprecated — old API key */
      batches?: (BatchPerformanceRow & {
        batchId?: string;
        pendingPayoutPaise?: number;
        paidOutPaise?: number;
      })[];
      page?: number;
      limit?: number;
      total?: number;
    }>(`${ANALYTICS}/getBatchPerformance?${q}`);
    const rawRows = res.rows ?? res.batches ?? [];
    return {
      rows: rawRows.map(normalizeBatch),
      page: res.page ?? params?.page ?? 1,
      limit: res.limit ?? params?.limit ?? 50,
      total: res.total ?? rawRows.length,
    };
  },

  getRedemptionTrends: async (
    fromDate?: string,
    toDate?: string,
    granularity: 'day' | 'week' | 'month' = 'day'
  ) => {
    const q = new URLSearchParams({ granularity });
    if (fromDate) q.set('fromDate', fromDate);
    if (toDate) q.set('toDate', toDate);
    const res = await apiService.get<{
      trends: (RedemptionTrendPoint & {
        count?: number;
        totalPayoutPaise?: number;
        amountPaise?: number;
      })[];
    }>(`${ANALYTICS}/getRedemptionTrends?${q}`);
    return {
      trends: (res.trends ?? []).map(normalizeTrend),
    };
  },

  getPayoutSummary: async () => {
    const raw = await apiService.get<Record<string, unknown>>(
      `${ANALYTICS}/getPayoutSummary`
    );
    return normalizePayoutSummary(raw);
  },

  getRedeemerLeaderboard: async (
    limit = 20,
    sortBy: 'count' | 'amount' = 'count'
  ) => {
    const res = await apiService.get<{
      redeemers: (RedeemerLeaderboardEntry & {
        totalRedemptions?: number;
        lifetimeEarnedPaise?: number;
      })[];
    }>(`${ANALYTICS}/getRedeemerLeaderboard?limit=${limit}&sortBy=${sortBy}`);
    return {
      redeemers: (res.redeemers ?? []).map(normalizeRedeemerLeaderboard),
    };
  },

  getFraudSignals: async (fromDate?: string, toDate?: string) => {
    const q = new URLSearchParams();
    if (fromDate) q.set('fromDate', fromDate);
    if (toDate) q.set('toDate', toDate);
    const qs = q.toString();
    const raw = await apiService.get<Record<string, unknown>>(
      `${ANALYTICS}/getFraudSignals${qs ? `?${qs}` : ''}`
    );
    return normalizeFraudSignals(raw);
  },

  getPromotionRulePerformance: async (fromDate?: string, toDate?: string) => {
    const q = new URLSearchParams();
    if (fromDate) q.set('fromDate', fromDate);
    if (toDate) q.set('toDate', toDate);
    const qs = q.toString();
    const res = await apiService.get<{
      rules: (PromotionRulePerformanceRow & {
        ruleId?: string;
        fireCount?: number;
        fires?: number;
        bonusPaidPaise?: number;
        rule_type?: string;
        is_active?: boolean;
        last_applied_at?: string | null;
      })[];
    }>(`${ANALYTICS}/getPromotionRulePerformance${qs ? `?${qs}` : ''}`);
    return {
      rules: (res.rules ?? []).map(normalizeRulePerformance),
    };
  },
};

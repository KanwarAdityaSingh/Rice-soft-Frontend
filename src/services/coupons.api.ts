import { apiService, API_BASE_URL } from './api';
import { authenticatedFetch } from './authenticatedFetch';
import { normalizeRuleStats, normalizeRedeemer } from '../utils/couponAnalyticsNormalize';
import type {
  CouponBatch,
  BatchStats,
  Coupon,
  CouponStatusHistory,
  Redemption,
  Redeemer,
  PromotionRule,
  RuleApplication,
  PayoutAttempt,
  RedemptionAttempt,
  PaginatedRows,
  CreateCouponBatchRequest,
  CreatePromotionRuleRequest,
  PreviewStackRequest,
  StackPreviewResult,
  ExportCouponRow,
} from '../types/coupons';

const ADMIN = '/coupons/admin';

export const couponsAPI = {
  createCouponBatch: (body: CreateCouponBatchRequest) =>
    apiService.post<CouponBatch>(`${ADMIN}/createCouponBatch`, body),

  generateBatchCodes: (batchId: string) =>
    apiService.post<{ generated: number; batch: CouponBatch }>(
      `${ADMIN}/generateBatchCodes/${batchId}`
    ),

  getAllCouponBatches: (page = 1, limit = 50) =>
    apiService.get<PaginatedRows<CouponBatch>>(
      `${ADMIN}/getAllCouponBatches?page=${page}&limit=${limit}`
    ),

  getCouponBatchById: (batchId: string) =>
    apiService.get<{ batch: CouponBatch; stats: BatchStats }>(
      `${ADMIN}/getCouponBatchById/${batchId}`
    ),

  markBatchPrinted: (batchId: string) =>
    apiService.post<{ updated: number }>(`${ADMIN}/markBatchPrinted/${batchId}`),

  markBatchAllotted: (batchId: string) =>
    apiService.post<{ updated: number }>(`${ADMIN}/markBatchAllotted/${batchId}`),

  archiveCouponBatch: (batchId: string) =>
    apiService.post<CouponBatch>(`${ADMIN}/archiveCouponBatch/${batchId}`),

  voidCouponBatch: (batchId: string) =>
    apiService.post<{ voided: number }>(`${ADMIN}/voidCouponBatch/${batchId}`),

  deleteCouponBatch: (batchId: string) =>
    apiService.post<{ coupon_batch_id: string; deleted: boolean }>(
      `${ADMIN}/deleteCouponBatch/${batchId}`
    ),

  getAllCoupons: (params: {
    batchId?: string;
    status?: string;
    code?: string;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params.batchId) q.set('batchId', params.batchId);
    if (params.status) q.set('status', params.status);
    if (params.code) q.set('code', params.code);
    q.set('page', String(params.page ?? 1));
    q.set('limit', String(params.limit ?? 50));
    return apiService.get<PaginatedRows<Coupon>>(`${ADMIN}/getAllCoupons?${q}`);
  },

  getCouponByCode: (code: string) =>
    apiService.get<{ coupon: Coupon; history: CouponStatusHistory[] }>(
      `${ADMIN}/getCouponByCode/${code}`
    ),

  voidCoupon: (code: string) =>
    apiService.post<Coupon>(`${ADMIN}/voidCoupon/${code}`),

  markCouponPrinted: (code: string) =>
    apiService.post<Coupon>(`${ADMIN}/markCouponPrinted/${encodeURIComponent(code)}`),

  markCouponAllotted: (code: string) =>
    apiService.post<Coupon>(`${ADMIN}/markCouponAllotted/${encodeURIComponent(code)}`),

  getPendingPayouts: (page = 1, limit = 50) =>
    apiService.get<PaginatedRows<Redemption>>(
      `${ADMIN}/getPendingPayouts?page=${page}&limit=${limit}`
    ),

  getAllRedemptions: (params: {
    payoutStatus?: string;
    batchId?: string;
    phone?: string;
    code?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, String(v));
    });
    if (!q.has('page')) q.set('page', '1');
    if (!q.has('limit')) q.set('limit', '50');
    return apiService.get<PaginatedRows<Redemption>>(
      `${ADMIN}/getAllRedemptions?${q}`
    );
  },

  getRedemptionById: (id: string) =>
    apiService.get<{
      redemption: Redemption;
      redeemer: Redeemer;
      ruleApplications: RuleApplication[];
      payoutAttempts: PayoutAttempt[];
    }>(`${ADMIN}/getRedemptionById/${id}`),

  markRedemptionPaid: (
    id: string,
    body: { payment_reference: string; notes?: string }
  ) =>
    apiService.post<{
      redemptionId: string;
      publicRef: string;
      payoutStatus: string;
      paidVia: string;
      paymentReference: string;
      paidAt: string;
      totalAmountPaise: number;
    }>(`${ADMIN}/markRedemptionPaid/${id}`, body),

  bulkMarkRedemptionsPaid: (body: {
    items: { redemption_id: string; payment_reference: string }[];
    notes?: string;
  }) =>
    apiService.post<{
      succeeded: {
        redemptionId: string;
        publicRef: string;
        payoutStatus: string;
        totalAmountPaise: number;
      }[];
      failed: { redemptionId: string; error: string }[];
    }>(`${ADMIN}/bulkMarkRedemptionsPaid`, body),

  unmarkRedemptionPaid: (id: string, body: { reason: string }) =>
    apiService.post<{
      redemptionId: string;
      publicRef: string;
      payoutStatus: string;
      previousPaidVia: string;
      previousPaymentReference: string;
      previousPaidAt: string;
    }>(`${ADMIN}/unmarkRedemptionPaid/${id}`, body),

  getRedeemerByPhone: async (phone: string) => {
    const res = await apiService.get<{
      redeemer: Record<string, unknown>;
      redemptions: Redemption[];
    }>(`${ADMIN}/getRedeemerByPhone/${phone}`);
    return {
      redeemer: normalizeRedeemer(res.redeemer ?? {}),
      redemptions: res.redemptions ?? [],
    };
  },

  getAllRedeemers: async (page = 1, limit = 50) => {
    const res = await apiService.get<PaginatedRows<Record<string, unknown>>>(
      `${ADMIN}/getAllRedeemers?page=${page}&limit=${limit}`
    );
    return {
      rows: (res.rows ?? []).map((r) => normalizeRedeemer(r)),
      total: res.total ?? 0,
    };
  },

  createPromotionRule: (body: CreatePromotionRuleRequest) =>
    apiService.post<PromotionRule>(`${ADMIN}/createPromotionRule`, body),

  getAllPromotionRules: (includeInactive = true) =>
    apiService.get<PromotionRule[]>(
      `${ADMIN}/getAllPromotionRules?includeInactive=${includeInactive}`
    ),

  getPromotionRuleById: (id: string) =>
    apiService.get<PromotionRule>(`${ADMIN}/getPromotionRuleById/${id}`),

  updatePromotionRule: (id: string, body: Partial<CreatePromotionRuleRequest>) =>
    apiService.post<PromotionRule>(`${ADMIN}/updatePromotionRule/${id}`, body),

  togglePromotionRule: (id: string, is_active: boolean) =>
    apiService.post<PromotionRule>(`${ADMIN}/togglePromotionRule/${id}`, {
      is_active,
    }),

  deletePromotionRule: (id: string) =>
    apiService.post<{ promotionRuleId: string; deleted: boolean }>(
      `${ADMIN}/deletePromotionRule/${id}`
    ),

  previewPromotionRuleStack: (body: PreviewStackRequest) =>
    apiService.post<StackPreviewResult>(
      `${ADMIN}/previewPromotionRuleStack`,
      body
    ),

  getPromotionRuleStats: async (
    id: string,
    params?: { fromDate?: string; toDate?: string; recentLimit?: number }
  ) => {
    const q = new URLSearchParams();
    if (params?.fromDate) q.set('fromDate', params.fromDate);
    if (params?.toDate) q.set('toDate', params.toDate);
    if (params?.recentLimit) q.set('recentLimit', String(params.recentLimit));
    const qs = q.toString();
    const res = await apiService.get<{
      rule: {
        promotionRuleId?: string;
        ruleId?: string;
        name: string;
        ruleType?: string;
        rule_type?: string;
        isActive?: boolean;
        is_active?: boolean;
      };
      stats: Record<string, unknown>;
      recentApplications: {
        ruleApplicationId?: string;
        redemptionId: string;
        publicRef: string;
        code?: string;
        bonusPaise?: number;
        bonus_paise?: number;
        totalAmountPaise?: number;
        total_amount_paise?: number;
        appliedAt?: string;
        applied_at?: string;
      }[];
    }>(`${ADMIN}/getPromotionRuleStats/${id}${qs ? `?${qs}` : ''}`);

    return {
      rule: {
        promotionRuleId: res.rule.promotionRuleId ?? res.rule.ruleId ?? id,
        name: res.rule.name,
        ruleType: res.rule.ruleType ?? res.rule.rule_type ?? '',
        isActive: res.rule.isActive ?? res.rule.is_active ?? false,
      },
      stats: normalizeRuleStats(res.stats ?? {}),
      recentApplications: (res.recentApplications ?? []).map((a) => ({
        ruleApplicationId: a.ruleApplicationId ?? '',
        redemptionId: a.redemptionId,
        publicRef: a.publicRef,
        code: a.code ?? '',
        bonusPaise: a.bonusPaise ?? a.bonus_paise ?? 0,
        totalAmountPaise: a.totalAmountPaise ?? a.total_amount_paise ?? 0,
        appliedAt: a.appliedAt ?? a.applied_at ?? '',
      })),
    };
  },

  retryPayout: (redemptionId: string) =>
    apiService.post<{ redemptionId: string }>(
      `${ADMIN}/retryPayout/${redemptionId}`
    ),

  getPayoutAttempts: (redemptionId: string) =>
    apiService.get<PayoutAttempt[]>(
      `${ADMIN}/getPayoutAttempts/${redemptionId}`
    ),

  getRedemptionAttempts: (params: {
    failureReason?: string;
    code?: string;
    phone?: string;
    ip?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, String(v));
    });
    if (!q.has('page')) q.set('page', '1');
    if (!q.has('limit')) q.set('limit', '50');
    return apiService.get<PaginatedRows<RedemptionAttempt>>(
      `${ADMIN}/getRedemptionAttempts?${q}`
    );
  },
};

/** CSV export — not JSON */
export async function exportBatchCodesCsv(batchId: string): Promise<string> {
  const url = `${API_BASE_URL}${ADMIN}/exportBatchCodes/${batchId}`;
  const response = await authenticatedFetch(url);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string; message?: string }).error ||
        (err as { error?: string; message?: string }).message ||
        'Export failed'
    );
  }
  return response.text();
}

export function parseBatchCodesCsv(csv: string): ExportCouponRow[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const rows: ExportCouponRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 4) continue;
    rows.push({
      code: parts[0],
      redeem_url: parts[1],
      face_value_paise: parseInt(parts[2], 10),
      face_value_rupees: parseFloat(parts[3]),
    });
  }
  return rows;
}

export function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

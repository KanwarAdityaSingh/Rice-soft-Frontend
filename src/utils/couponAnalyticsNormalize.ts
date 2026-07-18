import type {
  AnalyticsOverview,
  BatchPerformanceRow,
  RedemptionTrendPoint,
  PayoutSummary,
  FraudSignals,
  PromotionRulePerformanceRow,
  RedeemerLeaderboardEntry,
  Redeemer,
} from '../types/coupons';

type CountAmount = { count?: number; amountPaise?: number; amount_paise?: number };

function num(...values: unknown[]): number {
  for (const v of values) {
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
  }
  return 0;
}

function countAmount(
  block: CountAmount | null | undefined,
  flatCount?: number,
  flatAmount?: number
): { count: number; amountPaise: number } {
  return {
    count: num(block?.count, flatCount),
    amountPaise: num(block?.amountPaise, block?.amount_paise, flatAmount),
  };
}

export function normalizeOverview(raw: Record<string, unknown>): AnalyticsOverview {
  const coupons = (raw.coupons ?? {}) as Record<string, unknown>;
  const redemptions = (raw.redemptions ?? {}) as Record<string, unknown>;
  const payouts = (raw.payouts ?? {}) as Record<string, unknown>;

  return {
    coupons: {
      totalGenerated: num(coupons.totalGenerated),
      allotted: num(coupons.allotted),
      redeemed: num(coupons.redeemed),
      expired: num(coupons.expired),
      redemptionRate: num(coupons.redemptionRate),
    },
    redemptions: {
      totalCount: num(redemptions.totalCount, redemptions.count),
      totalAmountPaise: num(redemptions.totalAmountPaise, redemptions.totalPayoutPaise),
      bonusAmountPaise: num(redemptions.bonusAmountPaise, redemptions.bonusPaise),
    },
    payouts: {
      pendingCount: num(payouts.pendingCount),
      pendingAmountPaise: num(payouts.pendingAmountPaise, payouts.pendingPayoutPaise),
      paidCount: num(payouts.paidCount),
      paidAmountPaise: num(payouts.paidAmountPaise, payouts.paidOutPaise, payouts.paidAmount),
    },
  };
}

export function normalizeBatch(
  raw: BatchPerformanceRow & {
    batchId?: string;
    pendingPayoutPaise?: number;
    paidOutPaise?: number;
  }
): BatchPerformanceRow {
  return {
    couponBatchId: raw.batchId ?? raw.couponBatchId ?? '',
    name: raw.name ?? '',
    allotted: num(raw.allotted),
    redeemed: num(raw.redeemed),
    redemptionRate: num(raw.redemptionRate),
    pendingAmountPaise: num(raw.pendingPayoutPaise, raw.pendingAmountPaise),
    paidAmountPaise: num(raw.paidOutPaise, raw.paidAmountPaise),
  };
}

export function normalizeTrend(
  raw: RedemptionTrendPoint & {
    count?: number;
    totalPayoutPaise?: number;
    amountPaise?: number;
  }
): RedemptionTrendPoint {
  return {
    date: raw.date ?? '',
    redemptionCount: num(raw.redemptionCount, raw.count),
    totalAmountPaise: num(raw.totalAmountPaise, raw.totalPayoutPaise, raw.amountPaise),
  };
}

export function normalizePayoutSummary(raw: Record<string, unknown>): PayoutSummary {
  const pending = (raw.pending ?? {}) as CountAmount;
  const paidManual = (raw.paidManual ?? raw.paid_manual ?? {}) as CountAmount;
  const paidRazorpay = (raw.paidRazorpay ?? raw.paid_razorpay ?? {}) as CountAmount;

  return {
    pending: countAmount(pending, num(raw.pendingCount), num(raw.pendingAmountPaise, raw.pendingPayoutPaise)),
    paidManual: countAmount(
      paidManual,
      num(raw.paidManualCount),
      num(raw.paidManualAmountPaise)
    ),
    paidRazorpay: countAmount(
      paidRazorpay,
      num(raw.paidRazorpayCount),
      num(raw.paidRazorpayAmountPaise)
    ),
    razorpayFailedAttempts: num(raw.razorpayFailedAttempts, raw.razorpay_failed_attempts),
  };
}

export function normalizeRedeemerLeaderboard(
  raw: RedeemerLeaderboardEntry & {
    totalRedemptions?: number;
    lifetimeEarnedPaise?: number;
  }
): RedeemerLeaderboardEntry {
  return {
    phone: raw.phone ?? '',
    name: raw.name,
    redemptionCount: num(raw.totalRedemptions, raw.redemptionCount),
    totalEarnedPaise: num(raw.lifetimeEarnedPaise, raw.totalEarnedPaise),
  };
}

export function normalizeFraudSignals(raw: Record<string, unknown>): FraudSignals {
  return {
    failedAttempts: num(raw.failedAttempts, raw.failed_attempts),
    failureReasonBreakdown:
      (raw.failureReasonBreakdown as Record<string, number>) ??
      (raw.failure_reason_breakdown as Record<string, number>) ??
      {},
    topFailedCodes:
      (raw.topFailedCodes as FraudSignals['topFailedCodes']) ??
      (raw.top_failed_codes as FraudSignals['topFailedCodes']) ??
      [],
    topFailedIps:
      (raw.topFailedIps as FraudSignals['topFailedIps']) ??
      (raw.top_failed_ips as FraudSignals['topFailedIps']) ??
      [],
    phonesWithHighRedemptions:
      (raw.phonesWithHighRedemptions as FraudSignals['phonesWithHighRedemptions']) ??
      (raw.phones_with_high_redemptions as FraudSignals['phonesWithHighRedemptions']) ??
      [],
  };
}

export function normalizeRulePerformance(
  raw: PromotionRulePerformanceRow & {
    ruleId?: string;
    fireCount?: number;
    fires?: number;
    bonusPaidPaise?: number;
    totalBonusPaidPaise?: number;
    rule_type?: string;
    is_active?: boolean;
    last_applied_at?: string | null;
  }
): PromotionRulePerformanceRow {
  return {
    promotionRuleId: raw.promotionRuleId ?? raw.ruleId ?? '',
    name: raw.name ?? '',
    ruleType: (raw.ruleType ?? raw.rule_type ?? 'FIRST_TIME') as PromotionRulePerformanceRow['ruleType'],
    isActive: raw.isActive ?? raw.is_active ?? false,
    applicationCount: num(raw.applicationCount, raw.fireCount, raw.fires),
    totalBonusPaise: num(raw.totalBonusPaise, raw.bonusPaidPaise, raw.totalBonusPaidPaise),
    lastAppliedAt: raw.lastAppliedAt ?? raw.last_applied_at ?? null,
  };
}

export function normalizeRedeemer(
  raw: Record<string, unknown> & Partial<Redeemer>
): Redeemer {
  return {
    redeemer_id: (raw.redeemer_id ?? raw.redeemerId) as string | undefined,
    phone: String(raw.phone ?? ''),
    name: (raw.name ?? null) as string | null,
    upi_vpa: (raw.upi_vpa ?? raw.upiVpa ?? null) as string | null,
    account_holder_name: (raw.account_holder_name ?? raw.accountHolderName ?? null) as string | null,
    account_number: (raw.account_number ?? raw.accountNumber ?? null) as string | null,
    ifsc: (raw.ifsc ?? null) as string | null,
    bank_name: (raw.bank_name ?? raw.bankName ?? null) as string | null,
    total_redemptions: num(raw.total_redemptions, raw.totalRedemptions),
    lifetime_earned_paise: num(raw.lifetime_earned_paise, raw.lifetimeEarnedPaise),
    first_redeemed_at: (raw.first_redeemed_at ?? raw.firstRedeemedAt ?? null) as string | null,
    last_redeemed_at: (raw.last_redeemed_at ?? raw.lastRedeemedAt ?? null) as string | null,
    created_at: (raw.created_at ?? raw.createdAt ?? null) as string | null,
    updated_at: (raw.updated_at ?? raw.updatedAt ?? null) as string | null,
  };
}

export function normalizeRuleStats(raw: Record<string, unknown>) {
  return {
    applicationCount: num(raw.applicationCount, raw.fireCount, raw.fires),
    totalBonusPaise: num(raw.totalBonusPaise, raw.bonusPaidPaise, raw.totalBonusPaidPaise),
    averageBonusPaise: num(raw.averageBonusPaise, raw.averageBonusPaidPaise),
    lastAppliedAt: (raw.lastAppliedAt ?? raw.last_applied_at) as string | undefined,
  };
}

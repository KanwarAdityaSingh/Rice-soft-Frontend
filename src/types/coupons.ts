export type CouponStatus =
  | 'created'
  | 'printed'
  | 'allotted'
  | 'redeemed'
  | 'expired'
  | 'void';

export type BatchStatus = 'draft' | 'generating' | 'ready' | 'archived';

export type PayoutStatus = 'pending' | 'paid';

export type PaidVia = 'manual' | 'razorpay';

export type RuleType = 'FIRST_TIME' | 'REDEMPTION_COUNT' | 'BATCH';

export type RewardType = 'FIXED' | 'PERCENT' | 'MULTIPLIER' | 'PERCENT_CAPPED';

export interface CouponBatch {
  coupon_batch_id: string;
  name: string;
  description?: string | null;
  face_value_paise: number;
  total_count: number;
  generated_count: number;
  status: BatchStatus;
  expires_at?: string | null;
  redeem_base_url?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface BatchStats {
  created: number;
  printed: number;
  allotted: number;
  redeemed: number;
  expired: number;
  void: number;
  redemption_rate: number;
}

export interface Coupon {
  coupon_id: string;
  code: string;
  status: CouponStatus;
  face_value_paise: number;
  coupon_batch_id: string;
  expires_at?: string | null;
  redeemed_at?: string | null;
  created_at: string;
}

export interface CouponStatusHistory {
  from_status: CouponStatus | null;
  to_status: CouponStatus;
  reason?: string | null;
  changed_by?: string | null;
  created_at: string;
}

export interface Redemption {
  redemption_id: string;
  public_ref: string;
  code: string;
  coupon_id?: string;
  redeemer_id?: string;
  coupon_batch_id?: string;
  base_amount_paise: number;
  bonus_amount_paise: number;
  total_amount_paise: number;
  payout_status: PayoutStatus;
  paid_via?: PaidVia | null;
  payment_reference?: string | null;
  paid_at?: string | null;
  paid_by?: string | null;
  payout_upi_vpa?: string | null;
  payout_account_holder_name?: string | null;
  payout_account_number?: string | null;
  payout_ifsc?: string | null;
  payout_bank_name?: string | null;
  last_payout_error?: string | null;
  idempotency_key?: string | null;
  redeemed_ip?: string | null;
  redeemed_user_agent?: string | null;
  created_at: string;
}

export interface Redeemer {
  redeemer_id?: string;
  phone: string;
  name?: string | null;
  upi_vpa?: string | null;
  account_holder_name?: string | null;
  account_number?: string | null;
  ifsc?: string | null;
  bank_name?: string | null;
  total_redemptions: number;
  lifetime_earned_paise: number;
  first_redeemed_at?: string | null;
  last_redeemed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PromotionRule {
  promotion_rule_id: string;
  name: string;
  description?: string | null;
  rule_type: RuleType;
  conditions: Record<string, unknown>;
  reward: PromotionRuleReward;
  is_active: boolean;
  priority: number;
  valid_from?: string | null;
  valid_to?: string | null;
  created_at?: string;
  updated_at?: string;
  application_count?: number;
}

export interface PromotionRuleReward {
  type?: RewardType;
  bonusPaise?: number;
  percent?: number;
  times?: number;
  maxBonusPaise?: number;
}

export interface RuleApplication {
  rule_name: string;
  bonus_paise: number;
  created_at: string;
}

export interface PayoutAttempt {
  status: string;
  razorpay_payout_id?: string | null;
  failure_reason?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface RedemptionAttempt {
  redemption_attempt_id: string;
  code_attempted: string;
  phone?: string | null;
  ip?: string | null;
  failure_reason: string;
  created_at: string;
}

export interface PaginatedRows<T> {
  rows: T[];
  total: number;
}

export interface CreateCouponBatchRequest {
  name: string;
  description?: string;
  face_value_paise: number;
  total_count: number;
  expires_at?: string | null;
  redeem_base_url?: string;
}

export interface CreatePromotionRuleRequest {
  name: string;
  description?: string;
  rule_type: RuleType;
  conditions: Record<string, unknown>;
  reward: PromotionRuleReward;
  is_active?: boolean;
  priority?: number;
  valid_from?: string | null;
  valid_to?: string | null;
}

export interface PreviewStackRequest {
  coupon_batch_id: string;
  phone?: string;
  total_redemptions?: number;
  face_value_paise?: number;
  include_inactive?: boolean;
  include_skipped?: boolean;
}

export interface AppliedRulePreview {
  promotionRuleId: string;
  ruleName: string;
  ruleType: RuleType;
  priority: number;
  bonusPaise: number;
  rewardType: RewardType;
  rewardDetail?: string | null;
}

export interface SkippedRulePreview {
  promotionRuleId: string;
  ruleName: string;
  ruleType: RuleType;
  priority: number;
  skipReason: string;
}

export interface StackPreviewResult {
  redeemerContext: { totalRedemptions: number; phone?: string };
  couponBatchId: string;
  faceValuePaise: number;
  baseAmountPaise: number;
  bonusAmountPaise: number;
  totalAmountPaise: number;
  appliedRules: AppliedRulePreview[];
  skippedRules: SkippedRulePreview[];
}

export interface AnalyticsOverview {
  coupons: {
    totalGenerated: number;
    allotted: number;
    redeemed: number;
    expired: number;
    redemptionRate: number;
  };
  redemptions: {
    totalCount: number;
    totalAmountPaise: number;
    bonusAmountPaise: number;
  };
  payouts: {
    pendingCount: number;
    pendingAmountPaise: number;
    paidCount: number;
    paidAmountPaise: number;
  };
}

export interface BatchPerformanceRow {
  couponBatchId: string;
  name: string;
  allotted: number;
  redeemed: number;
  redemptionRate: number;
  pendingAmountPaise: number;
  paidAmountPaise: number;
}

export interface RedemptionTrendPoint {
  date: string;
  redemptionCount: number;
  totalAmountPaise: number;
}

export interface PayoutSummary {
  pending: { count: number; amountPaise: number };
  paidManual: { count: number; amountPaise: number };
  paidRazorpay: { count: number; amountPaise: number };
  razorpayFailedAttempts: number;
}

export interface FraudSignals {
  failedAttempts: number;
  failureReasonBreakdown: Record<string, number>;
  topFailedCodes: { codePrefix: string; attempts: number }[];
  topFailedIps: { ip: string; attempts: number }[];
  phonesWithHighRedemptions: { phone: string; count: number }[];
}

export interface RedeemerLeaderboardEntry {
  phone: string;
  name?: string;
  redemptionCount: number;
  totalEarnedPaise: number;
}

export interface PromotionRulePerformanceRow {
  promotionRuleId: string;
  name: string;
  ruleType: RuleType;
  isActive: boolean;
  applicationCount: number;
  totalBonusPaise: number;
  lastAppliedAt?: string | null;
}

export interface ExportCouponRow {
  code: string;
  redeem_url: string;
  face_value_paise: number;
  face_value_rupees: number;
}

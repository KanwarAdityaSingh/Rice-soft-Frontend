import type {
  BatchStatus,
  CouponStatus,
  PayoutStatus,
  RuleType,
  RewardType,
  Redeemer,
} from '../types/coupons';

/** Backend DB and analytics buckets use IST calendar days. */
export const IST_TIMEZONE = 'Asia/Kolkata';

const PLAIN_CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse an API date for display.
 * YYYY-MM-DD = IST calendar bucket (not UTC midnight).
 * ISO with Z = instant — format via IST timezone, don't strip Z.
 */
export function calendarDateForDisplay(value: string): Date {
  if (PLAIN_CALENDAR_DATE.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    // Noon UTC keeps the calendar day stable in Asia/Kolkata across client locales.
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  }
  return new Date(value);
}

export function formatIstDate(
  value: string,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }
): string {
  return calendarDateForDisplay(value).toLocaleDateString('en-IN', {
    timeZone: IST_TIMEZONE,
    ...options,
  });
}

/**
 * Trend bucket label — API may return midnight IST as a UTC instant, e.g.
 * "2026-07-04T18:30:00.000Z" → display "5 Jul 2026" (not "4 Jul").
 */
export function chartLabel(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Chart axis labels for redemption trend buckets. */
export function formatChartBucketDate(
  value: string,
  granularity: 'day' | 'week' | 'month' | string
): string {
  if (PLAIN_CALENDAR_DATE.test(value)) {
    return formatIstDate(
      value,
      granularity === 'month'
        ? { month: 'short', year: '2-digit' }
        : { day: 'numeric', month: 'short' }
    );
  }
  return new Date(value).toLocaleDateString('en-IN', {
    timeZone: IST_TIMEZONE,
    ...(granularity === 'month'
      ? { month: 'short', year: '2-digit' }
      : { day: 'numeric', month: 'short' }),
  });
}

export function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatRupeesPlain(paise: number): string {
  return `Rs. ${(paise / 100).toFixed(2)}`;
}

export function paiseToRupeesInput(paise: number): string {
  return (paise / 100).toString();
}

export function rupeesInputToPaise(value: string): number {
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

const COUPON_STATUS_STYLES: Record<
  CouponStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  created: {
    label: 'Created',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
  },
  printed: {
    label: 'Printed',
    bg: 'bg-sky-100',
    text: 'text-sky-700',
    border: 'border-sky-200',
  },
  allotted: {
    label: 'Allotted',
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  redeemed: {
    label: 'Redeemed',
    bg: 'bg-violet-100',
    text: 'text-violet-700',
    border: 'border-violet-200',
  },
  expired: {
    label: 'Expired',
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  void: {
    label: 'Void',
    bg: 'bg-rose-100',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
};

const BATCH_STATUS_STYLES: Record<
  BatchStatus,
  { label: string; bg: string; text: string }
> = {
  draft: { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-600' },
  generating: {
    label: 'Generating',
    bg: 'bg-amber-100',
    text: 'text-amber-700',
  },
  ready: { label: 'Ready', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  archived: { label: 'Archived', bg: 'bg-gray-100', text: 'text-gray-500' },
};

const PAYOUT_STATUS_STYLES: Record<
  PayoutStatus,
  { label: string; bg: string; text: string }
> = {
  pending: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-700' },
  paid: { label: 'Paid', bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

export function getCouponStatusStyle(status: CouponStatus) {
  return COUPON_STATUS_STYLES[status] ?? COUPON_STATUS_STYLES.created;
}

export function getBatchStatusStyle(status: BatchStatus) {
  return BATCH_STATUS_STYLES[status] ?? BATCH_STATUS_STYLES.draft;
}

export function getPayoutStatusStyle(status: PayoutStatus) {
  return PAYOUT_STATUS_STYLES[status] ?? PAYOUT_STATUS_STYLES.pending;
}

export function ruleTypeLabel(type: RuleType): string {
  const labels: Record<RuleType, string> = {
    FIRST_TIME: 'First-time bonus',
    REDEMPTION_COUNT: 'Redemption milestone',
    BATCH: 'Batch-specific',
  };
  return labels[type] ?? type;
}

export function rewardTypeLabel(type: RewardType): string {
  const labels: Record<RewardType, string> = {
    FIXED: 'Fixed bonus',
    PERCENT: 'Percentage',
    MULTIPLIER: 'Multiplier',
    PERCENT_CAPPED: 'Percent (capped)',
  };
  return labels[type] ?? type;
}

export function formatRewardSummary(reward: {
  type?: RewardType;
  bonusPaise?: number;
  percent?: number;
  times?: number;
  maxBonusPaise?: number;
}): string {
  const type = reward.type ?? (reward.bonusPaise != null ? 'FIXED' : 'FIXED');
  switch (type) {
    case 'FIXED':
      return `+${formatRupees(reward.bonusPaise ?? 0)}`;
    case 'PERCENT':
      return `${reward.percent ?? 0}% of face value`;
    case 'MULTIPLIER':
      return `${reward.times ?? 1}× payout`;
    case 'PERCENT_CAPPED':
      return `${reward.percent ?? 0}% (max ${formatRupees(reward.maxBonusPaise ?? 0)})`;
    default:
      return '—';
  }
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return formatIstDate(iso, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      timeZone: IST_TIMEZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function hasRedeemerBankDetails(
  r: Pick<Redeemer, 'account_holder_name' | 'account_number' | 'ifsc' | 'bank_name'>
): boolean {
  return Boolean(r.account_number || r.ifsc || r.account_holder_name || r.bank_name);
}

/** Razorpay failure = still pending, with last_payout_error set (no separate failed status). */
export function isRazorpayPayoutFailed(row: {
  payout_status: string;
  last_payout_error?: string | null;
}): boolean {
  return row.payout_status === 'pending' && !!row.last_payout_error?.trim();
}

export const FAILURE_REASON_LABELS: Record<string, string> = {
  not_found: 'Code not found',
  expired: 'Expired',
  not_allotted: 'Not allotted',
  already_redeemed: 'Already redeemed',
  void: 'Void coupon',
  invalid_format: 'Invalid format',
};

export function canGenerateBatch(batch: {
  status: BatchStatus;
  generated_count: number;
  total_count: number;
}): boolean {
  return (
    (batch.status === 'draft' || batch.status === 'generating') &&
    batch.generated_count < batch.total_count
  );
}

export function canDeleteBatch(stats?: { redeemed: number }): boolean {
  return (stats?.redeemed ?? 0) === 0;
}

import type { Redemption, PayoutAttempt } from '../../../types/coupons';
import { PayoutStatusBadge } from '../shared/CouponUi';
import { formatDateTime, isRazorpayPayoutFailed } from '../../../utils/couponFormat';

export function AutoPayFailedBadge() {
  return (
    <span className="inline-flex text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
      Auto-pay failed
    </span>
  );
}

export function PayoutQueueStatus({ redemption }: { redemption: Redemption }) {
  const failed = isRazorpayPayoutFailed(redemption);
  return (
    <div className="flex flex-col items-start gap-1">
      <PayoutStatusBadge status={redemption.payout_status} />
      {failed && <AutoPayFailedBadge />}
    </div>
  );
}

export function PayoutErrorText({ error }: { error?: string | null }) {
  if (!error?.trim()) {
    return <span className="text-slate-400 text-xs">—</span>;
  }
  return (
    <span className="text-xs text-amber-800 leading-snug" title={error}>
      ⚠ {error}
    </span>
  );
}

/** Compact payout destination for queue tables (UPI or bank, not both). */
export function PayoutDestinationCell({ redemption: r }: { redemption: Redemption }) {
  if (r.payout_upi_vpa?.trim()) {
    return (
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-violet-400">UPI</p>
        <p
          className="font-mono text-xs text-violet-800 truncate max-w-[14rem]"
          title={r.payout_upi_vpa}
        >
          {r.payout_upi_vpa}
        </p>
      </div>
    );
  }

  const hasBank =
    r.payout_account_holder_name ||
    r.payout_bank_name ||
    r.payout_account_number ||
    r.payout_ifsc;

  if (!hasBank) {
    return <span className="text-slate-400 text-xs">—</span>;
  }

  return (
    <div className="min-w-0 text-xs leading-snug space-y-0.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-violet-400">Bank</p>
      {r.payout_account_holder_name && (
        <p className="text-violet-900 truncate max-w-[14rem]" title={r.payout_account_holder_name}>
          {r.payout_account_holder_name}
        </p>
      )}
      {(r.payout_bank_name || r.payout_ifsc) && (
        <p className="text-violet-500 truncate max-w-[14rem]">
          {[r.payout_bank_name, r.payout_ifsc].filter(Boolean).join(' · ')}
        </p>
      )}
      {r.payout_account_number && (
        <p className="font-mono text-violet-800">{r.payout_account_number}</p>
      )}
    </div>
  );
}

export function PayoutQueueStatusBlock({ redemption }: { redemption: Redemption }) {
  const failed = isRazorpayPayoutFailed(redemption);
  return (
    <div className="flex flex-col items-start gap-1 min-w-0">
      <PayoutQueueStatus redemption={redemption} />
      {failed && redemption.last_payout_error && (
        <p
          className="text-[11px] text-amber-800 leading-snug line-clamp-2"
          title={redemption.last_payout_error}
        >
          {redemption.last_payout_error}
        </p>
      )}
    </div>
  );
}

export function AutoPayFailedBanner({ error }: { error: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-wrap items-start gap-3">
      <AutoPayFailedBadge />
      <p className="text-sm text-amber-900 flex-1 min-w-0">
        <span className="font-semibold">Razorpay could not pay out automatically.</span>{' '}
        {error}
      </p>
    </div>
  );
}

export function PayoutAttemptsTimeline({ attempts }: { attempts: PayoutAttempt[] }) {
  if (!attempts.length) return null;

  const sorted = [...attempts].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <ol className="relative border-l-2 border-violet-100 ml-2 space-y-4 py-1">
      {sorted.map((a, i) => {
        const success = a.status === 'success' || a.status === 'processed';
        return (
          <li key={i} className="relative pl-5">
            <span
              className={`absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-white ${
                success ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span
                className={`text-sm font-semibold capitalize ${
                  success ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {a.status}
              </span>
              <span className="text-xs text-violet-400">{formatDateTime(a.created_at)}</span>
            </div>
            {a.failure_reason && (
              <p className="text-xs text-rose-600 mt-0.5">{a.failure_reason}</p>
            )}
            {a.razorpay_payout_id && (
              <p className="text-[10px] font-mono text-slate-400 mt-0.5">{a.razorpay_payout_id}</p>
            )}
            {a.completed_at && (
              <p className="text-[10px] text-slate-400 mt-0.5">
                Completed {formatDateTime(a.completed_at)}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

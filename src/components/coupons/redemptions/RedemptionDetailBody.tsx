import { Link } from 'react-router-dom';
import type { Redemption, Redeemer, RuleApplication, PayoutAttempt } from '../../../types/coupons';
import { formatRupees, formatDateTime, isRazorpayPayoutFailed } from '../../../utils/couponFormat';
import {
  AutoPayFailedBanner,
  PayoutAttemptsTimeline,
  PayoutQueueStatus,
} from './PayoutQueueUi';
import { PaidByText } from './PaidByText';
import { useUserDisplayNames } from '../../../hooks/useUserDisplayNames';

function DetailField({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">{label}</dt>
      <dd className={`text-sm text-slate-800 break-all ${mono ? 'font-mono text-xs' : ''}`}>
        {value?.trim() ? value : '—'}
      </dd>
    </div>
  );
}

interface RedemptionDetailBodyProps {
  redemption: Redemption;
  redeemer?: Redeemer | null;
  rules?: RuleApplication[];
  attempts?: PayoutAttempt[];
  compact?: boolean;
}

export function RedemptionDetailBody({
  redemption: r,
  redeemer,
  rules = [],
  attempts = [],
  compact,
}: RedemptionDetailBodyProps) {
  const { resolve: resolveUserName } = useUserDisplayNames();
  const gridClass = compact ? 'grid sm:grid-cols-2 gap-4' : 'grid md:grid-cols-2 gap-6';
  const payoutFailed = isRazorpayPayoutFailed(r);

  return (
    <div className="space-y-4">
      {payoutFailed && r.last_payout_error && (
        <AutoPayFailedBanner error={r.last_payout_error} />
      )}

      <div className={gridClass}>
      <div className="coupon-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-violet-800">Redemption</h3>
          <PayoutQueueStatus redemption={r} />
        </div>
        <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-3">
          <DetailField label="Reference" value={r.public_ref} mono />
          <DetailField label="Coupon code" value={r.code} mono />
          <DetailField label="Redeemed at" value={formatDateTime(r.created_at)} />
          <DetailField label="Redemption ID" value={r.redemption_id} mono className="sm:col-span-2" />
          <DetailField label="Coupon ID" value={r.coupon_id} mono />
          <DetailField label="Batch ID" value={r.coupon_batch_id} mono />
          {r.coupon_batch_id && (
            <div className="sm:col-span-2">
              <Link
                to={`/coupons/batches/${r.coupon_batch_id}`}
                className="text-sm text-violet-600 font-semibold hover:underline"
              >
                View batch →
              </Link>
            </div>
          )}
        </dl>
      </div>

      <div className="coupon-card p-5 space-y-4">
        <h3 className="font-bold text-violet-800">Amount breakdown</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-violet-500">Base amount</span>
            <span>{formatRupees(r.base_amount_paise ?? r.total_amount_paise - (r.bonus_amount_paise ?? 0))}</span>
          </div>
          <div className="flex justify-between text-emerald-600">
            <span>Bonus</span>
            <span>+{formatRupees(r.bonus_amount_paise ?? 0)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t border-violet-100">
            <span>Total payout</span>
            <span>{formatRupees(r.total_amount_paise)}</span>
          </div>
        </div>
        {r.payout_status === 'paid' && (
          <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-3 pt-3 border-t border-violet-100">
            <DetailField label="Paid via" value={r.paid_via ?? undefined} />
            <DetailField label="Payment reference" value={r.payment_reference} mono />
            <DetailField label="Paid at" value={formatDateTime(r.paid_at)} />
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">Paid by</dt>
              <dd>
                <PaidByText userId={r.paid_by} name={resolveUserName(r.paid_by)} />
              </dd>
            </div>
          </dl>
        )}
      </div>

      <div className="coupon-card p-5 space-y-3">
        <h3 className="font-bold text-violet-800">Payout destination (at redeem)</h3>
        <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-3">
          <DetailField label="UPI VPA" value={r.payout_upi_vpa} mono />
          <DetailField label="Account holder" value={r.payout_account_holder_name} />
          <DetailField label="Bank" value={r.payout_bank_name} />
          <DetailField label="Account number" value={r.payout_account_number} mono />
          <DetailField label="IFSC" value={r.payout_ifsc} mono />
        </dl>
      </div>

      {redeemer && (
        <div className="coupon-card p-5">
          <h3 className="font-bold text-violet-800 mb-3">Redeemer</h3>
          <Link
            to={`/coupons/redeemers?phone=${redeemer.phone}`}
            className="text-violet-700 font-semibold hover:underline"
          >
            {redeemer.phone}
          </Link>
          {redeemer.name && <p className="text-sm text-violet-500 mt-1">{redeemer.name}</p>}
          <p className="text-xs text-violet-400 mt-2">
            {redeemer.total_redemptions} redemptions · {formatRupees(redeemer.lifetime_earned_paise)} lifetime
          </p>
          {r.redeemer_id && (
            <p className="text-[10px] font-mono text-slate-400 mt-2 break-all">{r.redeemer_id}</p>
          )}
        </div>
      )}

      <div className="coupon-card p-5 space-y-3 md:col-span-2">
        <h3 className="font-bold text-violet-800">Request metadata</h3>
        <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
          <DetailField label="Redeem IP" value={r.redeemed_ip} mono />
          <DetailField label="Idempotency key" value={r.idempotency_key} mono className="sm:col-span-2" />
          <DetailField
            label="User agent"
            value={r.redeemed_user_agent}
            className="sm:col-span-2 lg:col-span-3"
          />
        </dl>
      </div>

      {rules.length > 0 && (
        <div className="coupon-card p-5 md:col-span-2">
          <h3 className="font-bold text-violet-800 mb-3">Applied rules</h3>
          <ul className="space-y-2">
            {rules.map((rule, i) => (
              <li key={i} className="flex justify-between items-start text-sm gap-3">
                <div>
                  <span>{rule.rule_name}</span>
                  <p className="text-[10px] text-violet-400">{formatDateTime(rule.created_at)}</p>
                </div>
                <span className="text-emerald-600 font-semibold shrink-0">+{formatRupees(rule.bonus_paise)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {attempts.length > 0 && (
        <div className="coupon-card p-5 md:col-span-2">
          <h3 className="font-bold text-violet-800 mb-4">Razorpay payout timeline</h3>
          <PayoutAttemptsTimeline attempts={attempts} />
        </div>
      )}
      </div>
    </div>
  );
}

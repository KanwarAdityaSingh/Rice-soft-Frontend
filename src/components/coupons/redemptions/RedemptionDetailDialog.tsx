import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { X, ExternalLink, RotateCcw } from 'lucide-react';
import { CouponLoading } from '../shared/CouponUi';
import { MarkPaidModal } from './MarkPaidModal';
import { RedemptionDetailBody } from './RedemptionDetailBody';
import { couponsAPI } from '../../../services/coupons.api';
import type { Redemption, Redeemer, RuleApplication, PayoutAttempt } from '../../../types/coupons';
import { formatRupees, isRazorpayPayoutFailed } from '../../../utils/couponFormat';

interface RedemptionDetailDialogProps {
  redemptionId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export function RedemptionDetailDialog({ redemptionId, onClose, onUpdated }: RedemptionDetailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [redemption, setRedemption] = useState<Redemption | null>(null);
  const [redeemer, setRedeemer] = useState<Redeemer | null>(null);
  const [rules, setRules] = useState<RuleApplication[]>([]);
  const [attempts, setAttempts] = useState<PayoutAttempt[]>([]);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    if (!redemptionId) return;
    setLoading(true);
    try {
      const res = await couponsAPI.getRedemptionById(redemptionId);
      setRedemption(res.redemption);
      setRedeemer(res.redeemer);
      setRules(res.ruleApplications ?? []);
      setAttempts(res.payoutAttempts ?? []);
    } catch {
      setRedemption(null);
    } finally {
      setLoading(false);
    }
  }, [redemptionId]);

  useEffect(() => {
    if (!redemptionId) {
      setRedemption(null);
      return;
    }
    void load();
  }, [redemptionId, load]);

  if (!redemptionId) return null;

  const payoutFailed = redemption ? isRazorpayPayoutFailed(redemption) : false;

  const handleMarkPaid = async (ref: string, notes?: string) => {
    if (!redemption) return;
    await couponsAPI.markRedemptionPaid(redemption.redemption_id, { payment_reference: ref, notes });
    await load();
    onUpdated?.();
  };

  const handleRetry = async () => {
    if (!redemption) return;
    setActionLoading(true);
    try {
      await couponsAPI.retryPayout(redemption.redemption_id);
      await load();
      onUpdated?.();
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="coupon-card w-full max-w-4xl my-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-violet-100">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Redemption detail</p>
            <h2 className="text-xl font-bold text-violet-950 mt-1">
              {redemption?.public_ref ?? 'Loading…'}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {redemption?.payout_status === 'pending' && (
              <>
                {payoutFailed && (
                  <button
                    type="button"
                    className="coupon-btn-secondary text-xs flex items-center gap-1"
                    disabled={actionLoading}
                    onClick={() => void handleRetry()}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Retry payout
                  </button>
                )}
                <button
                  type="button"
                  className="coupon-btn-primary text-xs"
                  onClick={() => setMarkPaidOpen(true)}
                >
                  Mark paid manually
                </button>
              </>
            )}
            {redemption && (
              <Link
                to={`/coupons/redemptions/${redemption.redemption_id}`}
                className="coupon-btn-secondary text-xs flex items-center gap-1"
                onClick={onClose}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Full page
              </Link>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-5 max-h-[75vh] overflow-y-auto">
          {loading ? (
            <CouponLoading />
          ) : redemption ? (
            <RedemptionDetailBody
              redemption={redemption}
              redeemer={redeemer}
              rules={rules}
              attempts={attempts}
              compact
            />
          ) : (
            <p className="text-center text-violet-500 py-8">Could not load redemption</p>
          )}
        </div>
      </div>

      {redemption && (
        <MarkPaidModal
          open={markPaidOpen}
          publicRef={redemption.public_ref}
          amountLabel={formatRupees(redemption.total_amount_paise)}
          onClose={() => setMarkPaidOpen(false)}
          onSubmit={handleMarkPaid}
        />
      )}
    </div>
  );
}

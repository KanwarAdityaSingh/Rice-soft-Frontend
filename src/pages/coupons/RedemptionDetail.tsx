import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import {
  CouponPageHeader,
  CouponLoading,
} from '../../components/coupons/shared/CouponUi';
import { MarkPaidModal } from '../../components/coupons/redemptions/MarkPaidModal';
import { RedemptionDetailBody } from '../../components/coupons/redemptions/RedemptionDetailBody';
import { couponsAPI } from '../../services/coupons.api';
import type { Redemption, Redeemer, RuleApplication, PayoutAttempt } from '../../types/coupons';
import { formatRupees, formatDateTime, isRazorpayPayoutFailed } from '../../utils/couponFormat';
import { PayoutQueueStatus } from '../../components/coupons/redemptions/PayoutQueueUi';

export default function RedemptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [redemption, setRedemption] = useState<Redemption | null>(null);
  const [redeemer, setRedeemer] = useState<Redeemer | null>(null);
  const [rules, setRules] = useState<RuleApplication[]>([]);
  const [attempts, setAttempts] = useState<PayoutAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [undoOpen, setUndoOpen] = useState(false);
  const [undoReason, setUndoReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await couponsAPI.getRedemptionById(id);
      setRedemption(res.redemption);
      setRedeemer(res.redeemer);
      setRules(res.ruleApplications ?? []);
      setAttempts(res.payoutAttempts ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  if (loading) return <CouponLoading />;
  if (!redemption) {
    return (
      <div className="coupon-page">
        <p className="text-violet-500">Redemption not found</p>
      </div>
    );
  }

  const handleMarkPaid = async (ref: string, notes?: string) => {
    await couponsAPI.markRedemptionPaid(redemption.redemption_id, {
      payment_reference: ref,
      notes,
    });
    await load();
  };

  const handleUndo = async () => {
    setActionLoading(true);
    try {
      await couponsAPI.unmarkRedemptionPaid(redemption.redemption_id, {
        reason: undoReason,
      });
      await load();
      setUndoOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetry = async () => {
    setActionLoading(true);
    try {
      await couponsAPI.retryPayout(redemption.redemption_id);
      await load();
    } finally {
      setActionLoading(false);
    }
  };

  const payoutFailed = isRazorpayPayoutFailed(redemption);

  return (
    <div className="coupon-page">
      <Link to="/coupons/redemptions" className="text-sm text-violet-500 flex items-center gap-1 mb-4">
        <ArrowLeft className="h-3 w-3" /> All redemptions
      </Link>

      <CouponPageHeader
        title={redemption.public_ref}
        subtitle={`Coupon ${redemption.code} · Redeemed ${formatDateTime(redemption.created_at)}`}
        badge="Redemption detail"
        actions={
          <div className="flex gap-2 flex-wrap items-center">
            <PayoutQueueStatus redemption={redemption} />
            {redemption.payout_status === 'pending' && (
              <>
                {payoutFailed && (
                  <button
                    type="button"
                    className="coupon-btn-secondary flex items-center gap-1"
                    disabled={actionLoading}
                    onClick={handleRetry}
                  >
                    <RotateCcw className="h-3 w-3" /> Retry payout
                  </button>
                )}
                <button type="button" className="coupon-btn-primary" onClick={() => setMarkPaidOpen(true)}>
                  Mark paid manually
                </button>
              </>
            )}
            {redemption.payout_status === 'paid' && (
              <button type="button" className="coupon-btn-danger" onClick={() => setUndoOpen(true)}>
                Undo paid
              </button>
            )}
          </div>
        }
      />

      <RedemptionDetailBody
        redemption={redemption}
        redeemer={redeemer}
        rules={rules}
        attempts={attempts}
      />

      <MarkPaidModal
        open={markPaidOpen}
        publicRef={redemption.public_ref}
        amountLabel={formatRupees(redemption.total_amount_paise)}
        onClose={() => setMarkPaidOpen(false)}
        onSubmit={handleMarkPaid}
      />

      {undoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-violet-950/30 backdrop-blur-sm">
          <div className="coupon-card p-6 max-w-md w-full">
            <h3 className="font-bold text-violet-950">Undo mark paid</h3>
            <p className="text-sm text-violet-500 mt-1">Revert this redemption to pending. Reason required.</p>
            <textarea
              className="coupon-input mt-3 min-h-[80px]"
              value={undoReason}
              onChange={(e) => setUndoReason(e.target.value)}
              placeholder="Marked wrong redemption by mistake"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" className="coupon-btn-secondary" onClick={() => setUndoOpen(false)}>Cancel</button>
              <button type="button" className="coupon-btn-danger" disabled={!undoReason.trim() || actionLoading} onClick={handleUndo}>
                Revert to pending
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

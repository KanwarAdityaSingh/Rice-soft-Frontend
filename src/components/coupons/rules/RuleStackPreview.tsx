import { useEffect, useState } from 'react';
import { Check, X, ArrowRight, User, Ticket } from 'lucide-react';
import type { StackPreviewResult } from '../../../types/coupons';
import { couponsAPI } from '../../../services/coupons.api';
import { formatRupees, rewardTypeLabel } from '../../../utils/couponFormat';

interface RuleStackPreviewProps {
  batchId: string;
  faceValuePaise?: number;
  phone?: string;
  totalRedemptions?: number;
  includeInactive?: boolean;
  compact?: boolean;
}

export function RuleStackPreview({
  batchId,
  faceValuePaise,
  phone,
  totalRedemptions,
  includeInactive = false,
  compact = false,
}: RuleStackPreviewProps) {
  const [preview, setPreview] = useState<StackPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!batchId) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await couponsAPI.previewPromotionRuleStack({
          coupon_batch_id: batchId,
          face_value_paise: faceValuePaise,
          phone: phone || undefined,
          total_redemptions: phone ? undefined : totalRedemptions,
          include_inactive: includeInactive,
          include_skipped: true,
        });
        setPreview(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Preview failed');
        setPreview(null);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [batchId, faceValuePaise, phone, totalRedemptions, includeInactive]);

  if (!batchId) {
    return (
      <div className="rounded-xl border border-dashed border-violet-200 p-8 text-center text-violet-400 text-sm">
        Pick a batch to run the simulator
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-violet-50/50 p-8 text-center">
        <div className="h-8 w-8 mx-auto rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" />
        <p className="text-sm text-violet-500 mt-3">Running stack simulation…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-600">
        {error}
      </div>
    );
  }

  if (!preview) return null;

  const allRules = [
    ...preview.appliedRules.map((r) => ({ ...r, applied: true as const })),
    ...preview.skippedRules.map((r) => ({
      promotionRuleId: r.promotionRuleId,
      ruleName: r.ruleName,
      ruleType: r.ruleType,
      priority: r.priority,
      bonusPaise: 0,
      rewardType: 'FIXED' as const,
      rewardDetail: r.skipReason,
      applied: false as const,
    })),
  ].sort((a, b) => a.priority - b.priority);

  return (
    <div className={`space-y-4 ${compact ? '' : 'lg:grid lg:grid-cols-5 lg:gap-6 lg:space-y-0'}`}>
      {/* Context pills */}
      <div className={`${compact ? '' : 'lg:col-span-2'} space-y-3`}>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-violet-100 text-violet-700 px-3 py-1.5 rounded-full">
            <User className="h-3 w-3" />
            {preview.redeemerContext.phone
              ? `${preview.redeemerContext.phone} · ${preview.redeemerContext.totalRedemptions} prior`
              : `${preview.redeemerContext.totalRedemptions} prior redeems (simulated)`}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full">
            <Ticket className="h-3 w-3" />
            Face {formatRupees(preview.faceValuePaise)}
          </span>
        </div>

        {/* Waterfall payout */}
        <div className="coupon-card p-5 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-violet-500">
            Payout waterfall
          </p>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-violet-600">Base (face value)</span>
              <span className="font-semibold">{formatRupees(preview.baseAmountPaise)}</span>
            </div>
            {preview.appliedRules.map((r) => (
              <div
                key={r.promotionRuleId}
                className="flex justify-between items-center text-sm pl-3 border-l-2 border-emerald-300"
              >
                <span className="text-emerald-700 truncate pr-2">{r.ruleName}</span>
                <span className="font-semibold text-emerald-600 shrink-0">
                  +{formatRupees(r.bonusPaise)}
                </span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-3 border-t-2 border-violet-200">
              <span className="font-bold text-violet-900">Total payout</span>
              <span className="text-xl font-bold text-violet-950">
                {formatRupees(preview.totalAmountPaise)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Rule evaluation list */}
      <div className={`${compact ? '' : 'lg:col-span-3'}`}>
        <div className="coupon-card overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-fuchsia-50 border-b border-violet-100 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-violet-700">
              Rule evaluation
            </span>
            <span className="text-[10px] text-violet-400">priority order</span>
          </div>
          <ul className="divide-y divide-violet-50">
            {allRules.map((rule) => (
              <li
                key={rule.promotionRuleId}
                className={`flex items-center gap-3 px-4 py-3 ${
                  rule.applied ? 'bg-white' : 'bg-slate-50/50'
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-[11px] font-bold text-violet-600">
                  {rule.priority}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-medium text-sm ${
                      rule.applied ? 'text-violet-900' : 'text-violet-400'
                    }`}
                  >
                    {rule.ruleName}
                  </p>
                  {!rule.applied && 'rewardDetail' in rule && (
                    <p className="text-[11px] text-violet-400 mt-0.5 line-clamp-2">
                      {(rule as { rewardDetail?: string }).rewardDetail}
                    </p>
                  )}
                </div>
                <span className="hidden sm:inline text-[10px] text-violet-400 uppercase tracking-wide">
                  {rewardTypeLabel(rule.rewardType as 'FIXED')}
                </span>
                {rule.applied ? (
                  <span className="flex items-center gap-1 text-emerald-600 font-bold text-sm shrink-0">
                    <Check className="h-4 w-4" />
                    {formatRupees(rule.bonusPaise)}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-slate-400 text-xs shrink-0">
                    <X className="h-3.5 w-3.5" />
                    skip
                  </span>
                )}
              </li>
            ))}
          </ul>
          {preview.appliedRules.length > 0 && (
            <div className="px-4 py-2.5 bg-emerald-50/60 border-t border-emerald-100 flex items-center gap-2 text-xs text-emerald-700">
              <ArrowRight className="h-3 w-3" />
              {preview.appliedRules.length} rule
              {preview.appliedRules.length !== 1 ? 's' : ''} applied — bonuses sum, no global cap
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer, Ban, CheckCircle, Package } from 'lucide-react';
import {
  CouponPageHeader,
  CouponLoading,
  CouponStatusBadge,
  CouponConfirmDialog,
} from '../../components/coupons/shared/CouponUi';
import { couponsAPI } from '../../services/coupons.api';
import type { Coupon, CouponStatusHistory, CouponBatch } from '../../types/coupons';
import { formatRupees, formatDateTime, formatDate } from '../../utils/couponFormat';
import { downloadCouponsPdf, buildExportRow } from '../../utils/couponPdf';
import { getUserFacingApiErrorMessage } from '../../utils/errorHandler';

type ConfirmAction = 'void' | 'printed' | 'allotted';

export default function CouponLookupPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const codeParam = searchParams.get('code') ?? '';
  const [code, setCode] = useState(codeParam);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [history, setHistory] = useState<CouponStatusHistory[]>([]);
  const [batch, setBatch] = useState<CouponBatch | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const lookup = async (searchCode: string) => {
    if (!searchCode.trim()) return;
    setLoading(true);
    setActionError(null);
    try {
      const res = await couponsAPI.getCouponByCode(searchCode.trim().toUpperCase());
      setCoupon(res.coupon);
      setHistory(res.history ?? []);
      const batchRes = await couponsAPI.getCouponBatchById(res.coupon.coupon_batch_id);
      setBatch(batchRes.batch);
    } catch {
      setCoupon(null);
      setHistory([]);
      setBatch(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (codeParam) void lookup(codeParam);
  }, [codeParam]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ code: code.trim().toUpperCase() });
    void lookup(code);
  };

  const handlePrint = async () => {
    if (!coupon || !batch) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const row = buildExportRow(coupon.code, coupon.face_value_paise, batch.redeem_base_url);
      await downloadCouponsPdf([row], {
        batchName: batch.name,
        expiresAt: batch.expires_at ?? coupon.expires_at,
      }, `coupon-${coupon.code}.pdf`);
    } finally {
      setActionLoading(false);
    }
  };

  const runConfirmAction = async () => {
    if (!coupon || !confirm) return;
    setActionLoading(true);
    setActionError(null);
    try {
      if (confirm === 'void') {
        await couponsAPI.voidCoupon(coupon.code);
      } else if (confirm === 'printed') {
        await couponsAPI.markCouponPrinted(coupon.code);
      } else if (confirm === 'allotted') {
        await couponsAPI.markCouponAllotted(coupon.code);
      }
      await lookup(coupon.code);
      setConfirm(null);
    } catch (err) {
      setActionError(getUserFacingApiErrorMessage(err, 'Action failed'));
    } finally {
      setActionLoading(false);
    }
  };

  const canVoid = coupon && ['created', 'printed', 'allotted'].includes(coupon.status);
  const canMarkPrinted = coupon?.status === 'created';
  const canMarkAllotted = coupon?.status === 'printed';

  const confirmCopy: Record<ConfirmAction, { title: string; message: string; destructive?: boolean }> = {
    void: {
      title: 'Void coupon',
      message: `Void coupon ${coupon?.code}? This cannot be undone.`,
      destructive: true,
    },
    printed: {
      title: 'Mark printed',
      message: `Mark coupon ${coupon?.code} as printed?`,
    },
    allotted: {
      title: 'Mark allotted',
      message: `Mark coupon ${coupon?.code} as allotted? It will become redeemable.`,
    },
  };

  return (
    <div className="coupon-page">
      <CouponPageHeader
        title="Coupon Lookup"
        subtitle="Search by 8-character code and view status history"
        badge="Inventory"
      />

      <form onSubmit={handleSearch} className="coupon-card p-4 mb-6 flex gap-3">
        <input
          className="coupon-input max-w-xs font-mono text-lg tracking-widest uppercase"
          placeholder="AB12CD34"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={8}
        />
        <button type="submit" className="coupon-btn-primary">Lookup</button>
      </form>

      {actionError && (
        <div className="coupon-card p-3 mb-4 border-rose-200 bg-rose-50 text-sm text-rose-700">
          {actionError}
        </div>
      )}

      {loading ? (
        <CouponLoading />
      ) : coupon ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="coupon-ticket-preview">
            <div className="flex justify-between items-start mb-4">
              <div className="h-10 w-10 rounded-xl coupon-gradient-bg flex items-center justify-center">
                <span className="text-white text-xs font-bold">RS</span>
              </div>
              <CouponStatusBadge status={coupon.status} />
            </div>
            <p className="text-[10px] uppercase tracking-widest text-violet-400 mb-1">
              {batch?.name ?? 'Coupon'}
            </p>
            <p className="font-mono text-3xl font-bold text-violet-950 tracking-wider mb-2">
              {coupon.code}
            </p>
            <p className="text-2xl font-bold text-emerald-600 mb-4">
              {formatRupees(coupon.face_value_paise)} Cashback
            </p>
            <p className="text-xs text-violet-500">
              {batch?.redeem_base_url
                ? `Redeem: ${batch.redeem_base_url}?code=${coupon.code}`
                : 'No redeem URL configured'}
            </p>
            {(coupon.expires_at ?? batch?.expires_at) && (
              <p className="text-xs text-violet-400 mt-1">
                Expires {formatDate(coupon.expires_at ?? batch?.expires_at)}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-4">
              <button type="button" className="coupon-btn-secondary flex items-center gap-1 text-xs" disabled={actionLoading} onClick={handlePrint}>
                <Printer className="h-3 w-3" /> Reprint
              </button>
              {canMarkPrinted && (
                <button
                  type="button"
                  className="coupon-btn-secondary flex items-center gap-1 text-xs"
                  disabled={actionLoading}
                  onClick={() => setConfirm('printed')}
                >
                  <CheckCircle className="h-3 w-3" /> Mark printed
                </button>
              )}
              {canMarkAllotted && (
                <button
                  type="button"
                  className="coupon-btn-primary flex items-center gap-1 text-xs"
                  disabled={actionLoading}
                  onClick={() => setConfirm('allotted')}
                >
                  <Package className="h-3 w-3" /> Mark allotted
                </button>
              )}
              {canVoid && (
                <button type="button" className="coupon-btn-danger flex items-center gap-1 text-xs" onClick={() => setConfirm('void')}>
                  <Ban className="h-3 w-3" /> Void
                </button>
              )}
            </div>
          </div>

          <div className="coupon-card p-5">
            <h3 className="font-bold text-violet-800 mb-4">Status history</h3>
            {history.length === 0 ? (
              <p className="text-sm text-violet-400">No history recorded</p>
            ) : (
              <ol className="relative border-l border-violet-200 ml-2 space-y-4">
                {history.map((h, i) => (
                  <li key={i} className="ml-4">
                    <span className="absolute -left-1.5 h-3 w-3 rounded-full bg-violet-400 border-2 border-white" />
                    <p className="text-sm font-semibold text-violet-900">
                      {h.from_status ?? '—'} → {h.to_status}
                    </p>
                    {h.reason && <p className="text-xs text-violet-500">{h.reason}</p>}
                    <p className="text-[10px] text-violet-400">{formatDateTime(h.created_at)}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      ) : codeParam ? (
        <p className="text-violet-500 text-center py-8">Coupon not found</p>
      ) : null}

      <CouponConfirmDialog
        open={!!confirm}
        title={confirm ? confirmCopy[confirm].title : ''}
        message={confirm ? confirmCopy[confirm].message : ''}
        destructive={confirm ? confirmCopy[confirm].destructive : false}
        loading={actionLoading}
        onCancel={() => setConfirm(null)}
        onConfirm={runConfirmAction}
      />
    </div>
  );
}

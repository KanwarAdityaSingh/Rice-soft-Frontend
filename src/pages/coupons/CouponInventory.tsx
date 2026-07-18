import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CouponPageHeader,
  CouponLoading,
  CouponEmpty,
  CouponPagination,
  CouponStatusBadge,
  CouponConfirmDialog,
} from '../../components/coupons/shared/CouponUi';
import { couponsAPI } from '../../services/coupons.api';
import type { Coupon, CouponBatch } from '../../types/coupons';
import { formatRupees, formatDate } from '../../utils/couponFormat';
import { downloadCouponsPdf, buildExportRow } from '../../utils/couponPdf';
import { getUserFacingApiErrorMessage } from '../../utils/errorHandler';
import { Printer, CheckCircle, Package } from 'lucide-react';

type BulkAction = 'printed' | 'allotted';

export default function CouponInventoryPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [batches, setBatches] = useState<CouponBatch[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [batchId, setBatchId] = useState('');
  const [status, setStatus] = useState('');
  const [code, setCode] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirm, setConfirm] = useState<BulkAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await couponsAPI.getAllCoupons({
        batchId: batchId || undefined,
        status: status || undefined,
        code: code || undefined,
        page,
        limit: 50,
      });
      setCoupons(r.rows);
      setTotal(r.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    couponsAPI.getAllCouponBatches(1, 200).then((r) => setBatches(r.rows));
  }, []);

  useEffect(() => {
    void refresh();
  }, [batchId, status, code, page]);

  const selectedCoupons = useMemo(
    () => coupons.filter((c) => selected.has(c.coupon_id)),
    [coupons, selected],
  );
  const selectedCreated = useMemo(
    () => selectedCoupons.filter((c) => c.status === 'created'),
    [selectedCoupons],
  );
  const selectedPrinted = useMemo(
    () => selectedCoupons.filter((c) => c.status === 'printed'),
    [selectedCoupons],
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pageCouponIds = useMemo(() => coupons.map((c) => c.coupon_id), [coupons]);
  const allPageSelected =
    pageCouponIds.length > 0 && pageCouponIds.every((id) => selected.has(id));
  const somePageSelected = pageCouponIds.some((id) => selected.has(id));

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageCouponIds.forEach((id) => next.delete(id));
      } else {
        pageCouponIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const setSelectAllRef = (el: HTMLInputElement | null) => {
    selectAllRef.current = el;
  };

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = somePageSelected && !allPageSelected;
    }
  }, [somePageSelected, allPageSelected]);

  const handlePrintSelected = async () => {
    if (!selectedCoupons.length) return;
    setPrinting(true);
    setActionError(null);
    try {
      const batch = batches.find((b) => b.coupon_batch_id === selectedCoupons[0].coupon_batch_id);
      const rows = selectedCoupons.map((c) =>
        buildExportRow(c.code, c.face_value_paise, batch?.redeem_base_url)
      );
      await downloadCouponsPdf(rows, {
        batchName: batch?.name ?? 'Coupons',
        expiresAt: batch?.expires_at,
      });
    } finally {
      setPrinting(false);
    }
  };

  const runBulkStatus = async () => {
    if (!confirm) return;
    const targets = confirm === 'printed' ? selectedCreated : selectedPrinted;
    if (!targets.length) {
      setConfirm(null);
      return;
    }
    setActionLoading(true);
    setActionError(null);
    setActionResult(null);
    let ok = 0;
    const failures: string[] = [];
    try {
      for (const c of targets) {
        try {
          if (confirm === 'printed') await couponsAPI.markCouponPrinted(c.code);
          else await couponsAPI.markCouponAllotted(c.code);
          ok += 1;
        } catch (err) {
          failures.push(`${c.code}: ${getUserFacingApiErrorMessage(err, 'failed')}`);
        }
      }
      setActionResult(
        failures.length
          ? `Updated ${ok} of ${targets.length}. ${failures.slice(0, 3).join('; ')}${failures.length > 3 ? '…' : ''}`
          : `Updated ${ok} coupon${ok === 1 ? '' : 's'} to ${confirm}.`,
      );
      setSelected(new Set());
      await refresh();
      setConfirm(null);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="coupon-page">
      <CouponPageHeader
        title="Coupon Inventory"
        subtitle="Search and manage individual coupon codes"
        badge="Inventory"
        actions={
          selected.size > 0 ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="coupon-btn-primary flex items-center gap-2" disabled={printing || actionLoading} onClick={handlePrintSelected}>
                <Printer className="h-4 w-4" /> Print selected ({selected.size})
              </button>
              {selectedCreated.length > 0 && (
                <button
                  type="button"
                  className="coupon-btn-secondary flex items-center gap-2"
                  disabled={actionLoading}
                  onClick={() => setConfirm('printed')}
                >
                  <CheckCircle className="h-4 w-4" /> Mark printed ({selectedCreated.length})
                </button>
              )}
              {selectedPrinted.length > 0 && (
                <button
                  type="button"
                  className="coupon-btn-primary flex items-center gap-2"
                  disabled={actionLoading}
                  onClick={() => setConfirm('allotted')}
                >
                  <Package className="h-4 w-4" /> Mark allotted ({selectedPrinted.length})
                </button>
              )}
            </div>
          ) : undefined
        }
      />

      <div className="coupon-card p-4 mb-4 flex flex-wrap gap-3">
        <select className="coupon-select w-48" value={batchId} onChange={(e) => { setBatchId(e.target.value); setPage(1); }}>
          <option value="">All batches</option>
          {batches.map((b) => (
            <option key={b.coupon_batch_id} value={b.coupon_batch_id}>{b.name}</option>
          ))}
        </select>
        <select className="coupon-select w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {['created', 'printed', 'allotted', 'redeemed', 'expired', 'void'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input className="coupon-input w-40" placeholder="Code prefix" value={code} onChange={(e) => { setCode(e.target.value); setPage(1); }} />
      </div>

      {(actionError || actionResult) && (
        <div className={`coupon-card p-3 mb-4 text-sm ${actionError ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {actionError ?? actionResult}
        </div>
      )}

      <div className="coupon-card p-3 mb-4 flex items-start gap-2.5 border border-violet-100 bg-violet-50/60 text-sm text-violet-700">
        <Printer className="h-4 w-4 shrink-0 mt-0.5 text-violet-500" />
        <p>
          Select coupons, then print a PDF and/or mark printed (created → printed) or allotted (printed → allotted) for eligible codes.
        </p>
      </div>

      <div className="coupon-card overflow-hidden">
        {loading ? (
          <CouponLoading />
        ) : coupons.length === 0 ? (
          <CouponEmpty message="No coupons match your filters" />
        ) : (
          <>
            <table className="coupon-table w-full">
              <thead>
                <tr>
                  <th className="w-8">
                    <input
                      type="checkbox"
                      ref={setSelectAllRef}
                      checked={allPageSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all coupons on this page"
                      title="Select all on this page"
                    />
                  </th>
                  <th>Code</th>
                  <th>Status</th>
                  <th>Value</th>
                  <th>Expiry</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.coupon_id}>
                    <td>
                      <input type="checkbox" checked={selected.has(c.coupon_id)} onChange={() => toggleSelect(c.coupon_id)} />
                    </td>
                    <td className="font-mono font-bold">{c.code}</td>
                    <td><CouponStatusBadge status={c.status} /></td>
                    <td>{formatRupees(c.face_value_paise)}</td>
                    <td className="text-violet-400">{formatDate(c.expires_at)}</td>
                    <td>
                      <Link to={`/coupons/lookup?code=${c.code}`} className="text-xs text-violet-600 hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <CouponPagination page={page} total={total} limit={50} onPageChange={setPage} />
          </>
        )}
      </div>

      <CouponConfirmDialog
        open={!!confirm}
        title={confirm === 'printed' ? 'Mark printed' : 'Mark allotted'}
        message={
          confirm === 'printed'
            ? `Mark ${selectedCreated.length} coupon(s) as printed?`
            : `Mark ${selectedPrinted.length} coupon(s) as allotted? They will become redeemable.`
        }
        loading={actionLoading}
        onCancel={() => setConfirm(null)}
        onConfirm={runBulkStatus}
      />
    </div>
  );
}

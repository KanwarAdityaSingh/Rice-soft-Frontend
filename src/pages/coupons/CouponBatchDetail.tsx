import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Download,
  Printer,
  Play,
  CheckCircle,
  Package,
  Archive,
  Ban,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import {
  CouponPageHeader,
  CouponLoading,
  CouponStatCard,
  CouponConfirmDialog,
  BatchStatusBadge,
  CouponPagination,
  CouponStatusBadge,
} from '../../components/coupons/shared/CouponUi';
import {
  couponsAPI,
  exportBatchCodesCsv,
  parseBatchCodesCsv,
  downloadCsv,
} from '../../services/coupons.api';
import type { CouponBatch, BatchStats, Coupon } from '../../types/coupons';
import {
  formatRupees,
  formatDate,
  canGenerateBatch,
  canDeleteBatch,
} from '../../utils/couponFormat';
import { downloadCouponsPdf } from '../../utils/couponPdf';

export default function CouponBatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<CouponBatch | null>(null);
  const [stats, setStats] = useState<BatchStats | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponTotal, setCouponTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirm, setConfirm] = useState<{
    type: string;
    title: string;
    message: string;
    destructive?: boolean;
  } | null>(null);

  const refresh = useCallback(async () => {
    if (!batchId) return;
    setLoading(true);
    try {
      const [detail, couponList] = await Promise.all([
        couponsAPI.getCouponBatchById(batchId),
        couponsAPI.getAllCoupons({ batchId, page, limit: 50 }),
      ]);
      setBatch(detail.batch);
      setStats(detail.stats);
      setCoupons(couponList.rows);
      setCouponTotal(couponList.total);
    } finally {
      setLoading(false);
    }
  }, [batchId, page]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runAction = async (type: string) => {
    if (!batchId) return;
    setActionLoading(true);
    try {
      switch (type) {
        case 'generate':
          await couponsAPI.generateBatchCodes(batchId);
          break;
        case 'printed':
          await couponsAPI.markBatchPrinted(batchId);
          break;
        case 'allotted':
          await couponsAPI.markBatchAllotted(batchId);
          break;
        case 'archive':
          await couponsAPI.archiveCouponBatch(batchId);
          break;
        case 'void':
          await couponsAPI.voidCouponBatch(batchId);
          break;
        case 'delete':
          await couponsAPI.deleteCouponBatch(batchId);
          navigate('/coupons/batches');
          return;
      }
      await refresh();
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  };

  const handleExportCsv = async () => {
    if (!batchId || !batch) return;
    setActionLoading(true);
    try {
      const csv = await exportBatchCodesCsv(batchId);
      downloadCsv(csv, `${batch.name}-codes.csv`);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrintPdf = async () => {
    if (!batchId || !batch) return;
    setActionLoading(true);
    try {
      const csv = await exportBatchCodesCsv(batchId);
      const rows = parseBatchCodesCsv(csv);
      await downloadCouponsPdf(rows, {
        batchName: batch.name,
        expiresAt: batch.expires_at,
      }, `${batch.name}-coupons.pdf`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !batch) return <CouponLoading />;
  if (!batch || !stats) {
    return (
      <div className="coupon-page">
        <p className="text-violet-500">Batch not found</p>
        <Link to="/coupons/batches" className="coupon-btn-secondary mt-4 inline-block">← Back</Link>
      </div>
    );
  }

  const canExport = batch.status === 'ready' && batch.generated_count === batch.total_count;
  const canPrint = canExport;
  const canMarkPrinted = batch.status === 'ready' && stats.created > 0;
  const canMarkAllotted = stats.printed > 0;
  const showDelete = canDeleteBatch(stats);

  return (
    <div className="coupon-page">
      <Link to="/coupons/batches" className="text-sm text-violet-500 hover:text-violet-700 flex items-center gap-1 mb-4">
        <ArrowLeft className="h-3 w-3" /> All batches
      </Link>

      <CouponPageHeader
        title={batch.name}
        subtitle={batch.description ?? `Batch ID: ${batch.coupon_batch_id.slice(0, 8)}…`}
        badge="Batch detail"
        actions={<BatchStatusBadge status={batch.status} />}
      />

      {batch.status === 'generating' || (batch.generated_count > 0 && batch.generated_count < batch.total_count) ? (
        <div className="coupon-card p-4 mb-4 border-amber-200 bg-amber-50/50">
          <p className="text-sm text-amber-800">
            {batch.generated_count} of {batch.total_count} generated.
            {batch.status === 'generating' ? ' Generation was interrupted — click Resume.' : ' Click Resume to continue.'}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {(['created', 'printed', 'allotted', 'redeemed', 'expired', 'void'] as const).map((key) => (
          <div key={key} className="coupon-card p-3 text-center">
            <p className="text-lg font-bold text-violet-950">{stats[key]}</p>
            <p className="text-[10px] uppercase text-violet-400 font-semibold">{key}</p>
          </div>
        ))}
        <div className="coupon-card p-3 text-center bg-emerald-50">
          <p className="text-lg font-bold text-emerald-700">{stats.redemption_rate.toFixed(1)}%</p>
          <p className="text-[10px] uppercase text-emerald-500 font-semibold">Redemption rate</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {canGenerateBatch(batch) && (
          <button type="button" className="coupon-btn-primary flex items-center gap-2" disabled={actionLoading || batch.status === 'generating'} onClick={() => runAction('generate')}>
            <Play className="h-4 w-4" />
            {batch.generated_count > 0 ? 'Resume generation' : 'Generate codes'}
          </button>
        )}
        <button type="button" className="coupon-btn-secondary flex items-center gap-2" disabled={!canExport || actionLoading} onClick={handleExportCsv}>
          <Download className="h-4 w-4" /> Export CSV
        </button>
        <button type="button" className="coupon-btn-secondary flex items-center gap-2" disabled={!canPrint || actionLoading} onClick={handlePrintPdf}>
          <Printer className="h-4 w-4" /> Print coupons (PDF)
        </button>
        <button type="button" className="coupon-btn-secondary flex items-center gap-2" disabled={!canMarkPrinted || actionLoading} onClick={() => setConfirm({ type: 'printed', title: 'Mark printed', message: `Transition all ${stats.created} created coupons to printed?` })}>
          <CheckCircle className="h-4 w-4" /> Mark printed
        </button>
        <button type="button" className="coupon-btn-primary flex items-center gap-2" disabled={!canMarkAllotted || actionLoading} onClick={() => setConfirm({ type: 'allotted', title: 'Mark allotted', message: 'This will make all printed coupons live for redemption. Continue?', destructive: false })}>
          <Package className="h-4 w-4" /> Mark allotted
        </button>
        <button type="button" className="coupon-btn-secondary flex items-center gap-2" disabled={batch.status === 'archived' || actionLoading} onClick={() => setConfirm({ type: 'archive', title: 'Archive batch', message: 'Archive this batch? No new operations will be allowed.' })}>
          <Archive className="h-4 w-4" /> Archive
        </button>
        <button type="button" className="coupon-btn-danger flex items-center gap-2" disabled={actionLoading} onClick={() => setConfirm({ type: 'void', title: 'Void batch', message: 'Void all non-terminal coupons in this batch?', destructive: true })}>
          <Ban className="h-4 w-4" /> Void
        </button>
        {showDelete && (
          <button type="button" className="coupon-btn-danger flex items-center gap-2" disabled={actionLoading} onClick={() => setConfirm({ type: 'delete', title: 'Delete permanently', message: 'This permanently removes the batch and all coupon codes. Cannot be undone.', destructive: true })}>
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <CouponStatCard title="Face value" value={formatRupees(batch.face_value_paise)} icon={Package} variant="violet" />
        <CouponStatCard title="Total count" value={batch.total_count.toLocaleString()} icon={Package} variant="sky" />
        <CouponStatCard title="Expires" value={formatDate(batch.expires_at)} subtitle={batch.expires_at ? undefined : 'Never'} icon={Package} variant="coral" />
      </div>

      {!batch.redeem_base_url && (
        <div className="coupon-card p-3 mb-4 border-amber-300 bg-amber-50 text-sm text-amber-800">
          ⚠ No redeem base URL on this batch — QR export will use the server default if configured.
        </div>
      )}

      <div className="coupon-card overflow-hidden">
        <div className="px-4 py-3 border-b border-violet-100">
          <h3 className="font-bold text-violet-800">Coupons in batch</h3>
        </div>
        <table className="coupon-table w-full">
          <thead>
            <tr><th>Code</th><th>Status</th><th>Value</th><th>Redeemed</th></tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.coupon_id}>
                <td>
                  <Link to={`/coupons/lookup?code=${c.code}`} className="font-mono font-bold text-violet-700">{c.code}</Link>
                </td>
                <td><CouponStatusBadge status={c.status} /></td>
                <td>{formatRupees(c.face_value_paise)}</td>
                <td className="text-violet-400">{formatDate(c.redeemed_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <CouponPagination page={page} total={couponTotal} limit={50} onPageChange={setPage} />
      </div>

      <CouponConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        destructive={confirm?.destructive}
        loading={actionLoading}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && runAction(confirm.type)}
      />
    </div>
  );
}

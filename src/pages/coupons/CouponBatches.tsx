import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import {
  CouponPageHeader,
  CouponLoading,
  CouponEmpty,
  CouponPagination,
  BatchStatusBadge,
} from '../../components/coupons/shared/CouponUi';
import { BatchFormModal } from '../../components/coupons/batches/BatchFormModal';
import { couponsAPI } from '../../services/coupons.api';
import type { CouponBatch } from '../../types/coupons';
import { formatRupees, formatDate } from '../../utils/couponFormat';

export default function CouponBatchesPage() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<CouponBatch[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await couponsAPI.getAllCouponBatches(page, 50);
      setBatches(res.rows);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [page]);

  const handleCreate = async (data: Parameters<typeof couponsAPI.createCouponBatch>[0]) => {
    const batch = await couponsAPI.createCouponBatch(data);
    await load();
    navigate(`/coupons/batches/${batch.coupon_batch_id}`);
  };

  return (
    <div className="coupon-page">
      <CouponPageHeader
        title="Coupon Batches"
        subtitle="Create, generate, print, and distribute coupon campaigns"
        badge="Inventory"
        actions={
          <button type="button" className="coupon-btn-primary flex items-center gap-2" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> New batch
          </button>
        }
      />

      <div className="coupon-card overflow-hidden">
        {loading ? (
          <CouponLoading />
        ) : batches.length === 0 ? (
          <CouponEmpty message="No batches yet — create your first campaign" />
        ) : (
          <>
            <table className="coupon-table w-full">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Face value</th>
                  <th>Count</th>
                  <th>Generated</th>
                  <th>Status</th>
                  <th>Expiry</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.coupon_batch_id}>
                    <td>
                      <Link
                        to={`/coupons/batches/${b.coupon_batch_id}`}
                        className="font-semibold text-violet-700 hover:underline"
                      >
                        {b.name}
                      </Link>
                    </td>
                    <td>{formatRupees(b.face_value_paise)}</td>
                    <td>{b.total_count.toLocaleString()}</td>
                    <td>{b.generated_count.toLocaleString()}</td>
                    <td><BatchStatusBadge status={b.status} /></td>
                    <td>{formatDate(b.expires_at)}</td>
                    <td className="text-violet-400">{formatDate(b.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <CouponPagination page={page} total={total} limit={50} onPageChange={setPage} />
          </>
        )}
      </div>

      <BatchFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleCreate} />
    </div>
  );
}

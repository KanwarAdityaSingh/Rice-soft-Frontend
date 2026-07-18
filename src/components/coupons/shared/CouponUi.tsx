import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { CouponStatus, BatchStatus, PayoutStatus } from '../../../types/coupons';
import {
  getCouponStatusStyle,
  getBatchStatusStyle,
  getPayoutStatusStyle,
} from '../../../utils/couponFormat';

interface CouponPageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: ReactNode;
}

export function CouponPageHeader({
  title,
  subtitle,
  badge,
  actions,
}: CouponPageHeaderProps) {
  return (
    <header className="coupon-hero mb-6">
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          {badge && (
            <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-violet-500 bg-violet-100 px-2 py-0.5 rounded-full mb-2">
              {badge}
            </span>
          )}
          <h1 className="text-2xl md:text-3xl font-bold coupon-hero-title">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-violet-600/70">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

interface CouponStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'violet' | 'coral' | 'mint' | 'sky';
}

const VARIANT_ICON: Record<string, string> = {
  violet: 'from-violet-500 to-purple-600',
  coral: 'from-orange-400 to-rose-500',
  mint: 'from-emerald-400 to-teal-500',
  sky: 'from-sky-400 to-blue-500',
};

export function CouponStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'violet',
}: CouponStatCardProps) {
  return (
    <div className={`coupon-stat-card coupon-stat-${variant}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-500/80">
            {title}
          </p>
          <p className="mt-1 text-2xl font-bold text-violet-950">{value}</p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-violet-500/60">{subtitle}</p>
          )}
        </div>
        <div
          className={`p-2.5 rounded-xl bg-gradient-to-br ${VARIANT_ICON[variant]} text-white shadow-md`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function CouponLoading() {
  return (
    <div className="coupon-page flex items-center justify-center min-h-[40vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-full border-3 border-violet-200 border-t-violet-600 animate-spin" />
        <p className="text-sm text-violet-500">Loading…</p>
      </div>
    </div>
  );
}

export function CouponEmpty({ message }: { message: string }) {
  return (
    <div className="py-12 text-center text-violet-400 text-sm">{message}</div>
  );
}

interface CouponPaginationProps {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export function CouponPagination({
  page,
  total,
  limit,
  onPageChange,
}: CouponPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-violet-100">
      <span className="text-xs text-violet-500">
        Page {page} of {totalPages} · {total} total
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className="coupon-btn-secondary text-xs py-1 px-3"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="coupon-btn-secondary text-xs py-1 px-3"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

interface CouponConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function CouponConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  destructive,
  onConfirm,
  onCancel,
  loading,
}: CouponConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-violet-950/30 backdrop-blur-sm">
      <div className="coupon-card p-6 max-w-md w-full shadow-2xl">
        <h3 className="text-lg font-bold text-violet-950">{title}</h3>
        <p className="mt-2 text-sm text-violet-600/80">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="coupon-btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className={destructive ? 'coupon-btn-danger' : 'coupon-btn-primary'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CouponStatusBadge({ status }: { status: CouponStatus }) {
  const s = getCouponStatusStyle(status);
  return (
    <span className={`coupon-badge ${s.bg} ${s.text} ${s.border}`}>
      {s.label}
    </span>
  );
}

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  const s = getBatchStatusStyle(status);
  return (
    <span className={`coupon-badge ${s.bg} ${s.text} border-transparent`}>
      {s.label}
    </span>
  );
}

export function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  const s = getPayoutStatusStyle(status);
  return (
    <span className={`coupon-badge ${s.bg} ${s.text} border-transparent`}>
      {s.label}
    </span>
  );
}

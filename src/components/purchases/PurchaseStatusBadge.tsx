import type { PurchaseStatus } from '../../types/entities';

interface PurchaseStatusBadgeProps {
  status: PurchaseStatus;
}

const statusConfig: Record<PurchaseStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  in_transit: {
    label: 'In Transit',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  received: {
    label: 'Received',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  completed: {
    label: 'Completed',
    className: 'bg-primary/20 text-primary',
  },
};

export function PurchaseStatusBadge({ status }: PurchaseStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}


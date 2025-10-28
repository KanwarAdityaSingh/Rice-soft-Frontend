import type { Lead } from '../../../types/entities';

interface LeadStatusBadgeProps {
  status: Lead['lead_status'];
}

export function LeadStatusBadge({ status }: LeadStatusBadgeProps) {
  const colors = {
    new: 'bg-blue-500/20 text-blue-600 border-blue-500/50 dark:text-blue-400',
    contacted: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/50 dark:text-yellow-400',
    engaged: 'bg-purple-500/20 text-purple-600 border-purple-500/50 dark:text-purple-400',
    converted: 'bg-green-500/20 text-green-600 border-green-500/50 dark:text-green-400',
    rejected: 'bg-red-500/20 text-red-600 border-red-500/50 dark:text-red-400',
  };

  const labels = {
    new: 'New',
    contacted: 'Contacted',
    engaged: 'Engaged',
    converted: 'Converted',
    rejected: 'Rejected',
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}


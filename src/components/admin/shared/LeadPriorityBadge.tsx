import type { Lead } from '../../../types/entities';

interface LeadPriorityBadgeProps {
  priority: Lead['priority'];
}

export function LeadPriorityBadge({ priority }: LeadPriorityBadgeProps) {
  const colors = {
    low: 'bg-gray-500/20 text-gray-600 border-gray-500/50 dark:text-gray-400',
    medium: 'bg-blue-500/20 text-blue-600 border-blue-500/50 dark:text-blue-400',
    high: 'bg-orange-500/20 text-orange-600 border-orange-500/50 dark:text-orange-400',
    urgent: 'bg-red-500/20 text-red-600 border-red-500/50 dark:text-red-400',
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colors[priority]}`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}


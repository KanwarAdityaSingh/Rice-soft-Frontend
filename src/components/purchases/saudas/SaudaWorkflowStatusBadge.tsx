import type { Sauda } from '../../../types/entities';

/** Workflow `status` (draft / active / completed / cancelled) */
export function SaudaWorkflowStatusBadge({ status }: { status: Sauda['status'] }) {
  const variant: Record<Sauda['status'], string> = {
    draft: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-600',
    active: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800',
    completed: 'bg-sky-100 dark:bg-sky-900/30 text-sky-900 dark:text-sky-200 border-sky-200 dark:border-sky-800',
    cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-200 border-red-200 dark:border-red-800',
  };
  return (
    <span
      className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium capitalize whitespace-nowrap border ${variant[status]}`}
    >
      {status}
    </span>
  );
}

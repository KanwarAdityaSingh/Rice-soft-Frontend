import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

const GRADIENTS = [
  'from-violet-400 to-violet-500',
  'from-emerald-400 to-teal-500',
  'from-slate-400 to-slate-500',
  'from-sky-400 to-blue-500',
  'from-indigo-400 to-indigo-500',
  'from-amber-400 to-amber-500',
  'from-cyan-400 to-cyan-500',
  'from-rose-400 to-rose-500',
];

interface AnalyticsKpiProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  index?: number;
  href?: string;
  highlight?: boolean;
}

export function AnalyticsKpi({
  title,
  value,
  subtitle,
  icon: Icon,
  index = 0,
  href,
  highlight,
}: AnalyticsKpiProps) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const inner = (
    <div
      className={`analytics-kpi relative overflow-hidden rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-xl ${
        highlight ? 'analytics-kpi-highlight' : ''
      }`}
    >
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-slate-200/40 blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-violet-500/90">
            {title}
          </p>
          <p className="mt-1 text-2xl md:text-3xl font-bold text-violet-950 tracking-tight truncate">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-violet-500/80">{subtitle}</p>
          )}
        </div>
        <div
          className={`shrink-0 p-3 rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg shadow-violet-300/30`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="block no-underline">
        {inner}
      </Link>
    );
  }
  return inner;
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function AnalyticsSectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div>
        <h2 className="text-lg font-bold text-violet-950">{title}</h2>
        {subtitle && <p className="text-sm text-violet-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function AnalyticsEmpty({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-violet-400">
      <div className="h-12 w-12 rounded-full bg-violet-100 flex items-center justify-center mb-3 text-xl">
        📊
      </div>
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function ChartTooltipStyle({
  active,
  payload,
  label,
  valueFormatter,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  valueFormatter?: (v: number, name: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur border border-violet-200 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="font-bold text-violet-800 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {valueFormatter ? valueFormatter(p.value, p.name) : p.value}
        </p>
      ))}
    </div>
  );
}

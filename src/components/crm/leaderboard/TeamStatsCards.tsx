import { motion, useAnimation } from 'framer-motion';
import type { TeamStats } from '../../../types/entities';
import { useEffect } from 'react';

export function TeamStatsCards({ stats }: { stats: TeamStats }) {
  const controls = useAnimation();
  useEffect(() => {
    controls.start({ opacity: 1, y: 0 });
  }, [controls, stats]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <Kpi label="Salespeople" value={stats.total_salespeople} />
      <Kpi label="Leads" value={stats.total_leads} />
      <Kpi label="Conversions" value={stats.total_conversions} />
      <Kpi label="Conv. Rate" value={`${stats.overall_conversion_rate.toFixed(1)}%`} />
      <Kpi label="Revenue" value={formatCurrency(stats.total_revenue)} />
      <Kpi label="Avg Deal" value={formatCurrency(stats.avg_deal_size)} />
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="rounded-lg sm:rounded-xl border border-border/70 p-2 sm:p-3">
      <div className="text-[10px] sm:text-xs text-muted-foreground">{label}</div>
      <div className="text-base sm:text-lg font-semibold">{value}</div>
    </motion.div>
  );
}

function formatCurrency(n: number) {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  } catch {
    return `₹${n.toLocaleString('en-IN')}`;
  }
}



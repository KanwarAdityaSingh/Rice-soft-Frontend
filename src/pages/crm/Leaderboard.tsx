import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { ChevronDown, SortAsc, SortDesc } from 'lucide-react';
import { Podium } from '../../components/crm/leaderboard/Podium';
import { TeamStatsCards } from '../../components/crm/leaderboard/TeamStatsCards';
import { PerformanceDial } from '../../components/crm/leaderboard/PerformanceDial';
import { DateRangeFilter } from '../../components/crm/leaderboard/DateRangeFilter';
import { SortDropdown } from '../../components/crm/leaderboard/SortDropdown';

export default function LeaderboardPage() {
  const {
    entries,
    totalCount,
    teamStats,
    loading,
    error,
    sortBy,
    sortOrder,
    startDate,
    endDate,
    limit,
    offset,
    toggleSort,
    applyPresetRange,
    setCustomRange,
    paginate,
    fireConfetti,
  } = useLeaderboard();

  useEffect(() => {
    // fire confetti lightly on first mount for flair
    const t = setTimeout(() => fireConfetti(), 600);
    return () => clearTimeout(t);
  }, [fireConfetti]);

  return (
    <div className="container py-8 space-y-8">
      <header className="hero-bg rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -left-6 -top-6 h-24 w-24 floating-orb" />
        <div className="absolute -right-6 -bottom-6 h-20 w-20 floating-orb" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between relative">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold"><span className="text-gradient">Leaderboard</span></h1>
            <p className="text-sm text-muted-foreground">Track top performers and team momentum.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DateRangeFilter onPreset={applyPresetRange} />
            <SortDropdown value={sortBy} order={sortOrder} onChange={({ value, order }) => { if (value !== sortBy) toggleSort(value); else toggleSort(value); if (order !== sortOrder) toggleSort(value); }} />
          </div>
        </div>
      </header>

      {teamStats && (
        <TeamStatsCards stats={teamStats} />
      )}

      <Podium entries={entries} />

      <section className="rounded-2xl card-glow overflow-hidden">
        <div className="grid grid-cols-12 bg-muted/30 text-xs font-medium">
          <HeaderCell className="col-span-1">Rank</HeaderCell>
          <HeaderCell className="col-span-3">Name</HeaderCell>
          <HeaderCell className="col-span-2" onClick={() => toggleSort('total_leads')} sortable active={sortBy==='total_leads'} order={sortOrder}>Total Leads</HeaderCell>
          <HeaderCell className="col-span-2" onClick={() => toggleSort('conversion_rate')} sortable active={sortBy==='conversion_rate'} order={sortOrder}>Conversion Rate</HeaderCell>
          <HeaderCell className="col-span-2" onClick={() => toggleSort('total_revenue')} sortable active={sortBy==='total_revenue'} order={sortOrder}>Revenue</HeaderCell>
          <HeaderCell className="col-span-2" onClick={() => toggleSort('performance_score')} sortable active={sortBy==='performance_score'} order={sortOrder}>Score</HeaderCell>
        </div>
        <div>
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No leaderboard data available yet</div>
          ) : (
            entries.map((e) => (
              <div key={e.salesperson_id} className="grid grid-cols-12 items-center border-t border-border/60 px-3 py-2 text-sm hover:bg-muted/30 transition-colors">
                <div className="col-span-1 font-semibold">{getRankIcon(e.rank)}</div>
                <div className="col-span-3">
                  <div className="font-medium">{e.salesperson_name}</div>
                  <div className="text-xs text-muted-foreground">{e.salesperson_email}</div>
                </div>
                <div className="col-span-2">{Number(e.total_leads ?? 0)}</div>
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, Number(e.conversion_rate ?? 0))}%` }} />
                    </div>
                    <span className="w-12 text-right">{Number(e.conversion_rate ?? 0).toFixed(1)}%</span>
                  </div>
                </div>
                <div className="col-span-2">{formatCurrency(Number(e.total_revenue ?? 0))}</div>
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-muted">
                      <div className={scoreBarClass(Number(e.performance_score ?? 0))} style={{ width: `${Math.min(100, Number(e.performance_score ?? 0))}%` }} />
                    </div>
                    <span className="w-12 text-right">{Number(e.performance_score ?? 0).toFixed(1)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function HeaderCell({ children, className = '', onClick, sortable, active, order }: { children: React.ReactNode; className?: string; onClick?: () => void; sortable?: boolean; active?: boolean; order?: 'asc'|'desc'; }) {
  return (
    <div className={`${className} px-3 py-2 flex items-center gap-1 ${sortable ? 'cursor-pointer hover:bg-muted/50' : ''}`} onClick={onClick}>
      <span>{children}</span>
      {sortable && (
        <span className="text-muted-foreground">
          {active ? (order === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />) : <ChevronDown className="h-3 w-3 opacity-40" />}
        </span>
      )}
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: string | number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="rounded-xl border border-border/70 p-3">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="text-lg font-semibold">{value}</div>
    </motion.div>
  );
}

function getRankIcon(rank: number) {
  switch (rank) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return rank;
  }
}

function scoreBarClass(score: number) {
  if (score >= 80) return 'h-2 rounded-full bg-emerald-500';
  if (score >= 60) return 'h-2 rounded-full bg-yellow-500';
  if (score >= 40) return 'h-2 rounded-full bg-orange-500';
  return 'h-2 rounded-full bg-red-500';
}

function formatCurrency(n: number) {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  } catch {
    return `₹${n.toLocaleString('en-IN')}`;
  }
}



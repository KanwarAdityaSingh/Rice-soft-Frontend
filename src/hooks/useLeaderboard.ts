import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { leaderboardAPI } from '../services/leaderboard.api';
import type {
  LeaderboardEntry,
  LeaderboardFilters,
  LeaderboardResponse,
  TeamStats,
  SalespersonStats,
  MonthlyTrend,
  RecentActivity,
} from '../types/entities';
import confetti from 'canvas-confetti';

type SortBy = NonNullable<LeaderboardFilters['sort_by']>;
type SortOrder = NonNullable<LeaderboardFilters['sort_order']>;

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('performance_score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [limit, setLimit] = useState<number>(10);
  const [offset, setOffset] = useState<number>(0);

  const prevTopIdRef = useRef<string | null>(null);

  const filters: LeaderboardFilters = useMemo(() => ({
    start_date: startDate,
    end_date: endDate,
    sort_by: sortBy,
    sort_order: sortOrder,
    limit,
    offset,
  }), [startDate, endDate, sortBy, sortOrder, limit, offset]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [lb, stats] = await Promise.all([
        leaderboardAPI.getLeaderboard(filters),
        leaderboardAPI.getTeamStats(),
      ]);

      setEntries(lb.entries);
      setTotalCount(lb.total_count);
      setTeamStats(stats);

      const newTop = lb.entries[0]?.salesperson_id || null;
      if (newTop && prevTopIdRef.current && prevTopIdRef.current !== newTop) {
        fireConfetti();
      }
      prevTopIdRef.current = newTop;
    } catch (e: any) {
      setError(e?.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  const fireConfetti = useCallback(() => {
    const end = Date.now() + 600;
    const colors = ['#FFD700', '#C0C0C0', '#CD7F32', '#22c55e', '#a78bfa'];
    const frame = () => {
      confetti({
        particleCount: 40,
        spread: 60,
        startVelocity: 45,
        ticks: 120,
        scalar: 0.8,
        zIndex: 9999,
        colors,
        origin: { x: Math.random(), y: Math.random() * 0.3 + 0.1 },
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  const applyPresetRange = useCallback((preset: 'this_month' | 'this_quarter' | 'this_year' | 'last_7' | 'last_30' | 'last_90' | 'all_time') => {
    const today = new Date();
    let start: Date | null = null;
    let end: Date | null = today;
    switch (preset) {
      case 'this_month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'this_quarter':
        {
          const q = Math.floor(today.getMonth() / 3);
          start = new Date(today.getFullYear(), q * 3, 1);
        }
        break;
      case 'this_year':
        start = new Date(today.getFullYear(), 0, 1);
        break;
      case 'last_7':
        start = new Date(today);
        start.setDate(start.getDate() - 7);
        break;
      case 'last_30':
        start = new Date(today);
        start.setDate(start.getDate() - 30);
        break;
      case 'last_90':
        start = new Date(today);
        start.setDate(start.getDate() - 90);
        break;
      case 'all_time':
        start = null; end = null;
        break;
    }
    setStartDate(start ? start.toISOString().split('T')[0] : null);
    setEndDate(end ? end.toISOString().split('T')[0] : null);
  }, []);

  const setCustomRange = useCallback((start?: string | null, end?: string | null) => {
    setStartDate(start || null);
    setEndDate(end || null);
  }, []);

  const toggleSort = useCallback((column: SortBy) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setOffset(0);
  }, [sortBy]);

  const paginate = useCallback((newOffset: number, newLimit?: number) => {
    if (typeof newLimit === 'number') setLimit(newLimit);
    setOffset(newOffset);
  }, []);

  // Salesperson auxiliary fetchers for drawer consumers
  const fetchSalespersonBundle = useCallback(async (id: string) => {
    const [stats, trends, activities] = await Promise.all([
      leaderboardAPI.getSalespersonStats(id, { start_date: startDate || undefined, end_date: endDate || undefined }),
      leaderboardAPI.getMonthlyTrends(id),
      leaderboardAPI.getRecentActivities(id, 10),
    ]);
    return { stats, trends, activities } as { stats: SalespersonStats; trends: MonthlyTrend[]; activities: RecentActivity[] };
  }, [startDate, endDate]);

  return {
    // data
    entries,
    totalCount,
    teamStats,
    // state
    loading,
    error,
    sortBy,
    sortOrder,
    startDate,
    endDate,
    limit,
    offset,
    // actions
    refetch: fetchAll,
    toggleSort,
    applyPresetRange,
    setCustomRange,
    paginate,
    fireConfetti,
    fetchSalespersonBundle,
  };
}



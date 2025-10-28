import { apiService } from './api';
import type {
  LeaderboardFilters,
  LeaderboardResponse,
  TeamStats,
  SalespersonStats,
  SalespersonDetailStats,
  MonthlyTrend,
  RecentActivity,
} from '../types/entities';

export const leaderboardAPI = {
  getLeaderboard: async (filters?: LeaderboardFilters): Promise<LeaderboardResponse> => {
    let url = '/leaderboard/getLeaderboard';
    const params = new URLSearchParams();

    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.sort_by) params.append('sort_by', filters.sort_by);
    if (filters?.sort_order) params.append('sort_order', filters.sort_order);
    if (typeof filters?.limit === 'number') params.append('limit', String(filters.limit));
    if (typeof filters?.offset === 'number') params.append('offset', String(filters.offset));

    if (params.toString()) url += `?${params.toString()}`;

    return apiService.get<LeaderboardResponse>(url);
  },

  getTeamStats: async (): Promise<TeamStats> => {
    return apiService.get<TeamStats>('/leaderboard/getTeamStats');
  },

  getSalespersonStats: async (id: string, timeRange?: { start_date?: string; end_date?: string }): Promise<SalespersonStats> => {
    let url = `/leaderboard/getSalespersonStats/${id}`;
    const params = new URLSearchParams();
    if (timeRange?.start_date) params.append('start_date', timeRange.start_date);
    if (timeRange?.end_date) params.append('end_date', timeRange.end_date);
    if (params.toString()) url += `?${params.toString()}`;
    return apiService.get<SalespersonStats>(url);
  },

  getSalespersonDetailStats: async (id: string): Promise<SalespersonDetailStats> => {
    return apiService.get<SalespersonDetailStats>(`/leaderboard/getSalespersonDetailStats/${id}`);
  },

  getMonthlyTrends: async (id: string): Promise<MonthlyTrend[]> => {
    return apiService.get<MonthlyTrend[]>(`/leaderboard/getSalespersonMonthlyTrends/${id}`);
  },

  getRecentActivities: async (id: string, limit = 10): Promise<RecentActivity[]> => {
    let url = `/leaderboard/getSalespersonRecentActivities/${id}`;
    if (limit) url += `?limit=${limit}`;
    return apiService.get<RecentActivity[]>(url);
  },
};



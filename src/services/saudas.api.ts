import { apiService } from './api';
import type { Sauda, CreateSaudaRequest, UpdateSaudaRequest, SaudaFilters } from '../types/entities';

export const saudasAPI = {
  // Get all saudas
  getAllSaudas: (filters?: SaudaFilters) => {
    let url = '/saudas';
    const params = new URLSearchParams();
    if (filters?.include_inactive) params.append('include_inactive', 'true');
    if (filters?.status) params.append('status', filters.status);
    if (filters?.sauda_type) params.append('sauda_type', filters.sauda_type);
    if (filters?.purchaser_id) params.append('purchaser_id', filters.purchaser_id);
    if (params.toString()) url += `?${params.toString()}`;
    return apiService.get<Sauda[]>(url);
  },

  // Get sauda by ID
  getSaudaById: (id: string) => {
    return apiService.get<Sauda>(`/saudas/${id}`);
  },

  // Create sauda
  createSauda: (data: CreateSaudaRequest) => {
    return apiService.post<Sauda>('/saudas', data);
  },

  // Update sauda
  updateSauda: (id: string, data: UpdateSaudaRequest) => {
    return apiService.put<Sauda>(`/saudas/${id}`, data);
  },

  // Update sauda status
  updateSaudaStatus: (id: string, status: 'draft' | 'active' | 'completed' | 'cancelled') => {
    return apiService.post<Sauda>(`/saudas/${id}/status`, { status });
  },

  // Delete sauda
  deleteSauda: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/saudas/${id}`);
  },
};


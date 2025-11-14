import { apiService } from './api';
import type { Sauda, CreateSaudaRequest, UpdateSaudaRequest, SaudaStatus } from '../types/entities';

export const saudasAPI = {
  // Get all saudas
  getAllSaudas: (params?: {
    include_inactive?: boolean;
    status?: SaudaStatus;
    sauda_type?: 'xgodown' | 'for';
    purchaser_id?: string;
  }) => {
    let url = '/saudas';
    const queryParams = new URLSearchParams();
    if (params?.include_inactive) queryParams.append('include_inactive', 'true');
    if (params?.status) queryParams.append('status', params.status);
    if (params?.sauda_type) queryParams.append('sauda_type', params.sauda_type);
    if (params?.purchaser_id) queryParams.append('purchaser_id', params.purchaser_id);
    if (queryParams.toString()) url += `?${queryParams.toString()}`;
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
  updateSaudaStatus: (id: string, status: SaudaStatus) => {
    return apiService.patch<Sauda>(`/saudas/${id}/status`, { status });
  },

  // Delete sauda
  deleteSauda: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/saudas/${id}`);
  },
};


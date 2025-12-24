import { apiService } from './api';
import type { Kaanta, CreateKaantaRequest, UpdateKaantaRequest } from '../types/entities';

export const kaantasAPI = {
  // Get all kaantas with optional filters
  getAllKaantas: (sauda_id?: string, inward_slip_pass_id?: string) => {
    let url = '/kaantas';
    const params = new URLSearchParams();
    if (sauda_id) params.append('sauda_id', sauda_id);
    if (inward_slip_pass_id) params.append('inward_slip_pass_id', inward_slip_pass_id);
    if (params.toString()) url += `?${params.toString()}`;
    return apiService.get<Kaanta[]>(url);
  },

  // Get kaanta by ID
  getKaantaById: (id: string) => {
    return apiService.get<Kaanta>(`/kaantas/${id}`);
  },

  // Create kaanta (auto-creates lot in backend)
  createKaanta: (data: CreateKaantaRequest) => {
    return apiService.post<Kaanta>('/kaantas', data);
  },

  // Update kaanta (does NOT update associated lot)
  updateKaanta: (id: string, data: UpdateKaantaRequest) => {
    return apiService.put<Kaanta>(`/kaantas/${id}`, data);
  },

  // Delete kaanta (cascade deletes associated lot)
  deleteKaanta: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/kaantas/${id}`);
  },
};


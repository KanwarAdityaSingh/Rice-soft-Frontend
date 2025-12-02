import { apiService } from './api';
import type { Lot, CreateLotRequest, UpdateLotRequest } from '../types/entities';

export const lotsAPI = {
  // Get all lots
  getAllLots: (sauda_id?: string) => {
    let url = '/lots';
    if (sauda_id) {
      url += `?sauda_id=${sauda_id}`;
    }
    return apiService.get<Lot[]>(url);
  },

  // Get lot by ID
  getLotById: (id: string) => {
    return apiService.get<Lot>(`/lots/${id}`);
  },

  // Create lot (note: uses sauda_id, NOT inward_slip_pass_id)
  createLot: (data: CreateLotRequest) => {
    return apiService.post<Lot>('/lots', data);
  },

  // Update lot
  updateLot: (id: string, data: UpdateLotRequest) => {
    return apiService.put<Lot>(`/lots/${id}`, data);
  },

  // Delete lot
  deleteLot: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/lots/${id}`);
  },
};


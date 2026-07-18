import { apiService } from './api';
import type { RiceLengthRecord } from '../types/entities';

export interface CreateRiceLengthRequest {
  name: string;
  is_active?: boolean;
}

export interface UpdateRiceLengthRequest {
  name?: string;
  is_active?: boolean;
}

export const riceLengthsAPI = {
  getAllRiceLengths: (includeInactive = false): Promise<RiceLengthRecord[]> => {
    const params = includeInactive ? '?include_inactive=true' : '';
    return apiService.get<RiceLengthRecord[]>(`/riceLengths/getAllRiceLengths${params}`);
  },

  getRiceLengthById: (id: string): Promise<RiceLengthRecord> => {
    return apiService.get<RiceLengthRecord>(`/riceLengths/getRiceLengthById/${id}`);
  },

  createRiceLength: (data: CreateRiceLengthRequest): Promise<RiceLengthRecord> => {
    return apiService.post<RiceLengthRecord>('/riceLengths/createRiceLength', data);
  },

  updateRiceLength: (id: string, data: UpdateRiceLengthRequest): Promise<RiceLengthRecord> => {
    return apiService.post<RiceLengthRecord>(`/riceLengths/updateRiceLength/${id}`, data);
  },

  deleteRiceLength: (id: string): Promise<{ success: boolean; message: string }> => {
    return apiService.post<{ success: boolean; message: string }>(
      `/riceLengths/deleteRiceLength/${id}`,
    );
  },
};

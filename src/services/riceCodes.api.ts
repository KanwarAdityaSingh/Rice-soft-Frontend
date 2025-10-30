import { apiService } from './api';
import type { RiceCode, RiceType } from '../types/entities';

export interface CreateRiceCodeRequest {
  rice_code_name: string;
}

export interface UpdateRiceCodeRequest {
  rice_code_name?: string;
}

export const riceCodesAPI = {
  // Get all rice codes
  getAllRiceCodes: async (): Promise<RiceCode[]> => {
    return apiService.get<RiceCode[]>('/riceCodes/getAllRiceCodes');
  },

  // Get rice code by name
  getRiceCodeByName: async (name: string): Promise<RiceCode> => {
    return apiService.get<RiceCode>(`/riceCodes/getRiceCodeByName?name=${encodeURIComponent(name)}`);
  },

  // Get all rice types
  getRiceTypes: async (): Promise<RiceType[]> => {
    return apiService.get<RiceType[]>('/riceCodes/getRiceTypes');
  },

  // Create rice code
  createRiceCode: (data: CreateRiceCodeRequest) => {
    return apiService.post<RiceCode>('/riceCodes/createRiceCode', data);
  },

  // Update rice code
  updateRiceCode: (id: string, data: UpdateRiceCodeRequest) => {
    return apiService.post<RiceCode>(`/riceCodes/updateRiceCode/${id}`, data);
  },

  // Delete rice code
  deleteRiceCode: (id: string) => {
    return apiService.post<{ success: boolean; message: string }>(`/riceCodes/deleteRiceCode/${id}`);
  },
};


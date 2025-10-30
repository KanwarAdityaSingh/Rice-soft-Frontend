import { apiService } from './api';
import type { RiceCode, RiceType } from '../types/entities';

export const riceCodesAPI = {
  // Get all rice codes
  getAllRiceCodes: async (): Promise<RiceCode[]> => {
    return apiService.get<RiceCode[]>('/riceCodes/getAllRiceCodes');
  },

  // Get all rice types
  getRiceTypes: async (): Promise<RiceType[]> => {
    return apiService.get<RiceType[]>('/riceCodes/getRiceTypes');
  },
};


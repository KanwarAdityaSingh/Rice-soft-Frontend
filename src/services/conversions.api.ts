import { apiService } from './api';
import type { LeadConversion } from '../types/entities';

export const conversionsAPI = {
  getAllConversions: async (): Promise<LeadConversion[]> => {
    // Note: This endpoint may need to be created in the backend
    try {
      return apiService.get<LeadConversion[]>('/conversions/getAllConversions');
    } catch (error) {
      // If endpoint doesn't exist, return empty array for now
      console.warn('Conversions endpoint not available yet');
      return [];
    }
  },

  getConversionById: async (id: string): Promise<LeadConversion> => {
    return apiService.get<LeadConversion>(`/conversions/getConversionById/${id}`);
  },
};


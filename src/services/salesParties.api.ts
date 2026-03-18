import { apiService } from './api';
import type { SalesParty, CreateSalesPartyRequest, UpdateSalesPartyRequest } from '../types/entities';

const BASE = '/sales-parties';

export const salesPartiesAPI = {
  getAll: (includeInactive: boolean = false) => {
    const params = new URLSearchParams();
    if (includeInactive) params.append('include_inactive', 'true');
    const q = params.toString();
    return apiService.get<SalesParty[]>(q ? `${BASE}?${q}` : BASE);
  },

  getById: (id: string) => apiService.get<SalesParty>(`${BASE}/${id}`),

  create: (data: CreateSalesPartyRequest) => apiService.post<SalesParty>(BASE, data),

  update: (id: string, data: UpdateSalesPartyRequest) =>
    apiService.patch<SalesParty>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    apiService.delete<{ success: boolean; message: string }>(`${BASE}/${id}`),
};

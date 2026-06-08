import { apiService } from './api';
import type { Godown, CreateGodownRequest, UpdateGodownRequest } from '../types/entities';
import { kycAPI } from './kyc.api';

const BASE = '/godowns';

export const godownsAPI = {
  getAll: (params?: { include_inactive?: boolean }) => {
    const search = new URLSearchParams();
    if (params?.include_inactive) search.set('include_inactive', 'true');
    const q = search.toString();
    return apiService.get<Godown[]>(q ? `${BASE}?${q}` : BASE);
  },

  getById: (id: string) => apiService.get<Godown>(`${BASE}/${id}`),

  lookupGST: (gstNumber: string) => kycAPI.lookupGSTAdvanced(gstNumber),

  create: (data: CreateGodownRequest) => apiService.post<Godown>(BASE, data),

  update: (id: string, data: UpdateGodownRequest) =>
    apiService.patch<Godown>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    apiService.delete<{ success: boolean; message?: string }>(`${BASE}/${id}`),
};

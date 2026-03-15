import { apiService } from './api';
import type {
  SalesSauda,
  CreateSalesSaudaRequest,
  UpdateSalesSaudaRequest,
  SalesSaudaStatus,
} from '../types/sales';

const BASE = '/sales-saudas';

export const salesSaudasAPI = {
  list: (params?: { customer_id?: string; status?: SalesSaudaStatus }) => {
    const search = new URLSearchParams();
    if (params?.customer_id) search.set('customer_id', params.customer_id);
    if (params?.status) search.set('status', params.status);
    const q = search.toString();
    return apiService.get<SalesSauda[]>(q ? `${BASE}?${q}` : BASE);
  },

  getById: (id: string) => apiService.get<SalesSauda>(`${BASE}/${id}`),

  create: (data: CreateSalesSaudaRequest) => apiService.post<SalesSauda>(BASE, data),

  update: (id: string, data: UpdateSalesSaudaRequest) =>
    apiService.put<SalesSauda>(`${BASE}/${id}`, data),

  finalize: (id: string) => apiService.post<SalesSauda>(`${BASE}/${id}/finalize`),

  delete: (id: string) => apiService.delete<{ success: boolean }>(`${BASE}/${id}`),
};

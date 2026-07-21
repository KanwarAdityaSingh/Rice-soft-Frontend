import { apiService } from './api';
import type {
  SalesSauda,
  CreateSalesSaudaRequest,
  UpdateSalesSaudaRequest,
  SalesSaudaStatus,
} from '../types/sales';
import type { SalesMovementTypeFilter } from '../constants/sales-movement-types';

const BASE = '/sales-saudas';

export const salesSaudasAPI = {
  list: (params?: {
    sales_party_id?: string;
    status?: SalesSaudaStatus;
    /** Indian FY label e.g. "2025-2026" */
    financial_year?: string;
    /**
     * Default on server is `sale`. Pass `godown_transfer` or `all`.
     */
    movement_type?: SalesMovementTypeFilter;
  }) => {
    const search = new URLSearchParams();
    if (params?.sales_party_id) search.set('sales_party_id', params.sales_party_id);
    if (params?.status) search.set('status', params.status);
    if (params?.financial_year) search.set('financial_year', params.financial_year);
    if (params?.movement_type) search.set('movement_type', params.movement_type);
    const q = search.toString();
    return apiService.get<SalesSauda[]>(q ? `${BASE}?${q}` : BASE);
  },

  /** GET /sales-saudas/types — same shape as product brands/HSN options */
  getTypes: () =>
    apiService.get<Array<{ value: string; label: string }>>(`${BASE}/types`),

  getById: (id: string) => apiService.get<SalesSauda>(`${BASE}/${id}`),

  create: (data: CreateSalesSaudaRequest) => apiService.post<SalesSauda>(BASE, data),

  update: (id: string, data: UpdateSalesSaudaRequest) =>
    apiService.put<SalesSauda>(`${BASE}/${id}`, data),

  finalize: (id: string) => apiService.post<SalesSauda>(`${BASE}/${id}/finalize`),

  delete: (id: string) => apiService.delete<{ success: boolean }>(`${BASE}/${id}`),
};

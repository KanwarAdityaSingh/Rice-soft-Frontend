import { apiService } from './api';
import type { SalesPartySite, CreateSalesPartySiteRequest, UpdateSalesPartySiteRequest } from '../types/entities';

/** Base URL env usually ends with `/api/v1` — do not prefix another `/v1` here. */
const BASE = '/sales-party-sites';

export const salesPartySitesAPI = {
  list: (salesPartyId: string, includeInactive = false) => {
    const params = new URLSearchParams({ sales_party_id: salesPartyId });
    if (includeInactive) params.set('include_inactive', 'true');
    return apiService.get<SalesPartySite[]>(`${BASE}?${params.toString()}`);
  },
  getById: (id: string) => apiService.get<SalesPartySite>(`${BASE}/${id}`),
  create: (data: CreateSalesPartySiteRequest) => apiService.post<SalesPartySite>(BASE, data),
  update: (id: string, data: UpdateSalesPartySiteRequest) => apiService.put<SalesPartySite>(`${BASE}/${id}`, data),
  remove: (id: string) => apiService.delete<unknown>(`${BASE}/${id}`),
};

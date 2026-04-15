import { apiService } from './api';
import type { VendorSite, CreateVendorSiteRequest, UpdateVendorSiteRequest } from '../types/entities';

/** Base URL env usually ends with `/api/v1` — do not prefix another `/v1` here. */
const BASE = '/sites';

export const vendorSitesAPI = {
  list: (vendorId: string, includeInactive = false) => {
    const params = new URLSearchParams({ vendor_id: vendorId });
    if (includeInactive) params.set('include_inactive', 'true');
    return apiService.get<VendorSite[]>(`${BASE}?${params.toString()}`);
  },
  getById: (id: string) => apiService.get<VendorSite>(`${BASE}/${id}`),
  create: (data: CreateVendorSiteRequest) => apiService.post<VendorSite>(BASE, data),
  update: (id: string, data: UpdateVendorSiteRequest) => apiService.put<VendorSite>(`${BASE}/${id}`, data),
  remove: (id: string) => apiService.delete<unknown>(`${BASE}/${id}`),
};

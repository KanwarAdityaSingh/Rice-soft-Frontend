import { API_BASE_URL, apiService } from './api';
import { authenticatedFetchEnvelopeData } from './authenticatedFetch';
import type {
  Packaging,
  CreatePackagingRequest,
  UpdatePackagingRequest,
  AddPacketsInventoryRequest,
  PacketsInventory,
} from '../types/entities';

export interface UploadPackagingBillResponse {
  url: string;
  packaging: Packaging;
}

export const packagingAPI = {
  getAllPackaging: (filters?: { product_id?: string; godown_id?: string }) => {
    const params = new URLSearchParams();
    if (filters?.product_id) params.set('product_id', filters.product_id);
    if (filters?.godown_id) params.set('godown_id', filters.godown_id);
    const q = params.toString();
    return apiService.get<Packaging[]>(q ? `/packaging?${q}` : '/packaging');
  },

  getPackagingById: (id: string) => {
    return apiService.get<Packaging>(`/packaging/${id}`);
  },

  createPackaging: (data: CreatePackagingRequest) => {
    return apiService.post<Packaging>('/packaging', data);
  },

  updatePackaging: (id: string, data: UpdatePackagingRequest) => {
    return apiService.put<Packaging>(`/packaging/${id}`, data);
  },

  deletePackaging: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/packaging/${id}`);
  },

  addPacketsInventory: (id: string, data: AddPacketsInventoryRequest) => {
    return apiService.post<PacketsInventory>(`/packaging/${id}/inventory`, data);
  },

  uploadPackagingBill: async (
    id: string,
    file: File,
    billNumber?: string,
    billDate?: string
  ): Promise<UploadPackagingBillResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (billNumber?.trim()) {
      formData.append('bill_number', billNumber.trim());
    }
    if (billDate) {
      formData.append('bill_date', billDate);
    }
    return authenticatedFetchEnvelopeData<UploadPackagingBillResponse>(
      `${API_BASE_URL}/packaging/${id}/upload-packaging-bill`,
      {
        method: 'POST',
        body: formData,
      }
    );
  },
};

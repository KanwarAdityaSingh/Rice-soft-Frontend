import { apiService } from './api';
import type { Packaging, CreatePackagingRequest, UpdatePackagingRequest, AddPacketsInventoryRequest, PacketsInventory } from '../types/entities';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api';

export interface UploadPackagingBillResponse {
  url: string;
  packaging: Packaging;
}

export const packagingAPI = {
  // Get all packaging types (optionally filtered by product_id and/or godown_id)
  getAllPackaging: (filters?: { product_id?: string; godown_id?: string }) => {
    const params = new URLSearchParams();
    if (filters?.product_id) params.set('product_id', filters.product_id);
    if (filters?.godown_id) params.set('godown_id', filters.godown_id);
    const q = params.toString();
    return apiService.get<Packaging[]>(q ? `/packaging?${q}` : '/packaging');
  },

  // Get packaging by ID
  getPackagingById: (id: string) => {
    return apiService.get<Packaging>(`/packaging/${id}`);
  },

  // Create packaging
  createPackaging: (data: CreatePackagingRequest) => {
    return apiService.post<Packaging>('/packaging', data);
  },

  // Update packaging
  updatePackaging: (id: string, data: UpdatePackagingRequest) => {
    return apiService.put<Packaging>(`/packaging/${id}`, data);
  },

  // Delete packaging
  deletePackaging: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/packaging/${id}`);
  },

  // Add empty packets to inventory
  addPacketsInventory: (id: string, data: AddPacketsInventoryRequest) => {
    return apiService.post<PacketsInventory>(`/packaging/${id}/inventory`, data);
  },

  /** Multipart upload: field `file` (JPEG/PNG/GIF/PDF, max 10MB); optional `bill_number`, `bill_date` (YYYY-MM-DD). */
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
    const token = localStorage.getItem('auth:token');
    const response = await fetch(`${API_BASE_URL}/packaging/${id}/upload-packaging-bill`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Upload failed');
    }
    return data.data as UploadPackagingBillResponse;
  },
};


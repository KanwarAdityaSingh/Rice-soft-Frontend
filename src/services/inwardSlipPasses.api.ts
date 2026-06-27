import { API_BASE_URL, apiService } from './api';
import { authenticatedFetchEnvelopeData } from './authenticatedFetch';
import type { InwardSlipPass, CreateInwardSlipPassRequest, UpdateInwardSlipPassRequest } from '../types/entities';

export const inwardSlipPassesAPI = {
  getAllInwardSlipPasses: (sauda_id?: string, godown_id?: string) => {
    const params = new URLSearchParams();
    if (sauda_id) params.set('sauda_id', sauda_id);
    if (godown_id) params.set('godown_id', godown_id);
    const q = params.toString();
    return apiService.get<InwardSlipPass[]>(q ? `/inward-slip-passes?${q}` : '/inward-slip-passes');
  },

  getInwardSlipPassById: (id: string) => {
    return apiService.get<InwardSlipPass>(`/inward-slip-passes/${id}`);
  },

  createInwardSlipPass: (data: CreateInwardSlipPassRequest) => {
    return apiService.post<InwardSlipPass>('/inward-slip-passes', data);
  },

  updateInwardSlipPass: (id: string, data: UpdateInwardSlipPassRequest) => {
    return apiService.put<InwardSlipPass>(`/inward-slip-passes/${id}`, data);
  },

  updateInwardSlipPassStatus: (id: string, status: 'pending' | 'completed') => {
    return apiService.post<InwardSlipPass>(`/inward-slip-passes/${id}/status`, { status });
  },

  uploadOtherBill: async (id: string, name: string, file: File) => {
    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('file', file);
    return authenticatedFetchEnvelopeData(`${API_BASE_URL}/inward-slip-passes/${id}/upload-other-bill`, {
      method: 'POST',
      body: formData,
    });
  },

  deleteOtherBill: async (id: string, billUrl: string) => {
    return authenticatedFetchEnvelopeData(`${API_BASE_URL}/inward-slip-passes/${id}/delete-other-bill`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: billUrl }),
    });
  },

  uploadPurchaseBill: async (id: string, file: File, billNumber?: string, billDate?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (billNumber && billNumber.trim()) {
      formData.append('bill_number', billNumber.trim());
    }
    if (billDate) {
      formData.append('bill_date', billDate);
    }
    return authenticatedFetchEnvelopeData(`${API_BASE_URL}/inward-slip-passes/${id}/upload-purchase-bill`, {
      method: 'POST',
      body: formData,
    });
  },

  uploadBilti: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return authenticatedFetchEnvelopeData(`${API_BASE_URL}/inward-slip-passes/${id}/upload-bilti`, {
      method: 'POST',
      body: formData,
    });
  },

  uploadEwayBill: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return authenticatedFetchEnvelopeData(`${API_BASE_URL}/inward-slip-passes/${id}/upload-eway-bill`, {
      method: 'POST',
      body: formData,
    });
  },

  deleteInwardSlipPass: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/inward-slip-passes/${id}`);
  },
};

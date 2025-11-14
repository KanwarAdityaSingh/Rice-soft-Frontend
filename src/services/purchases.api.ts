import { apiService } from './api';
import type { Purchase, CreatePurchaseRequest, UpdatePurchaseRequest } from '../types/entities';

export const purchasesAPI = {
  // Get all purchases
  getAllPurchases: async (params?: {
    vendor_id?: string;
    sauda_id?: string;
  }) => {
    let url = '/purchases';
    const queryParams = new URLSearchParams();
    if (params?.vendor_id) queryParams.append('vendor_id', params.vendor_id);
    if (params?.sauda_id) queryParams.append('sauda_id', params.sauda_id);
    if (queryParams.toString()) url += `?${queryParams.toString()}`;
    const response = await apiService.get<Purchase[]>(url);
    // apiService.get already unwraps the response, so response is always Purchase[]
    return Array.isArray(response) ? response : [];
  },

  // Get purchase by ID
  getPurchaseById: (id: string) => {
    return apiService.get<Purchase>(`/purchases/${id}`);
  },

  // Create purchase
  createPurchase: (data: CreatePurchaseRequest) => {
    return apiService.post<Purchase>('/purchases', data);
  },

  // Update purchase
  updatePurchase: (id: string, data: UpdatePurchaseRequest) => {
    return apiService.put<Purchase>(`/purchases/${id}`, data);
  },

  // Upload transportation bill
  uploadTransportationBill: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('auth:token');
    const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api';
    const response = await fetch(`${API_BASE_URL}/purchases/${id}/upload-transportation-bill`, {
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
    return data.data as Purchase;
  },

  // Upload purchase bill
  uploadPurchaseBill: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('auth:token');
    const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api';
    const response = await fetch(`${API_BASE_URL}/purchases/${id}/upload-purchase-bill`, {
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
    return data.data as Purchase;
  },

  // Upload bilti
  uploadBilti: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('auth:token');
    const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api';
    const response = await fetch(`${API_BASE_URL}/purchases/${id}/upload-bilti`, {
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
    return data.data as Purchase;
  },

  // Upload e-way bill
  uploadEwayBill: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('auth:token');
    const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api';
    const response = await fetch(`${API_BASE_URL}/purchases/${id}/upload-eway-bill`, {
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
    return data.data as Purchase;
  },

  // Delete purchase
  deletePurchase: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/purchases/${id}`);
  },
};


import { apiService } from './api';
import type { Sauda, CreateSaudaRequest, UpdateSaudaRequest, SaudaFilters } from '../types/entities';

export const saudasAPI = {
  // Get all saudas
  getAllSaudas: (filters?: SaudaFilters) => {
    let url = '/saudas';
    const params = new URLSearchParams();
    if (filters?.include_inactive) params.append('include_inactive', 'true');
    if (filters?.status) params.append('status', filters.status);
    if (filters?.sauda_type) params.append('sauda_type', filters.sauda_type);
    if (filters?.purchaser_id) params.append('purchaser_id', filters.purchaser_id);
    if (params.toString()) url += `?${params.toString()}`;
    return apiService.get<Sauda[]>(url);
  },

  // Get sauda by ID
  getSaudaById: (id: string) => {
    return apiService.get<Sauda>(`/saudas/${id}`);
  },

  // Create sauda
  createSauda: (data: CreateSaudaRequest) => {
    return apiService.post<Sauda>('/saudas', data);
  },

  // Update sauda
  updateSauda: (id: string, data: UpdateSaudaRequest) => {
    return apiService.put<Sauda>(`/saudas/${id}`, data);
  },

  // Update sauda status
  updateSaudaStatus: (id: string, status: 'draft' | 'active' | 'completed' | 'cancelled') => {
    return apiService.post<Sauda>(`/saudas/${id}/status`, { status });
  },

  // Delete sauda
  deleteSauda: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/saudas/${id}`);
  },

  // Upload cooked rice image
  uploadCookedRiceImage: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('auth:token');
    const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api';
    const response = await fetch(`${API_BASE_URL}/saudas/${id}/upload-cooked-rice-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Upload failed');
    }
    return data.data;
  },

  // Upload uncooked rice image
  uploadUncookedRiceImage: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('auth:token');
    const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api';
    const response = await fetch(`${API_BASE_URL}/saudas/${id}/upload-uncooked-rice-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Upload failed');
    }
    return data.data;
  },

  // Get notification preview
  getNotificationPreview: async (id: string) => {
    const token = localStorage.getItem('auth:token');
    const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api';
    // Remove /v1 from base URL if present, then add it correctly
    const baseUrl = API_BASE_URL.replace(/\/v1$/, '');
    const response = await fetch(`${baseUrl}/v1/saudas/${id}/notification-preview`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to load preview');
    }
    return data.data;
  },

  // Send sauda via email
  sendViaEmail: async (id: string, emails: string[], options?: { customSubject?: string; customHtml?: string; customText?: string; file?: File }) => {
    const formData = new FormData();
    formData.append('emails', JSON.stringify(emails));
    if (options?.customSubject) formData.append('customSubject', options.customSubject);
    if (options?.customHtml) formData.append('customHtml', options.customHtml);
    if (options?.customText) formData.append('customText', options.customText);
    if (options?.file) formData.append('file', options.file);

    const token = localStorage.getItem('auth:token');
    const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api';
    // Remove /v1 from base URL if present, then add it correctly
    const baseUrl = API_BASE_URL.replace(/\/v1$/, '');
    const response = await fetch(`${baseUrl}/v1/saudas/${id}/send-via-email`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok || data.status !== 'success') {
      throw new Error(data.message || 'Failed to send email');
    }
    return data.data;
  },

  // Send sauda via WhatsApp
  sendViaWhatsApp: async (id: string, whatsappNumbers: string[], options?: { customMessage?: string; file?: File; pdfUrl?: string }) => {
    const formData = new FormData();
    formData.append('whatsappNumbers', JSON.stringify(whatsappNumbers));
    if (options?.customMessage) formData.append('customMessage', options.customMessage);
    if (options?.file) formData.append('file', options.file);
    if (options?.pdfUrl) formData.append('pdfUrl', options.pdfUrl);

    const token = localStorage.getItem('auth:token');
    const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api';
    // Remove /v1 from base URL if present, then add it correctly
    const baseUrl = API_BASE_URL.replace(/\/v1$/, '');
    const response = await fetch(`${baseUrl}/v1/saudas/${id}/send-via-whatsapp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok || data.status !== 'success') {
      throw new Error(data.message || 'Failed to send WhatsApp');
    }
    return data.data;
  },
};


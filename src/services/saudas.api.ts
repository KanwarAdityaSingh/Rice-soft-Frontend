import { API_BASE_URL, apiService } from './api';
import { authenticatedFetch, authenticatedFetchEnvelopeData } from './authenticatedFetch';
import type {
  Sauda,
  CreateSaudaRequest,
  UpdateSaudaRequest,
  SaudaFilters,
} from '../types/entities';

export const saudasAPI = {
  getAllSaudas: (filters?: SaudaFilters) => {
    let url = '/saudas';
    const params = new URLSearchParams();
    if (filters?.include_inactive) params.append('include_inactive', 'true');
    if (filters?.status) params.append('status', filters.status);
    if (filters?.sauda_type) params.append('sauda_type', filters.sauda_type);
    if (filters?.purchaser_id) params.append('purchaser_id', filters.purchaser_id);
    if (filters?.rice_code_id) params.append('rice_code_id', filters.rice_code_id);
    if (filters?.rice_type) params.append('rice_type', filters.rice_type);
    if (params.toString()) url += `?${params.toString()}`;
    return apiService.get<Sauda[]>(url);
  },

  getSaudaById: (id: string) => {
    return apiService.get<Sauda>(`/saudas/${id}`);
  },

  createSauda: (data: CreateSaudaRequest) => {
    return apiService.post<Sauda>('/saudas', data);
  },

  updateSauda: (id: string, data: UpdateSaudaRequest) => {
    return apiService.put<Sauda>(`/saudas/${id}`, data);
  },

  patchSaudaStatus: (id: string, data: UpdateSaudaRequest) => {
    return apiService.patch<Sauda>(`/saudas/${id}/status`, data);
  },

  deleteSauda: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/saudas/${id}`);
  },

  uploadCookedRiceImage: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return authenticatedFetchEnvelopeData<{ url: string }>(`${API_BASE_URL}/saudas/${id}/upload-cooked-rice-image`, {
      method: 'POST',
      body: formData,
    });
  },

  uploadUncookedRiceImage: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return authenticatedFetchEnvelopeData<{ url: string }>(`${API_BASE_URL}/saudas/${id}/upload-uncooked-rice-image`, {
      method: 'POST',
      body: formData,
    });
  },

  getNotificationPreview: async (id: string) => {
    return authenticatedFetchEnvelopeData(`${API_BASE_URL}/saudas/${id}/notification-preview`);
  },

  sendViaEmail: async (
    id: string,
    emails: string[],
    options?: { customSubject?: string; customHtml?: string; customText?: string; file?: File }
  ) => {
    const formData = new FormData();
    formData.append('emails', JSON.stringify(emails));
    if (options?.customSubject) formData.append('customSubject', options.customSubject);
    if (options?.customHtml) formData.append('customHtml', options.customHtml);
    if (options?.customText) formData.append('customText', options.customText);
    if (options?.file) formData.append('file', options.file);

    const response = await authenticatedFetch(`${API_BASE_URL}/saudas/${id}/send-via-email`, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    apiService.inspectSessionFromResponse(data);
    if (!response.ok || data.status !== 'success') {
      throw new Error(data.message || 'Failed to send email');
    }
    return data.data;
  },

  sendViaWhatsApp: async (
    id: string,
    whatsappNumbers: string[],
    options?: { customMessage?: string; file?: File; pdfUrl?: string }
  ) => {
    const formData = new FormData();
    formData.append('whatsappNumbers', JSON.stringify(whatsappNumbers));
    if (options?.customMessage) formData.append('customMessage', options.customMessage);
    if (options?.file) formData.append('file', options.file);
    if (options?.pdfUrl) formData.append('pdfUrl', options.pdfUrl);

    const response = await authenticatedFetch(`${API_BASE_URL}/saudas/${id}/send-via-whatsapp`, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    apiService.inspectSessionFromResponse(data);
    if (!response.ok || data.status !== 'success') {
      throw new Error(data.message || 'Failed to send WhatsApp');
    }
    return data.data;
  },
};

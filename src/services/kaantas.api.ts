import { apiService } from './api';
import type { Kaanta, CreateKaantaRequest, UpdateKaantaRequest } from '../types/entities';

export const kaantasAPI = {
  // Get all kaantas with optional filters
  getAllKaantas: (sauda_id?: string, inward_slip_pass_id?: string) => {
    let url = '/kaantas';
    const params = new URLSearchParams();
    if (sauda_id) params.append('sauda_id', sauda_id);
    if (inward_slip_pass_id) params.append('inward_slip_pass_id', inward_slip_pass_id);
    if (params.toString()) url += `?${params.toString()}`;
    return apiService.get<Kaanta[]>(url);
  },

  // Get kaanta by ID
  getKaantaById: (id: string) => {
    return apiService.get<Kaanta>(`/kaantas/${id}`);
  },

  // Create kaanta (auto-creates lot in backend)
  createKaanta: (data: CreateKaantaRequest) => {
    return apiService.post<Kaanta>('/kaantas', data);
  },

  // Update kaanta (does NOT update associated lot)
  updateKaanta: (id: string, data: UpdateKaantaRequest) => {
    return apiService.put<Kaanta>(`/kaantas/${id}`, data);
  },

  // Delete kaanta (cascade deletes associated lot)
  deleteKaanta: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/kaantas/${id}`);
  },

  // Upload khaali kaanta parchi (empty kaanta receipt)
  uploadKhaaliKaantaParchi: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('auth:token');
    const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api';
    const response = await fetch(`${API_BASE_URL}/kaantas/${id}/upload-khaali-kaanta-parchi`, {
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

  // Upload bhara kaanta parchi (filled kaanta receipt)
  uploadBharaKaantaParchi: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('auth:token');
    const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api';
    const response = await fetch(`${API_BASE_URL}/kaantas/${id}/upload-bhara-kaanta-parchi`, {
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
};


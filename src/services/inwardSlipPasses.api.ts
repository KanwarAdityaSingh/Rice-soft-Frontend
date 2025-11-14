import { apiService } from './api';
import type {
  InwardSlipPass,
  CreateInwardSlipPassRequest,
  UpdateInwardSlipPassRequest,
  UpdateInwardSlipLotRequest,
  InwardSlipPassStatus,
  InwardSlipLot,
} from '../types/entities';

export const inwardSlipPassesAPI = {
  // Get all inward slip passes
  getAllInwardSlipPasses: (sauda_id?: string) => {
    let url = '/inward-slip-passes';
    if (sauda_id) {
      url += `?sauda_id=${sauda_id}`;
    }
    return apiService.get<InwardSlipPass[]>(url);
  },

  // Get inward slip pass by ID
  getInwardSlipPassById: (id: string) => {
    return apiService.get<InwardSlipPass>(`/inward-slip-passes/${id}`);
  },

  // Create inward slip pass
  createInwardSlipPass: (data: CreateInwardSlipPassRequest) => {
    return apiService.post<InwardSlipPass>('/inward-slip-passes', data);
  },

  // Update inward slip pass
  updateInwardSlipPass: (id: string, data: UpdateInwardSlipPassRequest) => {
    return apiService.put<InwardSlipPass>(`/inward-slip-passes/${id}`, data);
  },

  // Update inward slip pass status
  updateInwardSlipPassStatus: (id: string, status: InwardSlipPassStatus) => {
    return apiService.patch<InwardSlipPass>(`/inward-slip-passes/${id}/status`, { status });
  },

  // Delete inward slip pass
  deleteInwardSlipPass: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/inward-slip-passes/${id}`);
  },

  // Update inward slip lot
  updateLot: (inwardSlipId: string, lotId: string, data: UpdateInwardSlipLotRequest) => {
    return apiService.put<InwardSlipLot>(`/inward-slip-passes/${inwardSlipId}/lots/${lotId}`, data);
  },

  // Upload inward slip bill image
  uploadInwardSlipBill: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('auth:token');
    const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api';
    const response = await fetch(`${API_BASE_URL}/inward-slip-passes/${id}/upload-bill-image`, {
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
    // API returns { url: uploadResult.url } in data.data
    return data.data as { url: string };
  },
};


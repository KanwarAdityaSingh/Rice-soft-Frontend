import { apiService } from './api';
import type { Transporter, CreateTransporterRequest, UpdateTransporterRequest } from '../types/entities';

export const transportersAPI = {
  // Get all transporters
  getAllTransporters: (includeInactive: boolean = false) => {
    let url = '/transporters';
    if (includeInactive) {
      url += '?include_inactive=true';
    }
    return apiService.get<Transporter[]>(url);
  },

  // Get transporter by ID
  getTransporterById: (id: string) => {
    return apiService.get<Transporter>(`/transporters/${id}`);
  },

  // Create transporter
  createTransporter: (data: CreateTransporterRequest) => {
    return apiService.post<Transporter>('/transporters', data);
  },

  // Update transporter
  updateTransporter: (id: string, data: UpdateTransporterRequest) => {
    return apiService.put<Transporter>(`/transporters/${id}`, data);
  },

  // Delete transporter
  deleteTransporter: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/transporters/${id}`);
  },
};


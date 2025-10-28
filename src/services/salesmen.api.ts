import { apiService } from './api';
import type { Salesman, CreateSalesmanRequest, UpdateSalesmanRequest } from '../types/entities';

export const salesmenAPI = {
  // Get all salesmen
  getAllSalesmen: (includeInactive: boolean = false) => {
    let url = '/salesmen/getAllSalesmen';
    const params = new URLSearchParams();
    if (includeInactive) params.append('include_inactive', 'true');
    if (params.toString()) url += `?${params.toString()}`;
    return apiService.get<Salesman[]>(url);
  },

  // Get salesman by ID
  getSalesmanById: (id: string) => {
    return apiService.get<Salesman>(`/salesmen/getSalesmanById/${id}`);
  },

  // Create salesman
  createSalesman: (data: CreateSalesmanRequest) => {
    return apiService.post<Salesman>('/salesmen/createSalesman', data);
  },

  // Update salesman
  updateSalesman: (id: string, data: UpdateSalesmanRequest) => {
    return apiService.post<Salesman>(`/salesmen/updateSalesman/${id}`, data);
  },

  // Delete salesman
  deleteSalesman: (id: string) => {
    return apiService.post<{ success: boolean; message: string }>(`/salesmen/deleteSalesman/${id}`);
  },
};


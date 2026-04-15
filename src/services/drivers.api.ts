import { apiService } from './api';
import type { Driver, CreateDriverRequest, UpdateDriverRequest } from '../types/entities';

export const driversAPI = {
  getAllDrivers: (includeInactive?: boolean) => {
    let url = '/drivers';
    if (includeInactive) url += '?include_inactive=true';
    return apiService.get<Driver[]>(url);
  },

  getDriverById: (id: string) => apiService.get<Driver>(`/drivers/${id}`),

  getDriverByLicense: (licenseNumber: string) =>
    apiService.get<Driver>(`/drivers/by-license/${encodeURIComponent(licenseNumber)}`),

  createDriver: (data: CreateDriverRequest) => apiService.post<Driver>('/drivers', data),

  updateDriver: (id: string, data: UpdateDriverRequest) =>
    apiService.put<Driver>(`/drivers/${id}`, data),

  deleteDriver: (id: string) =>
    apiService.delete<{ success: boolean; message: string }>(`/drivers/${id}`),
};

import { apiService } from './api';
import type { Broker, CreateBrokerRequest, UpdateBrokerRequest, GSTLookupResponse } from '../types/entities';

export const brokersAPI = {
  // Get all brokers
  getAllBrokers: (includeInactive: boolean = false, type?: string) => {
    let url = '/brokers/getAllBrokers';
    const params = new URLSearchParams();
    if (includeInactive) params.append('include_inactive', 'true');
    if (type) params.append('type', type);
    if (params.toString()) url += `?${params.toString()}`;
    return apiService.get<Broker[]>(url);
  },

  // Get broker by ID
  getBrokerById: (id: string) => {
    return apiService.get<Broker>(`/brokers/getBrokerById/${id}`);
  },

  // Create broker
  createBroker: (data: CreateBrokerRequest) => {
    return apiService.post<Broker>('/brokers/createBroker', data);
  },

  // Update broker
  updateBroker: (id: string, data: UpdateBrokerRequest) => {
    return apiService.post<Broker>(`/brokers/updateBroker/${id}`, data);
  },

  // Delete broker
  deleteBroker: (id: string) => {
    return apiService.post<{ success: boolean; message: string }>(`/brokers/deleteBroker/${id}`);
  },

  // Lookup GST
  lookupGST: (gstNumber: string) => {
    return apiService.get<GSTLookupResponse>(`/brokers/lookupGST?gst_number=${gstNumber}`);
  },

  // Lookup PAN
  lookupPAN: (panNumber: string) => {
    return apiService.get(`/brokers/lookupPAN?pan_number=${panNumber}`);
  },

  // Quick create from GST
  quickCreateFromGST: (data: any) => {
    return apiService.post<Broker>('/brokers/quickCreateFromGST', data);
  },

  // Quick create from PAN
  quickCreateFromPAN: (data: any) => {
    return apiService.post<Broker>('/brokers/quickCreateFromPAN', data);
  },
};


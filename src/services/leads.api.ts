import { apiService } from './api';
import type { 
  Lead, 
  CreateLeadRequest, 
  UpdateLeadRequest, 
  LeadFilters,
  LeadEvent,
  CreateLeadEventRequest,
  ConvertLeadToVendorRequest,
  ConvertLeadRequest,
  LeadAnalytics
} from '../types/entities';

export const leadsAPI = {
  getAllLeads: async (filters?: LeadFilters): Promise<Lead[]> => {
    let url = '/leads/getAllLeads';
    const params = new URLSearchParams();
    
    if (filters?.lead_status) params.append('lead_status', filters.lead_status);
    if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to);
    if (filters?.broker_id) params.append('broker_id', filters.broker_id);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.is_existing_customer !== undefined) {
      params.append('is_existing_customer', filters.is_existing_customer.toString());
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await apiService.get<Lead[]>(url);
    return response;
  },

  getLeadById: async (id: string): Promise<Lead> => {
    return apiService.get<Lead>(`/leads/getLeadById/${id}`);
  },

  createLead: async (data: CreateLeadRequest): Promise<Lead> => {
    return apiService.post<Lead>('/leads/createLead', data);
  },

  updateLead: async (id: string, data: UpdateLeadRequest): Promise<Lead> => {
    return apiService.post<Lead>(`/leads/updateLead/${id}`, data);
  },

  deleteLead: async (id: string): Promise<void> => {
    return apiService.post<void>(`/leads/deleteLead/${id}`, {});
  },

  getLeadEvents: async (id: string): Promise<LeadEvent[]> => {
    const response = await apiService.get<LeadEvent[]>(`/leads/getLeadEvents/${id}`);
    return response;
  },

  addLeadEvent: async (data: CreateLeadEventRequest): Promise<LeadEvent> => {
    return apiService.post<LeadEvent>('/leads/addLeadEvent', data);
  },

  convertLeadToVendor: async (data: ConvertLeadToVendorRequest): Promise<any> => {
    return apiService.post<any>('/leads/convertLeadToVendor', data);
  },

  convertLead: async (data: ConvertLeadRequest): Promise<any> => {
    return apiService.post<any>('/leads/convertLead', data);
  },

  getLeadAnalytics: async (): Promise<LeadAnalytics> => {
    return apiService.get<LeadAnalytics>('/leads/getLeadAnalytics');
  },
};

import { apiService } from './api';
import type {
  QualityParameter,
  CreateQualityParameterRequest,
  UpdateQualityParameterRequest,
} from '../types/entities';

export type ListQualityParametersFilters = {
  batch_id?: string;
  product_id?: string;
  inward_slip_pass_id?: string;
};

function buildQuery(filters?: ListQualityParametersFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.batch_id) params.set('batch_id', filters.batch_id);
  if (filters.product_id) params.set('product_id', filters.product_id);
  if (filters.inward_slip_pass_id) params.set('inward_slip_pass_id', filters.inward_slip_pass_id);
  const q = params.toString();
  return q ? `?${q}` : '';
}

export const parametersAPI = {
  list: (filters?: ListQualityParametersFilters) => {
    return apiService.get<QualityParameter[]>(`/parameters${buildQuery(filters)}`);
  },

  getById: (id: string) => {
    return apiService.get<QualityParameter>(`/parameters/${id}`);
  },

  create: (data: CreateQualityParameterRequest) => {
    return apiService.post<QualityParameter>('/parameters', data);
  },

  update: (id: string, data: UpdateQualityParameterRequest) => {
    return apiService.put<QualityParameter>(`/parameters/${id}`, data);
  },

  delete: (id: string) => {
    return apiService.delete(`/parameters/${id}`);
  },
};

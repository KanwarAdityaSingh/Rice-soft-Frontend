import { apiService } from './api';
import type { Batch, BatchWithDetails, CreateBatchRequest, UpdateBatchRequest, BatchLotUsage, BatchRiceCodeUsage } from '../types/entities';

export const batchesAPI = {
  // Get all batches
  getAllBatches: () => {
    return apiService.get<Batch[]>('/batches');
  },

  // Get batch by ID with details
  getBatchById: (id: string) => {
    return apiService.get<BatchWithDetails>(`/batches/${id}`);
  },

  // Create batch
  createBatch: (data: CreateBatchRequest) => {
    return apiService.post<Batch>('/batches', data);
  },

  // Update batch
  updateBatch: (id: string, data: UpdateBatchRequest) => {
    return apiService.put<Batch>(`/batches/${id}`, data);
  },

  // Get lot-level usage for batch
  getBatchLotUsage: (id: string) => {
    return apiService.get<BatchLotUsage[]>(`/batches/${id}/lot-usage`);
  },

  // Get rice code-level usage for batch
  getBatchRiceCodeUsage: (id: string) => {
    return apiService.get<BatchRiceCodeUsage[]>(`/batches/${id}/rice-code-usage`);
  },

  // Delete batch
  deleteBatch: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/batches/${id}`);
  },
};


import { apiService } from './api';
import type { Batch, BatchWithDetails, CreateBatchRequest, UpdateBatchRequest, BatchLotUsage, BatchRiceCodeUsage, BatchProduct, BatchPackaging } from '../types/entities';

export const batchesAPI = {
  // Get all batches
  getAllBatches: (godown_id?: string) => {
    const q = godown_id ? `?godown_id=${encodeURIComponent(godown_id)}` : '';
    return apiService.get<Batch[]>(`/batches${q}`);
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

  // Batch Products (Stage 2)
  addProductToBatch: (batchId: string, data: { product_id: string }) => {
    return apiService.post<Batch>(`/batches/${batchId}/products`, data);
  },

  getBatchProducts: (batchId: string) => {
    return apiService.get<BatchProduct[]>(`/batches/${batchId}/products`);
  },

  removeProductFromBatch: (batchId: string, productId: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/batches/${batchId}/products/${productId}`);
  },

  // Batch Packaging (Stage 3)
  addPackagingToBatch: (batchId: string, data: { product_id: string; packaging_id: string; quantity: number }) => {
    return apiService.post<{ success: boolean; message: string }>(`/batches/${batchId}/packaging`, data);
  },

  getBatchPackaging: (batchId: string, productId?: string) => {
    let url = `/batches/${batchId}/packaging`;
    if (productId) {
      url += `?product_id=${productId}`;
    }
    return apiService.get<BatchPackaging[]>(url);
  },

  removePackagingFromBatch: (batchId: string, packagingId: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/batches/${batchId}/packaging/${packagingId}`);
  },
};


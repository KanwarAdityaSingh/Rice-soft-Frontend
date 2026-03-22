import { apiService } from './api';
import type {
  Product,
  CreateProductRequest,
  UpdateProductRequest,
  ProductRate,
  SetProductRatesRequest,
  ProductRateHistoryResponse,
  ProductRateHistoryQueryParams,
} from '../types/entities';

export const productsAPI = {
  // Get all products
  getAllProducts: () => {
    return apiService.get<Product[]>('/products');
  },

  // Get product by ID (includes linked recipes)
  getProductById: (id: string) => {
    return apiService.get<Product>(`/products/${id}`);
  },

  // Create product
  createProduct: (data: CreateProductRequest) => {
    return apiService.post<Product>('/products', data);
  },

  // Update product
  updateProduct: (id: string, data: UpdateProductRequest) => {
    return apiService.put<Product>(`/products/${id}`, data);
  },

  // Delete product
  deleteProduct: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/products/${id}`);
  },

  // Get brands
  getBrands: () => {
    return apiService.get<Array<{ value: string; label: string }>>('/products/brands');
  },

  /** GET /products/:id/rates — list rates for a product */
  getProductRates: (productId: string) => {
    return apiService.get<ProductRate[]>(`/products/${productId}/rates`);
  },

  /** PUT /products/:id/rates — upsert rates by (product_id, holding_capacity) */
  setProductRates: (productId: string, data: SetProductRatesRequest) => {
    return apiService.put<ProductRate[]>(`/products/${productId}/rates`, data);
  },

  /** GET /products/:id/rates/history — chronological rate changes (optional filters). */
  getProductRateHistory: (productId: string, params?: ProductRateHistoryQueryParams) => {
    const sp = new URLSearchParams();
    if (params?.holding_capacity != null) sp.set('holding_capacity', String(params.holding_capacity));
    if (params?.from) sp.set('from', params.from);
    if (params?.to) sp.set('to', params.to);
    if (params?.limit != null) sp.set('limit', String(params.limit));
    if (params?.offset != null) sp.set('offset', String(params.offset));
    const qs = sp.toString();
    return apiService.get<ProductRateHistoryResponse>(
      `/products/${productId}/rates/history${qs ? `?${qs}` : ''}`
    );
  },

  /** GET /suggested-rate?product_id=...&packaging_id=... — rate for product + packaging (holding_capacity) */
  getSuggestedRate: (productId: string, packagingId: string) => {
    const params = new URLSearchParams({ product_id: productId, packaging_id: packagingId });
    return apiService.get<{ rate: number }>(`/suggested-rate?${params.toString()}`);
  },
};


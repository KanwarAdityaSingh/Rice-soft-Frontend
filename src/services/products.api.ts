import { apiService } from './api';
import type { Product, CreateProductRequest, UpdateProductRequest, LinkRecipeToProductRequest } from '../types/entities';

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

  // Link recipe to product
  linkRecipe: (productId: string, data: LinkRecipeToProductRequest) => {
    return apiService.post<{ success: boolean; message: string }>(`/products/${productId}/recipes`, data);
  },

  // Unlink recipe from product
  unlinkRecipe: (productId: string, recipeId: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/products/${productId}/recipes/${recipeId}`);
  },

  // Get brands
  getBrands: () => {
    return apiService.get<Array<{ value: string; label: string }>>('/products/brands');
  },
};


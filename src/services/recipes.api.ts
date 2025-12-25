import { apiService } from './api';
import type { Recipe, CreateRecipeRequest, UpdateRecipeRequest } from '../types/entities';

export const recipesAPI = {
  // Get all recipes
  getAllRecipes: () => {
    return apiService.get<Recipe[]>('/recipes');
  },

  // Get recipe by ID
  getRecipeById: (id: string) => {
    return apiService.get<Recipe>(`/recipes/${id}`);
  },

  // Create recipe
  createRecipe: (data: CreateRecipeRequest) => {
    return apiService.post<Recipe>('/recipes', data);
  },

  // Update recipe
  updateRecipe: (id: string, data: UpdateRecipeRequest) => {
    return apiService.put<Recipe>(`/recipes/${id}`, data);
  },

  // Delete recipe
  deleteRecipe: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/recipes/${id}`);
  },
};


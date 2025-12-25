import { useState, useEffect } from 'react';
import { recipesAPI } from '../services/recipes.api';
import type { Recipe, CreateRecipeRequest, UpdateRecipeRequest } from '../types/entities';

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecipes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await recipesAPI.getAllRecipes();
      setRecipes(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  const createRecipe = async (data: CreateRecipeRequest) => {
    try {
      const newRecipe = await recipesAPI.createRecipe(data);
      await fetchRecipes();
      return newRecipe;
    } catch (err: any) {
      throw err;
    }
  };

  const updateRecipe = async (id: string, data: UpdateRecipeRequest) => {
    try {
      const updatedRecipe = await recipesAPI.updateRecipe(id, data);
      setRecipes(recipes.map((r) => (r.id === id ? updatedRecipe : r)));
      return updatedRecipe;
    } catch (err: any) {
      throw err;
    }
  };

  const deleteRecipe = async (id: string) => {
    try {
      await recipesAPI.deleteRecipe(id);
      setRecipes(recipes.filter((r) => r.id !== id));
    } catch (err: any) {
      throw err;
    }
  };

  return {
    recipes,
    loading,
    error,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    refetch: fetchRecipes,
  };
}


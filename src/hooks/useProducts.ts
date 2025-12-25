import { useState, useEffect } from 'react';
import { productsAPI } from '../services/products.api';
import type { Product, CreateProductRequest, UpdateProductRequest, LinkRecipeToProductRequest } from '../types/entities';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productsAPI.getAllProducts();
      setProducts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const createProduct = async (data: CreateProductRequest) => {
    try {
      const newProduct = await productsAPI.createProduct(data);
      await fetchProducts();
      return newProduct;
    } catch (err: any) {
      throw err;
    }
  };

  const updateProduct = async (id: string, data: UpdateProductRequest) => {
    try {
      const updatedProduct = await productsAPI.updateProduct(id, data);
      setProducts(products.map((p) => (p.id === id ? updatedProduct : p)));
      return updatedProduct;
    } catch (err: any) {
      throw err;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await productsAPI.deleteProduct(id);
      setProducts(products.filter((p) => p.id !== id));
    } catch (err: any) {
      throw err;
    }
  };

  const linkRecipe = async (productId: string, data: LinkRecipeToProductRequest) => {
    try {
      await productsAPI.linkRecipe(productId, data);
      await fetchProducts();
    } catch (err: any) {
      throw err;
    }
  };

  const unlinkRecipe = async (productId: string, recipeId: string) => {
    try {
      await productsAPI.unlinkRecipe(productId, recipeId);
      await fetchProducts();
    } catch (err: any) {
      throw err;
    }
  };

  return {
    products,
    loading,
    error,
    createProduct,
    updateProduct,
    deleteProduct,
    linkRecipe,
    unlinkRecipe,
    refetch: fetchProducts,
  };
}


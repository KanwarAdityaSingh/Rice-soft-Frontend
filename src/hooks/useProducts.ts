import { useState, useEffect, useRef } from 'react';
import { productsAPI } from '../services/products.api';
import type { Product, CreateProductRequest, UpdateProductRequest } from '../types/entities';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialFetchDone = useRef(false);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productsAPI.getAllProducts();
      // Sort by created_at descending (latest first)
      const sorted = [...data].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });
      setProducts(sorted);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;
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

  return {
    products,
    loading,
    error,
    createProduct,
    updateProduct,
    deleteProduct,
    refetch: fetchProducts,
  };
}


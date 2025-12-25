import { useState, useEffect } from 'react';
import { packagingAPI } from '../services/packaging.api';
import type { Packaging, CreatePackagingRequest, UpdatePackagingRequest, AddPacketsInventoryRequest } from '../types/entities';

export function usePackaging() {
  const [packaging, setPackaging] = useState<Packaging[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPackaging = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await packagingAPI.getAllPackaging();
      setPackaging(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackaging();
  }, []);

  const createPackaging = async (data: CreatePackagingRequest) => {
    try {
      const newPackaging = await packagingAPI.createPackaging(data);
      await fetchPackaging();
      return newPackaging;
    } catch (err: any) {
      throw err;
    }
  };

  const updatePackaging = async (id: string, data: UpdatePackagingRequest) => {
    try {
      const updatedPackaging = await packagingAPI.updatePackaging(id, data);
      setPackaging(packaging.map((p) => (p.id === id ? updatedPackaging : p)));
      return updatedPackaging;
    } catch (err: any) {
      throw err;
    }
  };

  const deletePackaging = async (id: string) => {
    try {
      await packagingAPI.deletePackaging(id);
      setPackaging(packaging.filter((p) => p.id !== id));
    } catch (err: any) {
      throw err;
    }
  };

  const addPacketsInventory = async (id: string, data: AddPacketsInventoryRequest) => {
    try {
      await packagingAPI.addPacketsInventory(id, data);
      await fetchPackaging();
    } catch (err: any) {
      throw err;
    }
  };

  return {
    packaging,
    loading,
    error,
    createPackaging,
    updatePackaging,
    deletePackaging,
    addPacketsInventory,
    refetch: fetchPackaging,
  };
}


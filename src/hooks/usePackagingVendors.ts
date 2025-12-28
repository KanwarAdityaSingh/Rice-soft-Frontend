import { useState, useEffect } from 'react';
import { packagingVendorsAPI } from '../services/packagingVendors.api';
import type { PackagingVendor, CreatePackagingVendorRequest, UpdatePackagingVendorRequest } from '../types/entities';

export function usePackagingVendors() {
  const [packagingVendors, setPackagingVendors] = useState<PackagingVendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPackagingVendors = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await packagingVendorsAPI.getAllPackagingVendors();
      // Sort by created_at descending (latest first)
      const sorted = [...data].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });
      setPackagingVendors(sorted);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackagingVendors();
  }, []);

  const createPackagingVendor = async (data: CreatePackagingVendorRequest) => {
    try {
      const newVendor = await packagingVendorsAPI.createPackagingVendor(data);
      await fetchPackagingVendors();
      return newVendor;
    } catch (err: any) {
      throw err;
    }
  };

  const updatePackagingVendor = async (id: string, data: UpdatePackagingVendorRequest) => {
    try {
      const updatedVendor = await packagingVendorsAPI.updatePackagingVendor(id, data);
      await fetchPackagingVendors();
      return updatedVendor;
    } catch (err: any) {
      throw err;
    }
  };

  const deletePackagingVendor = async (id: string) => {
    try {
      await packagingVendorsAPI.deletePackagingVendor(id);
      setPackagingVendors(packagingVendors.filter((v) => v.id !== id));
    } catch (err: any) {
      throw err;
    }
  };

  return {
    packagingVendors,
    loading,
    error,
    createPackagingVendor,
    updatePackagingVendor,
    deletePackagingVendor,
    refetch: fetchPackagingVendors,
  };
}


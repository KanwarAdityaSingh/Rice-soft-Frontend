import { useState, useEffect } from 'react';
import { vendorsAPI } from '../services/vendors.api';
import type { Vendor, CreateVendorRequest, UpdateVendorRequest } from '../types/entities';

export function useVendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Toast removed for now

  const fetchVendors = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await vendorsAPI.getAllVendors();
      setVendors(data);
    } catch (err: any) {
      setError(err.message);
      // showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const createVendor = async (data: CreateVendorRequest) => {
    try {
      const result = await vendorsAPI.createVendor(data);
      await fetchVendors();
      return result;
    } catch (err: any) {
      // showError(err.message || 'Failed to create vendor');
      throw err;
    }
  };

  const updateVendor = async (id: string, data: UpdateVendorRequest) => {
    try {
      const result = await vendorsAPI.updateVendor(id, data);
      await fetchVendors();
      return result;
    } catch (err: any) {
      throw err;
    }
  };

  const deleteVendor = async (id: string) => {
    try {
      await vendorsAPI.deleteVendor(id);
      setVendors(vendors.filter((v) => v.id !== id));
      // success('Vendor deleted successfully');
    } catch (err: any) {
      // showError(err.message || 'Failed to delete vendor');
      throw err;
    }
  };

  return {
    vendors,
    loading,
    error,
    createVendor,
    updateVendor,
    deleteVendor,
    refetch: fetchVendors,
  };
}


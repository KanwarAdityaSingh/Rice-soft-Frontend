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
      const newVendor = await vendorsAPI.createVendor(data);
      // Refetch all vendors to ensure we have the latest data from the server
      await fetchVendors();
      return newVendor;
    } catch (err: any) {
      // showError(err.message || 'Failed to create vendor');
      throw err;
    }
  };

  const updateVendor = async (id: string, data: UpdateVendorRequest) => {
    try {
      const updatedVendor = await vendorsAPI.updateVendor(id, data);
      setVendors(vendors.map((v) => (v.id === id ? updatedVendor : v)));
      // success('Vendor updated successfully');
      return updatedVendor;
    } catch (err: any) {
      // showError(err.message || 'Failed to update vendor');
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


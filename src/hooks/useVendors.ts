import { useState, useEffect, useCallback } from 'react';
import { vendorsAPI, type GetAllVendorsOptions } from '../services/vendors.api';
import type { Vendor, CreateVendorRequest, UpdateVendorRequest } from '../types/entities';

export type UseVendorsOptions = GetAllVendorsOptions;

export function useVendors(options: UseVendorsOptions = {}) {
  const {
    includeInactive = false,
    type,
    registrationType,
    isVerified,
    bankVerified,
  } = options;
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await vendorsAPI.getAllVendors({
        includeInactive,
        type,
        registrationType,
        isVerified,
        bankVerified,
      });
      setVendors(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [includeInactive, type, registrationType, isVerified, bankVerified]);

  useEffect(() => {
    void fetchVendors();
  }, [fetchVendors]);

  const createVendor = async (data: CreateVendorRequest) => {
    try {
      const result = await vendorsAPI.createVendor(data);
      await fetchVendors();
      return result;
    } catch (err: any) {
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
    } catch (err: any) {
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

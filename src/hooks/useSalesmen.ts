import { useState, useEffect } from 'react';
import { salesmenAPI } from '../services/salesmen.api';
import type { Salesman, CreateSalesmanRequest, UpdateSalesmanRequest } from '../types/entities';

export function useSalesmen() {
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Toast removed for now

  const fetchSalesmen = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await salesmenAPI.getAllSalesmen();
      setSalesmen(data);
    } catch (err: any) {
      setError(err.message);
      // showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesmen();
  }, []);

  const createSalesman = async (data: CreateSalesmanRequest) => {
    try {
      const newSalesman = await salesmenAPI.createSalesman(data);
      setSalesmen([...salesmen, newSalesman]);
      // success('Salesman created successfully');
      return newSalesman;
    } catch (err: any) {
      // showError(err.message || 'Failed to create salesman');
      throw err;
    }
  };

  const updateSalesman = async (id: string, data: UpdateSalesmanRequest) => {
    try {
      const updatedSalesman = await salesmenAPI.updateSalesman(id, data);
      setSalesmen(salesmen.map((s) => (s.id === id ? updatedSalesman : s)));
      // success('Salesman updated successfully');
      return updatedSalesman;
    } catch (err: any) {
      // showError(err.message || 'Failed to update salesman');
      throw err;
    }
  };

  const deleteSalesman = async (id: string) => {
    try {
      await salesmenAPI.deleteSalesman(id);
      setSalesmen(salesmen.filter((s) => s.id !== id));
      // success('Salesman deleted successfully');
    } catch (err: any) {
      // showError(err.message || 'Failed to delete salesman');
      throw err;
    }
  };

  return {
    salesmen,
    loading,
    error,
    createSalesman,
    updateSalesman,
    deleteSalesman,
    refetch: fetchSalesmen,
  };
}


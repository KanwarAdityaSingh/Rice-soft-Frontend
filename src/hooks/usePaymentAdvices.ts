import { useState, useEffect, useCallback } from 'react';
import { paymentAdvicesAPI } from '../services/paymentAdvices.api';
import type { 
  PaymentAdvice, 
  CreatePaymentAdviceRequest, 
  UpdatePaymentAdviceRequest,
  AddChargeRequest
} from '../types/entities';

export function usePaymentAdvices(
  sauda_id?: string, 
  inward_slip_pass_id?: string,
  status?: 'pending' | 'completed' | 'failed'
) {
  const [paymentAdvices, setPaymentAdvices] = useState<PaymentAdvice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentAdvices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await paymentAdvicesAPI.getAllPaymentAdvices(sauda_id, inward_slip_pass_id, status);
      setPaymentAdvices(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sauda_id, inward_slip_pass_id, status]);

  useEffect(() => {
    fetchPaymentAdvices();
  }, [fetchPaymentAdvices]);

  const createPaymentAdvice = async (data: CreatePaymentAdviceRequest) => {
    try {
      const newPaymentAdvice = await paymentAdvicesAPI.createPaymentAdvice(data);
      await fetchPaymentAdvices();
      return newPaymentAdvice;
    } catch (err: any) {
      throw err;
    }
  };

  const updatePaymentAdvice = async (id: string, data: UpdatePaymentAdviceRequest) => {
    try {
      const updatedPaymentAdvice = await paymentAdvicesAPI.updatePaymentAdvice(id, data);
      await fetchPaymentAdvices();
      return updatedPaymentAdvice;
    } catch (err: any) {
      throw err;
    }
  };

  const deletePaymentAdvice = async (id: string) => {
    try {
      await paymentAdvicesAPI.deletePaymentAdvice(id);
      setPaymentAdvices(paymentAdvices.filter((pa) => pa.id !== id));
    } catch (err: any) {
      throw err;
    }
  };

  const addCharge = async (id: string, charge: AddChargeRequest) => {
    try {
      const updatedPaymentAdvice = await paymentAdvicesAPI.addCharge(id, charge);
      await fetchPaymentAdvices();
      return updatedPaymentAdvice;
    } catch (err: any) {
      throw err;
    }
  };

  const removeCharge = async (id: string, chargeId: string) => {
    try {
      await paymentAdvicesAPI.removeCharge(id, chargeId);
      await fetchPaymentAdvices();
    } catch (err: any) {
      throw err;
    }
  };

  return {
    paymentAdvices,
    loading,
    error,
    createPaymentAdvice,
    updatePaymentAdvice,
    deletePaymentAdvice,
    addCharge,
    removeCharge,
    refetch: fetchPaymentAdvices,
  };
}


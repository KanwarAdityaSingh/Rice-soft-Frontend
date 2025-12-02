import * as Dialog from '@radix-ui/react-dialog';
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { usePaymentAdvices } from '../../../hooks/usePaymentAdvices';
import { paymentAdvicesAPI } from '../../../services/paymentAdvices.api';
import { useVendors } from '../../../hooks/useVendors';
import { usePurchases } from '../../../hooks/usePurchases';
import { AlertDialog } from '../../shared/AlertDialog';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import type { CreatePaymentAdviceRequest, UpdatePaymentAdviceRequest, PaymentAdvice, AddChargeRequest } from '../../../types/entities';

interface PaymentAdviceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentAdviceId?: string | null;
}

export function PaymentAdviceFormModal({ open, onOpenChange, paymentAdviceId }: PaymentAdviceFormModalProps) {
  const { createPaymentAdvice, updatePaymentAdvice, addCharge, removeCharge } = usePaymentAdvices();
  const { vendors } = useVendors();
  const { purchases } = usePurchases();
  const isEditMode = !!paymentAdviceId;
  const [formData, setFormData] = useState<CreatePaymentAdviceRequest>({
    purchase_id: null,
    payer_id: '',
    recipient_id: '',
    amount: 0,
    date_of_payment: new Date().toISOString().split('T')[0],
    status: 'pending',
    transaction_id: null,
    charges: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingPA, setLoadingPA] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [newCharge, setNewCharge] = useState<AddChargeRequest>({
    charge_name: '',
    charge_value: 0,
    charge_type: 'fixed',
  });

  useEffect(() => {
    if (open && paymentAdviceId && isEditMode) {
      loadPAData();
    } else if (open && !paymentAdviceId) {
      resetForm();
    }
  }, [open, paymentAdviceId]);

  const loadPAData = async () => {
    if (!paymentAdviceId) return;
    setLoadingPA(true);
    try {
      const pa = await paymentAdvicesAPI.getPaymentAdviceById(paymentAdviceId);
      setFormData({
        purchase_id: pa.purchase_id || null,
        payer_id: pa.payer_id,
        recipient_id: pa.recipient_id,
        amount: pa.amount,
        date_of_payment: pa.date_of_payment,
        status: pa.status,
        transaction_id: pa.transaction_id || null,
        charges: pa.charges.map(c => ({
          charge_name: c.charge_name,
          charge_value: c.charge_value,
          charge_type: c.charge_type,
        })),
      });
      setErrors({});
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to load payment advice data');
      setAlertOpen(true);
    } finally {
      setLoadingPA(false);
    }
  };

  const resetForm = () => {
    setFormData({
      purchase_id: null,
      payer_id: '',
      recipient_id: '',
      amount: 0,
      date_of_payment: new Date().toISOString().split('T')[0],
      status: 'pending',
      transaction_id: null,
      charges: [],
    });
    setErrors({});
    setNewCharge({
      charge_name: '',
      charge_value: 0,
      charge_type: 'fixed',
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.payer_id) {
      newErrors.payer_id = 'Payer is required';
    }
    if (!formData.recipient_id) {
      newErrors.recipient_id = 'Recipient is required';
    }
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    if (!formData.date_of_payment) {
      newErrors.date_of_payment = 'Date of payment is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isEditMode && paymentAdviceId) {
        await updatePaymentAdvice(paymentAdviceId, formData as UpdatePaymentAdviceRequest);
        setAlertType('success');
        setAlertTitle('Success');
        setAlertMessage('Payment advice updated successfully');
      } else {
        await createPaymentAdvice(formData);
        setAlertType('success');
        setAlertTitle('Success');
        setAlertMessage('Payment advice created successfully');
      }
      setAlertOpen(true);
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 1500);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to save payment advice');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCharge = () => {
    if (!newCharge.charge_name || newCharge.charge_value <= 0) return;
    setFormData({
      ...formData,
      charges: [...(formData.charges || []), newCharge],
    });
    setNewCharge({
      charge_name: '',
      charge_value: 0,
      charge_type: 'fixed',
    });
  };

  const handleRemoveCharge = (index: number) => {
    const updatedCharges = [...(formData.charges || [])];
    updatedCharges.splice(index, 1);
    setFormData({
      ...formData,
      charges: updatedCharges,
    });
  };

  const calculateNetPayable = () => {
    let net = formData.amount;
    (formData.charges || []).forEach(charge => {
      if (charge.charge_type === 'fixed') {
        net -= charge.charge_value;
      } else {
        net -= (formData.amount * charge.charge_value / 100);
      }
    });
    return Math.max(0, net);
  };

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-[90vw] md:w-full max-w-2xl translate-x-[-50%] translate-y-[-50%]">
            <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-xl sm:text-2xl font-semibold">
                  {isEditMode ? 'Edit Payment Advice' : 'Create Payment Advice'}
                </Dialog.Title>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {loadingPA ? (
                <div className="flex justify-center py-10">
                  <LoadingSpinner />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Purchase</label>
                      <select
                        value={formData.purchase_id || ''}
                        onChange={(e) => setFormData({ ...formData, purchase_id: e.target.value || null })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                      >
                        <option value="">Select Purchase (Optional)</option>
                        {purchases.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.invoice_number || p.id} - ₹{(p.total_amount ?? 0).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Payer <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.payer_id}
                        onChange={(e) => setFormData({ ...formData, payer_id: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors.payer_id ? 'border-red-500' : 'border-border'
                        }`}
                      >
                        <option value="">Select Payer</option>
                        {vendors.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.business_name}
                          </option>
                        ))}
                      </select>
                      {errors.payer_id && (
                        <p className="text-xs text-red-500 mt-1">{errors.payer_id}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Recipient <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.recipient_id}
                        onChange={(e) => setFormData({ ...formData, recipient_id: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors.recipient_id ? 'border-red-500' : 'border-border'
                        }`}
                      >
                        <option value="">Select Recipient</option>
                        {vendors.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.business_name}
                          </option>
                        ))}
                      </select>
                      {errors.recipient_id && (
                        <p className="text-xs text-red-500 mt-1">{errors.recipient_id}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Amount (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.amount || ''}
                        onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors.amount ? 'border-red-500' : 'border-border'
                        }`}
                        placeholder="0.00"
                      />
                      {errors.amount && (
                        <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Date of Payment <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.date_of_payment}
                        onChange={(e) => setFormData({ ...formData, date_of_payment: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors.date_of_payment ? 'border-red-500' : 'border-border'
                        }`}
                      />
                      {errors.date_of_payment && (
                        <p className="text-xs text-red-500 mt-1">{errors.date_of_payment}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                      >
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Transaction ID</label>
                      <input
                        type="text"
                        value={formData.transaction_id || ''}
                        onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value || null })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                        placeholder="TXN123456"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <h3 className="text-sm font-semibold mb-3">Charges</h3>
                    <div className="space-y-3">
                      {(formData.charges || []).map((charge, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                          <div className="flex-1">
                            <span className="text-sm font-medium">{charge.charge_name}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              {charge.charge_type === 'fixed' ? `₹${(charge.charge_value ?? 0).toFixed(2)}` : `${charge.charge_value ?? 0}%`}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveCharge(index)}
                            className="p-1 hover:bg-muted rounded"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCharge.charge_name}
                          onChange={(e) => setNewCharge({ ...newCharge, charge_name: e.target.value })}
                          className="flex-1 px-3 py-2 border border-border rounded-lg bg-background"
                          placeholder="Charge Name"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={newCharge.charge_value || ''}
                          onChange={(e) => setNewCharge({ ...newCharge, charge_value: parseFloat(e.target.value) || 0 })}
                          className="w-24 px-3 py-2 border border-border rounded-lg bg-background"
                          placeholder="Value"
                        />
                        <select
                          value={newCharge.charge_type}
                          onChange={(e) => setNewCharge({ ...newCharge, charge_type: e.target.value as 'fixed' | 'percentage' })}
                          className="px-3 py-2 border border-border rounded-lg bg-background"
                        >
                          <option value="fixed">Fixed</option>
                          <option value="percentage">%</option>
                        </select>
                        <button
                          type="button"
                          onClick={handleAddCharge}
                          className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {formData.amount > 0 && (
                    <div className="pt-4 border-t border-border">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Net Payable:</span>
                        <span className="text-lg font-bold text-primary">₹{calculateNetPayable().toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
      />
    </>
  );
}


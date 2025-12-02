import * as Dialog from '@radix-ui/react-dialog';
import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSaudas } from '../../../hooks/useSaudas';
import { saudasAPI } from '../../../services/saudas.api';
import { useVendors } from '../../../hooks/useVendors';
import { useBrokers } from '../../../hooks/useBrokers';
import { AlertDialog } from '../../shared/AlertDialog';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import type { CreateSaudaRequest, UpdateSaudaRequest, Sauda } from '../../../types/entities';

interface SaudaFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saudaId?: string | null;
}

export function SaudaFormModal({ open, onOpenChange, saudaId }: SaudaFormModalProps) {
  const navigate = useNavigate();
  const { createSauda, updateSauda } = useSaudas();
  const { vendors } = useVendors();
  const { brokers } = useBrokers();
  const isEditMode = !!saudaId;
  const [formData, setFormData] = useState<CreateSaudaRequest>({
    sauda_type: 'xgodown',
    rice_quality: '',
    rate: 0,
    purchaser_id: '',
    broker_id: null,
    broker_commission: null,
    cash_discount: null,
    quantity: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingSauda, setLoadingSauda] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    if (open && saudaId && isEditMode) {
      loadSaudaData();
    } else if (open && !saudaId) {
      resetForm();
    }
  }, [open, saudaId]);

  const loadSaudaData = async () => {
    if (!saudaId) return;
    setLoadingSauda(true);
    try {
      const sauda = await saudasAPI.getSaudaById(saudaId);
      setFormData({
        sauda_type: sauda.sauda_type,
        rice_quality: sauda.rice_quality,
        rate: sauda.rate,
        purchaser_id: sauda.purchaser_id,
        broker_id: sauda.broker_id || null,
        broker_commission: sauda.broker_commission || null,
        cash_discount: sauda.cash_discount || null,
        quantity: sauda.quantity || null,
      });
      setErrors({});
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to load sauda data');
      setAlertOpen(true);
    } finally {
      setLoadingSauda(false);
    }
  };

  const resetForm = () => {
    setFormData({
      sauda_type: 'xgodown',
      rice_quality: '',
      rate: 0,
      purchaser_id: '',
      broker_id: null,
      broker_commission: null,
      cash_discount: null,
      quantity: null,
    });
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.rice_quality.trim()) {
      newErrors.rice_quality = 'Rice quality is required';
    }
    if (!formData.rate || formData.rate <= 0) {
      newErrors.rate = 'Rate must be greater than 0';
    }
    if (!formData.purchaser_id) {
      newErrors.purchaser_id = 'Purchaser is required';
    }
    if (formData.broker_commission && (formData.broker_commission < 0 || formData.broker_commission > 100)) {
      newErrors.broker_commission = 'Broker commission must be between 0 and 100';
    }
    if (formData.cash_discount && formData.cash_discount < 0) {
      newErrors.cash_discount = 'Cash discount cannot be negative';
    }
    if (formData.quantity && formData.quantity < 0) {
      newErrors.quantity = 'Quantity cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isEditMode && saudaId) {
        await updateSauda(saudaId, formData as UpdateSaudaRequest);
        setAlertType('success');
        setAlertTitle('Success');
        setAlertMessage('Sauda updated successfully');
      } else {
        await createSauda(formData);
        setAlertType('success');
        setAlertTitle('Success');
        setAlertMessage('Sauda created successfully');
      }
      setAlertOpen(true);
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 1500);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to save sauda');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const purchaserVendors = vendors.filter(v => v.type === 'purchaser' || v.type === 'both');

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-[90vw] md:w-full max-w-2xl translate-x-[-50%] translate-y-[-50%]">
            <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-xl sm:text-2xl font-semibold">
                  {isEditMode ? 'Edit Sauda' : 'Create Sauda'}
                </Dialog.Title>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {loadingSauda ? (
                <div className="flex justify-center py-10">
                  <LoadingSpinner />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Sauda Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.sauda_type}
                        onChange={(e) => setFormData({ ...formData, sauda_type: e.target.value as 'xgodown' | 'for' })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                        disabled={isEditMode}
                      >
                        <option value="xgodown">X Godown</option>
                        <option value="for">FOR</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Rice Quality <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.rice_quality}
                        onChange={(e) => setFormData({ ...formData, rice_quality: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors.rice_quality ? 'border-red-500' : 'border-border'
                        }`}
                        placeholder="e.g., Premium Basmati"
                      />
                      {errors.rice_quality && (
                        <p className="text-xs text-red-500 mt-1">{errors.rice_quality}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Rate (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.rate || ''}
                        onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors.rate ? 'border-red-500' : 'border-border'
                        }`}
                        placeholder="0.00"
                      />
                      {errors.rate && (
                        <p className="text-xs text-red-500 mt-1">{errors.rate}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Purchaser <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.purchaser_id}
                        onChange={(e) => setFormData({ ...formData, purchaser_id: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors.purchaser_id ? 'border-red-500' : 'border-border'
                        }`}
                        disabled={isEditMode}
                      >
                        <option value="">Select Purchaser</option>
                        {purchaserVendors.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.business_name}
                          </option>
                        ))}
                      </select>
                      {errors.purchaser_id && (
                        <p className="text-xs text-red-500 mt-1">{errors.purchaser_id}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Broker</label>
                      <div className="flex gap-2">
                        <select
                          value={formData.broker_id || ''}
                          onChange={(e) => {
                            if (e.target.value === '__add_new__') {
                              navigate('/directory/brokers');
                              // Reset to empty after navigation
                              setTimeout(() => {
                                const select = e.target as HTMLSelectElement;
                                select.value = '';
                              }, 0);
                              return;
                            }
                            setFormData({ ...formData, broker_id: e.target.value || null });
                          }}
                          className="flex-1 px-3 py-2 border border-border rounded-lg bg-background"
                        >
                          <option value="">Select Broker</option>
                          {brokers.filter(b => b.is_active).map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.business_name}
                            </option>
                          ))}
                          <option value="__add_new__" className="text-primary font-medium">+ Add New Broker</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const basename = (import.meta as any).env?.BASE_URL ? (import.meta as any).env.BASE_URL.replace(/\/$/, '') : '/riceops';
                            const brokerUrl = `${window.location.origin}${basename}/directory/brokers`;
                            window.open(brokerUrl, '_blank');
                          }}
                          className="px-3 py-2 border border-border rounded-lg bg-background hover:bg-muted transition-colors flex items-center justify-center"
                          title="Add New Broker (Opens in new tab)"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Broker Commission (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.broker_commission || ''}
                        onChange={(e) => setFormData({ ...formData, broker_commission: parseFloat(e.target.value) || null })}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors.broker_commission ? 'border-red-500' : 'border-border'
                        }`}
                        placeholder="0.00"
                      />
                      {errors.broker_commission && (
                        <p className="text-xs text-red-500 mt-1">{errors.broker_commission}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Cash Discount (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.cash_discount || ''}
                        onChange={(e) => setFormData({ ...formData, cash_discount: parseFloat(e.target.value) || null })}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors.cash_discount ? 'border-red-500' : 'border-border'
                        }`}
                        placeholder="0.00"
                      />
                      {errors.cash_discount && (
                        <p className="text-xs text-red-500 mt-1">{errors.cash_discount}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Quantity</label>
                      <input
                        type="number"
                        value={formData.quantity || ''}
                        onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || null })}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors.quantity ? 'border-red-500' : 'border-border'
                        }`}
                        placeholder="0"
                      />
                      {errors.quantity && (
                        <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>
                      )}
                    </div>

                  </div>

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


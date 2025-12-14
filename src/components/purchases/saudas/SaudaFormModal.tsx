import * as Dialog from '@radix-ui/react-dialog';
import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSaudas } from '../../../hooks/useSaudas';
import { saudasAPI } from '../../../services/saudas.api';
import { useVendors } from '../../../hooks/useVendors';
import { useBrokers } from '../../../hooks/useBrokers';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { CustomSelect } from '../../shared/CustomSelect';
import { AlertDialog } from '../../shared/AlertDialog';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import type { CreateSaudaRequest, UpdateSaudaRequest, RiceCode, RiceType } from '../../../types/entities';

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
  const [riceCodes, setRiceCodes] = useState<RiceCode[]>([]);
  const [riceTypes, setRiceTypes] = useState<RiceType[]>([]);
  const [loadingRiceCodes, setLoadingRiceCodes] = useState(false);
  const [loadingRiceTypes, setLoadingRiceTypes] = useState(false);
  const [formData, setFormData] = useState<CreateSaudaRequest>({
    sauda_type: 'xgodown',
    rice_code_id: null,
    rice_type: null,
    rate: 0,
    purchaser_id: '',
    broker_id: null,
    broker_commission: null,
    cash_discount: null,
    quantity: null,
    estimated_delivery_time: null,
    cooked_rice_image_url: null,
    uncooked_rice_image_url: null,
    notes: null,
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

  useEffect(() => {
    const fetchRiceCodes = async () => {
      setLoadingRiceCodes(true);
      try {
        const data = await riceCodesAPI.getAllRiceCodes();
        setRiceCodes(data);
      } catch (error) {
        console.error('Failed to fetch rice codes:', error);
      } finally {
        setLoadingRiceCodes(false);
      }
    };
    if (open) {
      fetchRiceCodes();
    }
  }, [open]);

  useEffect(() => {
    const fetchRiceTypes = async () => {
      setLoadingRiceTypes(true);
      try {
        const data = await riceCodesAPI.getRiceTypes();
        setRiceTypes(data);
      } catch (error) {
        console.error('Failed to fetch rice types:', error);
      } finally {
        setLoadingRiceTypes(false);
      }
    };
    if (open) {
      fetchRiceTypes();
    }
  }, [open]);

  const loadSaudaData = async () => {
    if (!saudaId) return;
    setLoadingSauda(true);
    try {
      const sauda = await saudasAPI.getSaudaById(saudaId);
      setFormData({
        sauda_type: sauda.sauda_type,
        rice_code_id: sauda.rice_code_id || null,
        rice_type: sauda.rice_type || null,
        rate: sauda.rate,
        purchaser_id: sauda.purchaser_id,
        broker_id: sauda.broker_id || null,
        broker_commission: sauda.broker_commission || null,
        cash_discount: sauda.cash_discount || null,
        quantity: sauda.quantity || null,
        estimated_delivery_time: sauda.estimated_delivery_time || null,
        cooked_rice_image_url: sauda.cooked_rice_image_url || null,
        uncooked_rice_image_url: sauda.uncooked_rice_image_url || null,
        notes: sauda.notes || null,
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
      rice_code_id: null,
      rice_type: null,
      rate: 0,
      purchaser_id: '',
      broker_id: null,
      broker_commission: null,
      cash_discount: null,
      quantity: null,
      estimated_delivery_time: null,
      cooked_rice_image_url: null,
      uncooked_rice_image_url: null,
      notes: null,
    });
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.rice_type) {
      newErrors.rice_type = 'Rice type is required';
    }
    if (!formData.rate || formData.rate < 0) {
      newErrors.rate = 'Rate is required and must be 0 or greater';
    }
    if (!formData.purchaser_id) {
      newErrors.purchaser_id = 'Vendor is required';
    }

    // Optional fields with constraints
    if (formData.broker_commission != null && (formData.broker_commission < 0 || formData.broker_commission > 100)) {
      newErrors.broker_commission = 'Broker commission must be between 0 and 100';
    }
    if (formData.cash_discount != null && formData.cash_discount < 0) {
      newErrors.cash_discount = 'Cash discount cannot be negative';
    }
    if (formData.quantity != null && formData.quantity < 0) {
      newErrors.quantity = 'Quantity cannot be negative';
    }
    if (formData.estimated_delivery_time != null) {
      if (formData.estimated_delivery_time < 0) {
        newErrors.estimated_delivery_time = 'Estimated delivery time cannot be negative';
      }
      if (!Number.isInteger(formData.estimated_delivery_time)) {
        newErrors.estimated_delivery_time = 'Estimated delivery time must be a whole number';
      }
    }
    if (formData.notes != null && formData.notes.length > 1000) {
      newErrors.notes = 'Notes cannot exceed 1000 characters';
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
                        Rice Code
                      </label>
                      {loadingRiceCodes ? (
                        <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm flex items-center gap-2">
                          <LoadingSpinner size="sm" />
                          <span className="text-muted-foreground">Loading rice codes...</span>
                        </div>
                      ) : (
                        <CustomSelect
                          value={formData.rice_code_id || null}
                          onChange={(value) => setFormData({ ...formData, rice_code_id: value || null })}
                          options={riceCodes.map((riceCode) => ({
                            value: riceCode.rice_code_id,
                            label: riceCode.rice_code_name
                          }))}
                          placeholder="Select Rice Code"
                          allowClear={true}
                          clearLabel="None"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Rice Type <span className="text-red-500">*</span>
                      </label>
                      {loadingRiceTypes ? (
                        <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm flex items-center gap-2">
                          <LoadingSpinner size="sm" />
                          <span className="text-muted-foreground">Loading rice types...</span>
                        </div>
                      ) : (
                        <div className={errors.rice_type ? 'border border-red-500 rounded-lg' : ''}>
                          <CustomSelect
                            value={formData.rice_type || null}
                            onChange={(value) => setFormData({ ...formData, rice_type: value || null })}
                            options={riceTypes.map((riceType) => ({
                              value: riceType.value,
                              label: riceType.label
                            }))}
                            placeholder="Select Rice Type"
                            allowClear={false}
                          />
                        </div>
                      )}
                      {errors.rice_type && (
                        <p className="text-xs text-red-500 mt-1">{errors.rice_type}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Rate (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
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
                        Vendor <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.purchaser_id}
                        onChange={(e) => setFormData({ ...formData, purchaser_id: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors.purchaser_id ? 'border-red-500' : 'border-border'
                        }`}
                        disabled={isEditMode}
                      >
                        <option value="">Select Vendor</option>
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
                        min="0"
                        max="100"
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
                        min="0"
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
                        step="0.01"
                        min="0"
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

                    <div>
                      <label className="block text-sm font-medium mb-1">Estimated Delivery Time (days)</label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={formData.estimated_delivery_time || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({ 
                            ...formData, 
                            estimated_delivery_time: value === '' ? null : parseInt(value, 10) 
                          });
                        }}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors.estimated_delivery_time ? 'border-red-500' : 'border-border'
                        }`}
                        placeholder="0"
                      />
                      {errors.estimated_delivery_time && (
                        <p className="text-xs text-red-500 mt-1">{errors.estimated_delivery_time}</p>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium mb-1">Notes</label>
                      <textarea
                        value={formData.notes || ''}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors.notes ? 'border-red-500' : 'border-border'
                        }`}
                        placeholder="Additional notes (max 1000 characters)"
                        rows={3}
                        maxLength={1000}
                      />
                      <div className="flex justify-between items-center mt-1">
                        {errors.notes && (
                          <p className="text-xs text-red-500">{errors.notes}</p>
                        )}
                        <p className="text-xs text-muted-foreground ml-auto">
                          {(formData.notes || '').length}/1000
                        </p>
                      </div>
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


import * as Dialog from '@radix-ui/react-dialog';
import React, { useState, useEffect } from 'react';
import { X, Plus, RefreshCw } from 'lucide-react';
import { useSaudas } from '../../../hooks/useSaudas';
import { saudasAPI } from '../../../services/saudas.api';
import { useVendors } from '../../../hooks/useVendors';
import { useBrokers } from '../../../hooks/useBrokers';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { CustomSelect } from '../../shared/CustomSelect';
import { AlertDialog } from '../../shared/AlertDialog';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import type { CreateSaudaRequest, UpdateSaudaRequest, RiceCode, RiceType, CashDiscountType, BrokerCommissionType } from '../../../types/entities';

interface SaudaFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saudaId?: string | null;
}

export function SaudaFormModal({ open, onOpenChange, saudaId }: SaudaFormModalProps) {
  const { createSauda, updateSauda } = useSaudas();
  const { vendors, refetch: refetchVendors, loading: loadingVendors } = useVendors();
  const { brokers, refetch: refetchBrokers, loading: loadingBrokers } = useBrokers();
  const isEditMode = !!saudaId;
  const [riceCodes, setRiceCodes] = useState<RiceCode[]>([]);
  const [riceTypes, setRiceTypes] = useState<RiceType[]>([]);
  const [loadingRiceCodes, setLoadingRiceCodes] = useState(false);
  const [loadingRiceTypes, setLoadingRiceTypes] = useState(false);
  const [unit, setUnit] = useState<'kg' | 'quintal' | 'ton'>('kg');
  const [formData, setFormData] = useState<CreateSaudaRequest>({
    sauda_type: 'exgodown',
    rice_code_id: null,
    rice_type: null,
    rate: 0,
    purchaser_id: '',
    broker_id: null,
    broker_commission: null,
    broker_commission_type: 'percentage',
    cash_discount: null,
    cash_discount_type: 'rupees',
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
        broker_commission_type: sauda.broker_commission_type || 'percentage',
        cash_discount: sauda.cash_discount || null,
        cash_discount_type: sauda.cash_discount_type || 'rupees',
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
      sauda_type: 'exgodown',
      rice_code_id: null,
      rice_type: null,
      rate: 0,
      purchaser_id: '',
      broker_id: null,
      broker_commission: null,
      broker_commission_type: 'percentage',
      cash_discount: null,
      cash_discount_type: 'rupees',
      quantity: null,
      estimated_delivery_time: null,
      cooked_rice_image_url: null,
      uncooked_rice_image_url: null,
      notes: null,
    });
    setErrors({});
    setUnit('kg');
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
    if (formData.broker_commission != null) {
      if (formData.broker_commission < 0) {
        newErrors.broker_commission = 'Broker commission cannot be negative';
      } else if (formData.broker_commission_type === 'percentage' && formData.broker_commission > 100) {
        newErrors.broker_commission = 'Broker commission percentage must be between 0 and 100';
      }
    }
    if (formData.cash_discount != null) {
      if (formData.cash_discount < 0) {
        newErrors.cash_discount = 'Cash discount cannot be negative';
      } else if (formData.cash_discount_type === 'percentage' && formData.cash_discount > 100) {
        newErrors.cash_discount = 'Cash discount percentage must be between 0 and 100';
      }
    }
    if (formData.quantity != null && formData.quantity < 0) {
      newErrors.quantity = 'Quantity cannot be negative';
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
      const factor = (u: 'kg' | 'quintal' | 'ton') => (u === 'kg' ? 1 : u === 'quintal' ? 100 : 1000);
      const f = factor(unit);
      const payload: CreateSaudaRequest | UpdateSaudaRequest = {
        ...formData,
        rate: (formData.rate || 0) / f,
        quantity: formData.quantity != null ? (formData.quantity as number) * f : null,
      };
      if (isEditMode && saudaId) {
        await updateSauda(saudaId, payload as UpdateSaudaRequest);
        setAlertType('success');
        setAlertTitle('Success');
        setAlertMessage('Sauda updated successfully');
      } else {
        await createSauda(payload as CreateSaudaRequest);
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

  const sellerVendors = vendors.filter(v => v.type === 'seller' || v.type === 'both');

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
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Section: Basic Info */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Sauda Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.sauda_type}
                          onChange={(e) => setFormData({ ...formData, sauda_type: e.target.value as 'exgodown' | 'for' })}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                          disabled={isEditMode}
                        >
                          <option value="exgodown">Ex Godown</option>
                          <option value="for">FOR</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Rice Code</label>
                        {loadingRiceCodes ? (
                          <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm flex items-center gap-2">
                            <LoadingSpinner size="sm" />
                            <span className="text-muted-foreground">Loading...</span>
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
                            <span className="text-muted-foreground">Loading...</span>
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
                    </div>
                  </div>

                  {/* Section: Pricing & Quantity */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">
                      Pricing & Quantity
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Rate (₹ per {unit}) <span className="text-red-500">*</span>
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
                        <label className="block text-sm font-medium mb-1">Quantity</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.quantity || ''}
                            onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || null })}
                            className={`flex-1 px-3 py-2 border rounded-lg bg-background ${
                              errors.quantity ? 'border-red-500' : 'border-border'
                            }`}
                            placeholder="0"
                          />
                          <select
                            value={unit}
                            onChange={(e) => {
                              const newUnit = e.target.value as 'kg' | 'quintal' | 'ton';
                              const factor = (u: 'kg' | 'quintal' | 'ton') => (u === 'kg' ? 1 : u === 'quintal' ? 100 : 1000);
                              const currentFactor = factor(unit);
                              const nextFactor = factor(newUnit);
                              const rate = formData.rate || 0;
                              const quantity = formData.quantity;
                              const convertedRate = (rate / currentFactor) * nextFactor;
                              const convertedQty = quantity != null ? (quantity * currentFactor) / nextFactor : null;
                              setFormData({
                                ...formData,
                                rate: Number.isFinite(convertedRate) ? parseFloat(convertedRate.toFixed(4)) : 0,
                                quantity: convertedQty != null && Number.isFinite(convertedQty) ? parseFloat(convertedQty.toFixed(4)) : null,
                              });
                              setUnit(newUnit);
                            }}
                            className="w-28 px-2 py-2 border border-border rounded-lg bg-background text-sm"
                          >
                            <option value="kg">Kg</option>
                            <option value="quintal">Quintal</option>
                            <option value="ton">Ton</option>
                          </select>
                        </div>
                        {errors.quantity && (
                          <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Cash Discount</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={formData.cash_discount_type === 'percentage' ? 100 : undefined}
                            value={formData.cash_discount || ''}
                            onChange={(e) => setFormData({ ...formData, cash_discount: parseFloat(e.target.value) || null })}
                            className={`flex-1 px-3 py-2 border rounded-lg bg-background ${
                              errors.cash_discount ? 'border-red-500' : 'border-border'
                            }`}
                            placeholder="0.00"
                          />
                          <select
                            value={formData.cash_discount_type || 'rupees'}
                            onChange={(e) => setFormData({ ...formData, cash_discount_type: e.target.value as CashDiscountType })}
                            className="w-20 px-2 py-2 border border-border rounded-lg bg-background text-sm"
                          >
                            <option value="rupees">₹</option>
                            <option value="percentage">%</option>
                          </select>
                        </div>
                        {errors.cash_discount && (
                          <p className="text-xs text-red-500 mt-1">{errors.cash_discount}</p>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* Section: Parties */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">
                      Parties
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Vendor <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={formData.purchaser_id}
                            onChange={(e) => setFormData({ ...formData, purchaser_id: e.target.value })}
                            className={`flex-1 px-3 py-2 border rounded-lg bg-background ${
                              errors.purchaser_id ? 'border-red-500' : 'border-border'
                            }`}
                            disabled={isEditMode}
                          >
                            <option value="">Select Vendor</option>
                            {sellerVendors.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.business_name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => refetchVendors()}
                            disabled={loadingVendors}
                            className="px-2.5 py-2 border border-border rounded-lg bg-background hover:bg-muted transition-colors flex items-center justify-center disabled:opacity-50"
                            title="Refresh Vendors"
                          >
                            <RefreshCw className={`h-4 w-4 ${loadingVendors ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const basename = (import.meta as any).env?.BASE_URL ? (import.meta as any).env.BASE_URL.replace(/\/$/, '') : '/riceops';
                              const vendorUrl = `${window.location.origin}${basename}/directory/vendors`;
                              window.open(vendorUrl, '_blank');
                            }}
                            className="px-2.5 py-2 border border-border rounded-lg bg-background hover:bg-muted transition-colors flex items-center justify-center"
                            title="Add New Vendor (Opens in new tab)"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
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
                          </select>
                          <button
                            type="button"
                            onClick={() => refetchBrokers()}
                            disabled={loadingBrokers}
                            className="px-2.5 py-2 border border-border rounded-lg bg-background hover:bg-muted transition-colors flex items-center justify-center disabled:opacity-50"
                            title="Refresh Brokers"
                          >
                            <RefreshCw className={`h-4 w-4 ${loadingBrokers ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const basename = (import.meta as any).env?.BASE_URL ? (import.meta as any).env.BASE_URL.replace(/\/$/, '') : '/riceops';
                              const brokerUrl = `${window.location.origin}${basename}/directory/brokers`;
                              window.open(brokerUrl, '_blank');
                            }}
                            className="px-2.5 py-2 border border-border rounded-lg bg-background hover:bg-muted transition-colors flex items-center justify-center"
                            title="Add New Broker (Opens in new tab)"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Broker Commission</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={formData.broker_commission_type === 'percentage' ? 100 : undefined}
                            value={formData.broker_commission || ''}
                            onChange={(e) => setFormData({ ...formData, broker_commission: parseFloat(e.target.value) || null })}
                            className={`flex-1 px-3 py-2 border rounded-lg bg-background ${
                              errors.broker_commission ? 'border-red-500' : 'border-border'
                            }`}
                            placeholder="0.00"
                          />
                          <select
                            value={formData.broker_commission_type || 'percentage'}
                            onChange={(e) => setFormData({ ...formData, broker_commission_type: e.target.value as BrokerCommissionType })}
                            className="w-24 px-2 py-2 border border-border rounded-lg bg-background text-sm"
                          >
                            <option value="percentage">%</option>
                            <option value="rupees">₹</option>
                            <option value="weight">₹/Kg</option>
                          </select>
                        </div>
                        {errors.broker_commission && (
                          <p className="text-xs text-red-500 mt-1">{errors.broker_commission}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section: Notes */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">
                      Additional Information
                    </h3>
                    <div>
                      <label className="block text-sm font-medium mb-1">Notes</label>
                      <textarea
                        value={formData.notes || ''}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                        className={`w-full px-3 py-2 border rounded-lg bg-background resize-none ${
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

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-border">
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
                      className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : isEditMode ? 'Update Sauda' : 'Create Sauda'}
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


import * as Dialog from '@radix-ui/react-dialog';
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useLots } from '../../../hooks/useLots';
import { lotsAPI } from '../../../services/lots.api';
import { useSaudas } from '../../../hooks/useSaudas';
import { useVendors } from '../../../hooks/useVendors';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { getRiceTypeLabel } from '../../../utils/riceType';
import { CustomSelect } from '../../shared/CustomSelect';
import { AlertDialog } from '../../shared/AlertDialog';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { useGodowns } from '../../../hooks/useGodowns';
import type { CreateLotRequest, UpdateLotRequest, Lot, RiceCode, RiceType, Sauda } from '../../../types/entities';

interface LotFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lotId?: string | null;
}

export function LotFormModal({ open, onOpenChange, lotId }: LotFormModalProps) {
  const { createLot, updateLot } = useLots();
  const { saudas } = useSaudas();
  const { vendors } = useVendors();
  const { godowns } = useGodowns(false);
  const isEditMode = !!lotId;
  const [riceCodes, setRiceCodes] = useState<RiceCode[]>([]);
  const [riceTypes, setRiceTypes] = useState<RiceType[]>([]);
  const [loadingRiceCodes, setLoadingRiceCodes] = useState(false);
  const [loadingRiceTypes, setLoadingRiceTypes] = useState(false);

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
      fetchRiceCodes();
      fetchRiceTypes();
    }
  }, [open]);

  const getRiceCodeName = (riceCodeId: string | null | undefined): string => {
    if (!riceCodeId) return '';
    const riceCode = riceCodes.find((rc) => rc.rice_code_id === riceCodeId);
    return riceCode ? riceCode.rice_code_name : '';
  };

  const getPurchaserName = (purchaserId: string | null | undefined): string => {
    if (!purchaserId) return '';
    const purchaser = vendors.find((v) => v.id === purchaserId);
    return purchaser ? purchaser.business_name : '';
  };

  const getSaudaDisplayName = (sauda: Sauda): string => {
    const parts: string[] = [];
    
    const purchaserName = getPurchaserName(sauda.purchaser_id);
    if (purchaserName) parts.push(purchaserName);
    
    const riceCodeName = getRiceCodeName(sauda.rice_code_id);
    if (riceCodeName) parts.push(riceCodeName);
    
    const riceTypeLabel = getRiceTypeLabel(sauda.rice_type, riceTypes);
    if (riceTypeLabel) parts.push(riceTypeLabel);
    
    return parts.join(' - ') || 'Sauda';
  };

  const [formData, setFormData] = useState<CreateLotRequest>({
    godown_id: '',
    sauda_id: '',
    lot_number: '',
    rice_code_id: null,
    rice_type: null,
    no_of_bags: 0,
    bill_weight: 0,
    received_weight: 0,
    rate: 0,
    bag_weight: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingLot, setLoadingLot] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    if (open && lotId && isEditMode) {
      loadLotData();
    } else if (open && !lotId) {
      resetForm();
    }
  }, [open, lotId]);

  const loadLotData = async () => {
    if (!lotId) return;
    setLoadingLot(true);
    try {
      const lot = await lotsAPI.getLotById(lotId);
      setFormData({
        godown_id: lot.godown_id ?? '',
        sauda_id: lot.sauda_id,
        lot_number: lot.lot_number,
        rice_code_id: lot.rice_code_id || null,
        rice_type: lot.rice_type || null,
        no_of_bags: lot.no_of_bags,
        bill_weight: lot.bill_weight,
        received_weight: lot.received_weight,
        rate: lot.rate,
        bag_weight: lot.bag_weight || null,
      });
      setErrors({});
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to load lot data');
      setAlertOpen(true);
    } finally {
      setLoadingLot(false);
    }
  };

  const resetForm = () => {
    setFormData({
      godown_id: '',
      sauda_id: '',
      lot_number: '',
      rice_code_id: null,
      rice_type: null,
      no_of_bags: 0,
      bill_weight: 0,
      received_weight: 0,
      rate: 0,
      bag_weight: null,
    });
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!isEditMode && (!formData.godown_id || !formData.godown_id.trim())) {
      newErrors.godown_id = 'Godown is required';
    }
    if (!formData.sauda_id) {
      newErrors.sauda_id = 'Sauda is required';
    }
    if (!formData.lot_number.trim()) {
      newErrors.lot_number = 'Lot number is required';
    }
    if (!formData.no_of_bags || formData.no_of_bags <= 0) {
      newErrors.no_of_bags = 'Number of bags must be greater than 0';
    }
    if (!formData.bill_weight || formData.bill_weight <= 0) {
      newErrors.bill_weight = 'Bill weight must be greater than 0';
    }
    if (!formData.received_weight || formData.received_weight <= 0) {
      newErrors.received_weight = 'Received weight must be greater than 0';
    }
    if (!formData.rate || formData.rate <= 0) {
      newErrors.rate = 'Rate must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isEditMode && lotId) {
        const { godown_id: _g, ...updatePayload } = formData;
        void _g;
        await updateLot(lotId, updatePayload as UpdateLotRequest);
        setAlertType('success');
        setAlertTitle('Success');
        setAlertMessage('Lot updated successfully');
      } else {
        await createLot(formData);
        setAlertType('success');
        setAlertTitle('Success');
        setAlertMessage('Lot created successfully');
      }
      setAlertOpen(true);
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 1500);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to save lot');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const calculatedAmount = formData.received_weight * formData.rate;

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-[90vw] md:w-full max-w-2xl translate-x-[-50%] translate-y-[-50%]">
            <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-xl sm:text-2xl font-semibold">
                  {isEditMode ? 'Edit Lot' : 'Create Lot'}
                </Dialog.Title>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {loadingLot ? (
                <div className="flex justify-center py-10">
                  <LoadingSpinner />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isEditMode && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Godown <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.godown_id}
                        onChange={(e) => setFormData({ ...formData, godown_id: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors.godown_id ? 'border-red-500' : 'border-border'
                        }`}
                      >
                        <option value="">Select godown</option>
                        {godowns
                          .filter((g) => g.is_active)
                          .map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                      </select>
                      {errors.godown_id && <p className="text-xs text-red-600 mt-1">{errors.godown_id}</p>}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Sauda <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.sauda_id}
                        onChange={(e) => setFormData({ ...formData, sauda_id: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors.sauda_id ? 'border-red-500' : 'border-border'
                        }`}
                        disabled={isEditMode}
                      >
                        <option value="">Select Sauda</option>
                        {saudas.map((s) => (
                          <option key={s.id} value={s.id}>
                            {getSaudaDisplayName(s)} - ₹{s.rate}
                          </option>
                        ))}
                      </select>
                      {errors.sauda_id && (
                        <p className="text-xs text-red-500 mt-1">{errors.sauda_id}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Lot Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.lot_number}
                        onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors.lot_number ? 'border-red-500' : 'border-border'
                        }`}
                        placeholder="LOT-001"
                      />
                      {errors.lot_number && (
                        <p className="text-xs text-red-500 mt-1">{errors.lot_number}</p>
                      )}
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
                        Rice Type
                      </label>
                      {loadingRiceTypes ? (
                        <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm flex items-center gap-2">
                          <LoadingSpinner size="sm" />
                          <span className="text-muted-foreground">Loading rice types...</span>
                        </div>
                      ) : (
                        <CustomSelect
                          value={formData.rice_type || null}
                          onChange={(value) => setFormData({ ...formData, rice_type: value || null })}
                          options={riceTypes.map((riceType) => ({
                            value: riceType.value,
                            label: riceType.label
                          }))}
                          placeholder="Select Rice Type"
                          allowClear={true}
                          clearLabel="None"
                      />
                      )}
                      {errors.rice_type && (
                        <p className="text-xs text-red-500 mt-1">{errors.rice_type}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Number of Bags <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.no_of_bags || ''}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (value < 0) {
                            setErrors({ ...errors, no_of_bags: 'Negative values not allowed' });
                            setFormData({ ...formData, no_of_bags: 0 });
                          } else {
                            setFormData({ ...formData, no_of_bags: (value >= 0 && !isNaN(value)) ? value : 0 });
                            if (errors.no_of_bags === 'Negative values not allowed') {
                              setErrors({ ...errors, no_of_bags: '' });
                            }
                          }
                        }}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors.no_of_bags ? 'border-red-500' : 'border-border'
                        }`}
                        placeholder="0"
                      />
                      {errors.no_of_bags && (
                        <p className="text-xs text-red-500 mt-1">{errors.no_of_bags}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Bag Weight (kg)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.bag_weight || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (isNaN(value) || value === 0) {
                            setFormData({ ...formData, bag_weight: null });
                            setErrors({ ...errors, bag_weight: '' });
                          } else if (value < 0) {
                            setErrors({ ...errors, bag_weight: 'Negative values not allowed' });
                            setFormData({ ...formData, bag_weight: null });
                          } else {
                            setFormData({ ...formData, bag_weight: value });
                            setErrors({ ...errors, bag_weight: '' });
                          }
                        }}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors.bag_weight ? 'border-red-500' : 'border-border'
                        }`}
                        placeholder="50.00"
                      />
                      {errors.bag_weight && (
                        <p className="text-xs text-red-500 mt-1">{errors.bag_weight}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Bill Weight (kg) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.bill_weight || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (value < 0) {
                            setErrors({ ...errors, bill_weight: 'Negative values not allowed' });
                            setFormData({ ...formData, bill_weight: 0 });
                          } else {
                            setFormData({ ...formData, bill_weight: (value >= 0 && !isNaN(value)) ? value : 0 });
                            if (errors.bill_weight === 'Negative values not allowed') {
                              setErrors({ ...errors, bill_weight: '' });
                            }
                          }
                        }}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors.bill_weight ? 'border-red-500' : 'border-border'
                        }`}
                        placeholder="0.00"
                      />
                      {errors.bill_weight && (
                        <p className="text-xs text-red-500 mt-1">{errors.bill_weight}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Received Weight (kg) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.received_weight || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (value < 0) {
                            setErrors({ ...errors, received_weight: 'Negative values not allowed' });
                            setFormData({ ...formData, received_weight: 0 });
                          } else {
                            setFormData({ ...formData, received_weight: (value >= 0 && !isNaN(value)) ? value : 0 });
                            if (errors.received_weight === 'Negative values not allowed') {
                              setErrors({ ...errors, received_weight: '' });
                            }
                          }
                        }}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors.received_weight ? 'border-red-500' : 'border-border'
                        }`}
                        placeholder="0.00"
                      />
                      {errors.received_weight && (
                        <p className="text-xs text-red-500 mt-1">{errors.received_weight}</p>
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
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (value < 0) {
                            setErrors({ ...errors, rate: 'Negative values not allowed' });
                            setFormData({ ...formData, rate: 0 });
                          } else {
                            setFormData({ ...formData, rate: (value >= 0 && !isNaN(value)) ? value : 0 });
                            if (errors.rate === 'Negative values not allowed') {
                              setErrors({ ...errors, rate: '' });
                            }
                          }
                        }}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors.rate ? 'border-red-500' : 'border-border'
                        }`}
                        placeholder="0.00"
                      />
                      {errors.rate && (
                        <p className="text-xs text-red-500 mt-1">{errors.rate}</p>
                      )}
                    </div>

                    {calculatedAmount > 0 && (
                      <div className="sm:col-span-2 p-3 bg-muted/50 rounded-lg">
                        <label className="block text-sm font-medium mb-1">Calculated Amount</label>
                        <p className="text-lg font-semibold">₹{calculatedAmount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formData.received_weight} kg × ₹{(formData.rate ?? 0).toFixed(2)}
                        </p>
                      </div>
                    )}
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


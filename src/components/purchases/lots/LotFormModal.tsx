import * as Dialog from '@radix-ui/react-dialog';
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useLots } from '../../../hooks/useLots';
import { lotsAPI } from '../../../services/lots.api';
import { useSaudas } from '../../../hooks/useSaudas';
import { AlertDialog } from '../../shared/AlertDialog';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import type { CreateLotRequest, UpdateLotRequest, Lot } from '../../../types/entities';

interface LotFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lotId?: string | null;
}

export function LotFormModal({ open, onOpenChange, lotId }: LotFormModalProps) {
  const { createLot, updateLot } = useLots();
  const { saudas } = useSaudas();
  const isEditMode = !!lotId;
  const [formData, setFormData] = useState<CreateLotRequest>({
    sauda_id: '',
    lot_number: '',
    item_name: '',
    no_of_bags: 0,
    bill_weight: 0,
    received_weight: 0,
    rate: 0,
    bag_weight: null,
    bardana: null,
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
        sauda_id: lot.sauda_id,
        lot_number: lot.lot_number,
        item_name: lot.item_name,
        no_of_bags: lot.no_of_bags,
        bill_weight: lot.bill_weight,
        received_weight: lot.received_weight,
        rate: lot.rate,
        bag_weight: lot.bag_weight || null,
        bardana: lot.bardana || null,
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
      sauda_id: '',
      lot_number: '',
      item_name: '',
      no_of_bags: 0,
      bill_weight: 0,
      received_weight: 0,
      rate: 0,
      bag_weight: null,
      bardana: null,
    });
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.sauda_id) {
      newErrors.sauda_id = 'Sauda is required';
    }
    if (!formData.lot_number.trim()) {
      newErrors.lot_number = 'Lot number is required';
    }
    if (!formData.item_name.trim()) {
      newErrors.item_name = 'Item name is required';
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
        await updateLot(lotId, formData as UpdateLotRequest);
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
                        {saudas.filter(s => s.status === 'active').map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.rice_quality} - ₹{s.rate}
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

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium mb-1">
                        Item Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.item_name}
                        onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors.item_name ? 'border-red-500' : 'border-border'
                        }`}
                        placeholder="Premium Basmati Rice"
                      />
                      {errors.item_name && (
                        <p className="text-xs text-red-500 mt-1">{errors.item_name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Number of Bags <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.no_of_bags || ''}
                        onChange={(e) => setFormData({ ...formData, no_of_bags: parseInt(e.target.value) || 0 })}
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
                        value={formData.bag_weight || ''}
                        onChange={(e) => setFormData({ ...formData, bag_weight: parseFloat(e.target.value) || null })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                        placeholder="50.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Bill Weight (kg) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.bill_weight || ''}
                        onChange={(e) => setFormData({ ...formData, bill_weight: parseFloat(e.target.value) || 0 })}
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
                        value={formData.received_weight || ''}
                        onChange={(e) => setFormData({ ...formData, received_weight: parseFloat(e.target.value) || 0 })}
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
                      <label className="block text-sm font-medium mb-1">Bardana</label>
                      <input
                        type="text"
                        value={formData.bardana || ''}
                        onChange={(e) => setFormData({ ...formData, bardana: e.target.value || null })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                        placeholder="Standard"
                      />
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


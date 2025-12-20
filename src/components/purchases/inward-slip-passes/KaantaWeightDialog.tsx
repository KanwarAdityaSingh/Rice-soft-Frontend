import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X, Scale } from 'lucide-react';
import { inwardSlipPassesAPI } from '../../../services/inwardSlipPasses.api';
import { AlertDialog } from '../../shared/AlertDialog';
import type { InwardSlipPass } from '../../../types/entities';

interface KaantaWeightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isp: InwardSlipPass | null;
  onSuccess?: () => void;
}

export function KaantaWeightDialog({ open, onOpenChange, isp, onSuccess }: KaantaWeightDialogProps) {
  const [fullTruckWeight, setFullTruckWeight] = useState<string>('');
  const [emptyTruckWeight, setEmptyTruckWeight] = useState<string>('');
  const [kaantaWeight, setKaantaWeight] = useState<number>(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    if (open && isp) {
      // Pre-fill if values exist
      setFullTruckWeight(isp.full_truck_weight?.toString() || '');
      setEmptyTruckWeight(isp.empty_truck_weight?.toString() || '');
      setKaantaWeight(isp.kaanta_weight || 0);
      setErrors({});
    }
  }, [open, isp]);

  useEffect(() => {
    // Calculate kaanta weight whenever full or empty truck weight changes
    const full = parseFloat(fullTruckWeight) || 0;
    const empty = parseFloat(emptyTruckWeight) || 0;
    const calculated = full - empty;
    setKaantaWeight(calculated >= 0 ? calculated : 0);
  }, [fullTruckWeight, emptyTruckWeight]);

  const resetForm = () => {
    setFullTruckWeight('');
    setEmptyTruckWeight('');
    setKaantaWeight(0);
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const full = parseFloat(fullTruckWeight);
    const empty = parseFloat(emptyTruckWeight);

    if (!fullTruckWeight || isNaN(full) || full <= 0) {
      newErrors.fullTruckWeight = 'Full truck weight is required and must be greater than 0';
    }

    if (!emptyTruckWeight || isNaN(empty) || empty <= 0) {
      newErrors.emptyTruckWeight = 'Empty truck weight is required and must be greater than 0';
    }

    if (full > 0 && empty > 0 && empty >= full) {
      newErrors.emptyTruckWeight = 'Empty truck weight must be less than full truck weight';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !isp) return;

    setLoading(true);
    try {
      await inwardSlipPassesAPI.updateInwardSlipPass(isp.id, {
        full_truck_weight: parseFloat(fullTruckWeight),
        empty_truck_weight: parseFloat(emptyTruckWeight),
        kaanta_weight: kaantaWeight,
      });
      
      setAlertType('success');
      setAlertTitle('Success');
      setAlertMessage('Kaanta weight updated successfully');
      setAlertOpen(true);
      
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to update kaanta weight');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-[90vw] md:w-full max-w-md translate-x-[-50%] translate-y-[-50%]">
            <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <Scale className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <Dialog.Title className="text-xl sm:text-2xl font-semibold">
                      Add Kaanta Weight
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-muted-foreground mt-1">
                      {isp?.slip_number}
                    </Dialog.Description>
                  </div>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Full Truck Weight (kg) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={fullTruckWeight}
                    onChange={(e) => setFullTruckWeight(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg bg-background ${
                      errors.fullTruckWeight ? 'border-red-500' : 'border-border'
                    }`}
                    placeholder="0.00"
                  />
                  {errors.fullTruckWeight && (
                    <p className="text-xs text-red-500 mt-1">{errors.fullTruckWeight}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Empty Truck Weight (kg) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={emptyTruckWeight}
                    onChange={(e) => setEmptyTruckWeight(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg bg-background ${
                      errors.emptyTruckWeight ? 'border-red-500' : 'border-border'
                    }`}
                    placeholder="0.00"
                  />
                  {errors.emptyTruckWeight && (
                    <p className="text-xs text-red-500 mt-1">{errors.emptyTruckWeight}</p>
                  )}
                </div>

                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <label className="block text-sm font-medium mb-1 text-primary">
                    Kaanta Weight (kg)
                  </label>
                  <p className="text-2xl font-bold text-primary">
                    {kaantaWeight.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Calculated: Full Weight - Empty Weight
                  </p>
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
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
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


import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useSaudas } from '../../hooks/useSaudas';
import { useBrokers } from '../../hooks/useBrokers';
import { useRiceCodes } from '../../hooks/useRiceCodes';
import { useVendors } from '../../hooks/useVendors';
import { useTransporters } from '../../hooks/useTransporters';
import { saudasAPI } from '../../services/saudas.api';
import { CustomSelect } from '../shared/CustomSelect';
import { AlertDialog } from '../shared/AlertDialog';
import type { CreateSaudaRequest, UpdateSaudaRequest, SaudaType } from '../../types/entities';

interface SaudaFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saudaId?: string | null;
  preselectedVendorId?: string | null;
  preselectedTransporterId?: string | null;
  onSuccess?: (saudaId: string) => void;
}

export function SaudaFormModal({ open, onOpenChange, saudaId, preselectedVendorId, preselectedTransporterId, onSuccess }: SaudaFormModalProps) {
  const { createSauda, updateSauda } = useSaudas();
  const { brokers } = useBrokers();
  const { riceCodes } = useRiceCodes();
  const { vendors } = useVendors();
  const { transporters } = useTransporters();
  const [formData, setFormData] = useState<CreateSaudaRequest>({
    sauda_type: 'xgodown',
    rice_quality: '',
    rice_code_id: null,
    rate: 0,
    broker_id: null,
    broker_commission: 0,
    quantity: 0,
    transporter_id: preselectedTransporterId || null,
    transportation_cost: 0,
    cash_discount: 0,
    estimated_delivery_time: 0,
    purchaser_id: preselectedVendorId || '',
    cooked_rice_image_url: null,
    uncooked_rice_image_url: null,
    status: 'draft',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const isEditMode = !!saudaId;

  useEffect(() => {
    if (open && saudaId) {
      // Load sauda data when in edit mode
      const loadSaudaData = async () => {
        try {
          const sauda = await saudasAPI.getSaudaById(saudaId);
          setFormData({
            sauda_type: sauda.sauda_type,
            rice_quality: sauda.rice_quality,
            rice_code_id: sauda.rice_code_id || null,
            rate: sauda.rate,
            broker_id: sauda.broker_id || null,
            broker_commission: sauda.broker_commission || 0,
            quantity: sauda.quantity,
            transporter_id: sauda.transporter_id || preselectedTransporterId || null,
            transportation_cost: sauda.transportation_cost || 0,
            cash_discount: sauda.cash_discount || 0,
            estimated_delivery_time: sauda.estimated_delivery_time,
            purchaser_id: sauda.purchaser_id || preselectedVendorId || '',
            cooked_rice_image_url: sauda.cooked_rice_image_url || null,
            uncooked_rice_image_url: sauda.uncooked_rice_image_url || null,
            status: sauda.status,
          });
          setErrors({});
        } catch (error: any) {
          console.error('Failed to load sauda:', error);
          setErrors({ general: 'Failed to load sauda data' });
        }
      };
      loadSaudaData();
    } else if (open && !saudaId) {
      setFormData({
        sauda_type: 'xgodown',
        rice_quality: '',
        rice_code_id: null,
        rate: 0,
        broker_id: null,
        broker_commission: 0,
        quantity: 0,
        transporter_id: preselectedTransporterId || null,
        transportation_cost: 0,
        cash_discount: 0,
        estimated_delivery_time: 0,
        purchaser_id: preselectedVendorId || '',
        cooked_rice_image_url: null,
        uncooked_rice_image_url: null,
        status: 'draft',
      });
      setErrors({});
    }
  }, [open, saudaId, preselectedVendorId, preselectedTransporterId]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.rice_quality) newErrors.rice_quality = 'Rice quality required';
    if (!formData.rate || formData.rate <= 0) newErrors.rate = 'Valid rate required';
    if (!formData.quantity || formData.quantity <= 0) newErrors.quantity = 'Valid quantity required';
    if (!formData.purchaser_id) newErrors.purchaser_id = 'Purchaser required';
    if (!formData.estimated_delivery_time || formData.estimated_delivery_time <= 0) {
      newErrors.estimated_delivery_time = 'Valid delivery time required';
    }
    if (formData.sauda_type === 'xgodown') {
      if (!formData.transporter_id) newErrors.transporter_id = 'Transporter required for xgodown';
      if (!formData.transportation_cost || formData.transportation_cost <= 0) {
        newErrors.transportation_cost = 'Transportation cost required';
      }
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
        setAlertTitle('Sauda Updated');
        setAlertMessage('Sauda has been updated successfully.');
        setAlertOpen(true);
        onOpenChange(false);
      } else {
        const newSauda = await createSauda(formData);
        setAlertType('success');
        setAlertTitle('Sauda Created');
        setAlertMessage('Sauda has been created successfully.');
        setAlertOpen(true);
        onOpenChange(false);
        onSuccess?.(newSauda.id);
      }
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error?.message || 'An error occurred');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const isXgodown = formData.sauda_type === 'xgodown';

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-3xl translate-x-[-50%] translate-y-[-50%]">
            <div className="glass rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-xl font-semibold">
                  {isEditMode ? 'Update Sauda' : 'Create Sauda'}
                </Dialog.Title>
                <button
                  onClick={() => onOpenChange(false)}
                  className="rounded-lg p-1 hover:bg-muted/50 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Sauda Type *</label>
                  <CustomSelect
                    value={formData.sauda_type}
                    onChange={(value) => setFormData({ ...formData, sauda_type: (value || 'xgodown') as SaudaType })}
                    options={[
                      { value: 'xgodown', label: 'Ex-Godown (From Warehouse)' },
                      { value: 'for', label: 'Free on Rail/Road' },
                    ]}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Rice Quality *</label>
                  <input
                    type="text"
                    value={formData.rice_quality}
                    onChange={(e) => setFormData({ ...formData, rice_quality: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    placeholder="CHAPI WAND RAW PARMAL"
                  />
                  {errors.rice_quality && <p className="mt-1 text-xs text-red-600">{errors.rice_quality}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Rice Code (Optional)</label>
                  <CustomSelect
                    value={formData.rice_code_id || null}
                    onChange={(value) => setFormData({ ...formData, rice_code_id: value })}
                    options={riceCodes.map((rc) => ({ value: rc.rice_code_id, label: rc.rice_code_name || rc.rice_code_id }))}
                    placeholder="Select rice code"
                    allowClear
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Rate (₹/kg) *</label>
                    <input
                      type="number"
                      value={formData.rate || ''}
                      onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      min="0"
                      step="0.01"
                    />
                    {errors.rate && <p className="mt-1 text-xs text-red-600">{errors.rate}</p>}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Quantity (kg) *</label>
                    <input
                      type="number"
                      value={formData.quantity || ''}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      min="0"
                    />
                    {errors.quantity && <p className="mt-1 text-xs text-red-600">{errors.quantity}</p>}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Purchaser (Vendor) *</label>
                  <CustomSelect
                    value={formData.purchaser_id || null}
                    onChange={(value) => setFormData({ ...formData, purchaser_id: value || '' })}
                    options={vendors.map((v) => ({ value: v.id, label: v.business_name }))}
                    placeholder="Select vendor"
                  />
                  {errors.purchaser_id && <p className="mt-1 text-xs text-red-600">{errors.purchaser_id}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Broker (Optional)</label>
                  <CustomSelect
                    value={formData.broker_id || null}
                    onChange={(value) => setFormData({ ...formData, broker_id: value })}
                    options={brokers.map((b) => ({ value: b.id, label: b.business_name }))}
                    placeholder="Select broker"
                    allowClear
                  />
                </div>

                {formData.broker_id && (
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Broker Commission</label>
                    <input
                      type="number"
                      value={formData.broker_commission || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, broker_commission: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      min="0"
                      step="0.01"
                      placeholder="Percentage or amount"
                    />
                  </div>
                )}

                {isXgodown && (
                  <>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Transporter *</label>
                      <CustomSelect
                        value={formData.transporter_id || null}
                        onChange={(value) => setFormData({ ...formData, transporter_id: value })}
                        options={transporters.map((t) => ({ value: t.id, label: t.business_name }))}
                        placeholder="Select transporter"
                      />
                      {errors.transporter_id && <p className="mt-1 text-xs text-red-600">{errors.transporter_id}</p>}
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Transportation Cost (₹) *</label>
                      <input
                        type="number"
                        value={formData.transportation_cost || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, transportation_cost: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                        min="0"
                        step="0.01"
                      />
                      {errors.transportation_cost && (
                        <p className="mt-1 text-xs text-red-600">{errors.transportation_cost}</p>
                      )}
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Cash Discount (₹)</label>
                    <input
                      type="number"
                      value={formData.cash_discount || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, cash_discount: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Estimated Delivery Time (days) *</label>
                    <input
                      type="number"
                      value={formData.estimated_delivery_time || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, estimated_delivery_time: parseInt(e.target.value) || 0 })
                      }
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      min="0"
                    />
                    {errors.estimated_delivery_time && (
                      <p className="mt-1 text-xs text-red-600">{errors.estimated_delivery_time}</p>
                    )}
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Saving...' : isEditMode ? 'Update Sauda' : 'Create Sauda'}
                </button>
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


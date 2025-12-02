import * as Dialog from '@radix-ui/react-dialog';
import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { usePurchases } from '../../../hooks/usePurchases';
import { purchasesAPI } from '../../../services/purchases.api';
import { useVendors } from '../../../hooks/useVendors';
import { useSaudas } from '../../../hooks/useSaudas';
import { useInwardSlipPasses } from '../../../hooks/useInwardSlipPasses';
import { useLots } from '../../../hooks/useLots';
import { AlertDialog } from '../../shared/AlertDialog';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import type { CreatePurchaseRequest, UpdatePurchaseRequest, Purchase } from '../../../types/entities';

interface PurchaseFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseId?: string | null;
}

export function PurchaseFormModal({ open, onOpenChange, purchaseId }: PurchaseFormModalProps) {
  const { createPurchase, updatePurchase } = usePurchases();
  const { vendors } = useVendors();
  const { saudas } = useSaudas();
  const { inwardSlipPasses } = useInwardSlipPasses();
  const { lots } = useLots();
  const isEditMode = !!purchaseId;
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<CreatePurchaseRequest>({
    vendor_id: '',
    purchase_date: new Date().toISOString().split('T')[0],
    sauda_ids: [],
    inward_slip_pass_ids: [],
    lot_ids: [],
    broker_id: null,
    broker_commission: null,
    cash_discount: null,
    transportation_cost: null,
    rate: null,
    igst_percentage: null,
    invoice_number: null,
    invoice_date: null,
    truck_number: null,
    transport_name: null,
    notes: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingPurchase, setLoadingPurchase] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    if (open && purchaseId && isEditMode) {
      loadPurchaseData();
    } else if (open && !purchaseId) {
      resetForm();
    }
  }, [open, purchaseId]);

  const loadPurchaseData = async () => {
    if (!purchaseId) return;
    setLoadingPurchase(true);
    try {
      const purchase = await purchasesAPI.getPurchaseById(purchaseId);
      const linked = await purchasesAPI.getLinkedEntities(purchaseId);
      setFormData({
        vendor_id: purchase.vendor_id,
        purchase_date: purchase.purchase_date,
        sauda_ids: linked.sauda_ids,
        inward_slip_pass_ids: linked.inward_slip_pass_ids,
        lot_ids: linked.lot_ids,
        broker_id: purchase.broker_id || null,
        broker_commission: purchase.broker_commission || null,
        cash_discount: purchase.cash_discount || null,
        transportation_cost: purchase.transportation_cost || null,
        rate: purchase.rate || null,
        igst_percentage: purchase.igst_percentage || null,
        invoice_number: purchase.invoice_number || null,
        invoice_date: purchase.invoice_date || null,
        truck_number: purchase.truck_number || null,
        transport_name: purchase.transport_name || null,
        notes: purchase.notes || null,
      });
      setErrors({});
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to load purchase data');
      setAlertOpen(true);
    } finally {
      setLoadingPurchase(false);
    }
  };

  const resetForm = () => {
    setFormData({
      vendor_id: '',
      purchase_date: new Date().toISOString().split('T')[0],
      sauda_ids: [],
      inward_slip_pass_ids: [],
      lot_ids: [],
      broker_id: null,
      broker_commission: null,
      cash_discount: null,
      transportation_cost: null,
      rate: null,
      igst_percentage: null,
      invoice_number: null,
      invoice_date: null,
      truck_number: null,
      transport_name: null,
      notes: null,
    });
    setErrors({});
    setStep(1);
  };

  const validateStep = (stepNum: number): boolean => {
    const newErrors: Record<string, string> = {};
    if (stepNum === 1) {
      if (!formData.vendor_id) newErrors.vendor_id = 'Vendor is required';
      if (!formData.purchase_date) newErrors.purchase_date = 'Purchase date is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(step)) return;

    setLoading(true);
    try {
      if (isEditMode && purchaseId) {
        await updatePurchase(purchaseId, formData as UpdatePurchaseRequest);
        setAlertType('success');
        setAlertTitle('Success');
        setAlertMessage('Purchase updated successfully');
      } else {
        await createPurchase(formData);
        setAlertType('success');
        setAlertTitle('Success');
        setAlertMessage('Purchase created successfully');
      }
      setAlertOpen(true);
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 1500);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to save purchase');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (type: 'sauda' | 'isp' | 'lot', id: string) => {
    if (type === 'sauda') {
      const current = formData.sauda_ids || [];
      setFormData({
        ...formData,
        sauda_ids: current.includes(id) ? current.filter(s => s !== id) : [...current, id],
      });
    } else if (type === 'isp') {
      const current = formData.inward_slip_pass_ids || [];
      setFormData({
        ...formData,
        inward_slip_pass_ids: current.includes(id) ? current.filter(i => i !== id) : [...current, id],
      });
    } else if (type === 'lot') {
      const current = formData.lot_ids || [];
      setFormData({
        ...formData,
        lot_ids: current.includes(id) ? current.filter(l => l !== id) : [...current, id],
      });
    }
  };

  const purchaserVendors = vendors.filter(v => v.type === 'purchaser' || v.type === 'both');

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-[90vw] md:w-full max-w-3xl translate-x-[-50%] translate-y-[-50%]">
            <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-xl sm:text-2xl font-semibold">
                  {isEditMode ? 'Edit Purchase' : 'Create Purchase'}
                </Dialog.Title>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {loadingPurchase ? (
                <div className="flex justify-center py-10">
                  <LoadingSpinner />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Step Indicator */}
                  <div className="flex items-center justify-between mb-6">
                    {[1, 2, 3, 4].map((s) => (
                      <div key={s} className="flex items-center flex-1">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                          step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {s}
                        </div>
                        {s < 4 && (
                          <div className={`flex-1 h-1 mx-2 ${
                            step > s ? 'bg-primary' : 'bg-muted'
                          }`} />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Step 1: Basic Info */}
                  {step === 1 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Basic Information</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Vendor <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={formData.vendor_id}
                            onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-lg bg-background ${
                              errors.vendor_id ? 'border-red-500' : 'border-border'
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
                          {errors.vendor_id && (
                            <p className="text-xs text-red-500 mt-1">{errors.vendor_id}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Purchase Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={formData.purchase_date}
                            onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-lg bg-background ${
                              errors.purchase_date ? 'border-red-500' : 'border-border'
                            }`}
                          />
                          {errors.purchase_date && (
                            <p className="text-xs text-red-500 mt-1">{errors.purchase_date}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Invoice Number</label>
                          <input
                            type="text"
                            value={formData.invoice_number || ''}
                            onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value || null })}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                            placeholder="INV-001"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Invoice Date</label>
                          <input
                            type="date"
                            value={formData.invoice_date || ''}
                            onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value || null })}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Link Entities */}
                  {step === 2 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Link Entities</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Saudas</label>
                          <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2 space-y-2">
                            {saudas.filter(s => s.status === 'active').map((s) => (
                              <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={(formData.sauda_ids || []).includes(s.id)}
                                  onChange={() => toggleSelection('sauda', s.id)}
                                  className="rounded"
                                />
                                <span className="text-sm">{s.rice_quality} - ₹{s.rate}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Inward Slip Passes</label>
                          <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2 space-y-2">
                            {inwardSlipPasses.map((isp) => (
                              <label key={isp.id} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={(formData.inward_slip_pass_ids || []).includes(isp.id)}
                                  onChange={() => toggleSelection('isp', isp.id)}
                                  className="rounded"
                                />
                                <span className="text-sm">{isp.slip_number} - {isp.party_name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Lots</label>
                          <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2 space-y-2">
                            {lots.map((lot) => (
                              <label key={lot.id} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={(formData.lot_ids || []).includes(lot.id)}
                                  onChange={() => toggleSelection('lot', lot.id)}
                                  className="rounded"
                                />
                                <span className="text-sm">{lot.lot_number} - {lot.item_name} - ₹{(lot.amount ?? 0).toFixed(2)}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Accounting Overrides */}
                  {step === 3 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Accounting Overrides</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Cash Discount (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.cash_discount || ''}
                            onChange={(e) => setFormData({ ...formData, cash_discount: parseFloat(e.target.value) || null })}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Transportation Cost (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.transportation_cost || ''}
                            onChange={(e) => setFormData({ ...formData, transportation_cost: parseFloat(e.target.value) || null })}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Broker Commission (%)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.broker_commission || ''}
                            onChange={(e) => setFormData({ ...formData, broker_commission: parseFloat(e.target.value) || null })}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">IGST Percentage (%)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.igst_percentage || ''}
                            onChange={(e) => setFormData({ ...formData, igst_percentage: parseFloat(e.target.value) || null })}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                            placeholder="5.00"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Review */}
                  {step === 4 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Review</h3>
                      <div className="space-y-2 text-sm">
                        <p><strong>Vendor:</strong> {purchaserVendors.find(v => v.id === formData.vendor_id)?.business_name || 'N/A'}</p>
                        <p><strong>Purchase Date:</strong> {formData.purchase_date}</p>
                        <p><strong>Saudas:</strong> {(formData.sauda_ids || []).length}</p>
                        <p><strong>ISPs:</strong> {(formData.inward_slip_pass_ids || []).length}</p>
                        <p><strong>Lots:</strong> {(formData.lot_ids || []).length}</p>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={step > 1 ? handlePrevious : () => onOpenChange(false)}
                      className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {step > 1 ? 'Previous' : 'Cancel'}
                    </button>
                    {step < 4 ? (
                      <button
                        type="button"
                        onClick={handleNext}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
                      </button>
                    )}
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


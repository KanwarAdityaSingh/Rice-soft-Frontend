import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { usePurchases } from '../../hooks/usePurchases';
import { useVendors } from '../../hooks/useVendors';
import { useBrokers } from '../../hooks/useBrokers';
import { useSaudas } from '../../hooks/useSaudas';
import { saudasAPI } from '../../services/saudas.api';
import { inwardSlipPassesAPI } from '../../services/inwardSlipPasses.api';
import { purchasesAPI } from '../../services/purchases.api';
import { DocumentUpload } from './DocumentUpload';
import { CustomSelect } from '../shared/CustomSelect';
import { AlertDialog } from '../shared/AlertDialog';
import { LoadingSpinner } from '../admin/shared/LoadingSpinner';
import type { CreatePurchaseRequest, UpdatePurchaseRequest } from '../../types/entities';

interface PurchaseFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseId?: string | null;
  preselectedSaudaId?: string | null;
  preselectedVendorId?: string | null;
  onSuccess?: (purchaseId: string) => void;
}

export function PurchaseFormModal({
  open,
  onOpenChange,
  purchaseId,
  preselectedSaudaId,
  preselectedVendorId,
  onSuccess,
}: PurchaseFormModalProps) {
  const { createPurchase, updatePurchase } = usePurchases();
  const { vendors } = useVendors();
  const { brokers } = useBrokers();
  const { saudas } = useSaudas();
  const [selectedSauda, setSelectedSauda] = useState<any>(null);
  
  // Calculate final total amount including all adjustments
  const calculateFinalAmount = (baseAmount: number, sauda: any, igstPercent: number): { finalAmount: number; igstAmount: number } => {
    if (baseAmount <= 0) return { finalAmount: 0, igstAmount: 0 };
    
    // Step 1: Base Amount (already calculated)
    let amount = baseAmount;
    
    // Step 2: Subtract Cash Discount
    const cashDiscount = sauda?.cash_discount || 0;
    amount = amount - cashDiscount;
    
    // Step 3: Add Broker Commission
    const brokerCommissionPercent = sauda?.broker_commission || 0;
    const brokerCommissionAmount = (amount * brokerCommissionPercent) / 100;
    amount = amount + brokerCommissionAmount;
    
    // Step 4: Add Transportation Cost (only for 'xgodown' type)
    const transportationCost = sauda?.sauda_type === 'xgodown' ? (sauda?.transportation_cost || 0) : 0;
    amount = amount + transportationCost;
    
    // Step 5: Calculate IGST on amount before IGST
    const amountBeforeIGST = amount;
    const igstAmount = (amountBeforeIGST * igstPercent) / 100;
    const finalAmount = amountBeforeIGST + igstAmount;
    
    return { finalAmount, igstAmount };
  };
  const [formData, setFormData] = useState<CreatePurchaseRequest>({
    vendor_id: preselectedVendorId || '',
    sauda_id: preselectedSaudaId || '',
    broker_id: null,
    broker_commission: 0,
    invoice_number: null,
    invoice_date: null,
    rate: 0,
    total_weight: null,
    total_amount: null,
    igst_amount: null,
    igst_percentage: null,
    freight_status: null,
    truck_number: null,
    transport_name: null,
    goods_dispatched_from: null,
    goods_dispatched_to: null,
    purchase_date: new Date().toISOString().split('T')[0],
    expected_quantity: null,
    notes: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [pendingDocuments, setPendingDocuments] = useState<Record<string, File>>({});
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const isEditMode = !!purchaseId;

  useEffect(() => {
    if (open && purchaseId) {
      // Load purchase data when in edit mode
      loadPurchaseData();
    } else if (open && !purchaseId) {
      // Reset form when opening in create mode
      if (preselectedSaudaId) {
        // Immediately set sauda_id in formData so dropdown shows it
        setFormData((prev) => ({
          ...prev,
          sauda_id: preselectedSaudaId,
        }));
        
        // Load sauda immediately to get details and add to options
        saudasAPI.getSaudaById(preselectedSaudaId).then(async (sauda) => {
          // Store the sauda so we can add it to options if needed
          setSelectedSauda(sauda);
          
          // Pre-fill basic fields from sauda
          const rate = sauda.rate || 0;
          const totalWeight = sauda.quantity || 0;
          const baseAmount = rate * totalWeight;
          
          const updatedFormData: Partial<CreatePurchaseRequest> = {
            vendor_id: sauda.purchaser_id || preselectedVendorId || '',
            sauda_id: preselectedSaudaId,
            broker_id: sauda.broker_id || null,
            broker_commission: sauda.broker_commission || 0,
            rate: rate,
            expected_quantity: sauda.quantity,
            total_weight: totalWeight || null,
            total_amount: baseAmount > 0 ? calculateFinalAmount(baseAmount, sauda, 0).finalAmount : null,
          };

          // Try to fetch inward slip passes to calculate actual total weight
          try {
            const inwardSlips = await inwardSlipPassesAPI.getAllInwardSlipPasses(preselectedSaudaId);
            if (inwardSlips && inwardSlips.length > 0) {
              // Calculate total weight from all lots in all inward slips
              let totalReceivedWeight = 0;

              inwardSlips.forEach((slip) => {
                if (slip.lots && slip.lots.length > 0) {
                  slip.lots.forEach((lot) => {
                    totalReceivedWeight += lot.received_weight || 0;
                  });
                }
              });

              if (totalReceivedWeight > 0) {
                updatedFormData.total_weight = totalReceivedWeight;
                // Recalculate total_amount with actual received weight
                const rate = updatedFormData.rate || 0;
                const baseAmount = rate * totalReceivedWeight;
                const igstPercent = updatedFormData.igst_percentage || 0;
                const { finalAmount } = calculateFinalAmount(baseAmount, sauda, igstPercent);
                updatedFormData.total_amount = finalAmount > 0 ? finalAmount : null;
              }
            }
          } catch (error) {
            // If inward slips can't be fetched, use sauda quantity for total_weight
            console.log('Could not fetch inward slip passes:', error);
          }

          setFormData((prev) => ({
            ...prev,
            ...updatedFormData,
          }));
        }).catch((error) => {
          console.error('Failed to load preselected sauda:', error);
        });
      } else {
        // Reset form when opening without preselected sauda
        setSelectedSauda(null);
        setFormData({
          vendor_id: preselectedVendorId || '',
          sauda_id: preselectedSaudaId || '',
          broker_id: null,
          broker_commission: 0,
          invoice_number: null,
          invoice_date: null,
          rate: 0,
          total_weight: null,
          total_amount: null,
          igst_amount: null,
          igst_percentage: null,
          freight_status: null,
          truck_number: null,
          transport_name: null,
          goods_dispatched_from: null,
          goods_dispatched_to: null,
          purchase_date: new Date().toISOString().split('T')[0],
          expected_quantity: null,
          notes: null,
        });
      }
      // Reset pending documents when modal opens
      setPendingDocuments({});
    }
  }, [open, preselectedSaudaId, preselectedVendorId, purchaseId]);

  const loadPurchaseData = async () => {
    if (!purchaseId) return;
    
    setLoadingData(true);
    try {
      const purchase = await purchasesAPI.getPurchaseById(purchaseId);
      
      // Load sauda details for calculations
      if (purchase.sauda_id) {
        try {
          const sauda = await saudasAPI.getSaudaById(purchase.sauda_id);
          setSelectedSauda(sauda);
        } catch (error) {
          console.error('Failed to load sauda:', error);
        }
      }
      
      // Populate form with purchase data
      setFormData({
        vendor_id: purchase.vendor_id || '',
        sauda_id: purchase.sauda_id || '',
        broker_id: purchase.broker_id || null,
        broker_commission: purchase.broker_commission || 0,
        invoice_number: purchase.invoice_number || null,
        invoice_date: purchase.invoice_date || null,
        rate: purchase.rate || 0,
        total_weight: purchase.total_weight || null,
        total_amount: purchase.total_amount || null,
        igst_amount: purchase.igst_amount || null,
        igst_percentage: purchase.igst_percentage || null,
        freight_status: purchase.freight_status || null,
        truck_number: purchase.truck_number || null,
        transport_name: purchase.transport_name || null,
        goods_dispatched_from: purchase.goods_dispatched_from || null,
        goods_dispatched_to: purchase.goods_dispatched_to || null,
        purchase_date: purchase.purchase_date || new Date().toISOString().split('T')[0],
        expected_quantity: purchase.expected_quantity || null,
        notes: purchase.notes || null,
      });
    } catch (error: any) {
      console.error('Failed to load purchase:', error);
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error?.message || 'Failed to load purchase data');
      setAlertOpen(true);
    } finally {
      setLoadingData(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.vendor_id) newErrors.vendor_id = 'Vendor required';
    if (!formData.sauda_id) newErrors.sauda_id = 'Sauda required';
    if (!formData.purchase_date) newErrors.purchase_date = 'Purchase date required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Ensure numeric fields are numbers, not null
      const submitData = {
        ...formData,
        total_amount: formData.total_amount ?? 0,
        igst_amount: formData.igst_amount ?? 0,
        igst_percentage: formData.igst_percentage ?? 0,
      };

      if (isEditMode && purchaseId) {
        await updatePurchase(purchaseId, submitData as UpdatePurchaseRequest);
        setAlertType('success');
        setAlertTitle('Purchase Updated');
        setAlertMessage('Purchase has been updated successfully.');
        setAlertOpen(true);
        onOpenChange(false);
      } else {
        const newPurchase = await createPurchase(submitData);
        
        // Upload any pending documents after purchase is created
        if (Object.keys(pendingDocuments).length > 0) {
          await uploadPendingDocuments(newPurchase.id);
        }
        
        setAlertType('success');
        setAlertTitle('Purchase Created');
        setAlertMessage('Purchase has been created successfully.');
        setAlertOpen(true);
        onOpenChange(false);
        onSuccess?.(newPurchase.id);
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

  const handleDocumentUpload = async (type: 'transportation' | 'purchase' | 'bilti' | 'eway', file: File) => {
    // If purchase doesn't exist yet (create mode), store the file for later upload
    if (!purchaseId) {
      setPendingDocuments({ ...pendingDocuments, [type]: file });
      setAlertType('success');
      setAlertTitle('Document Queued');
      setAlertMessage('Document will be uploaded after purchase is created.');
      setAlertOpen(true);
      return;
    }

    // If purchase exists, upload immediately
    setUploading({ ...uploading, [type]: true });
    try {
      switch (type) {
        case 'transportation':
          await purchasesAPI.uploadTransportationBill(purchaseId, file);
          break;
        case 'purchase':
          await purchasesAPI.uploadPurchaseBill(purchaseId, file);
          break;
        case 'bilti':
          await purchasesAPI.uploadBilti(purchaseId, file);
          break;
        case 'eway':
          await purchasesAPI.uploadEwayBill(purchaseId, file);
          break;
      }
      setAlertType('success');
      setAlertTitle('Document Uploaded');
      setAlertMessage('Document has been uploaded successfully.');
      setAlertOpen(true);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Upload Failed');
      setAlertMessage(error?.message || 'Failed to upload document');
      setAlertOpen(true);
    } finally {
      setUploading({ ...uploading, [type]: false });
    }
  };

  const uploadPendingDocuments = async (newPurchaseId: string) => {
    const uploadPromises = Object.entries(pendingDocuments).map(async ([type, file]) => {
      setUploading((prev) => ({ ...prev, [type]: true }));
      try {
        switch (type) {
          case 'transportation':
            await purchasesAPI.uploadTransportationBill(newPurchaseId, file);
            break;
          case 'purchase':
            await purchasesAPI.uploadPurchaseBill(newPurchaseId, file);
            break;
          case 'bilti':
            await purchasesAPI.uploadBilti(newPurchaseId, file);
            break;
          case 'eway':
            await purchasesAPI.uploadEwayBill(newPurchaseId, file);
            break;
        }
      } catch (error) {
        console.error(`Failed to upload ${type} document:`, error);
      } finally {
        setUploading((prev) => ({ ...prev, [type]: false }));
      }
    });

    await Promise.all(uploadPromises);
    setPendingDocuments({});
  };

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-3xl translate-x-[-50%] translate-y-[-50%]">
            <div className="glass rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-xl font-semibold">
                  {isEditMode ? 'Update Purchase' : 'Create Purchase'}
                </Dialog.Title>
                <button
                  onClick={() => onOpenChange(false)}
                  className="rounded-lg p-1 hover:bg-muted/50 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {loadingData && isEditMode ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Vendor *</label>
                    <CustomSelect
                      value={formData.vendor_id || null}
                      onChange={(value) => setFormData({ ...formData, vendor_id: value || '' })}
                      options={vendors.map((v) => ({ value: v.id, label: v.business_name }))}
                      placeholder="Select vendor"
                      disabled={isEditMode}
                    />
                    {errors.vendor_id && <p className="mt-1 text-xs text-red-600">{errors.vendor_id}</p>}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Sauda * 
                      {preselectedSaudaId && (
                        <span className="ml-2 text-xs text-primary font-normal">(From Pipeline)</span>
                      )}
                    </label>
                    <CustomSelect
                      value={formData.sauda_id || null}
                      onChange={async (value) => {
                        const saudaId = value || '';
                        // Load sauda details if selected
                        if (saudaId) {
                          try {
                            const sauda = await saudasAPI.getSaudaById(saudaId);
                            setSelectedSauda(sauda);
                            // Update form data with sauda details
                            const rate = sauda.rate || formData.rate || 0;
                            const totalWeight = formData.total_weight || sauda.quantity || 0;
                            const baseAmount = rate * totalWeight;
                            const igstPercent = formData.igst_percentage || 0;
                            const { finalAmount, igstAmount } = baseAmount > 0 ? calculateFinalAmount(baseAmount, sauda, igstPercent) : { finalAmount: 0, igstAmount: 0 };
                            setFormData({ 
                              ...formData, 
                              sauda_id: saudaId,
                              vendor_id: sauda.purchaser_id || formData.vendor_id,
                              broker_id: sauda.broker_id || formData.broker_id,
                              broker_commission: sauda.broker_commission || formData.broker_commission || 0,
                              rate: rate,
                              total_amount: finalAmount > 0 ? finalAmount : null,
                              igst_amount: igstAmount > 0 ? igstAmount : null
                            });
                          } catch (error) {
                            console.error('Failed to load sauda:', error);
                            setFormData({ ...formData, sauda_id: saudaId });
                          }
                        } else {
                          setSelectedSauda(null);
                          setFormData({ ...formData, sauda_id: '' });
                        }
                      }}
                      options={[
                        // Include selected sauda if it's not in the saudas list
                        ...(selectedSauda && !saudas.find(s => s.id === selectedSauda.id)
                          ? [{ value: selectedSauda.id, label: `${selectedSauda.rice_quality} - ₹${selectedSauda.rate}/kg` }]
                          : []),
                        // Include all saudas from the list
                        ...saudas.map((s) => ({ value: s.id, label: `${s.rice_quality} - ₹${s.rate}/kg` }))
                      ]}
                      placeholder={preselectedSaudaId ? "Sauda from pipeline" : "Select sauda"}
                      disabled={isEditMode || !!preselectedSaudaId}
                    />
                    {errors.sauda_id && <p className="mt-1 text-xs text-red-600">{errors.sauda_id}</p>}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Broker (Optional)</label>
                  <CustomSelect
                    value={formData.broker_id || null}
                    onChange={(value) => setFormData({ ...formData, broker_id: value })}
                    options={brokers.map((b) => ({ value: b.id, label: b.business_name }))}
                    placeholder="Select broker"
                    allowClear
                    disabled={!!preselectedSaudaId && !!formData.broker_id}
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
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Invoice Number</label>
                    <input
                      type="text"
                      value={formData.invoice_number || ''}
                      onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value || null })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Invoice Date</label>
                    <input
                      type="date"
                      value={formData.invoice_date || ''}
                      onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value || null })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Rate (₹/kg)</label>
                    <input
                      type="number"
                      value={formData.rate || ''}
                      onChange={(e) => {
                        const newRate = parseFloat(e.target.value) || 0;
                        const totalWeight = formData.total_weight || 0;
                        const baseAmount = newRate * totalWeight;
                        const igstPercent = formData.igst_percentage || 0;
                        const { finalAmount, igstAmount } = baseAmount > 0 ? calculateFinalAmount(baseAmount, selectedSauda, igstPercent) : { finalAmount: 0, igstAmount: 0 };
                        setFormData({ 
                          ...formData, 
                          rate: newRate,
                          total_amount: finalAmount > 0 ? finalAmount : null,
                          igst_amount: igstAmount > 0 ? igstAmount : null
                        });
                      }}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Total Weight (kg)</label>
                    <input
                      type="number"
                      value={formData.total_weight || ''}
                      onChange={(e) => {
                        const newWeight = parseFloat(e.target.value) || 0;
                        const rate = formData.rate || 0;
                        const baseAmount = rate * newWeight;
                        const igstPercent = formData.igst_percentage || 0;
                        const { finalAmount, igstAmount } = baseAmount > 0 ? calculateFinalAmount(baseAmount, selectedSauda, igstPercent) : { finalAmount: 0, igstAmount: 0 };
                        setFormData({ 
                          ...formData, 
                          total_weight: newWeight || null,
                          total_amount: finalAmount > 0 ? finalAmount : null,
                          igst_amount: igstAmount > 0 ? igstAmount : null
                        });
                      }}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Total Amount (₹)</label>
                    <input
                      type="number"
                      value={formData.total_amount || ''}
                      onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) || null })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      min="0"
                      step="0.01"
                      readOnly
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Auto-calculated: Base Amount - Cash Discount + Commission + Transportation + IGST</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">IGST Percentage (%)</label>
                    <input
                      type="number"
                      value={formData.igst_percentage || ''}
                      onChange={(e) => {
                        const igstPercent = parseFloat(e.target.value) || 0;
                        const rate = formData.rate || 0;
                        const totalWeight = formData.total_weight || 0;
                        const baseAmount = rate * totalWeight;
                        const { finalAmount, igstAmount } = baseAmount > 0 ? calculateFinalAmount(baseAmount, selectedSauda, igstPercent) : { finalAmount: 0, igstAmount: 0 };
                        setFormData({ 
                          ...formData, 
                          igst_percentage: igstPercent || null,
                          igst_amount: igstAmount > 0 ? igstAmount : null,
                          total_amount: finalAmount > 0 ? finalAmount : null
                        });
                      }}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">IGST Amount (₹)</label>
                    <input
                      type="number"
                      value={formData.igst_amount || ''}
                      onChange={(e) => setFormData({ ...formData, igst_amount: parseFloat(e.target.value) || null })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      min="0"
                      step="0.01"
                      readOnly
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Auto-calculated: Total × IGST%</p>
                  </div>
                </div>

                {/* Calculation Breakdown */}
                {formData.rate && formData.total_weight && selectedSauda && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                    <h3 className="text-sm font-semibold mb-3">Amount Calculation Breakdown</h3>
                    {(() => {
                      const baseAmount = (formData.rate || 0) * (formData.total_weight || 0);
                      const cashDiscount = selectedSauda?.cash_discount || 0;
                      const amountAfterDiscount = baseAmount - cashDiscount;
                      const brokerCommissionPercent = selectedSauda?.broker_commission || 0;
                      const brokerCommissionAmount = (amountAfterDiscount * brokerCommissionPercent) / 100;
                      const amountWithCommission = amountAfterDiscount + brokerCommissionAmount;
                      const transportationCost = selectedSauda?.sauda_type === 'xgodown' ? (selectedSauda?.transportation_cost || 0) : 0;
                      const amountWithTransportation = amountWithCommission + transportationCost;
                      const igstPercent = formData.igst_percentage || 0;
                      const igstAmount = (amountWithTransportation * igstPercent) / 100;
                      const finalAmount = amountWithTransportation + igstAmount;

                      return (
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Base Amount (Rate × Weight):</span>
                            <span className="font-medium">₹{baseAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                          </div>
                          {cashDiscount > 0 && (
                            <>
                              <div className="flex justify-between text-red-600">
                                <span>Cash Discount:</span>
                                <span>- ₹{cashDiscount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between text-muted-foreground">
                                <span>Amount After Discount:</span>
                                <span>₹{amountAfterDiscount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                              </div>
                            </>
                          )}
                          {brokerCommissionPercent > 0 && (
                            <>
                              <div className="flex justify-between text-green-600">
                                <span>Broker Commission ({brokerCommissionPercent}%):</span>
                                <span>+ ₹{brokerCommissionAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between text-muted-foreground">
                                <span>Amount With Commission:</span>
                                <span>₹{amountWithCommission.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                              </div>
                            </>
                          )}
                          {transportationCost > 0 && (
                            <>
                              <div className="flex justify-between text-green-600">
                                <span>Transportation Cost:</span>
                                <span>+ ₹{transportationCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between text-muted-foreground">
                                <span>Amount With Transportation:</span>
                                <span>₹{amountWithTransportation.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                              </div>
                            </>
                          )}
                          {igstPercent > 0 && (
                            <>
                              <div className="flex justify-between text-green-600">
                                <span>IGST ({igstPercent}%):</span>
                                <span>+ ₹{igstAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                              </div>
                            </>
                          )}
                          <div className="flex justify-between pt-2 border-t border-primary/20 font-semibold text-sm">
                            <span>Final Total Amount:</span>
                            <span className="text-primary">₹{finalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Purchase Date *</label>
                  <input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                  />
                  {errors.purchase_date && <p className="mt-1 text-xs text-red-600">{errors.purchase_date}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Truck Number</label>
                    <input
                      type="text"
                      value={formData.truck_number || ''}
                      onChange={(e) => setFormData({ ...formData, truck_number: e.target.value || null })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      placeholder="CF001"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Transport Name</label>
                    <input
                      type="text"
                      value={formData.transport_name || ''}
                      onChange={(e) => setFormData({ ...formData, transport_name: e.target.value || null })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      placeholder="Complete Flow Transport"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Goods Dispatched From</label>
                    <input
                      type="text"
                      value={formData.goods_dispatched_from || ''}
                      onChange={(e) => setFormData({ ...formData, goods_dispatched_from: e.target.value || null })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      placeholder="Source location"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Goods Dispatched To</label>
                    <input
                      type="text"
                      value={formData.goods_dispatched_to || ''}
                      onChange={(e) => setFormData({ ...formData, goods_dispatched_to: e.target.value || null })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      placeholder="Destination location"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Expected Quantity (kg)</label>
                  <input
                    type="number"
                    value={formData.expected_quantity || ''}
                    onChange={(e) => setFormData({ ...formData, expected_quantity: parseFloat(e.target.value) || null })}
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    min="0"
                    step="0.01"
                    placeholder="100"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Notes</label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    rows={3}
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <h3 className="text-sm font-semibold">Documents</h3>
                  <DocumentUpload
                    label="Transportation Bill"
                    onUpload={(file) => handleDocumentUpload('transportation', file)}
                    loading={uploading.transportation}
                  />
                  <DocumentUpload
                    label="Purchase Bill"
                    onUpload={(file) => handleDocumentUpload('purchase', file)}
                    loading={uploading.purchase}
                  />
                  <DocumentUpload
                    label="Bilti"
                    onUpload={(file) => handleDocumentUpload('bilti', file)}
                    loading={uploading.bilti}
                  />
                  <DocumentUpload
                    label="E-way Bill"
                    onUpload={(file) => handleDocumentUpload('eway', file)}
                    loading={uploading.eway}
                  />
                  {!purchaseId && Object.keys(pendingDocuments).length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {Object.keys(pendingDocuments).length} document(s) queued for upload after purchase creation.
                    </p>
                  )}
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Saving...' : isEditMode ? 'Update Purchase' : 'Create Purchase'}
                </button>
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


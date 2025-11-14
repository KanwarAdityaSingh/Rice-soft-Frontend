import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { usePaymentAdvices } from '../../hooks/usePaymentAdvices';
import { useVendors } from '../../hooks/useVendors';
import { useBrokers } from '../../hooks/useBrokers';
import { useAuth } from '../../hooks/useAuth';
import { paymentAdvicesAPI } from '../../services/paymentAdvices.api';
import { purchasesAPI } from '../../services/purchases.api';
import { inwardSlipPassesAPI } from '../../services/inwardSlipPasses.api';
import { saudasAPI } from '../../services/saudas.api';
import { ChargesTable } from './ChargesTable';
import { DocumentUpload } from './DocumentUpload';
import { LoadingSpinner } from '../admin/shared/LoadingSpinner';
import { AlertDialog } from '../shared/AlertDialog';
import type {
  CreatePaymentAdviceRequest,
  UpdatePaymentAdviceRequest,
  CreatePaymentAdviceChargeRequest,
} from '../../types/entities';

interface PaymentAdviceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentAdviceId?: string | null;
  preselectedPurchaseId?: string | null;
  preselectedVendorId?: string | null;
  onSuccess?: () => void;
}

export function PaymentAdviceFormModal({
  open,
  onOpenChange,
  paymentAdviceId,
  preselectedPurchaseId,
  preselectedVendorId,
  onSuccess,
}: PaymentAdviceFormModalProps) {
  const { createPaymentAdvice, updatePaymentAdvice } = usePaymentAdvices();
  const { vendors } = useVendors();
  const { brokers } = useBrokers();
  const { user } = useAuth();
  const [formData, setFormData] = useState<Omit<CreatePaymentAdviceRequest, 'charges'>>({
    purchase_id: preselectedPurchaseId || null,
    payer_id: user?.id || '',
    recipient_id: preselectedVendorId || '',
    sr_number: null,
    party_name: null,
    party_address: null,
    broker_name: null,
    invoice_number: null,
    invoice_date: null,
    truck_number: null,
    item: null,
    total_bags: null,
    due_date: null,
    bill_weight: null,
    kanta_weight: null,
    final_weight: null,
    rate: null,
    amount: 0,
    date_of_payment: new Date().toISOString().split('T')[0],
    status: 'pending',
    transaction_id: null,
    payment_slip_image_url: null,
    notes: null,
  });

  const [charges, setCharges] = useState<CreatePaymentAdviceChargeRequest[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingPaymentAdvice, setLoadingPaymentAdvice] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [netPayable, setNetPayable] = useState<number | null>(null);
  const [loadingNetPayable, setLoadingNetPayable] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const isEditMode = !!paymentAdviceId;

  // Load payment advice data when in edit mode, or load purchase data when creating
  useEffect(() => {
    if (open && paymentAdviceId) {
      loadPaymentAdviceData();
    } else if (open && !paymentAdviceId) {
      // Check if payment advice already exists for this purchase
      if (preselectedPurchaseId) {
        paymentAdvicesAPI.getAllPaymentAdvices({ purchase_id: preselectedPurchaseId })
          .then((payments) => {
            if (payments.length > 0) {
              setAlertType('warning');
              setAlertTitle('Payment Advice Already Exists');
              setAlertMessage('A payment advice already exists for this purchase. Only one payment advice is allowed per purchase.');
              setAlertOpen(true);
              onOpenChange(false);
              return;
            }
            // Continue with form setup if no payment advice exists
            loadPurchaseData();
          })
          .catch((error) => {
            console.error('Error checking for existing payment advice:', error);
            // Continue with form setup even if check fails
            loadPurchaseData();
          });
      } else {
        // Reset form for create mode without purchase
        setFormData({
          purchase_id: null,
          payer_id: user?.id || '',
          recipient_id: preselectedVendorId || '',
          sr_number: null,
          party_name: null,
          party_address: null,
          broker_name: null,
          invoice_number: null,
          invoice_date: null,
          truck_number: null,
          item: null,
          total_bags: null,
          due_date: null,
          bill_weight: null,
          kanta_weight: null,
          final_weight: null,
          rate: null,
          amount: 0,
          date_of_payment: new Date().toISOString().split('T')[0],
          status: 'pending',
          transaction_id: null,
          payment_slip_image_url: null,
          notes: null,
        });
        setCharges([]);
        setErrors({});
      }
    }
  }, [open, paymentAdviceId, preselectedPurchaseId, preselectedVendorId, user?.id, onOpenChange]);

  const loadPurchaseData = async () => {
    if (preselectedPurchaseId) {
      try {
        // Load purchase data to pre-fill fields
        const purchase = await purchasesAPI.getPurchaseById(preselectedPurchaseId);
          const amount = purchase.total_amount || 0;
          const vendorId = purchase.vendor_id || preselectedVendorId || '';
          
          // Load vendor details to get party name and address
          let partyName = null;
          let partyAddress = null;
          if (vendorId) {
            try {
              const vendor = vendors.find(v => v.id === vendorId);
              if (vendor) {
                partyName = vendor.business_name;
                partyAddress = vendor.address 
                  ? `${vendor.address.street}, ${vendor.address.city}, ${vendor.address.state} - ${vendor.address.pincode}`
                  : null;
              }
            } catch (error) {
              console.log('Could not load vendor details:', error);
            }
          }
        
        // Load inward slip data to prefill additional fields
        let truckNumber = purchase.truck_number || null;
        let item = null;
        let totalBags = null;
        let billWeight = purchase.total_weight || null;
        let kantaWeight = null;
        let finalWeight = purchase.total_weight || null;
        let brokerName = null;
        
        if (purchase.sauda_id) {
          try {
            // Load sauda to get broker information
            const sauda = await saudasAPI.getSaudaById(purchase.sauda_id);
            if (sauda.broker_id) {
              const broker = brokers.find(b => b.id === sauda.broker_id);
              if (broker) {
                brokerName = broker.business_name;
              }
            }
            
            // Load inward slip data
            const inwardSlips = await inwardSlipPassesAPI.getAllInwardSlipPasses(purchase.sauda_id);
            if (inwardSlips && inwardSlips.length > 0) {
              const inwardSlip = inwardSlips[0];
              
              // Prefill from inward slip
              if (!truckNumber) truckNumber = inwardSlip.vehicle_number || null;
              if (!partyName) partyName = inwardSlip.party_name || null;
              if (!partyAddress) partyAddress = inwardSlip.party_address || null;
              
              // Calculate totals from lots
              if (inwardSlip.lots && inwardSlip.lots.length > 0) {
                // Sum all bags
                totalBags = inwardSlip.lots.reduce((sum, lot) => sum + (lot.no_of_bags || 0), 0);
                
                // Get item names (comma-separated if multiple)
                const itemNames = inwardSlip.lots.map(lot => lot.item_name).filter(Boolean);
                if (itemNames.length > 0) {
                  item = itemNames.join(', ');
                }
                
                // Sum bill weights (total weight)
                const totalBillWeight = inwardSlip.lots.reduce((sum, lot) => sum + (lot.bill_weight || 0), 0);
                if (!billWeight && totalBillWeight > 0) billWeight = totalBillWeight;
                
                // Sum received weights (final weight)
                const totalReceivedWeight = inwardSlip.lots.reduce((sum, lot) => sum + (lot.received_weight || 0), 0);
                if (!finalWeight && totalReceivedWeight > 0) finalWeight = totalReceivedWeight;
              }
            }
          } catch (error) {
            console.error('Failed to load sauda or inward slip data:', error);
          }
        }
          
          setFormData({
            purchase_id: preselectedPurchaseId,
            payer_id: user?.id || '',
            recipient_id: vendorId,
            sr_number: null,
            party_name: partyName,
            party_address: partyAddress,
          broker_name: brokerName,
            invoice_number: purchase.invoice_number || null,
            invoice_date: purchase.invoice_date || null,
          truck_number: truckNumber,
          item: item,
          total_bags: totalBags,
            due_date: null,
          bill_weight: billWeight,
          kanta_weight: kantaWeight,
          final_weight: finalWeight,
            rate: purchase.rate || null,
            amount: amount,
            date_of_payment: new Date().toISOString().split('T')[0],
            status: 'pending',
            transaction_id: null,
            payment_slip_image_url: null,
            notes: null,
          });
      } catch (error) {
          console.error('Failed to load purchase:', error);
          // Fallback to default form
          setFormData({
            purchase_id: preselectedPurchaseId || null,
            payer_id: user?.id || '',
            recipient_id: preselectedVendorId || '',
            sr_number: null,
            party_name: null,
            party_address: null,
            broker_name: null,
            invoice_number: null,
            invoice_date: null,
            truck_number: null,
            item: null,
            total_bags: null,
            due_date: null,
            bill_weight: null,
            kanta_weight: null,
            final_weight: null,
            rate: null,
            amount: 0,
            date_of_payment: new Date().toISOString().split('T')[0],
            status: 'pending',
            transaction_id: null,
            payment_slip_image_url: null,
            notes: null,
          });
      }
      } else {
        // Reset form for create mode without preselected purchase
        setFormData({
          purchase_id: preselectedPurchaseId || null,
          payer_id: user?.id || '',
          recipient_id: preselectedVendorId || '',
          sr_number: null,
          party_name: null,
          party_address: null,
          broker_name: null,
          invoice_number: null,
          invoice_date: null,
          truck_number: null,
          item: null,
          total_bags: null,
          due_date: null,
          bill_weight: null,
          kanta_weight: null,
          final_weight: null,
          rate: null,
          amount: 0,
          date_of_payment: new Date().toISOString().split('T')[0],
          status: 'pending',
          transaction_id: null,
          payment_slip_image_url: null,
          notes: null,
        });
      }
      setCharges([]);
      setErrors({});
  };

  const loadPaymentAdviceData = async () => {
    if (!paymentAdviceId) return;
    setLoadingPaymentAdvice(true);
    try {
      const data = await paymentAdvicesAPI.getPaymentAdviceById(paymentAdviceId);
      setFormData({
        purchase_id: data.purchase_id || null,
        payer_id: data.payer_id,
        recipient_id: data.recipient_id,
        sr_number: data.sr_number || null,
        party_name: data.party_name || null,
        party_address: data.party_address || null,
        broker_name: data.broker_name || null,
        invoice_number: data.invoice_number || null,
        invoice_date: data.invoice_date || null,
        truck_number: data.truck_number || null,
        item: data.item || null,
        total_bags: data.total_bags || null,
        due_date: data.due_date || null,
        bill_weight: data.bill_weight || null,
        kanta_weight: data.kanta_weight || null,
        final_weight: data.final_weight || null,
        rate: data.rate || null,
        amount: data.amount,
        date_of_payment: data.date_of_payment,
        status: data.status,
        transaction_id: data.transaction_id || null,
        payment_slip_image_url: data.payment_slip_image_url || null,
        notes: data.notes || null,
      });
      // Convert charges to CreatePaymentAdviceChargeRequest format
      setCharges(
        data.charges.map((charge) => ({
          charge_name: charge.charge_name,
          charge_value: charge.charge_value,
          charge_type: charge.charge_type,
        }))
      );
      
      // Fetch net payable from backend after loading data
      if (paymentAdviceId) {
        fetchNetPayable();
      }
    } catch (error: any) {
      console.error('Failed to load payment advice:', error);
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error?.message || 'Failed to load payment advice');
      setAlertOpen(true);
    } finally {
      setLoadingPaymentAdvice(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.payer_id) newErrors.payer_id = 'Payer required';
    if (!formData.recipient_id) newErrors.recipient_id = 'Recipient required';
    if (!formData.amount || formData.amount <= 0) newErrors.amount = 'Valid amount required';
    if (!formData.date_of_payment) newErrors.date_of_payment = 'Payment date required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isEditMode && paymentAdviceId) {
        await updatePaymentAdvice(paymentAdviceId, { ...formData, charges } as UpdatePaymentAdviceRequest);
        // Refresh net payable after update
        await fetchNetPayable();
        setAlertType('success');
        setAlertTitle('Payment Advice Updated');
        setAlertMessage('Payment advice has been updated successfully.');
        setAlertOpen(true);
        onOpenChange(false);
      } else {
        await createPaymentAdvice({ ...formData, charges });
        setAlertType('success');
        setAlertTitle('Payment Advice Created');
        setAlertMessage('Payment advice has been created successfully.');
        setAlertOpen(true);
        onOpenChange(false);
        onSuccess?.();
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

  const handleSlipUpload = async (file: File) => {
    if (!paymentAdviceId) return;
    setUploading(true);
    try {
      await paymentAdvicesAPI.uploadPaymentSlip(paymentAdviceId, file);
      setAlertType('success');
      setAlertTitle('Slip Uploaded');
      setAlertMessage('Payment slip has been uploaded successfully.');
      setAlertOpen(true);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Upload Failed');
      setAlertMessage(error?.message || 'Failed to upload slip');
      setAlertOpen(true);
    } finally {
      setUploading(false);
    }
  };

  // Fetch net payable from backend API (only in edit mode)
  const fetchNetPayable = useCallback(async () => {
    if (!paymentAdviceId || !isEditMode) return;
    
    setLoadingNetPayable(true);
    try {
      const response = await paymentAdvicesAPI.getNetPayable(paymentAdviceId);
      setNetPayable(response.net_payable);
    } catch (error) {
      console.error('Error fetching net payable:', error);
      // Fallback to frontend calculation on error
      const totalCharges = charges.reduce((sum, charge) => sum + (charge.charge_value || 0), 0);
      setNetPayable(formData.amount - totalCharges);
    } finally {
      setLoadingNetPayable(false);
    }
  }, [paymentAdviceId, isEditMode, charges, formData.amount]);

  // Calculate net payable on frontend (for create mode or as fallback)
  const calculateNetPayable = () => {
    if (isEditMode && netPayable !== null) {
      return netPayable;
    }
    const totalCharges = charges.reduce((sum, charge) => sum + (charge.charge_value || 0), 0);
    return formData.amount - totalCharges;
  };

  // Fetch net payable when amount or charges change (in edit mode)
  useEffect(() => {
    if (isEditMode && paymentAdviceId && formData.amount > 0) {
      // Debounce the API call
      const timeoutId = setTimeout(() => {
        fetchNetPayable();
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      // Reset net payable in create mode
      setNetPayable(null);
    }
  }, [formData.amount, charges, isEditMode, paymentAdviceId, fetchNetPayable]);

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-4xl translate-x-[-50%] translate-y-[-50%]">
            <div className="glass rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-xl font-semibold">
                  {isEditMode ? 'Update Payment Advice' : 'Create Payment Advice'}
                </Dialog.Title>
                <button
                  onClick={() => onOpenChange(false)}
                  className="rounded-lg p-1 hover:bg-muted/50 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {loadingPaymentAdvice ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner />
                  <span className="ml-2 text-sm text-muted-foreground">Loading payment advice data...</span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Recipient (Vendor) *</label>
                    <select
                      value={formData.recipient_id}
                      onChange={(e) => setFormData({ ...formData, recipient_id: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      disabled={!!preselectedVendorId || !!preselectedPurchaseId}
                    >
                      <option value="">Select vendor</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.business_name}
                        </option>
                      ))}
                    </select>
                    {errors.recipient_id && <p className="mt-1 text-xs text-red-600">{errors.recipient_id}</p>}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Amount (₹) *</label>
                    <input
                      type="number"
                      value={formData.amount || ''}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      min="0"
                      step="0.01"
                    />
                    {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Date of Payment *</label>
                    <input
                      type="date"
                      value={formData.date_of_payment}
                      onChange={(e) => setFormData({ ...formData, date_of_payment: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    />
                    {errors.date_of_payment && <p className="mt-1 text-xs text-red-600">{errors.date_of_payment}</p>}
                  </div>
                  {isEditMode && (
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Status *</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'pending' | 'completed' | 'failed' })}
                        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      >
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">SR Number</label>
                    <input
                      type="text"
                      value={formData.sr_number || ''}
                      onChange={(e) => setFormData({ ...formData, sr_number: e.target.value || null })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Invoice Number</label>
                    <input
                      type="text"
                      value={formData.invoice_number || ''}
                      onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value || null })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Invoice Date</label>
                    <input
                      type="date"
                      value={formData.invoice_date || ''}
                      onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value || null })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Due Date</label>
                    <input
                      type="date"
                      value={formData.due_date || ''}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value || null })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Vendor Name</label>
                  <input
                    type="text"
                    value={formData.party_name || ''}
                    onChange={(e) => setFormData({ ...formData, party_name: e.target.value || null })}
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Vendor Address</label>
                  <input
                    type="text"
                    value={formData.party_address || ''}
                    onChange={(e) => setFormData({ ...formData, party_address: e.target.value || null })}
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Broker Name</label>
                    <input
                      type="text"
                      value={formData.broker_name || ''}
                      onChange={(e) => setFormData({ ...formData, broker_name: e.target.value || null })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      placeholder="Broker name"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Truck Number</label>
                    <input
                      type="text"
                      value={formData.truck_number || ''}
                      onChange={(e) => setFormData({ ...formData, truck_number: e.target.value || null })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      placeholder="Vehicle number"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Item</label>
                  <input
                    type="text"
                    value={formData.item || ''}
                    onChange={(e) => setFormData({ ...formData, item: e.target.value || null })}
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    placeholder="Item name(s)"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Total Weight (kg)</label>
                    <input
                      type="number"
                      value={formData.bill_weight || ''}
                      onChange={(e) => setFormData({ ...formData, bill_weight: parseFloat(e.target.value) || null })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Kanta Weight (kg)</label>
                    <input
                      type="number"
                      value={formData.kanta_weight || ''}
                      onChange={(e) => setFormData({ ...formData, kanta_weight: parseFloat(e.target.value) || null })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Final Weight (kg)</label>
                    <input
                      type="number"
                      value={formData.final_weight || ''}
                      onChange={(e) => setFormData({ ...formData, final_weight: parseFloat(e.target.value) || null })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Rate (₹/kg)</label>
                    <input
                      type="number"
                      value={formData.rate || ''}
                      onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || null })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Total Bags</label>
                    <input
                      type="number"
                      value={formData.total_bags || ''}
                      onChange={(e) => setFormData({ ...formData, total_bags: parseInt(e.target.value) || null })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Notes</label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    rows={3}
                  />
                </div>

                <ChargesTable
                  charges={charges}
                  onChargesChange={setCharges}
                  amount={formData.amount}
                />

                {/* Amount Breakdown */}
                {formData.amount > 0 && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                    <h3 className="text-sm font-semibold mb-3">Payment Amount Breakdown</h3>
                    {(() => {
                      const totalCharges = charges.reduce((sum, charge) => sum + (charge.charge_value || 0), 0);
                      const calculatedNetPayable = calculateNetPayable();

                      return (
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Payment Amount:</span>
                            <span className="font-medium">₹{formData.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                          </div>
                          {charges.length > 0 && (
                            <>
                              {charges.map((charge, index) => (
                                <div key={index} className="flex justify-between text-red-600">
                                  <span>{charge.charge_name || `Charge ${index + 1}`}:</span>
                                  <span>- ₹{(charge.charge_value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                </div>
                              ))}
                              <div className="flex justify-between pt-1 border-t border-primary/20">
                                <span className="text-muted-foreground">Total Charges:</span>
                                <span className="font-medium text-red-600">
                                  - ₹{totalCharges.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </>
                          )}
                          <div className="flex justify-between pt-2 border-t border-primary/20 font-semibold text-sm">
                            <span>Net Payable:</span>
                            <span className="text-primary">
                              {loadingNetPayable ? (
                                <span className="text-xs text-muted-foreground">Calculating...</span>
                              ) : (
                                `₹${calculatedNetPayable.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {isEditMode && paymentAdviceId && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    <h3 className="text-sm font-semibold">Payment Slip</h3>
                    <DocumentUpload
                      label="Payment Slip"
                      onUpload={handleSlipUpload}
                      loading={uploading}
                    />
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Transaction ID</label>
                      <input
                        type="text"
                        value={formData.transaction_id || ''}
                        onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value || null })}
                        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                        placeholder="TXN123456789"
                      />
                    </div>
                  </div>
                )}

                <div className="bg-primary/10 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Net Payable:</span>
                    <span className="text-lg font-bold text-primary">
                      {loadingNetPayable ? (
                        <span className="text-sm text-muted-foreground">Calculating...</span>
                      ) : (
                        `₹${calculateNetPayable().toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                      )}
                    </span>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Saving...' : isEditMode ? 'Update Payment Advice' : 'Create Payment Advice'}
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


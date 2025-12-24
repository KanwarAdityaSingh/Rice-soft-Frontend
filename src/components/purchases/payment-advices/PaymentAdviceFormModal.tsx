import * as Dialog from '@radix-ui/react-dialog';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Plus, Trash2, FileText, Edit2, Download, Mail, MessageCircle } from 'lucide-react';
import { usePaymentAdvices } from '../../../hooks/usePaymentAdvices';
import { paymentAdvicesAPI } from '../../../services/paymentAdvices.api';
import { purchaseSummaryAPI } from '../../../services/purchaseSummary.api';
import { kaantasAPI } from '../../../services/kaantas.api';
import { vendorsAPI } from '../../../services/vendors.api';
import { vehiclesAPI } from '../../../services/vehicles.api';
import { useVendors } from '../../../hooks/useVendors';
import { useSaudas } from '../../../hooks/useSaudas';
import { useInwardSlipPasses } from '../../../hooks/useInwardSlipPasses';
import { useBrokers } from '../../../hooks/useBrokers';
import { transportersAPI } from '../../../services/transporters.api';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { getRiceTypeLabel } from '../../../utils/riceType';
import { AlertDialog } from '../../shared/AlertDialog';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { NotificationModal } from '../../shared/NotificationModal';
import type { 
  CreatePaymentAdviceRequest, 
  UpdatePaymentAdviceRequest, 
  AddChargeRequest,
  SaudaPurchaseSummary,
  ISPPurchaseSummary,
  RiceCode,
  RiceType,
  Sauda,
  Transporter,
  Kaanta,
  Vehicle,
  PaymentAdvice
} from '../../../types/entities';

// Default recipient type
interface DefaultRecipient {
  name: string;
  address: string;
  llpin: string;
}

type LinkType = 'sauda' | 'isp';

interface PaymentAdviceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentAdviceId?: string | null;
}

// Generate invoice number
const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PAI${date.getFullYear()}${month}S/${year}-${random}`;
};

export function PaymentAdviceFormModal({ open, onOpenChange, paymentAdviceId }: PaymentAdviceFormModalProps) {
  const { createPaymentAdvice, updatePaymentAdvice } = usePaymentAdvices();
  const { vendors } = useVendors();
  const { saudas } = useSaudas();
  const { inwardSlipPasses } = useInwardSlipPasses();
  const { brokers } = useBrokers();
  const isEditMode = !!paymentAdviceId;
  
  // Reference data
  const [riceCodes, setRiceCodes] = useState<RiceCode[]>([]);
  const [riceTypes, setRiceTypes] = useState<RiceType[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [kaantas, setKaantas] = useState<Kaanta[]>([]);
  const [defaultRecipient, setDefaultRecipient] = useState<DefaultRecipient | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  
  // Link type selection
  const [linkType, setLinkType] = useState<LinkType>('sauda');
  
  // Form state
  const [formData, setFormData] = useState<CreatePaymentAdviceRequest>({
    sauda_id: null,
    inward_slip_pass_id: null,
    payer_id: '',
    recipient_id: '', // Will be auto-set
    amount: undefined,
    igst_percentage: 0,
    date_of_payment: new Date().toISOString().split('T')[0],
    transaction_id: null,
    charges: [],
  });
  
  const [invoiceNo, setInvoiceNo] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  
  // Summary preview
  const [summary, setSummary] = useState<SaudaPurchaseSummary | ISPPurchaseSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  
  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingPA, setLoadingPA] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [newCharge, setNewCharge] = useState<AddChargeRequest>({
    charge_name: '',
    charge_value: 0,
    charge_type: 'fixed',
  });
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [createdPaymentAdvice, setCreatedPaymentAdvice] = useState<PaymentAdvice | null>(null);

  // Load reference data
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const [codes, types, trans, recipient] = await Promise.all([
          riceCodesAPI.getAllRiceCodes(),
          riceCodesAPI.getRiceTypes(),
          transportersAPI.getAllTransporters(),
          vendorsAPI.getDefaultRecipient()
        ]);
        setRiceCodes(codes);
        setRiceTypes(types);
        setTransporters(trans);
        setDefaultRecipient(recipient);
      } catch (error) {
        console.error('Failed to fetch reference data:', error);
      }
    };
    if (open) {
      fetchReferenceData();
    }
  }, [open]);

  useEffect(() => {
    if (open && paymentAdviceId && isEditMode) {
      loadPAData();
    } else if (open && !paymentAdviceId) {
      resetForm();
    }
  }, [open, paymentAdviceId]);

  // Fetch summary when selection changes
  useEffect(() => {
    const fetchSummary = async () => {
      if (linkType === 'sauda' && formData.sauda_id) {
        setLoadingSummary(true);
        try {
          const [data, kaantaData] = await Promise.all([
            purchaseSummaryAPI.getSaudaSummary(formData.sauda_id, formData.igst_percentage),
            kaantasAPI.getAllKaantas(formData.sauda_id)
          ]);
          setSummary(data);
          setKaantas(kaantaData);
        } catch (error) {
          console.error('Failed to fetch sauda summary:', error);
          setSummary(null);
        } finally {
          setLoadingSummary(false);
        }
      } else if (linkType === 'isp' && formData.inward_slip_pass_id) {
        setLoadingSummary(true);
        try {
          const [data, kaantaData] = await Promise.all([
            purchaseSummaryAPI.getISPSummary(formData.inward_slip_pass_id, formData.igst_percentage),
            kaantasAPI.getAllKaantas(undefined, formData.inward_slip_pass_id)
          ]);
          setSummary(data);
          setKaantas(kaantaData);
        } catch (error) {
          console.error('Failed to fetch ISP summary:', error);
          setSummary(null);
        } finally {
          setLoadingSummary(false);
        }
      } else {
        setSummary(null);
        setKaantas([]);
      }
    };
    fetchSummary();
  }, [linkType, formData.sauda_id, formData.inward_slip_pass_id, formData.igst_percentage]);

  const loadPAData = async () => {
    if (!paymentAdviceId) return;
    setLoadingPA(true);
    try {
      const pa = await paymentAdvicesAPI.getPaymentAdviceById(paymentAdviceId);
      if (pa.sauda_id) {
        setLinkType('sauda');
      } else if (pa.inward_slip_pass_id) {
        setLinkType('isp');
      }
      setFormData({
        sauda_id: pa.sauda_id || null,
        inward_slip_pass_id: pa.inward_slip_pass_id || null,
        payer_id: pa.payer_id,
        recipient_id: pa.recipient_id,
        amount: pa.amount,
        date_of_payment: pa.date_of_payment,
        transaction_id: pa.transaction_id || null,
        charges: pa.charges.map(c => ({
          charge_name: c.charge_name,
          charge_value: c.charge_value,
          charge_type: c.charge_type,
        })),
      });
      setInvoiceNo(pa.transaction_id || '');
      setErrors({});
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to load payment advice data');
      setAlertOpen(true);
    } finally {
      setLoadingPA(false);
    }
  };

  const resetForm = () => {
    setLinkType('sauda');
    setFormData({
      sauda_id: null,
      inward_slip_pass_id: null,
      payer_id: '',
      recipient_id: '',
      amount: undefined,
      igst_percentage: 0,
      date_of_payment: new Date().toISOString().split('T')[0],
      transaction_id: null,
      charges: [],
    });
    setInvoiceNo(generateInvoiceNumber());
    // Set due date to 10 days from now
    const due = new Date();
    due.setDate(due.getDate() + 10);
    setDueDate(due.toISOString().split('T')[0]);
    setSummary(null);
    setKaantas([]);
    setErrors({});
    setNewCharge({
      charge_name: '',
      charge_value: 0,
      charge_type: 'fixed',
    });
    setCreatedPaymentAdvice(null);
    setNotificationOpen(false);
  };

  const getRiceCodeName = (riceCodeId: string | null | undefined): string => {
    if (!riceCodeId) return '';
    const riceCode = riceCodes.find(rc => rc.rice_code_id === riceCodeId);
    return riceCode ? riceCode.rice_code_name : '';
  };

  const getVendorName = (vendorId: string | null | undefined): string => {
    if (!vendorId) return '';
    const vendor = vendors.find(v => v.id === vendorId);
    return vendor ? vendor.business_name : '';
  };

  const getVendorAddress = (vendorId: string | null | undefined): string => {
    if (!vendorId) return '';
    const vendor = vendors.find(v => v.id === vendorId);
    if (!vendor?.address) return '';
    const a = vendor.address;
    return [a.street, a.city, a.state, a.pincode].filter(Boolean).join(', ');
  };

  const getBrokerName = (brokerId: string | null | undefined): string => {
    if (!brokerId) return '';
    const broker = brokers.find(b => b.id === brokerId);
    return broker?.contact_persons?.[0]?.name || broker?.business_name || '';
  };

  const getTransporterName = (transporterId: string | null | undefined): string => {
    if (!transporterId) return '';
    const transporter = transporters.find(t => t.id === transporterId);
    return transporter?.business_name || '';
  };

  const getSaudaDisplayName = (sauda: Sauda): string => {
    const parts: string[] = [];
    const vendorName = getVendorName(sauda.purchaser_id);
    if (vendorName) parts.push(vendorName);
    const riceCodeName = getRiceCodeName(sauda.rice_code_id);
    if (riceCodeName) parts.push(riceCodeName);
    const riceTypeLabel = getRiceTypeLabel(sauda.rice_type, riceTypes);
    if (riceTypeLabel) parts.push(riceTypeLabel);
    parts.push(`₹${sauda.rate}/kg`);
    return parts.join(' - ');
  };

  // Get the currently selected sauda or ISP data
  const selectedSauda = useMemo(() => {
    if (linkType === 'sauda' && formData.sauda_id) {
      return saudas.find(s => s.id === formData.sauda_id);
    }
    return null;
  }, [linkType, formData.sauda_id, saudas]);

  const selectedISP = useMemo(() => {
    if (linkType === 'isp' && formData.inward_slip_pass_id) {
      return inwardSlipPasses.find(i => i.id === formData.inward_slip_pass_id);
    } else if (linkType === 'sauda' && formData.sauda_id) {
      // Find ISP that contains this sauda
      return inwardSlipPasses.find(i => i.sauda_ids?.includes(formData.sauda_id!));
    }
    return null;
  }, [linkType, formData.sauda_id, formData.inward_slip_pass_id, inwardSlipPasses]);

  // Fetch vehicle when ISP changes
  useEffect(() => {
    const fetchVehicle = async () => {
      if (selectedISP?.vehicle_id) {
        try {
          const vehicleData = await vehiclesAPI.getVehicleById(selectedISP.vehicle_id);
          setVehicle(vehicleData);
        } catch (err) {
          console.error('Failed to fetch vehicle:', err);
          setVehicle(null);
        }
      } else {
        setVehicle(null);
      }
    };
    fetchVehicle();
  }, [selectedISP?.vehicle_id]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (linkType === 'sauda' && !formData.sauda_id) {
      newErrors.link = 'Please select a sauda';
    } else if (linkType === 'isp' && !formData.inward_slip_pass_id) {
      newErrors.link = 'Please select an ISP';
    }

    if (!formData.payer_id) {
      newErrors.payer_id = 'Payer is required';
    }
    if (!formData.date_of_payment) {
      newErrors.date_of_payment = 'Date of payment is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const submitData: CreatePaymentAdviceRequest = {
        sauda_id: linkType === 'sauda' ? formData.sauda_id : null,
        inward_slip_pass_id: linkType === 'isp' ? formData.inward_slip_pass_id : null,
        payer_id: formData.payer_id,
        recipient_id: formData.payer_id, // Using payer as recipient for now (actual recipient is hardcoded in display)
        amount: formData.amount,
        igst_percentage: formData.igst_percentage,
        date_of_payment: formData.date_of_payment,
        transaction_id: invoiceNo || null,
        charges: formData.charges,
      };

      if (isEditMode && paymentAdviceId) {
        const updated = await updatePaymentAdvice(paymentAdviceId, submitData as UpdatePaymentAdviceRequest);
        setCreatedPaymentAdvice(updated);
        setAlertType('success');
        setAlertTitle('Success');
        setAlertMessage('Payment advice updated successfully');
      } else {
        const created = await createPaymentAdvice(submitData);
        setCreatedPaymentAdvice(created);
        setAlertType('success');
        setAlertTitle('Success');
        setAlertMessage('Payment advice created successfully');
      }
      setAlertOpen(true);
      // Don't auto-close, let user send notifications if needed
      // setTimeout(() => {
      //   onOpenChange(false);
      //   resetForm();
      // }, 1500);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to save payment advice');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCharge = () => {
    if (!newCharge.charge_name || newCharge.charge_value <= 0) return;
    setFormData({
      ...formData,
      charges: [...(formData.charges || []), newCharge],
    });
    setNewCharge({
      charge_name: '',
      charge_value: 0,
      charge_type: 'fixed',
    });
  };

  const handleRemoveCharge = (index: number) => {
    const updatedCharges = [...(formData.charges || [])];
    updatedCharges.splice(index, 1);
    setFormData({
      ...formData,
      charges: updatedCharges,
    });
  };

  const calculateNetPayable = () => {
    const baseAmount = formData.amount || (summary?.final_total_amount ?? 0);
    let net = baseAmount;
    (formData.charges || []).forEach(charge => {
      if (charge.charge_type === 'fixed') {
        net -= charge.charge_value;
      } else {
        net -= (baseAmount * charge.charge_value / 100);
      }
    });
    return Math.max(0, net);
  };

  const handleLinkTypeChange = (type: LinkType) => {
    setLinkType(type);
    setFormData({
      ...formData,
      sauda_id: null,
      inward_slip_pass_id: null,
    });
    setSummary(null);
    setKaantas([]);
  };

  const previewAmount = formData.amount || (summary?.final_total_amount ?? 0);
  const activeSaudas = saudas.filter(s => s.status === 'active' || s.status === 'completed');

  // Calculate bill weight (sauda quantity), kaanta weight, final weight
  const billWeight = summary?.total_weight ?? 0;
  const kaantaWeight = kaantas.reduce((sum, k) => sum + k.kaanta_weight, 0);
  const totalBags = summary?.total_bags ?? kaantas.reduce((sum, k) => sum + k.no_of_bags, 0);

  // Reference for PDF download
  const previewRef = useRef<HTMLDivElement>(null);

  // Download PDF function
  const handleDownloadPDF = () => {
    if (!previewRef.current) return;

    const printContent = previewRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to download the PDF');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Advice - ${invoiceNo}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              font-size: 12px;
              color: #000;
            }
            .preview-container { max-width: 800px; margin: 0 auto; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .font-medium { font-weight: 500; }
            .text-lg { font-size: 16px; }
            .text-xs { font-size: 10px; }
            .text-muted-foreground { color: #666; }
            .border-b { border-bottom: 1px solid #ddd; }
            .border-t { border-top: 1px solid #ddd; }
            .border-l { border-left: 1px solid #ddd; }
            .border-border { border-color: #ddd; }
            .pb-3 { padding-bottom: 12px; }
            .pt-2 { padding-top: 8px; }
            .mt-2 { margin-top: 8px; }
            .mt-4 { margin-top: 16px; }
            .py-1 { padding: 4px 0; }
            .pl-4 { padding-left: 16px; }
            .space-y-1 > * + * { margin-top: 4px; }
            .space-y-4 > * + * { margin-top: 16px; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
            .gap-x-6 { column-gap: 24px; }
            .gap-y-1 { row-gap: 4px; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .text-right { text-align: right; }
            .text-primary { color: #7c3aed; }
            h3 { margin-bottom: 4px; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="preview-container">
            ${printContent}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-[90vw] md:w-full max-w-5xl translate-x-[-50%] translate-y-[-50%]">
            <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-xl sm:text-2xl font-semibold">
                  {isEditMode ? 'Edit Payment Advice' : 'Create Payment Advice'}
                </Dialog.Title>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {loadingPA ? (
                <div className="flex justify-center py-10">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Form Section */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Link Type Selection */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Link To <span className="text-red-500">*</span>
                      </label>
                      <div className="flex rounded-lg border border-border overflow-hidden mb-3">
                        <button
                          type="button"
                          onClick={() => handleLinkTypeChange('sauda')}
                          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                            linkType === 'sauda' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-background hover:bg-muted'
                          }`}
                        >
                          Sauda
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLinkTypeChange('isp')}
                          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                            linkType === 'isp' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-background hover:bg-muted'
                          }`}
                        >
                          ISP
                        </button>
                      </div>

                      {linkType === 'sauda' ? (
                        <select
                          value={formData.sauda_id || ''}
                          onChange={(e) => setFormData({ ...formData, sauda_id: e.target.value || null })}
                          className={`w-full px-3 py-2 border rounded-lg bg-background ${
                            errors.link ? 'border-red-500' : 'border-border'
                          }`}
                        >
                          <option value="">Select Sauda</option>
                          {activeSaudas.map((s) => (
                            <option key={s.id} value={s.id}>
                              {getSaudaDisplayName(s)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={formData.inward_slip_pass_id || ''}
                          onChange={(e) => setFormData({ ...formData, inward_slip_pass_id: e.target.value || null })}
                          className={`w-full px-3 py-2 border rounded-lg bg-background ${
                            errors.link ? 'border-red-500' : 'border-border'
                          }`}
                        >
                          <option value="">Select ISP</option>
                          {inwardSlipPasses.map((isp) => (
                            <option key={isp.id} value={isp.id}>
                              {isp.slip_number} - {isp.party_name} ({isp.sauda_ids?.length || 0} saudas)
                            </option>
                          ))}
                        </select>
                      )}
                      {errors.link && (
                        <p className="text-xs text-red-500 mt-1">{errors.link}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Payer (Party) <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.payer_id}
                          onChange={(e) => setFormData({ ...formData, payer_id: e.target.value })}
                          className={`w-full px-3 py-2 border rounded-lg bg-background ${
                            errors.payer_id ? 'border-red-500' : 'border-border'
                          }`}
                        >
                          <option value="">Select Payer</option>
                          {vendors.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.business_name}
                            </option>
                          ))}
                        </select>
                        {errors.payer_id && (
                          <p className="text-xs text-red-500 mt-1">{errors.payer_id}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">IGST %</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={formData.igst_percentage || ''}
                          onChange={(e) => setFormData({ ...formData, igst_percentage: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Invoice No
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={invoiceNo}
                            onChange={(e) => setInvoiceNo(e.target.value)}
                            className="w-full px-3 py-2 pr-8 border border-border rounded-lg bg-background"
                            placeholder="PAI2024..."
                          />
                          <Edit2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Auto-generated, editable</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Date of Payment <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={formData.date_of_payment}
                          onChange={(e) => setFormData({ ...formData, date_of_payment: e.target.value })}
                          className={`w-full px-3 py-2 border rounded-lg bg-background ${
                            errors.date_of_payment ? 'border-red-500' : 'border-border'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Due Date</label>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Amount (₹) <span className="text-muted-foreground text-xs">(Optional)</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.amount || ''}
                          onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || undefined })}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                          placeholder={summary ? `Auto: ₹${summary.final_total_amount.toFixed(2)}` : 'Leave empty to auto-calculate'}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Leave empty to auto-calculate</p>
                      </div>
                    </div>

                    {/* Charges Section */}
                    <div className="pt-4 border-t border-border">
                      <h3 className="text-sm font-semibold mb-3">Charges (Deductions)</h3>
                      <div className="space-y-2">
                        {(formData.charges || []).map((charge, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                            <div className="flex-1">
                              <span className="text-sm font-medium">{charge.charge_name}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                {charge.charge_type === 'fixed' ? `₹${(charge.charge_value ?? 0).toFixed(2)}` : `${charge.charge_value ?? 0}%`}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveCharge(index)}
                              className="p-1 hover:bg-muted rounded"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newCharge.charge_name}
                            onChange={(e) => setNewCharge({ ...newCharge, charge_name: e.target.value })}
                            className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background"
                            placeholder="e.g., RTGS Charges"
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={newCharge.charge_value || ''}
                            onChange={(e) => setNewCharge({ ...newCharge, charge_value: parseFloat(e.target.value) || 0 })}
                            className="w-20 px-2 py-2 text-sm border border-border rounded-lg bg-background"
                            placeholder="Value"
                          />
                          <select
                            value={newCharge.charge_type}
                            onChange={(e) => setNewCharge({ ...newCharge, charge_type: e.target.value as 'fixed' | 'percentage' })}
                            className="px-2 py-2 text-sm border border-border rounded-lg bg-background"
                          >
                            <option value="fixed">₹</option>
                            <option value="percentage">%</option>
                          </select>
                          <button
                            type="button"
                            onClick={handleAddCharge}
                            className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
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

                    {/* Notification Buttons - Show after successful save */}
                    {createdPaymentAdvice && alertType === 'success' && !loading && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-3 text-center">Send notification to recipients:</p>
                        <div className="flex gap-3 justify-center">
                          <button
                            type="button"
                            onClick={() => setNotificationOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium transition-all shadow-lg"
                          >
                            <Mail className="h-4 w-4" />
                            Send Email
                          </button>
                          <button
                            type="button"
                            onClick={() => setNotificationOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-medium transition-all shadow-lg"
                          >
                            <MessageCircle className="h-4 w-4" />
                            Send WhatsApp
                          </button>
                        </div>
                      </div>
                    )}
                  </form>

                  {/* Preview Section */}
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4 text-sm">
                    {loadingSummary ? (
                      <div className="flex justify-center items-center h-full">
                        <LoadingSpinner />
                      </div>
                    ) : !summary && !formData.sauda_id && !formData.inward_slip_pass_id ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <FileText className="h-12 w-12 mb-3 opacity-50" />
                        <p>Select a Sauda or ISP to see preview</p>
                      </div>
                    ) : (
                      <div className="space-y-4" ref={previewRef}>
                        {/* Header */}
                        <div className="text-center border-b border-border pb-3">
                          <h3 className="font-bold text-lg">{defaultRecipient?.name || 'Loading...'}</h3>
                          <p className="text-xs text-muted-foreground">LLPIN- {defaultRecipient?.llpin || '-'}</p>
                          <p className="text-xs text-muted-foreground">{defaultRecipient?.address || '-'}</p>
                        </div>

                        {/* SR NO and Invoice Info */}
                        <div className="flex justify-between">
                          <div>
                            <span className="font-semibold">SR.NO. </span>
                            <span>{invoiceNo?.split('/')[1]?.split('-')[1] || '001'}</span>
                          </div>
                          <div className="text-right">
                            <div><span className="text-muted-foreground">inv No</span> <span className="font-medium">{invoiceNo}</span></div>
                            <div><span className="text-muted-foreground">Date</span> <span className="font-medium">{formData.date_of_payment ? new Date(formData.date_of_payment).toLocaleDateString('en-IN') : '-'}</span></div>
                          </div>
                        </div>

                        {/* Payment Details Header */}
                        <div className="text-center font-bold border-b border-t border-border py-1">
                          PAYMENT DETAILS
                        </div>

                        {/* Two Column Layout */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                          {/* Left Column */}
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Party Name</span>
                              <span className="font-medium text-right">{getVendorName(formData.payer_id) || selectedISP?.party_name || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Address</span>
                              <span className="text-right text-xs">{getVendorAddress(formData.payer_id) || selectedISP?.party_address || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Broker</span>
                              <span className="font-medium">{getBrokerName(selectedSauda?.broker_id) || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Bill Weight</span>
                              <span className="font-medium">{billWeight.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Kanta Weight</span>
                              <span className="font-medium">{kaantaWeight.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Less: Dana 300gm per Qtl</span>
                              <span className="font-medium">0.00</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Final Weight</span>
                              <span className="font-medium">{(summary?.total_weight ?? kaantaWeight).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Rate</span>
                              <span className="font-medium">{selectedSauda?.rate?.toFixed(2) || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Amount</span>
                              <span className="font-bold">{(summary?.base_amount ?? 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Brokerage Rs {selectedSauda?.broker_commission_type === 'percentage' ? `${selectedSauda?.broker_commission || 0}%` : ''}</span>
                              <span className="font-medium">{(summary?.broker_commission_amount ?? 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">CD {selectedSauda?.cash_discount_type === 'percentage' ? `${selectedSauda?.cash_discount || 0}%` : ''}</span>
                              <span className="font-medium">{(summary?.cash_discount_amount ?? 0).toFixed(2)}</span>
                            </div>
                            {/* Custom Charges */}
                            {(formData.charges || []).map((charge, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span className="text-muted-foreground">{charge.charge_name}</span>
                                <span className="font-medium">
                                  {charge.charge_type === 'fixed' 
                                    ? charge.charge_value.toFixed(2) 
                                    : ((previewAmount * charge.charge_value / 100)).toFixed(2)
                                  }
                                </span>
                              </div>
                            ))}
                            <div className="flex justify-between border-t border-border pt-2 mt-2">
                              <span className="font-bold">Net Payable</span>
                              <span className="font-bold text-lg text-primary">{calculateNetPayable().toFixed(2)}</span>
                            </div>
                          </div>

                          {/* Right Column */}
                          <div className="space-y-1 border-l border-border pl-4">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Truck No</span>
                              <span className="font-medium">{vehicle?.vehicle_number || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Item</span>
                              <span className="font-medium">{getRiceCodeName(selectedSauda?.rice_code_id) || 'RICE'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Bag</span>
                              <span className="font-medium">{totalBags}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">DUE Date</span>
                              <span className="font-medium">{dueDate ? new Date(dueDate).toLocaleDateString('en-IN') : '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">FREIGHT</span>
                              <span className="font-medium">{(selectedISP?.transportation_cost ?? summary?.transportation_cost ?? 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Transporter</span>
                              <span className="font-medium text-xs">{getTransporterName(selectedISP?.transporter_id) || '-'}</span>
                            </div>
                            <div className="flex justify-between mt-4">
                              <span className="text-muted-foreground">IGST ({formData.igst_percentage || 0}%)</span>
                              <span className="font-medium">{(summary?.igst_amount ?? 0).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Download Button - Outside previewRef so it won't appear in PDF */}
                    {summary && (
                      <div className="pt-4 border-t border-border flex justify-center">
                        <button
                          type="button"
                          onClick={handleDownloadPDF}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors inline-flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download PDF
                        </button>
                      </div>
                    )}
                  </div>
                </div>
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

      <NotificationModal
        open={notificationOpen}
        onOpenChange={setNotificationOpen}
        type="payment-advice"
        paymentAdviceData={createdPaymentAdvice ? {
          adviceNumber: createdPaymentAdvice.transaction_id || invoiceNo,
          vendorName: getVendorName(createdPaymentAdvice.payer_id),
          amount: createdPaymentAdvice.amount || 0,
          date: createdPaymentAdvice.date_of_payment,
        } : undefined}
        onSuccess={() => {
          setNotificationOpen(false);
          setTimeout(() => {
            onOpenChange(false);
            resetForm();
          }, 1000);
        }}
      />
    </>
  );
}

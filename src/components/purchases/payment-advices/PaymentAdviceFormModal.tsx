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
import { getCompletionStatus, formatCompletionPercentage, formatWeightDisplay } from '../../../utils/saudaCompletion';
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
  const [notificationInitialTab, setNotificationInitialTab] = useState<'email' | 'whatsapp'>('email');
  const [createdPaymentAdvice, setCreatedPaymentAdvice] = useState<PaymentAdvice | null>(null);
  const [loadedPaymentAdvice, setLoadedPaymentAdvice] = useState<PaymentAdvice | null>(null);

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
            purchaseSummaryAPI.getSaudaSummary(formData.sauda_id),
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
            purchaseSummaryAPI.getISPSummary(formData.inward_slip_pass_id),
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
  }, [linkType, formData.sauda_id, formData.inward_slip_pass_id]);

  const loadPAData = async () => {
    if (!paymentAdviceId) return;
    setLoadingPA(true);
    try {
      const pa = await paymentAdvicesAPI.getPaymentAdviceById(paymentAdviceId);
      setLoadedPaymentAdvice(pa);
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
  const activeSaudas = saudas.filter(s => s.status === 'active' || s.status === 'completed' || s.status === 'draft');

  // Calculate bill weight (sauda quantity), kaanta weight, final weight
  // Use payment advice fields if available, otherwise calculate from kaantas
  const totalSaidSentWeight = kaantas.reduce((sum, k) => sum + (k.said_sent_weight || 0), 0);
  const totalKaantaWeight = kaantas.reduce((sum, k) => sum + k.kaanta_weight, 0);
  // Dana deduction formula: (said_sent_weight * 300/1000) / 100 = 300gm per quintal
  const calculatedDanaDeduction = totalSaidSentWeight > 0 ? (totalSaidSentWeight * 300 / 1000) / 100 : 0;
  
  const billWeight = createdPaymentAdvice?.bill_weight ?? loadedPaymentAdvice?.bill_weight ?? totalSaidSentWeight;
  const kaantaWeight = createdPaymentAdvice?.kanta_weight ?? loadedPaymentAdvice?.kanta_weight ?? totalKaantaWeight;
  const danaDeduction = createdPaymentAdvice?.dana_deduction ?? loadedPaymentAdvice?.dana_deduction ?? calculatedDanaDeduction;
  const finalWeight = createdPaymentAdvice?.final_weight ?? loadedPaymentAdvice?.final_weight ?? (kaantaWeight - danaDeduction);
  const totalBags = summary?.total_bags ?? kaantas.reduce((sum, k) => sum + k.no_of_bags, 0);

  // Reference for PDF download
  const previewRef = useRef<HTMLDivElement>(null);

  // Download PDF function
  const handleDownloadPDF = () => {
    if (!previewRef.current) return;

    try {
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
            <meta charset="UTF-8">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: 'Arial', 'Helvetica', sans-serif; 
                padding: 30px; 
                font-size: 14px;
                line-height: 1.6;
                color: #000;
                background: #fff;
              }
              .preview-container { 
                max-width: 900px; 
                margin: 0 auto; 
                background: white;
                padding: 30px;
              }
              .text-center { text-align: center; }
              .font-bold { font-weight: bold; }
              .font-medium { font-weight: 600; }
              .font-semibold { font-weight: 600; }
              .text-lg { font-size: 18px; }
              .text-xl { font-size: 20px; }
              .text-2xl { font-size: 24px; }
              .text-xs { font-size: 12px; }
              .text-sm { font-size: 13px; }
              .text-muted-foreground { color: #666; }
              .border-b { border-bottom: 1px solid #ddd; }
              .border-t { border-top: 1px solid #ddd; }
              .border-l { border-left: 1px solid #ddd; }
              .border-border { border-color: #ddd; }
              .border-dashed { border-style: dashed; }
              .border-dotted { border-style: dotted; }
              .pb-3 { padding-bottom: 16px; }
              .pt-2 { padding-top: 12px; }
              .pt-4 { padding-top: 20px; }
              .mt-2 { margin-top: 12px; }
              .mt-4 { margin-top: 20px; }
              .mb-2 { margin-bottom: 12px; }
              .mb-3 { margin-bottom: 16px; }
              .mb-4 { margin-bottom: 20px; }
              .py-1 { padding: 8px 0; }
              .pl-4 { padding-left: 20px; }
              .space-y-1 > * + * { margin-top: 8px; }
              .space-y-4 > * + * { margin-top: 20px; }
              .grid { display: grid; }
              .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
              .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
              .gap-x-6 { column-gap: 30px; }
              .gap-y-1 { row-gap: 8px; }
              .gap-2 { gap: 12px; }
              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .text-right { text-align: right; }
              .text-primary { color: #7c3aed; }
              h2 { font-size: 20px; margin-bottom: 10px; }
              h3 { font-size: 16px; margin-bottom: 12px; font-weight: bold; }
              p { margin-bottom: 8px; }
              @media print {
                body { padding: 15px; }
                .preview-container { padding: 20px; }
                @page { margin: 1cm; }
              }
            </style>
          </head>
          <body>
            <div class="preview-container">
              ${printContent}
            </div>
            <script>
              (function() {
                var printWindow = window;
                var closed = false;
                
                function closeWindow() {
                  if (!closed && printWindow && !printWindow.closed) {
                    closed = true;
                    try {
                      printWindow.close();
                    } catch (e) {
                      // Ignore errors when closing
                    }
                  }
                }
                
                // Use onafterprint event if available (more reliable)
                if (printWindow.matchMedia) {
                  var mediaQueryList = printWindow.matchMedia('print');
                  mediaQueryList.addEventListener('change', function(mql) {
                    if (!mql.matches) {
                      // Print dialog was closed
                      setTimeout(closeWindow, 100);
                    }
                  });
                }
                
                // Fallback: use onafterprint event
                printWindow.onafterprint = function() {
                  setTimeout(closeWindow, 100);
                };
                
                // Trigger print after a short delay
                setTimeout(function() {
                  printWindow.print();
                }, 250);
              })();
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
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
                            onClick={() => {
                              setNotificationInitialTab('email');
                              setNotificationOpen(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium transition-all shadow-lg"
                          >
                            <Mail className="h-4 w-4" />
                            Send Email
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setNotificationInitialTab('whatsapp');
                              setNotificationOpen(true);
                            }}
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

                        {/* ISP: Per-Sauda Breakdown */}
                        {linkType === 'isp' && summary && 'saudas' in summary && summary.saudas && summary.saudas.length > 0 && (
                          <div className="mb-3 pb-3 border-b border-border">
                            <div className="text-xs font-semibold text-muted-foreground mb-2">Per Sauda Breakdown:</div>
                            <div className="space-y-2">
                              {summary.saudas.map((saudaItem, idx) => (
                                <div key={saudaItem.sauda_id} className="border border-border/50 rounded p-2 bg-muted/20">
                                  <div className="font-semibold text-xs mb-1">
                                    {idx + 1}. {getRiceCodeName(saudaItem.sauda_details.rice_code_id)} {getRiceTypeLabel(saudaItem.sauda_details.rice_type, riceTypes) || 'N/A'}
                                    {saudaItem.sauda_details.completion_percentage !== null && (
                                      <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${getCompletionStatus(saudaItem.sauda_details.completion_percentage).bgColor} ${getCompletionStatus(saudaItem.sauda_details.completion_percentage).color} border ${getCompletionStatus(saudaItem.sauda_details.completion_percentage).borderColor}`}>
                                        {formatCompletionPercentage(saudaItem.sauda_details.completion_percentage)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Weight:</span>
                                      <span>{saudaItem.total_weight.toFixed(2)} kg</span>
                                    </div>
                                    {saudaItem.sauda_details.quantity && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Received/Expected:</span>
                                        <span>{formatWeightDisplay(saudaItem.sauda_details.received_until_now, saudaItem.sauda_details.quantity)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Rate:</span>
                                      <span>₹{saudaItem.sauda_details.rate.toFixed(2)}/kg</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Base Amount:</span>
                                      <span>₹{saudaItem.base_amount.toFixed(2)}</span>
                                    </div>
                                    {saudaItem.cash_discount_amount > 0 && (
                                      <div className="flex justify-between text-emerald-600">
                                        <span>- Cash Discount:</span>
                                        <span>₹{saudaItem.cash_discount_amount.toFixed(2)}</span>
                                      </div>
                                    )}
                                    {saudaItem.broker_commission_amount > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">+ Broker Commission:</span>
                                        <span>₹{saudaItem.broker_commission_amount.toFixed(2)}</span>
                                      </div>
                                    )}
                                    <div className="col-span-2 flex justify-between font-semibold border-t border-border/30 pt-0.5 mt-0.5">
                                      <span>Sauda Total:</span>
                                      <span>₹{saudaItem.final_total_amount.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="text-xs font-semibold text-muted-foreground mt-2 pt-2 border-t border-border">Total Summary:</div>
                          </div>
                        )}

                        {/* Payment Details Header */}
                        <div className="text-center font-bold border-b border-t border-border py-1">
                          PAYMENT DETAILS
                        </div>

                        {/* Two Column Layout */}
                        {linkType === 'isp' && summary && 'saudas' in summary && summary.saudas && summary.saudas.length > 0 ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Party Name</span>
                                <span className="font-medium text-right">{getVendorName(formData.payer_id) || selectedISP?.party_name || '-'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Address</span>
                                <span className="text-right text-xs">{getVendorAddress(formData.payer_id) || selectedISP?.party_address || '-'}</span>
                              </div>
                            </div>
                            
                            {/* Per-Sauda Table */}
                            <div className="border border-border rounded-lg overflow-hidden">
                              <div className="bg-muted/50 px-3 py-2 text-xs font-semibold border-b border-border">
                                Sauda-wise Details
                              </div>
                              <div className="divide-y divide-border">
                                {summary.saudas.map((saudaItem, idx) => (
                                  <div key={saudaItem.sauda_id} className="p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="font-semibold text-xs">
                                        {idx + 1}. {getRiceCodeName(saudaItem.sauda_details.rice_code_id)} {getRiceTypeLabel(saudaItem.sauda_details.rice_type, riceTypes) || 'N/A'}
                                        {saudaItem.sauda_details.completion_percentage !== null && (
                                          <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${getCompletionStatus(saudaItem.sauda_details.completion_percentage).bgColor} ${getCompletionStatus(saudaItem.sauda_details.completion_percentage).color} border ${getCompletionStatus(saudaItem.sauda_details.completion_percentage).borderColor}`}>
                                            {formatCompletionPercentage(saudaItem.sauda_details.completion_percentage)}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs font-bold text-primary">
                                        ₹{saudaItem.final_total_amount.toFixed(2)}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Weight:</span>
                                        <span>{saudaItem.total_weight.toFixed(2)} kg</span>
                                      </div>
                                      {saudaItem.sauda_details.quantity && (
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Received/Expected:</span>
                                          <span>{formatWeightDisplay(saudaItem.sauda_details.received_until_now, saudaItem.sauda_details.quantity)}</span>
                                        </div>
                                      )}
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Rate:</span>
                                        <span>₹{saudaItem.sauda_details.rate.toFixed(2)}/kg</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Base Amount:</span>
                                        <span>₹{saudaItem.base_amount.toFixed(2)}</span>
                                      </div>
                                      {saudaItem.cash_discount_amount > 0 && (
                                        <div className="flex justify-between text-emerald-600">
                                          <span>- Cash Discount:</span>
                                          <span>₹{saudaItem.cash_discount_amount.toFixed(2)}</span>
                                        </div>
                                      )}
                                      {saudaItem.broker_commission_amount > 0 && (
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">+ Broker Commission:</span>
                                          <span>₹{saudaItem.broker_commission_amount.toFixed(2)}</span>
                                        </div>
                                      )}
                                      {getBrokerName(saudaItem.sauda_details.broker_id) && (
                                        <div className="flex justify-between col-span-2">
                                          <span className="text-muted-foreground">Broker:</span>
                                          <span className="text-xs">{getBrokerName(saudaItem.sauda_details.broker_id)}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {/* Total Row */}
                              <div className="bg-primary/10 px-3 py-2 border-t-2 border-primary/30">
                                <div className="flex justify-between items-center text-sm font-bold">
                                  <span>Total (All Saudas):</span>
                                  <span className="text-primary">₹{summary.final_total_amount.toFixed(2)}</span>
                                </div>
                                {/* Weight Calculation Flow */}
                                {(billWeight > 0 || kaantaWeight > 0 || danaDeduction > 0 || finalWeight > 0) && (
                                  <div className="mt-2 pt-2 border-t border-primary/20 space-y-0.5 text-[10px]">
                                    {billWeight > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Bill Weight:</span>
                                        <span>{billWeight.toFixed(2)} kg</span>
                                      </div>
                                    )}
                                    {kaantaWeight > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Kaanta Weight:</span>
                                        <span>{kaantaWeight.toFixed(2)} kg</span>
                                      </div>
                                    )}
                                    {danaDeduction > 0 && (
                                      <div className="flex justify-between text-red-600">
                                        <span className="text-muted-foreground">Less: Dana (300gm per Qtl):</span>
                                        <span>-{danaDeduction.toFixed(2)} kg</span>
                                      </div>
                                    )}
                                    {finalWeight > 0 && (
                                      <div className="flex justify-between font-semibold border-t border-primary/20 pt-0.5 mt-0.5">
                                        <span className="text-muted-foreground">Final Weight:</span>
                                        <span>{finalWeight.toFixed(2)} kg</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                  <span>Total Weight: {finalWeight.toFixed(2)} kg</span>
                                  <span>Total Bags: {summary.total_bags}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Transportation */}
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-3">
                              <div className="space-y-1">
                                {summary.transportation_cost > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">+ Transport:</span>
                                    <span className="font-medium">₹{summary.transportation_cost.toFixed(2)}</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Right Column for ISP */}
                              <div className="space-y-1 border-l border-border pl-4">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Truck No</span>
                                  <span className="font-medium">{vehicle?.vehicle_number || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Bag</span>
                                  <span className="font-medium">{summary.total_bags}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">DUE Date</span>
                                  <span className="font-medium">{dueDate ? new Date(dueDate).toLocaleDateString('en-IN') : '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">FREIGHT</span>
                                  <span className="font-medium">{summary.transportation_cost.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Transporter</span>
                                  <span className="font-medium text-xs">{getTransporterName(selectedISP?.transporter_id) || '-'}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Charges and Net Payable for ISP */}
                            {(formData.charges || []).length > 0 && (
                              <div className="mt-3 pt-3 border-t border-border">
                                <div className="text-xs font-semibold text-muted-foreground mb-2">Deductions:</div>
                                {(formData.charges || []).map((charge, idx) => (
                                  <div key={idx} className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">- {charge.charge_name}:</span>
                                    <span className="font-medium text-red-600">
                                      {charge.charge_type === 'fixed' 
                                        ? `₹${charge.charge_value.toFixed(2)}` 
                                        : `${charge.charge_value}% (₹${((previewAmount * charge.charge_value / 100)).toFixed(2)})`
                                      }
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            <div className="mt-3 pt-3 border-t-2 border-primary/30 bg-primary/10 rounded-lg p-3">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-sm">Net Payable:</span>
                                <span className="font-bold text-xl text-primary">₹{calculateNetPayable().toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Sauda: Show traditional format */
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
                                <span className="font-medium">{billWeight.toFixed(2)} kg</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Kaanta Weight</span>
                                <span className="font-medium">{kaantaWeight.toFixed(2)} kg</span>
                              </div>
                              {danaDeduction > 0 && (
                                <div className="flex justify-between text-red-600">
                                  <span className="text-muted-foreground">Less: Dana (300gm per Qtl)</span>
                                  <span className="font-medium">-{danaDeduction.toFixed(2)} kg</span>
                                </div>
                              )}
                              <div className="flex justify-between font-semibold">
                                <span className="text-muted-foreground">Final Weight</span>
                                <span className="font-medium">{finalWeight.toFixed(2)} kg</span>
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
                            {linkType === 'sauda' && summary && 'sauda_details' in summary && summary.sauda_details && summary.sauda_details.completion_percentage !== null && (
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Completion</span>
                                <div className="flex items-center gap-1">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getCompletionStatus(summary.sauda_details.completion_percentage).bgColor} ${getCompletionStatus(summary.sauda_details.completion_percentage).color} border ${getCompletionStatus(summary.sauda_details.completion_percentage).borderColor}`}>
                                    {formatCompletionPercentage(summary.sauda_details.completion_percentage)}
                                  </span>
                                  {summary.sauda_details.quantity && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {formatWeightDisplay(summary.sauda_details.received_until_now, summary.sauda_details.quantity)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
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
        initialTab={notificationInitialTab}
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

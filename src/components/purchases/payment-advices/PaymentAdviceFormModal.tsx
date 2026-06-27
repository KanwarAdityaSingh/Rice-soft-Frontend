import * as Dialog from '@radix-ui/react-dialog';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Plus, Trash2, FileText, Edit2, Download, Mail, MessageCircle } from 'lucide-react';
import { usePaymentAdvices } from '../../../hooks/usePaymentAdvices';
import { paymentAdvicesAPI } from '../../../services/paymentAdvices.api';
import { vendorsAPI } from '../../../services/vendors.api';
import { vehiclesAPI } from '../../../services/vehicles.api';
import { inwardSlipPassesAPI } from '../../../services/inwardSlipPasses.api';
import { useVendors } from '../../../hooks/useVendors';
import { useSaudas } from '../../../hooks/useSaudas';
import { useInwardSlipPasses } from '../../../hooks/useInwardSlipPasses';
import { useBrokers } from '../../../hooks/useBrokers';
import { transportersAPI } from '../../../services/transporters.api';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { riceLengthsAPI } from '../../../services/riceLengths.api';
import { getRiceTypeLabel, getRiceLengthLabel } from '../../../utils/riceType';
import { toRiceLengthLabelOptions } from '../../../utils/riceLengthModule';
import {
  getCompletionStatus,
  formatCompletionPercentage,
  formatWeightDisplay,
} from '../../../utils/saudaCompletion';
import {
  buildPaymentAdviceSavePayload,
  computePaymentAdviceTotalCharges,
  DEFAULT_RTGS_CHARGE,
  mapStoredChargesToFormCharges,
  paymentAdviceSaudaVendorAmount,
  syncFormChargesFromPaymentAdvice,
} from '../../../utils/paymentAdvice';
import { AlertDialog } from '../../shared/AlertDialog';
import { DateInputWithSteppers } from '../../shared/DateInputWithSteppers';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { NotificationModal } from '../../shared/NotificationModal';
import { PaymentAdviceStoredMismatchPanel } from './PaymentAdviceStoredMismatchPanel';
import type { 
  CreatePaymentAdviceRequest, 
  UpdatePaymentAdviceRequest, 
  AddChargeRequest,
  PaymentAdvicePreviewResponse,
  RiceCode,
  RiceType,
  Sauda,
  Transporter,
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
  const [riceLengths, setRiceLengths] = useState<RiceType[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [defaultRecipient, setDefaultRecipient] = useState<DefaultRecipient | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  
  // Link type selection
  const [linkType, setLinkType] = useState<LinkType>('sauda');
  
  // Form state
  const [formData, setFormData] = useState<CreatePaymentAdviceRequest>({
    sauda_id: null,
    inward_slip_pass_id: null,
    payer_id: '', // Not used anymore but kept for type compatibility
    recipient_id: '', // Will be auto-set
    amount: undefined,
    date_of_payment: new Date().toISOString().split('T')[0],
    transaction_id: null,
    bill_number: null, // Purchase bill number from ISP
    charges: [{ ...DEFAULT_RTGS_CHARGE }],
  });
  
  const [invoiceNo, setInvoiceNo] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  
  // Document preview from GET /payment-advices/preview
  const [preview, setPreview] = useState<PaymentAdvicePreviewResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  
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
  const [chargeValueError, setChargeValueError] = useState<string>('');
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationInitialTab, setNotificationInitialTab] = useState<'email' | 'whatsapp'>('email');
  const [createdPaymentAdvice, setCreatedPaymentAdvice] = useState<PaymentAdvice | null>(null);
  const [loadedPaymentAdvice, setLoadedPaymentAdvice] = useState<PaymentAdvice | null>(null);

  // Load reference data
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const [codes, types, lengths, trans, recipient] = await Promise.all([
          riceCodesAPI.getAllRiceCodes(),
          riceCodesAPI.getRiceTypes(),
          riceLengthsAPI.getAllRiceLengths(),
          transportersAPI.getAllTransporters(),
          vendorsAPI.getDefaultRecipient()
        ]);
        setRiceCodes(codes);
        setRiceTypes(types);
        setRiceLengths(toRiceLengthLabelOptions(lengths));
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

  const totalCharges = useMemo(
    () => computePaymentAdviceTotalCharges(formData.charges ?? [], preview?.amount ?? 0),
    [formData.charges, preview?.amount]
  );

  // Fetch document preview when sauda/ISP or charges change
  useEffect(() => {
    const saudaId = linkType === 'sauda' ? formData.sauda_id : null;
    const ispId = linkType === 'isp' ? formData.inward_slip_pass_id : null;

    if (!saudaId && !ispId) {
      setPreview(null);
      return;
    }

    let cancelled = false;
    setLoadingPreview(true);

    paymentAdvicesAPI
      .fetchPaymentAdvicePreview({
        sauda_id: saudaId ?? undefined,
        inward_slip_pass_id: ispId ?? undefined,
        total_charges: totalCharges,
      })
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch((error) => {
        console.error('Failed to fetch payment advice preview:', error);
        if (!cancelled) setPreview(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });

    return () => {
      cancelled = true;
    };
  }, [linkType, formData.sauda_id, formData.inward_slip_pass_id, totalCharges]);

  // Auto-populate bill_number from ISP
  useEffect(() => {
    if (linkType !== 'isp' || !formData.inward_slip_pass_id) return;

    inwardSlipPassesAPI
      .getInwardSlipPassById(formData.inward_slip_pass_id)
      .then((ispData) => {
        if (ispData.bill_number) {
          setFormData((prev) =>
            prev.bill_number ? prev : { ...prev, bill_number: ispData.bill_number || null }
          );
        }
      })
      .catch((error) => {
        console.error('Failed to fetch ISP for bill number:', error);
      });
  }, [linkType, formData.inward_slip_pass_id]);

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
        payer_id: '', // Not used anymore but kept for type compatibility
        recipient_id: pa.recipient_id, // Keep recipient_id from loaded payment advice
        amount: undefined, // amount comes from preview API on save
        date_of_payment: pa.date_of_payment,
        transaction_id: pa.transaction_id || null,
        bill_number: pa.bill_number || null, // Load bill_number from payment advice
        charges: mapStoredChargesToFormCharges(pa.charges),
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
      payer_id: '', // Not used anymore but kept for type compatibility
      recipient_id: '',
      amount: undefined,
      date_of_payment: new Date().toISOString().split('T')[0],
      transaction_id: null,
      bill_number: null, // Reset bill_number
      charges: [{ ...DEFAULT_RTGS_CHARGE }],
    });
    setInvoiceNo(generateInvoiceNumber());
    // Set due date to 10 days from now
    const due = new Date();
    due.setDate(due.getDate() + 10);
    setDueDate(due.toISOString().split('T')[0]);
    setPreview(null);
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

  const formatSaudaDateLabel = (iso: string | null | undefined): string | null => {
    if (!iso?.trim()) return null;
    const raw = iso.trim();
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00` : raw);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-IN');
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
    const dateLabel = formatSaudaDateLabel(sauda.sauda_date);
    if (dateLabel) parts.push(dateLabel);
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

    if (!formData.date_of_payment) {
      newErrors.date_of_payment = 'Date of payment is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const hasLink = !!(linkType === 'sauda' ? formData.sauda_id : formData.inward_slip_pass_id);
    if (hasLink && !preview) {
      setAlertType('error');
      setAlertTitle('Preview unavailable');
      setAlertMessage('Could not load payment advice preview. Please try again.');
      setAlertOpen(true);
      return;
    }

    setLoading(true);
    try {
      const savePayload = buildPaymentAdviceSavePayload({
        sauda_id: linkType === 'sauda' ? formData.sauda_id : null,
        inward_slip_pass_id: linkType === 'isp' ? formData.inward_slip_pass_id : null,
        recipient_id: formData.recipient_id,
        amount: preview?.amount,
        date_of_payment: formData.date_of_payment,
        transaction_id: invoiceNo || null,
        bill_number: formData.bill_number,
        charges: formData.charges ?? [],
      });

      const applySavedResponse = (pa: PaymentAdvice) => {
        setCreatedPaymentAdvice(pa);
        setLoadedPaymentAdvice(pa);
        setFormData((prev) => ({
          ...prev,
          amount: pa.amount,
          charges: syncFormChargesFromPaymentAdvice(pa),
        }));
      };

      if (isEditMode && paymentAdviceId) {
        const updated = await updatePaymentAdvice(paymentAdviceId, savePayload);
        applySavedResponse(updated);
        setAlertType('success');
        setAlertTitle('Success');
        setAlertMessage('Payment advice updated successfully');
      } else {
        const created = await createPaymentAdvice(savePayload);
        applySavedResponse(created);
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

  const handleLinkTypeChange = (type: LinkType) => {
    setLinkType(type);
    setFormData({
      ...formData,
      sauda_id: null,
      inward_slip_pass_id: null,
    });
    setPreview(null);
  };

  const summary = preview?.summary ?? null;

  /** Edit mode: document panel shows saved DB record until Update; create uses preview. */
  const showStoredDocument =
    isEditMode && !!loadedPaymentAdvice && !createdPaymentAdvice;

  const documentAmount = showStoredDocument
    ? (loadedPaymentAdvice!.amount ?? 0)
    : (createdPaymentAdvice?.amount ?? preview?.amount ?? loadedPaymentAdvice?.amount ?? 0);

  const documentNetPayable = showStoredDocument
    ? (loadedPaymentAdvice!.net_payable ?? loadedPaymentAdvice!.amount ?? 0)
    : (createdPaymentAdvice?.net_payable ??
      preview?.net_payable ??
      loadedPaymentAdvice?.net_payable ??
      0);

  const documentPreCharges = showStoredDocument
    ? (loadedPaymentAdvice!.amount ?? 0)
    : (preview?.amount ?? summary?.net_payable ?? summary?.final_total_amount ?? 0);

  const documentCharges = showStoredDocument
    ? (loadedPaymentAdvice!.charges ?? []).filter((c) => c.charge_value > 0)
    : (formData.charges ?? []).filter((c) => c.charge_name && c.charge_value > 0);

  const billWeight = showStoredDocument
    ? (loadedPaymentAdvice!.bill_weight ?? null)
    : (createdPaymentAdvice?.bill_weight ??
      preview?.bill_weight ??
      loadedPaymentAdvice?.bill_weight ??
      null);
  const kaantaWeight = showStoredDocument
    ? (loadedPaymentAdvice!.kanta_weight ?? null)
    : (createdPaymentAdvice?.kanta_weight ??
      preview?.kanta_weight ??
      loadedPaymentAdvice?.kanta_weight ??
      null);
  const danaDeduction = showStoredDocument
    ? (loadedPaymentAdvice!.dana_deduction ?? null)
    : (createdPaymentAdvice?.dana_deduction ??
      preview?.dana_deduction ??
      loadedPaymentAdvice?.dana_deduction ??
      null);
  const finalWeight = showStoredDocument
    ? (loadedPaymentAdvice!.final_weight ?? null)
    : (createdPaymentAdvice?.final_weight ??
      preview?.final_weight ??
      loadedPaymentAdvice?.final_weight ??
      null);
  const totalBags = showStoredDocument
    ? ((loadedPaymentAdvice as PaymentAdvice & { total_bags?: number | null }).total_bags ??
      preview?.total_bags ??
      summary?.total_bags ??
      null)
    : (preview?.total_bags ?? summary?.total_bags ?? null);

  const previewAmount = documentAmount;
  const netPayable = documentNetPayable;

  const canShowDocumentPreview =
    !!preview || !!loadedPaymentAdvice || !!formData.sauda_id || !!formData.inward_slip_pass_id;

  const canSubmit =
    !loading &&
    !loadingPreview &&
    (!!(linkType === 'sauda' ? formData.sauda_id : formData.inward_slip_pass_id) ? !!preview : true);

  const activeSaudas = saudas.filter(s => s.status === 'active' || s.status === 'completed' || s.status === 'draft');

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

                    {/* Completion Display */}
                    {linkType === 'sauda' && summary && 'sauda_details' in summary && summary.sauda_details && summary.sauda_details.completion_percentage !== null && (
                      <div className="p-3 bg-muted/50 rounded-lg border border-border">
                        <label className="block text-sm font-medium mb-2">Completion Status</label>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${getCompletionStatus(summary.sauda_details.completion_percentage).bgColor} ${getCompletionStatus(summary.sauda_details.completion_percentage).color} border ${getCompletionStatus(summary.sauda_details.completion_percentage).borderColor}`}>
                            {formatCompletionPercentage(summary.sauda_details.completion_percentage)}
                          </span>
                          {summary.sauda_details.quantity && (
                            <span className="text-xs text-muted-foreground">
                              {formatWeightDisplay(summary.sauda_details.received_until_now, summary.sauda_details.quantity)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {linkType === 'isp' && summary && 'saudas' in summary && summary.saudas && summary.saudas.length > 0 && (
                      <div className="p-3 bg-muted/50 rounded-lg border border-border">
                        <label className="block text-sm font-medium mb-2">Completion Status</label>
                        <div className="space-y-2">
                          {summary.saudas.map((saudaItem, idx) => (
                            saudaItem.sauda_details.completion_percentage !== null && (
                              <div key={saudaItem.sauda_id} className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {idx + 1}.{' '}
                                  {[getRiceCodeName(saudaItem.sauda_details.rice_code_id), getRiceTypeLabel(saudaItem.sauda_details.rice_type, riceTypes), getRiceLengthLabel(saudaItem.sauda_details.rice_length, riceLengths)].filter(Boolean).join(' ')}
                                  :
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-full ${getCompletionStatus(saudaItem.sauda_details.completion_percentage).bgColor} ${getCompletionStatus(saudaItem.sauda_details.completion_percentage).color} border ${getCompletionStatus(saudaItem.sauda_details.completion_percentage).borderColor}`}>
                                  {formatCompletionPercentage(saudaItem.sauda_details.completion_percentage)}
                                </span>
                                {saudaItem.sauda_details.quantity && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatWeightDisplay(saudaItem.sauda_details.received_until_now, saudaItem.sauda_details.quantity)}
                                  </span>
                                )}
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
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
                        <DateInputWithSteppers
                          className="w-full"
                          inputClassName="py-2"
                          invalid={Boolean(errors.date_of_payment)}
                          value={formData.date_of_payment}
                          onChange={(v) => setFormData({ ...formData, date_of_payment: v })}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Due Date</label>
                        <DateInputWithSteppers
                          className="w-full"
                          inputClassName="py-2"
                          value={dueDate}
                          onChange={setDueDate}
                          min={formData.date_of_payment || undefined}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Bill Number <span className="text-muted-foreground text-xs">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={formData.bill_number || ''}
                          onChange={(e) => setFormData({ ...formData, bill_number: e.target.value || null })}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                          placeholder="e.g., BILL-2024-001"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {linkType === 'isp' && selectedISP?.bill_number 
                            ? `Auto-filled from ISP: ${selectedISP.bill_number}` 
                            : 'Purchase bill number from ISP'}
                        </p>
                      </div>
                    </div>

                    {/* Charges Section */}
                    <div className="pt-4 border-t border-border">
                      <h3 className="text-sm font-semibold mb-3">Charges (Deductions)</h3>
                      <div className="space-y-2">
                        {(formData.charges || []).map((charge, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                            {charge.charge_name === 'RTGS Charge' ? (
                              <>
                                <span className="text-sm font-medium">{charge.charge_name}</span>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={charge.charge_value || ''}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value);
                                      const updatedCharges = [...(formData.charges || [])];
                                      updatedCharges[index] = {
                                        ...updatedCharges[index],
                                        charge_value: (value >= 0 && !isNaN(value)) ? value : 0,
                                      };
                                      setFormData({ ...formData, charges: updatedCharges });
                                    }}
                                    className="w-24 px-2 py-1 text-sm border border-border rounded bg-background"
                                    placeholder="0.00"
                                  />
                                  <span className="text-sm text-muted-foreground">₹</span>
                                </div>
                              </>
                            ) : (
                              <>
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
                              </>
                            )}
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
                          <div className="flex flex-col">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={newCharge.charge_value || ''}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (value < 0) {
                                  setChargeValueError('Negative values not allowed');
                                  setNewCharge({ ...newCharge, charge_value: 0 });
                                } else {
                                  setChargeValueError('');
                                  setNewCharge({ ...newCharge, charge_value: (value >= 0 && !isNaN(value)) ? value : 0 });
                                }
                              }}
                              className={`w-20 px-2 py-2 text-sm border rounded-lg bg-background ${
                                chargeValueError ? 'border-red-500' : 'border-border'
                              }`}
                              placeholder="Value"
                            />
                            {chargeValueError && (
                              <p className="text-xs text-red-500 mt-0.5">{chargeValueError}</p>
                            )}
                          </div>
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
                        disabled={!canSubmit}
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
                    {loadingPreview && !loadedPaymentAdvice ? (
                      <div className="flex justify-center items-center h-full">
                        <LoadingSpinner />
                      </div>
                    ) : !canShowDocumentPreview ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <FileText className="h-12 w-12 mb-3 opacity-50" />
                        <p>Select a Sauda or ISP to see preview</p>
                      </div>
                    ) : (
                      <>
                        <PaymentAdviceStoredMismatchPanel
                          stored={loadedPaymentAdvice}
                          preview={preview}
                          variant="form"
                        />
                      <div className="space-y-4" ref={previewRef}>
                        {showStoredDocument && (
                          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                            Showing <span className="font-semibold text-foreground">saved record</span> from the database.
                            Recalculated preview is in the comparison panel above. Save to apply preview values.
                          </div>
                        )}

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
                            {formData.bill_number && (
                              <div><span className="text-muted-foreground">Bill No</span> <span className="font-medium">{formData.bill_number}</span></div>
                            )}
                          </div>
                        </div>

                        {/* ISP: Per-Sauda Breakdown */}
                        {linkType === 'isp' && summary && 'saudas' in summary && summary.saudas && summary.saudas.length > 0 && (
                          <div className="mb-3 pb-3 border-b border-border">
                            <div className="text-xs font-semibold text-muted-foreground mb-2">Per Sauda Breakdown:</div>
                            <div className="space-y-2">
                              {summary.saudas.map((saudaItem, idx) => {
                                const vendorSaudaTotal = paymentAdviceSaudaVendorAmount(saudaItem);

                                return (
                                <div key={saudaItem.sauda_id} className="border border-border/50 rounded p-2 bg-muted/20">
                                  <div className="font-semibold text-xs mb-1">
                                    {idx + 1}.{' '}
                                    {[getRiceCodeName(saudaItem.sauda_details.rice_code_id), getRiceTypeLabel(saudaItem.sauda_details.rice_type, riceTypes), getRiceLengthLabel(saudaItem.sauda_details.rice_length, riceLengths)].filter(Boolean).join(' ') || 'N/A'}
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Weight:</span>
                                      <span>{saudaItem.total_weight.toFixed(2)} kg</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Received:</span>
                                      <span>
                                        {formatWeightDisplay(saudaItem.sauda_details.received_until_now, undefined)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Rate:</span>
                                      <span>₹{saudaItem.sauda_details.rate.toFixed(2)}/kg</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Base Amount:</span>
                                      <span>₹{saudaItem.base_amount.toFixed(2)}</span>
                                    </div>
                                    {(saudaItem.dana_deduction_kg ?? 0) > 0 && (
                                      <div className="flex justify-between text-red-600">
                                        <span className="text-muted-foreground">Less: Dana (300gm per Qtl):</span>
                                        <span>-{(saudaItem.dana_deduction_kg ?? 0).toFixed(2)} kg</span>
                                      </div>
                                    )}
                                    {(saudaItem.dana_deduction_amount ?? 0) > 0 && (
                                      <div className="flex justify-between text-red-600">
                                        <span className="text-muted-foreground">Less: Dana (amount):</span>
                                        <span>-₹{(saudaItem.dana_deduction_amount ?? 0).toFixed(2)}</span>
                                      </div>
                                    )}
                                    {saudaItem.cash_discount_amount > 0 && (
                                      <div className="flex justify-between text-emerald-600">
                                        <span>- Cash Discount:</span>
                                        <span>₹{saudaItem.cash_discount_amount.toFixed(2)}</span>
                                      </div>
                                    )}
                                    {saudaItem.broker_commission_amount > 0 && (
                                      <div className="flex justify-between text-amber-700 dark:text-amber-400">
                                        <span className="text-muted-foreground">- Broker Commission:</span>
                                        <span>₹{saudaItem.broker_commission_amount.toFixed(2)}</span>
                                      </div>
                                    )}
                                    <div className="col-span-2 flex justify-between font-semibold border-t border-border/30 pt-0.5 mt-0.5">
                                      <span>Sauda Total (vendor):</span>
                                      <span>₹{vendorSaudaTotal.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                                );
                              })}
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
                                <span className="font-medium text-right">{selectedISP?.party_name || '-'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Address</span>
                                <span className="text-right text-xs">{selectedISP?.party_address || '-'}</span>
                              </div>
                            </div>

                            {/* Logistics — compact, below party / above Sauda-wise */}
                            <div className="rounded-lg border border-border/60 bg-muted/15 px-3 py-2 text-[10px] leading-snug text-muted-foreground space-y-1">
                              <div className="flex justify-between gap-2">
                                <span>Truck No</span>
                                <span className="text-right text-foreground/90 font-medium tabular-nums shrink-0">
                                  {vehicle?.vehicle_number || '-'}
                                </span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span>Bag</span>
                                <span className="text-right text-foreground/90 font-medium tabular-nums shrink-0">
                                  {summary.total_bags}
                                </span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span>DUE Date</span>
                                <span className="text-right text-foreground/90 font-medium shrink-0">
                                  {dueDate ? new Date(dueDate).toLocaleDateString('en-IN') : '-'}
                                </span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span>FREIGHT</span>
                                <span className="text-right text-foreground/90 font-medium tabular-nums shrink-0">
                                  {summary.transportation_cost.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span>Transporter</span>
                                <span className="text-right text-foreground/90 font-medium max-w-[65%] truncate shrink-0">
                                  {getTransporterName(selectedISP?.transporter_id) || '-'}
                                </span>
                              </div>
                            </div>
                            
                            {/* Per-Sauda Table */}
                            <div className="border border-border rounded-lg overflow-hidden">
                              <div className="bg-muted/50 px-3 py-2 text-xs font-semibold border-b border-border">
                                Sauda-wise Details
                              </div>
                              <div className="divide-y divide-border">
                                {summary.saudas.map((saudaItem, idx) => {
                                const sauda = saudas.find(s => s.id === saudaItem.sauda_id);
                                const isDanaRequired = sauda?.is_dana_required ?? true;
                                const saudaDanaKg = saudaItem.dana_deduction_kg ?? 0;
                                const saudaDanaAmount = saudaItem.dana_deduction_amount ?? 0;
                                const vendorSaudaTotal = paymentAdviceSaudaVendorAmount(saudaItem);

                                return (
                                  <div key={saudaItem.sauda_id} className="p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="font-semibold text-xs">
                                        {idx + 1}.{' '}
                                        {[getRiceCodeName(saudaItem.sauda_details.rice_code_id), getRiceTypeLabel(saudaItem.sauda_details.rice_type, riceTypes), getRiceLengthLabel(saudaItem.sauda_details.rice_length, riceLengths)].filter(Boolean).join(' ') || 'N/A'}
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        {isDanaRequired ? (
                                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                                            Dana Required
                                          </span>
                                        ) : (
                                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700">
                                            Dana Not Required
                                          </span>
                                        )}
                                        {(summary.saudas?.length ?? 0) > 1 && (
                                          <div className="text-xs font-bold text-primary tabular-nums">
                                            ₹{vendorSaudaTotal.toFixed(2)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Weight:</span>
                                        <span>{saudaItem.total_weight.toFixed(2)} kg</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Received:</span>
                                        <span>
                                          {formatWeightDisplay(saudaItem.sauda_details.received_until_now, undefined)}
                                        </span>
                                      </div>
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
                                        <div className="flex justify-between text-amber-700 dark:text-amber-400">
                                          <span className="text-muted-foreground">- Broker Commission:</span>
                                          <span>₹{saudaItem.broker_commission_amount.toFixed(2)}</span>
                                        </div>
                                      )}
                                      {getBrokerName(saudaItem.sauda_details.broker_id) && (
                                        <div className="flex justify-between col-span-2">
                                          <span className="text-muted-foreground">Broker:</span>
                                          <span className="text-xs">{getBrokerName(saudaItem.sauda_details.broker_id)}</span>
                                        </div>
                                      )}
                                      {/* Dana Deduction for this sauda */}
                                      {isDanaRequired ? (
                                        saudaDanaKg > 0 ? (
                                          <>
                                            <div className="flex justify-between col-span-2 text-red-600">
                                              <span className="text-muted-foreground">Less: Dana (300gm per Qtl):</span>
                                              <span>-{saudaDanaKg.toFixed(2)} kg</span>
                                            </div>
                                            {saudaDanaAmount > 0 && (
                                              <div className="flex justify-between col-span-2 text-red-600">
                                                <span className="text-muted-foreground">Less: Dana (amount):</span>
                                                <span>-₹{saudaDanaAmount.toFixed(2)}</span>
                                              </div>
                                            )}
                                          </>
                                        ) : null
                                      ) : (
                                        <div className="flex justify-between col-span-2 text-muted-foreground">
                                          <span className="text-muted-foreground">Dana Deduction:</span>
                                          <span className="text-[9px]">Not Applicable</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                                })}
                              </div>
                              {/* Total Row */}
                              <div className="bg-primary/10 px-3 py-2 border-t-2 border-primary/30">
                                <div className="flex justify-between items-center text-sm font-bold">
                                  <span>Total (net payable, pre-charges):</span>
                                  <span className="text-primary">₹{documentPreCharges.toFixed(2)}</span>
                                </div>
                                {(billWeight != null || kaantaWeight != null || danaDeduction != null || finalWeight != null) && (
                                  <div className="mt-2 pt-2 border-t border-primary/20 space-y-0.5 text-[10px]">
                                    {billWeight != null && billWeight > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Bill Weight:</span>
                                        <span>{billWeight.toFixed(2)} kg</span>
                                      </div>
                                    )}
                                    {kaantaWeight != null && kaantaWeight > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Kaanta Weight:</span>
                                        <span>{kaantaWeight.toFixed(2)} kg</span>
                                      </div>
                                    )}
                                    {danaDeduction != null && danaDeduction > 0 ? (
                                      <div className="flex justify-between text-red-600">
                                        <span className="text-muted-foreground">Less: Dana (300gm per Qtl):</span>
                                        <span>-{danaDeduction.toFixed(2)} kg</span>
                                      </div>
                                    ) : (
                                      <div className="flex justify-between text-muted-foreground">
                                        <span className="text-muted-foreground">Dana Deduction:</span>
                                        <span className="text-xs">Not Applicable (No saudas require dana)</span>
                                      </div>
                                    )}
                                    {finalWeight != null && finalWeight > 0 && (
                                      <div className="flex justify-between font-semibold border-t border-primary/20 pt-0.5 mt-0.5">
                                        <span className="text-muted-foreground">Final Weight:</span>
                                        <span>{finalWeight.toFixed(2)} kg</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                  <span>Total Weight: {finalWeight != null ? `${finalWeight.toFixed(2)} kg` : '-'}</span>
                                  <span>Total Bags: {totalBags ?? summary?.total_bags ?? '-'}</span>
                                </div>
                              </div>
                            </div>
                            
                            {summary.transportation_cost > 0 && (
                              <div className="mt-3 flex justify-between text-sm px-0.5">
                                <span className="text-muted-foreground">+ Transport:</span>
                                <span className="font-medium">₹{summary.transportation_cost.toFixed(2)}</span>
                              </div>
                            )}
                            
                            {/* Charges and Net Payable for ISP */}
                            {documentCharges.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-border">
                                <div className="text-xs font-semibold text-muted-foreground mb-2">Deductions:</div>
                                {documentCharges.map((charge, idx) => (
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
                              <div className="flex justify-between items-start gap-3">
                                <div className="min-w-0">
                                  <span className="font-bold text-sm">Net Payable:</span>
                                  <p className="text-xs text-muted-foreground mt-1 leading-snug">
                                    Final net payable after charges and deductions.
                                  </p>
                                </div>
                                <span className="font-bold text-xl text-primary tabular-nums shrink-0">
                                  ₹{netPayable.toFixed(2)}
                                </span>
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
                                <span className="font-medium text-right">{selectedISP?.party_name || (selectedSauda ? getVendorName(selectedSauda.purchaser_id) : '-') || '-'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Address</span>
                                <span className="text-right text-xs">{selectedISP?.party_address || (selectedSauda ? getVendorAddress(selectedSauda.purchaser_id) : '-') || '-'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Broker</span>
                                <span className="font-medium">{getBrokerName(selectedSauda?.broker_id) || '-'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Bill Weight</span>
                                <span className="font-medium">{billWeight != null ? `${billWeight.toFixed(2)} kg` : '-'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Kaanta Weight</span>
                                <span className="font-medium">{kaantaWeight != null ? `${kaantaWeight.toFixed(2)} kg` : '-'}</span>
                              </div>
                              {selectedSauda && (selectedSauda.is_dana_required ?? true) ? (
                                danaDeduction != null && danaDeduction > 0 && (
                                  <div className="flex justify-between text-red-600">
                                    <span className="text-muted-foreground">Less: Dana (300gm per Qtl)</span>
                                    <span className="font-medium">-{danaDeduction.toFixed(2)} kg</span>
                                  </div>
                                )
                              ) : (
                                <div className="flex justify-between text-muted-foreground">
                                  <span className="text-muted-foreground">Dana Deduction</span>
                                  <span className="font-medium text-xs">Not Applicable (Dana not required for this sauda)</span>
                                </div>
                              )}
                              <div className="flex justify-between font-semibold">
                                <span className="text-muted-foreground">Final Weight</span>
                                <span className="font-medium">{finalWeight != null ? `${finalWeight.toFixed(2)} kg` : '-'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Rate</span>
                                <span className="font-medium">{selectedSauda?.rate?.toFixed(2) || '-'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Amount</span>
                                <span className="font-bold">{(summary?.base_amount ?? 0).toFixed(2)}</span>
                              </div>
                              {(summary?.broker_commission_amount ?? 0) > 0 && (
                              <div className="flex justify-between text-amber-700 dark:text-amber-400">
                                <span className="text-muted-foreground">Less: Brokerage Rs {selectedSauda?.broker_commission_type === 'percentage' ? `${selectedSauda?.broker_commission || 0}%` : ''}</span>
                                <span className="font-medium">{(summary?.broker_commission_amount ?? 0).toFixed(2)}</span>
                              </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">CD {selectedSauda?.cash_discount_type === 'percentage' ? `${selectedSauda?.cash_discount || 0}%` : ''}</span>
                                <span className="font-medium">{(summary?.cash_discount_amount ?? 0).toFixed(2)}</span>
                              </div>
                            {/* Custom Charges */}
                            {documentCharges.map((charge, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span className="text-muted-foreground">{charge.charge_name}</span>
                                <span className="font-medium">
                                  {charge.charge_type === 'fixed' 
                                    ? charge.charge_value.toFixed(2) 
                                    : ((documentAmount * charge.charge_value / 100)).toFixed(2)
                                  }
                                </span>
                              </div>
                            ))}
                            <div className="flex justify-between items-start gap-3 border-t border-border pt-2 mt-2">
                              <div className="min-w-0">
                                <span className="font-bold">Net Payable</span>
                                <p className="text-xs text-muted-foreground mt-1 leading-snug">
                                  Final net payable after charges and deductions.
                                </p>
                              </div>
                              <span className="font-bold text-lg text-primary tabular-nums shrink-0">
                                {netPayable.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Right Column — logistics; de-emphasized */}
                          <div className="space-y-1 border-l border-border pl-3 text-[10px] leading-snug text-muted-foreground">
                            <div className="flex justify-between gap-2">
                              <span>Truck No</span>
                              <span className="text-right text-foreground/90 font-medium tabular-nums shrink-0">
                                {vehicle?.vehicle_number || '-'}
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span>Item</span>
                              <span className="text-right text-foreground/90 font-medium max-w-[55%] truncate shrink-0">
                                {getRiceCodeName(selectedSauda?.rice_code_id) || 'RICE'}
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span>Bag</span>
                              <span className="text-right text-foreground/90 font-medium tabular-nums shrink-0">
                                {totalBags ?? '-'}
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span>DUE Date</span>
                              <span className="text-right text-foreground/90 font-medium shrink-0">
                                {dueDate ? new Date(dueDate).toLocaleDateString('en-IN') : '-'}
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span>FREIGHT</span>
                              <span className="text-right text-foreground/90 font-medium tabular-nums shrink-0">
                                {(selectedISP?.transportation_cost ?? summary?.transportation_cost ?? 0).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span>Transporter</span>
                              <span className="text-right text-foreground/90 font-medium max-w-[55%] truncate shrink-0">
                                {getTransporterName(selectedISP?.transporter_id) || '-'}
                              </span>
                            </div>
                          </div>
                        </div>
                        )}

                    {/* Download Button - Outside previewRef so it won't appear in PDF */}
                    {canShowDocumentPreview && (
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
                      </>
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
          vendorName: selectedISP?.party_name || (selectedSauda ? getVendorName(selectedSauda.purchaser_id) : '') || '',
          amount: createdPaymentAdvice.net_payable ?? createdPaymentAdvice.amount ?? 0,
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

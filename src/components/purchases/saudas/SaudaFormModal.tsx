import * as Dialog from '@radix-ui/react-dialog';
import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, RefreshCw, Check, Loader2, Download, FileText, Mail, MessageCircle } from 'lucide-react';
import { useSaudas } from '../../../hooks/useSaudas';
import { saudasAPI } from '../../../services/saudas.api';
import { useVendors } from '../../../hooks/useVendors';
import { useBrokers } from '../../../hooks/useBrokers';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { vendorsAPI } from '../../../services/vendors.api';
import { CustomSelect } from '../../shared/CustomSelect';
import { AlertDialog } from '../../shared/AlertDialog';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { DateInputWithSteppers } from '../../shared/DateInputWithSteppers';
import { NotificationModal } from '../../shared/NotificationModal';
import type {
  CreateSaudaRequest,
  UpdateSaudaRequest,
  RiceCode,
  RiceType,
  RiceLength,
  CashDiscountType,
  BrokerCommissionType,
} from '../../../types/entities';
import { RICE_LENGTH_VALUES } from '../../../constants/rice-lengths';

// Default recipient type
interface DefaultRecipient {
  name: string;
  address: string;
  llpin: string;
}

interface FileUploadState {
  cooked_rice_image: File | null;
  uncooked_rice_image: File | null;
}

interface SaudaFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saudaId?: string | null;
  onSuccess?: () => void;
}

export function SaudaFormModal({ open, onOpenChange, saudaId, onSuccess }: SaudaFormModalProps) {
  const { createSauda, updateSauda } = useSaudas();
  const { vendors, refetch: refetchVendors, loading: loadingVendors } = useVendors();
  const { brokers, refetch: refetchBrokers, loading: loadingBrokers } = useBrokers();
  const isEditMode = !!saudaId;
  const [riceCodes, setRiceCodes] = useState<RiceCode[]>([]);
  const [riceTypes, setRiceTypes] = useState<RiceType[]>([]);
  const [riceLengths, setRiceLengths] = useState<RiceType[]>([]);
  const [loadingRiceCodes, setLoadingRiceCodes] = useState(false);
  const [loadingRiceTypes, setLoadingRiceTypes] = useState(false);
  const [loadingRiceLengths, setLoadingRiceLengths] = useState(false);
  const [unit, setUnit] = useState<'kg' | 'quintal' | 'ton'>('kg');
  const [brokerCommissionUnit, setBrokerCommissionUnit] = useState<'kg' | 'quintal' | 'ton'>('kg');
  const [defaultRecipient, setDefaultRecipient] = useState<DefaultRecipient | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<CreateSaudaRequest>({
    sauda_type: 'exgodown',
    rice_code_id: null,
    rice_type: null,
    rice_length: null,
    rate: 0,
    purchaser_id: '',
    broker_id: null,
    broker_commission: null,
    broker_commission_type: 'percentage',
    cash_discount: null,
    cash_discount_type: 'rupees',
    quantity: null,
    estimated_delivery_time: null,
    cooked_rice_image_url: null,
    uncooked_rice_image_url: null,
    notes: null,
    is_dana_required: true, // Default to true
    sauda_date: new Date().toISOString().split('T')[0], // Default to today's date in YYYY-MM-DD format
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingSauda, setLoadingSauda] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<FileUploadState>({
    cooked_rice_image: null,
    uncooked_rice_image: null,
  });
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadSuccess, setUploadSuccess] = useState<Record<string, boolean>>({});
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationInitialTab, setNotificationInitialTab] = useState<'email' | 'whatsapp'>('email');
  const [createdSaudaId, setCreatedSaudaId] = useState<string | null>(null);

  useEffect(() => {
    if (open && saudaId && isEditMode) {
      loadSaudaData();
    } else if (open && !saudaId) {
      resetForm();
    }
  }, [open, saudaId]);

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
    const fetchDefaultRecipient = async () => {
      try {
        const recipient = await vendorsAPI.getDefaultRecipient();
        setDefaultRecipient(recipient);
      } catch (error) {
        console.error('Failed to fetch default recipient:', error);
      }
    };
    if (open) {
      fetchRiceCodes();
      fetchDefaultRecipient();
    }
  }, [open]);

  useEffect(() => {
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
      fetchRiceTypes();
    }
  }, [open]);

  useEffect(() => {
    const fetchRiceLengths = async () => {
      setLoadingRiceLengths(true);
      try {
        const data = await riceCodesAPI.getRiceLengths();
        setRiceLengths(data);
      } catch (error) {
        console.error('Failed to fetch rice lengths:', error);
      } finally {
        setLoadingRiceLengths(false);
      }
    };
    if (open) {
      fetchRiceLengths();
    }
  }, [open]);

  const loadSaudaData = async () => {
    if (!saudaId) return;
    setLoadingSauda(true);
    try {
      const sauda = await saudasAPI.getSaudaById(saudaId);
      setFormData({
        sauda_type: sauda.sauda_type,
        rice_code_id: sauda.rice_code_id || null,
        rice_type: sauda.rice_type || null,
        rice_length: sauda.rice_length ?? null,
        rate: sauda.rate,
        purchaser_id: sauda.purchaser_id,
        broker_id: sauda.broker_id || null,
        broker_commission: sauda.broker_commission || null,
        broker_commission_type: sauda.broker_commission_type || 'percentage',
        cash_discount: sauda.cash_discount || null,
        cash_discount_type: sauda.cash_discount_type || 'rupees',
        quantity: sauda.quantity || null,
        estimated_delivery_time: sauda.estimated_delivery_time || null,
        cooked_rice_image_url: sauda.cooked_rice_image_url || null,
        uncooked_rice_image_url: sauda.uncooked_rice_image_url || null,
        notes: sauda.notes || null,
        is_dana_required: sauda.is_dana_required ?? true, // Default to true if not set
        sauda_date: sauda.sauda_date || new Date().toISOString().split('T')[0],
      });
      setErrors({});
      setPendingFiles({
        cooked_rice_image: null,
        uncooked_rice_image: null,
      });
      setUploading({});
      setUploadSuccess({});
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to load sauda data');
      setAlertOpen(true);
    } finally {
      setLoadingSauda(false);
    }
  };

  const resetForm = () => {
    setFormData({
      sauda_type: 'exgodown',
      rice_code_id: null,
      rice_type: null,
      rice_length: null,
      rate: 0,
      purchaser_id: '',
      broker_id: null,
      broker_commission: null,
      broker_commission_type: 'percentage',
      cash_discount: null,
      cash_discount_type: 'rupees',
      quantity: null,
      estimated_delivery_time: null,
      cooked_rice_image_url: null,
      uncooked_rice_image_url: null,
      notes: null,
      is_dana_required: true, // Default to true
      sauda_date: new Date().toISOString().split('T')[0], // Default to today's date
    });
    setErrors({});
    setUnit('kg');
    setBrokerCommissionUnit('kg');
    setPendingFiles({
      cooked_rice_image: null,
      uncooked_rice_image: null,
    });
    setUploading({});
    setUploadSuccess({});
    setCreatedSaudaId(null);
    setNotificationOpen(false);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields (API contract)
    if (!formData.sauda_type) {
      newErrors.sauda_type = 'Sauda type is required';
    } else if (!['exgodown', 'for'].includes(formData.sauda_type)) {
      newErrors.sauda_type = 'Sauda type must be one of: exgodown, for';
    }
    
    if (!formData.rice_type) {
      newErrors.rice_type = 'Rice type is required';
    }
    
    if (formData.rate === undefined || formData.rate === null || isNaN(formData.rate)) {
      newErrors.rate = 'Rate is required';
    } else if (formData.rate < 0) {
      newErrors.rate = 'Rate must be 0 or greater';
    }
    
    if (!formData.purchaser_id || formData.purchaser_id.trim() === '') {
      newErrors.purchaser_id = 'Vendor (purchaser) is required';
    }

    // Optional fields with constraints
    if (formData.broker_commission != null) {
      if (formData.broker_commission < 0) {
        newErrors.broker_commission = 'Broker commission cannot be negative';
      } else if (formData.broker_commission_type === 'percentage' && formData.broker_commission > 100) {
        newErrors.broker_commission = 'Broker commission percentage must be between 0 and 100';
      }
    }
    if (formData.cash_discount != null) {
      if (formData.cash_discount < 0) {
        newErrors.cash_discount = 'Cash discount cannot be negative';
      } else if (formData.cash_discount_type === 'percentage' && formData.cash_discount > 100) {
        newErrors.cash_discount = 'Cash discount percentage must be between 0 and 100';
      }
    }
    if (formData.quantity != null && formData.quantity < 0) {
      newErrors.quantity = 'Quantity cannot be negative';
    }
    // Validate notes max length (API contract: max 1000 chars)
    if (formData.notes != null && formData.notes.length > 1000) {
      newErrors.notes = 'Notes cannot exceed 1000 characters';
    }
    
    // Validate rice_type against API contract allowed values
    const allowedRiceTypes = ['basmati', 'non_basmati', 'parboiled', 'raw', 'raw_basmati', 'steam_basmati', 'white_sella', 'golden_sella'];
    if (formData.rice_type && !allowedRiceTypes.includes(formData.rice_type)) {
      newErrors.rice_type = 'Invalid rice type';
    }
    if (formData.rice_length != null && !RICE_LENGTH_VALUES.includes(formData.rice_length)) {
      newErrors.rice_length = 'Invalid rice length';
    }

    // Validate estimated_delivery_time is integer if provided (API contract: integer, minimum 0)
    if (formData.estimated_delivery_time != null) {
      if (!Number.isInteger(formData.estimated_delivery_time) || formData.estimated_delivery_time < 0) {
        newErrors.estimated_delivery_time = 'Estimated delivery time must be a non-negative integer (days)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadPendingFiles = async (newSaudaId: string) => {
    const uploadPromises: Promise<void>[] = [];
    const fileFields = Object.keys(pendingFiles) as (keyof FileUploadState)[];
    
    for (const field of fileFields) {
      const file = pendingFiles[field];
      if (file) {
        uploadPromises.push(
          (async () => {
            try {
              await handleFileUpload(field, file, newSaudaId);
            } catch (error) {
              console.error(`Failed to upload ${field}:`, error);
            }
          })()
        );
      }
    }
    
    if (uploadPromises.length > 0) {
      await Promise.all(uploadPromises);
    }
  };

  const handleFileUpload = async (field: string, file: File, targetSaudaId?: string) => {
    const uploadSaudaId = targetSaudaId || saudaId;
    if (!uploadSaudaId) {
      // Store file for later upload after creation
      setPendingFiles(prev => ({ ...prev, [field]: file }));
      return;
    }

    setUploading(prev => ({ ...prev, [field]: true }));
    try {
      let uploadFn;
      switch (field) {
        case 'cooked_rice_image':
          uploadFn = saudasAPI.uploadCookedRiceImage;
          break;
        case 'uncooked_rice_image':
          uploadFn = saudasAPI.uploadUncookedRiceImage;
          break;
        default:
          throw new Error('Unknown upload field');
      }
      const result = await uploadFn(uploadSaudaId, file);
      setUploadSuccess(prev => ({ ...prev, [field]: true }));
      // Update form data with the new image URL
      // The API returns { url: string } or the URL might be in result.url
      const imageUrl = result?.url || (typeof result === 'string' ? result : null);
      if (field === 'cooked_rice_image' && imageUrl) {
        setFormData(prev => ({ ...prev, cooked_rice_image_url: imageUrl }));
      } else if (field === 'uncooked_rice_image' && imageUrl) {
        setFormData(prev => ({ ...prev, uncooked_rice_image_url: imageUrl }));
      }
      // Clear pending file after successful upload
      setPendingFiles(prev => ({ ...prev, [field]: null }));
      if (isEditMode) {
        setAlertType('success');
        setAlertTitle('Success');
        setAlertMessage('Image uploaded successfully');
        setAlertOpen(true);
      }
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to upload image');
      setAlertOpen(true);
    } finally {
      setUploading(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleFileSelect = (field: keyof FileUploadState, file: File | null) => {
    if (!file) return;
    
    if (isEditMode && saudaId) {
      // In edit mode, upload immediately
      handleFileUpload(field, file);
    } else {
      // In create mode, store for later
      setPendingFiles(prev => ({ ...prev, [field]: file }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const factor = (u: 'kg' | 'quintal' | 'ton') => (u === 'kg' ? 1 : u === 'quintal' ? 100 : 1000);
      const f = factor(unit);
      
      // Convert broker commission to per-kg if weight type is selected
      let brokerCommissionInKg = formData.broker_commission;
      if (formData.broker_commission_type === 'weight' && formData.broker_commission != null) {
        const commissionFactor = factor(brokerCommissionUnit);
        brokerCommissionInKg = formData.broker_commission / commissionFactor;
      }
      
      // Clean and prepare data according to API contract
      const cleanedData: CreateSaudaRequest | UpdateSaudaRequest = {
        sauda_type: formData.sauda_type,
        rice_type: formData.rice_type || null,
        rice_length: formData.rice_length ?? null,
        rice_code_id: formData.rice_code_id || null,
        rate: parseFloat(((formData.rate || 0) / f).toFixed(2)), // API contract: precision 2 decimal places
        purchaser_id: formData.purchaser_id,
        broker_id: formData.broker_id || null,
        broker_commission: brokerCommissionInKg != null ? parseFloat(brokerCommissionInKg.toFixed(2)) : null, // API contract: precision 2 decimal places
        broker_commission_type: formData.broker_commission_type || 'percentage',
        cash_discount: formData.cash_discount != null ? parseFloat(formData.cash_discount.toFixed(2)) : null, // API contract: precision 2 decimal places
        cash_discount_type: formData.cash_discount_type || 'rupees',
        quantity: formData.quantity != null ? parseFloat(((formData.quantity as number) * f).toFixed(2)) : null, // API contract: precision 2 decimal places
        estimated_delivery_time: formData.estimated_delivery_time != null ? Math.floor(formData.estimated_delivery_time) : null, // API contract: integer
        cooked_rice_image_url: formData.cooked_rice_image_url || null,
        uncooked_rice_image_url: formData.uncooked_rice_image_url || null,
        notes: formData.notes?.trim() || null, // Convert empty string to null
        is_dana_required: formData.is_dana_required ?? true,
        sauda_date: formData.sauda_date || null, // Date in YYYY-MM-DD format
      };
      
      // Add status only if provided (optional field)
      if (formData.status) {
        cleanedData.status = formData.status;
      }
      
      const payload = cleanedData;
      if (isEditMode && saudaId) {
        await updateSauda(saudaId, payload as UpdateSaudaRequest);
        // Upload any new pending files
        await uploadPendingFiles(saudaId);
        setCreatedSaudaId(saudaId); // Allow notifications for updated sauda too
        setAlertType('success');
        setAlertTitle('Success');
        setAlertMessage('Sauda updated successfully');
      } else {
        const newSauda = await createSauda(payload as CreateSaudaRequest);
        // Upload pending files after creation
        if (newSauda && newSauda.id) {
          await uploadPendingFiles(newSauda.id);
          setCreatedSaudaId(newSauda.id);
        }
        setAlertType('success');
        setAlertTitle('Success');
        setAlertMessage('Sauda created successfully');
      }
      setAlertOpen(true);
      // Call onSuccess callback immediately after successful save
      onSuccess?.();
      // Don't auto-close, let user send notifications if needed
      // setTimeout(() => {
      //   onOpenChange(false);
      //   resetForm();
      // }, 1500);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to save sauda');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const sellerVendors = vendors.filter(v => v.type === 'seller' || v.type === 'both');

  // Helper functions for preview
  const getRiceCodeName = (riceCodeId: string | null) => {
    if (!riceCodeId) return '-';
    const riceCode = riceCodes.find(rc => rc.rice_code_id === riceCodeId);
    return riceCode ? riceCode.rice_code_name : '-';
  };

  const getRiceTypeName = (riceType: string | null) => {
    if (!riceType) return '-';
    const type = riceTypes.find(rt => rt.value === riceType);
    return type ? type.label : riceType;
  };

  const getRiceLengthName = (riceLength: RiceLength | string | null) => {
    if (!riceLength) return '-';
    const row = riceLengths.find((r) => r.value === riceLength);
    return row ? row.label : riceLength;
  };

  const getVendorName = (vendorId: string) => {
    if (!vendorId) return '-';
    const vendor = vendors.find(v => v.id === vendorId);
    return vendor ? vendor.business_name : '-';
  };

  const getBrokerName = (brokerId: string | null) => {
    if (!brokerId) return '-';
    const broker = brokers.find(b => b.id === brokerId);
    return broker ? broker.business_name : '-';
  };

  // Calculate amount
  const calculateAmount = () => {
    if (!formData.rate || !formData.quantity) return null;
    const factor = unit === 'kg' ? 1 : unit === 'quintal' ? 100 : 1000;
    const ratePerKg = formData.rate / factor;
    const quantityInKg = formData.quantity * factor;
    return ratePerKg * quantityInKg;
  };

  // PDF Download function
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
            <title>Sauda Details</title>
            <meta charset="UTF-8">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: 'Arial', 'Helvetica', sans-serif; 
                padding: 30px;
                background: white;
                color: black;
                font-size: 14px;
                line-height: 1.6;
              }
              .preview-container {
                max-width: 700px;
                margin: 0 auto;
                border: 2px solid #333;
                padding: 25px;
                background: white;
              }
              .header { 
                text-align: center; 
                border-bottom: 2px dashed #333; 
                padding-bottom: 15px; 
                margin-bottom: 20px; 
              }
              .header h2 { font-size: 22px; margin-bottom: 8px; font-weight: bold; }
              .header h3 { font-size: 18px; margin-bottom: 8px; font-weight: bold; }
              .header p { font-size: 12px; color: #666; margin: 4px 0; }
              .section { margin-bottom: 18px; }
              .section-title { 
                font-weight: bold; 
                border-bottom: 1px solid #333; 
                padding-bottom: 8px; 
                margin-bottom: 12px; 
                font-size: 16px;
              }
              .row { 
                display: flex; 
                justify-content: space-between; 
                padding: 8px 0; 
              }
              .label { color: #666; font-size: 13px; }
              .value { font-weight: bold; text-align: right; font-size: 14px; }
              .highlight { 
                background: #f5f5f5; 
                padding: 15px; 
                border-radius: 4px; 
                text-align: center; 
                margin-top: 20px;
              }
              .highlight .amount { font-size: 24px; font-weight: bold; }
              .footer { 
                text-align: center; 
                border-top: 2px dashed #333; 
                padding-top: 15px; 
                margin-top: 20px; 
                font-size: 11px; 
                color: #666; 
              }
              @media print {
                body { padding: 15px; }
                .preview-container { border: none; padding: 20px; }
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
                  {isEditMode ? 'Edit Sauda' : 'Create Sauda'}
                </Dialog.Title>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {loadingSauda ? (
                <div className="flex justify-center py-10">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Section: Basic Info */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-1">
                      Basic Info
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-xs font-medium mb-0.5">
                          Sauda Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.sauda_type}
                          onChange={(e) => setFormData({ ...formData, sauda_type: e.target.value as 'exgodown' | 'for' })}
                          className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background"
                          disabled={isEditMode}
                        >
                          <option value="exgodown">Ex Godown</option>
                          <option value="for">FOR</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-0.5">Rice Code</label>
                        {loadingRiceCodes ? (
                          <div className="w-full rounded-md border border-border bg-background/60 px-2 py-1.5 text-sm flex items-center gap-2">
                            <LoadingSpinner size="sm" />
                            <span className="text-muted-foreground text-xs">Loading...</span>
                          </div>
                        ) : (
                          <CustomSelect
                            value={formData.rice_code_id || null}
                            onChange={(value) => setFormData({ ...formData, rice_code_id: value || null })}
                            options={riceCodes.map((riceCode) => ({
                              value: riceCode.rice_code_id,
                              label: riceCode.rice_code_name
                            }))}
                            placeholder="Select"
                            allowClear={true}
                            clearLabel="None"
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-0.5">
                          Rice Type <span className="text-red-500">*</span>
                        </label>
                        {loadingRiceTypes ? (
                          <div className="w-full rounded-md border border-border bg-background/60 px-2 py-1.5 text-sm flex items-center gap-2">
                            <LoadingSpinner size="sm" />
                            <span className="text-muted-foreground text-xs">Loading...</span>
                          </div>
                        ) : (
                          <div className={errors.rice_type ? 'border border-red-500 rounded-md' : ''}>
                            <CustomSelect
                              value={formData.rice_type || null}
                              onChange={(value) => setFormData({ ...formData, rice_type: value || null })}
                              options={riceTypes.map((riceType) => ({
                                value: riceType.value,
                                label: riceType.label
                              }))}
                              placeholder="Select"
                              allowClear={false}
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-0.5">Rice Length</label>
                        {loadingRiceLengths ? (
                          <div className="w-full rounded-md border border-border bg-background/60 px-2 py-1.5 text-sm flex items-center gap-2">
                            <LoadingSpinner size="sm" />
                            <span className="text-muted-foreground text-xs">Loading...</span>
                          </div>
                        ) : (
                          <div className={errors.rice_length ? 'border border-red-500 rounded-md' : ''}>
                            <CustomSelect
                              value={formData.rice_length ?? null}
                              onChange={(value) =>
                                setFormData({
                                  ...formData,
                                  rice_length: (value as RiceLength | null) || null,
                                })
                              }
                              options={riceLengths.map((r) => ({
                                value: r.value,
                                label: r.label,
                              }))}
                              placeholder="Optional"
                              allowClear={true}
                              clearLabel="None"
                            />
                          </div>
                        )}
                        {errors.rice_length && (
                          <p className="text-xs text-red-500 mt-0.5">{errors.rice_length}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2">
                      <label className="block text-xs font-medium mb-0.5">Sauda Date</label>
                      <DateInputWithSteppers
                        className="w-full"
                        inputClassName="py-1.5 text-sm"
                        value={formData.sauda_date || ''}
                        onChange={(v) => setFormData({ ...formData, sauda_date: v || null })}
                      />
                    </div>
                  </div>

                  {/* Section: Pricing & Quantity */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-1">
                      Pricing & Quantity
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-medium mb-0.5">
                          Rate (₹/{unit}) <span className="text-red-500">*</span>
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
                          className={`w-full px-2 py-1.5 text-sm border rounded-md bg-background ${
                            errors.rate ? 'border-red-500' : 'border-border'
                          }`}
                          placeholder="0.00"
                        />
                        {errors.rate && (
                          <p className="text-xs text-red-500 mt-0.5">{errors.rate}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-0.5">Quantity</label>
                        <div className="flex gap-1">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={formData.quantity || ''}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              if (isNaN(value) || value === 0) {
                                setFormData({ ...formData, quantity: null });
                                setErrors({ ...errors, quantity: '' });
                              } else if (value < 0) {
                                setErrors({ ...errors, quantity: 'Negative values not allowed' });
                                setFormData({ ...formData, quantity: null });
                              } else {
                                setFormData({ ...formData, quantity: value });
                                setErrors({ ...errors, quantity: '' });
                              }
                            }}
                            className={`flex-1 min-w-0 px-2 py-1.5 text-sm border rounded-md bg-background ${
                              errors.quantity ? 'border-red-500' : 'border-border'
                            }`}
                            placeholder="0"
                          />
                          <select
                            value={unit}
                            onChange={(e) => {
                              const newUnit = e.target.value as 'kg' | 'quintal' | 'ton';
                              const factor = (u: 'kg' | 'quintal' | 'ton') => (u === 'kg' ? 1 : u === 'quintal' ? 100 : 1000);
                              const currentFactor = factor(unit);
                              const nextFactor = factor(newUnit);
                              const rate = formData.rate || 0;
                              const quantity = formData.quantity;
                              const convertedRate = (rate / currentFactor) * nextFactor;
                              const convertedQty = quantity != null ? (quantity * currentFactor) / nextFactor : null;
                              setFormData({
                                ...formData,
                                rate: Number.isFinite(convertedRate) ? parseFloat(convertedRate.toFixed(4)) : 0,
                                quantity: convertedQty != null && Number.isFinite(convertedQty) ? parseFloat(convertedQty.toFixed(4)) : null,
                              });
                              setUnit(newUnit);
                            }}
                            className="w-16 px-1 py-1.5 text-xs border border-border rounded-md bg-background"
                          >
                            <option value="kg">Kg</option>
                            <option value="quintal">Qtl</option>
                            <option value="ton">Ton</option>
                          </select>
                        </div>
                        {errors.quantity && (
                          <p className="text-xs text-red-500 mt-0.5">{errors.quantity}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-0.5">Cash Discount</label>
                        <div className="flex gap-1">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={formData.cash_discount_type === 'percentage' ? 100 : undefined}
                            value={formData.cash_discount || ''}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              if (isNaN(value) || value === 0) {
                                setFormData({ ...formData, cash_discount: null });
                                setErrors({ ...errors, cash_discount: '' });
                              } else if (value < 0) {
                                setErrors({ ...errors, cash_discount: 'Negative values not allowed' });
                                setFormData({ ...formData, cash_discount: null });
                              } else {
                                const maxValue = formData.cash_discount_type === 'percentage' ? 100 : undefined;
                                const clampedValue = maxValue !== undefined ? Math.min(Math.max(value, 0), maxValue) : Math.max(value, 0);
                                setFormData({ ...formData, cash_discount: clampedValue > 0 ? clampedValue : null });
                                setErrors({ ...errors, cash_discount: '' });
                              }
                            }}
                            className={`flex-1 min-w-0 px-2 py-1.5 text-sm border rounded-md bg-background ${
                              errors.cash_discount ? 'border-red-500' : 'border-border'
                            }`}
                            placeholder="0"
                          />
                          <select
                            value={formData.cash_discount_type || 'rupees'}
                            onChange={(e) => setFormData({ ...formData, cash_discount_type: e.target.value as CashDiscountType })}
                            className="w-12 px-1 py-1.5 text-xs border border-border rounded-md bg-background"
                          >
                            <option value="rupees">₹</option>
                            <option value="percentage">%</option>
                          </select>
                        </div>
                        {errors.cash_discount && (
                          <p className="text-xs text-red-500 mt-0.5">{errors.cash_discount}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section: Parties */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-1">
                      Parties
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium mb-0.5">
                          Vendor <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-1">
                          <select
                            value={formData.purchaser_id}
                            onChange={(e) => setFormData({ ...formData, purchaser_id: e.target.value })}
                            className={`flex-1 min-w-0 px-2 py-1.5 text-sm border rounded-md bg-background ${
                              errors.purchaser_id ? 'border-red-500' : 'border-border'
                            }`}
                            disabled={isEditMode}
                          >
                            <option value="">Select</option>
                            {sellerVendors.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.business_name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => refetchVendors()}
                            disabled={loadingVendors}
                            className="flex-shrink-0 p-1.5 border border-border rounded-md bg-background hover:bg-muted transition-colors disabled:opacity-50"
                            title="Refresh"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${loadingVendors ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const basename = (import.meta as any).env?.BASE_URL ? (import.meta as any).env.BASE_URL.replace(/\/$/, '') : '/riceops';
                              const vendorUrl = `${window.location.origin}${basename}/directory/vendors`;
                              window.open(vendorUrl, '_blank');
                            }}
                            className="flex-shrink-0 p-1.5 border border-border rounded-md bg-background hover:bg-muted transition-colors"
                            title="Add New"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-0.5">Broker</label>
                        <div className="flex gap-1">
                          <select
                            value={formData.broker_id || ''}
                            onChange={(e) => {
                              setFormData({ ...formData, broker_id: e.target.value || null });
                            }}
                            className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-border rounded-md bg-background"
                          >
                            <option value="">Select</option>
                            {brokers.filter(b => b.is_active).map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.business_name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => refetchBrokers()}
                            disabled={loadingBrokers}
                            className="flex-shrink-0 p-1.5 border border-border rounded-md bg-background hover:bg-muted transition-colors disabled:opacity-50"
                            title="Refresh"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${loadingBrokers ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const basename = (import.meta as any).env?.BASE_URL ? (import.meta as any).env.BASE_URL.replace(/\/$/, '') : '/riceops';
                              const brokerUrl = `${window.location.origin}${basename}/directory/brokers`;
                              window.open(brokerUrl, '_blank');
                            }}
                            className="flex-shrink-0 p-1.5 border border-border rounded-md bg-background hover:bg-muted transition-colors"
                            title="Add New"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Broker Commission - inline */}
                    <div>
                      <label className="block text-xs font-medium mb-0.5">
                        Broker Commission {formData.broker_commission_type === 'weight' && <span className="text-muted-foreground font-normal">(per {brokerCommissionUnit})</span>}
                      </label>
                      <div className="flex gap-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={formData.broker_commission_type === 'percentage' ? 100 : undefined}
                          value={formData.broker_commission || ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (isNaN(value) || value === 0) {
                              setFormData({ ...formData, broker_commission: null });
                              setErrors({ ...errors, broker_commission: '' });
                            } else if (value < 0) {
                              setErrors({ ...errors, broker_commission: 'Negative values not allowed' });
                              setFormData({ ...formData, broker_commission: null });
                            } else {
                              const maxValue = formData.broker_commission_type === 'percentage' ? 100 : undefined;
                              const clampedValue = maxValue !== undefined ? Math.min(Math.max(value, 0), maxValue) : Math.max(value, 0);
                              setFormData({ ...formData, broker_commission: clampedValue > 0 ? clampedValue : null });
                              setErrors({ ...errors, broker_commission: '' });
                            }
                          }}
                          className={`flex-1 min-w-0 px-2 py-1.5 text-sm border rounded-md bg-background ${
                            errors.broker_commission ? 'border-red-500' : 'border-border'
                          }`}
                          placeholder="0"
                        />
                        <select
                          value={formData.broker_commission_type || 'percentage'}
                          onChange={(e) => setFormData({ ...formData, broker_commission_type: e.target.value as BrokerCommissionType })}
                          className="flex-shrink-0 w-14 px-1 py-1.5 text-xs border border-border rounded-md bg-background"
                        >
                          <option value="percentage">%</option>
                          <option value="rupees">₹</option>
                          <option value="weight">₹/Wt</option>
                        </select>
                        {formData.broker_commission_type === 'weight' && (
                          <select
                            value={brokerCommissionUnit}
                            onChange={(e) => setBrokerCommissionUnit(e.target.value as 'kg' | 'quintal' | 'ton')}
                            className="flex-shrink-0 w-16 px-1 py-1.5 text-xs border border-border rounded-md bg-background"
                          >
                            <option value="kg">Kg</option>
                            <option value="quintal">Qtl</option>
                            <option value="ton">Ton</option>
                          </select>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section: Notes */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium">Notes</label>
                    <textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                      className={`w-full px-2 py-1.5 text-sm border rounded-md bg-background resize-none ${
                        errors.notes ? 'border-red-500' : 'border-border'
                      }`}
                      placeholder="Additional notes (max 1000 chars)"
                      rows={2}
                      maxLength={1000}
                    />
                  </div>

                  {/* Section: Dana Required */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_dana_required"
                        checked={formData.is_dana_required ?? true}
                        onChange={(e) => setFormData({ ...formData, is_dana_required: e.target.checked })}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <label htmlFor="is_dana_required" className="text-xs font-medium cursor-pointer">
                        Is Dana Required
                      </label>
                    </div>
                    <p className="text-[10px] text-muted-foreground pl-6">
                      If checked, dana deduction (300gm per quintal) will be calculated in payment advice for this sauda. 
                      If unchecked, no dana deduction will be applied.
                    </p>
                  </div>

                  {/* Section: Rice Images */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-1">
                      Rice Images
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Cooked Rice Image */}
                      <div>
                        <label className="block text-xs font-medium mb-0.5">Cooked Rice</label>
                        <div className="space-y-1">
                          {formData.cooked_rice_image_url && (
                            <div className="relative w-full h-20 border border-border rounded-md overflow-hidden bg-muted/30">
                              <img
                                src={formData.cooked_rice_image_url}
                                alt="Cooked rice"
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, cooked_rice_image_url: null }));
                                  setPendingFiles(prev => ({ ...prev, cooked_rice_image: null }));
                                }}
                                className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                                title="Remove"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/gif"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                handleFileSelect('cooked_rice_image', file || null);
                              }}
                              disabled={uploading.cooked_rice_image}
                              className="w-full px-2 py-1 text-xs border border-border rounded-md bg-background file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-xs file:bg-primary/10 file:text-primary disabled:opacity-50"
                            />
                            {uploading.cooked_rice_image && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                              </div>
                            )}
                            {uploadSuccess.cooked_rice_image && !uploading.cooked_rice_image && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <Check className="h-3 w-3 text-emerald-500" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Uncooked Rice Image */}
                      <div>
                        <label className="block text-xs font-medium mb-0.5">Uncooked Rice</label>
                        <div className="space-y-1">
                          {formData.uncooked_rice_image_url && (
                            <div className="relative w-full h-20 border border-border rounded-md overflow-hidden bg-muted/30">
                              <img
                                src={formData.uncooked_rice_image_url}
                                alt="Uncooked rice"
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, uncooked_rice_image_url: null }));
                                  setPendingFiles(prev => ({ ...prev, uncooked_rice_image: null }));
                                }}
                                className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                                title="Remove"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/gif"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                handleFileSelect('uncooked_rice_image', file || null);
                              }}
                              disabled={uploading.uncooked_rice_image}
                              className="w-full px-2 py-1 text-xs border border-border rounded-md bg-background file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-xs file:bg-primary/10 file:text-primary disabled:opacity-50"
                            />
                            {uploading.uncooked_rice_image && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                              </div>
                            )}
                            {uploadSuccess.uncooked_rice_image && !uploading.uncooked_rice_image && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <Check className="h-3 w-3 text-emerald-500" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-3 border-t border-border">
                    <button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
                    </button>
                  </div>

                  {/* Notification Buttons - Show after successful save */}
                  {(createdSaudaId || (isEditMode && saudaId)) && alertType === 'success' && !loading && (
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
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Sauda Preview
                    </h3>
                    <button
                      type="button"
                      onClick={handleDownloadPDF}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </button>
                  </div>

                  <div 
                    ref={previewRef}
                    className="border border-border rounded-lg p-4 bg-background font-mono text-sm overflow-y-auto max-h-[65vh]"
                  >
                      {/* Header */}
                      <div className="text-center border-b-2 border-dashed border-border pb-4 mb-4">
                        <h2 className="font-bold text-lg">{defaultRecipient?.name || 'Loading...'}</h2>
                        <p className="text-xs text-muted-foreground">LLPIN: {defaultRecipient?.llpin || '-'}</p>
                        <p className="text-xs text-muted-foreground mt-1">{defaultRecipient?.address || '-'}</p>
                      </div>

                      {/* Sauda Title */}
                      <div className="text-center mb-4">
                        <h3 className="font-bold text-base uppercase border-b border-border pb-2">Sauda Details</h3>
                      </div>

                      {/* Basic Info */}
                      <div className="mb-4">
                        <div className="font-bold border-b border-border pb-1 mb-2">Basic Information</div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Sauda Type:</span>
                            <span className="font-semibold">{formData.sauda_type === 'exgodown' ? 'Ex Godown' : 'FOR'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Rice Code:</span>
                            <span className="font-semibold">{getRiceCodeName(formData.rice_code_id ?? null)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Rice Type:</span>
                            <span className="font-semibold">{getRiceTypeName(formData.rice_type ?? null)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Rice Length:</span>
                            <span className="font-semibold">{getRiceLengthName(formData.rice_length ?? null)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Date:</span>
                            <span className="font-semibold">
                              {formData.sauda_date 
                                ? new Date(formData.sauda_date + 'T00:00:00').toLocaleDateString('en-IN')
                                : new Date().toLocaleDateString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="mb-4">
                        <div className="font-bold border-b border-border pb-1 mb-2">Pricing & Quantity</div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Rate:</span>
                            <span className="font-semibold">₹{formData.rate?.toFixed(2) || '0.00'}/{unit}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Quantity:</span>
                            <span className="font-semibold">{formData.quantity?.toFixed(2) || '-'} {unit}</span>
                          </div>
                          {formData.cash_discount && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Cash Discount:</span>
                              <span className="font-semibold text-emerald-600">
                                {formData.cash_discount_type === 'percentage' 
                                  ? `${formData.cash_discount}%` 
                                  : `₹${formData.cash_discount?.toFixed(2)}`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Parties */}
                      <div className="mb-4">
                        <div className="font-bold border-b border-border pb-1 mb-2">Parties</div>
                        <div className="grid grid-cols-1 gap-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Vendor:</span>
                            <span className="font-semibold">{getVendorName(formData.purchaser_id)}</span>
                          </div>
                          {formData.broker_id && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Broker:</span>
                                <span className="font-semibold">{getBrokerName(formData.broker_id)}</span>
                              </div>
                              {formData.broker_commission && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Commission:</span>
                                  <span className="font-semibold">
                                    {formData.broker_commission_type === 'percentage' 
                                      ? `${formData.broker_commission}%`
                                      : formData.broker_commission_type === 'weight'
                                      ? `₹${formData.broker_commission}/${brokerCommissionUnit}`
                                      : `₹${formData.broker_commission?.toFixed(2)}`}
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Amount */}
                      {calculateAmount() && (
                        <div className="bg-muted/50 rounded-lg p-3 text-center mt-4">
                          <p className="text-xs text-muted-foreground mb-1">Estimated Amount</p>
                          <p className="text-xl font-bold text-primary">
                            ₹{calculateAmount()?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}

                      {/* Notes */}
                      {formData.notes && (
                        <div className="mt-4 pt-4 border-t border-dashed border-border">
                          <p className="text-xs text-muted-foreground">Notes:</p>
                          <p className="text-sm">{formData.notes}</p>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="text-center border-t-2 border-dashed border-border pt-4 mt-4">
                        <p className="text-xs text-muted-foreground">Generated on {new Date().toLocaleString('en-IN')}</p>
                        <p className="text-xs text-muted-foreground">This is a computer-generated document</p>
                      </div>
                    </div>
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
        type="sauda"
        initialTab={notificationInitialTab}
        entityId={createdSaudaId || saudaId || undefined}
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


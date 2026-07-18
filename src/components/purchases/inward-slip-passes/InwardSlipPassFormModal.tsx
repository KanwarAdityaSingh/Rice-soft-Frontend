import * as Dialog from '@radix-ui/react-dialog';
import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, Check, Loader2, Plus, Search, ChevronDown, RefreshCw, Download, Truck, Shield } from 'lucide-react';
import { useInwardSlipPasses } from '../../../hooks/useInwardSlipPasses';
import { inwardSlipPassesAPI } from '../../../services/inwardSlipPasses.api';
import { useSaudas } from '../../../hooks/useSaudas';
import { useVendors } from '../../../hooks/useVendors';
import { useTransporters } from '../../../hooks/useTransporters';
import { useVehicles } from '../../../hooks/useVehicles';
import { vehiclesAPI } from '../../../services/vehicles.api';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { vendorsAPI } from '../../../services/vendors.api';
import { kaantasAPI } from '../../../services/kaantas.api';
import { getRiceTypeLabel } from '../../../utils/riceType';
import { getCompletionStatus, formatCompletionPercentage, formatWeightDisplay } from '../../../utils/saudaCompletion';
import { getSaudaSerialNumber } from '../../../utils/saudaSerial';
import { getSaudaPurchaserName, partyDetailsFromSaudaVendor } from '../../../utils/saudaDisplay';
import { getUserFacingApiErrorMessage } from '../../../utils/errorHandler';
import {
  getVehicleNumberValidationError,
  sanitizeVehicleNumberInput,
  VEHICLE_NUMBER_MAX_LENGTH,
  getGstValidationError,
  getPanValidationError,
  getGstPanMismatchError,
  GST_EXAMPLE,
  PAN_EXAMPLE,
  GST_MAX_LENGTH,
  PAN_MAX_LENGTH,
} from '../../../utils/validation';
import { useGodowns } from '../../../hooks/useGodowns';
import { AlertDialog } from '../../shared/AlertDialog';
import { DateInputWithSteppers } from '../../shared/DateInputWithSteppers';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { TransporterFormModal } from '../../admin/transporters/TransporterFormModal';
import { VehicleFormModal } from '../../admin/vehicles/VehicleFormModal';
import type { CreateInwardSlipPassRequest, UpdateInwardSlipPassRequest, RiceCode, RiceType, Sauda, Vehicle, OtherBill } from '../../../types/entities';
import { parametersAPI } from '../../../services/parameters.api';
import { QualityParametersFields } from '../../shared/QualityParametersFields';
import { UploadedDocumentPreview, extractUploadResponseUrl } from '../../shared/UploadedDocumentPreview';
import {
  draftFromQualityParameter,
  emptyQualityParameterDraft,
  qualityDraftHasAnyValue,
  qualityDraftToNullableFields,
  type QualityParameterFieldKey,
} from '../../../utils/qualityParameters';

// Default recipient type
interface DefaultRecipient {
  name: string;
  address: string;
  llpin: string;
}

interface FileUploadState {
  purchase_bill: File | null;
  bilti: File | null;
  eway_bill: File | null;
}

interface PendingOtherBill {
  name: string;
  file: File;
}

interface InwardSlipPassFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ispId?: string | null;
}

export function InwardSlipPassFormModal({ open, onOpenChange, ispId }: InwardSlipPassFormModalProps) {
  const { createInwardSlipPass, updateInwardSlipPass } = useInwardSlipPasses();
  const { saudas } = useSaudas();
  const { vendors } = useVendors();
  const { transporters, refetch: refetchTransporters, loading: loadingTransporters } = useTransporters();
  const { vehicles, refetch: refetchVehicles, loading: loadingVehicles } = useVehicles();
  const { godowns } = useGodowns(false);
  const isEditMode = !!ispId;
  const [riceCodes, setRiceCodes] = useState<RiceCode[]>([]);
  const [riceTypes, setRiceTypes] = useState<RiceType[]>([]);
  const [defaultRecipient, setDefaultRecipient] = useState<DefaultRecipient | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  
  // Vehicle-related state
  const [vehicleNumberInput, setVehicleNumberInput] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [creatingVehicle, setCreatingVehicle] = useState(false);
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const vehicleDropdownRef = useRef<HTMLDivElement>(null);
  const [transporterDropdownOpen, setTransporterDropdownOpen] = useState(false);
  const [transporterSearchQuery, setTransporterSearchQuery] = useState('');
  const transporterDropdownRef = useRef<HTMLDivElement>(null);
  const [transporterFormOpen, setTransporterFormOpen] = useState(false);
  const [vehicleFormOpen, setVehicleFormOpen] = useState(false);

  useEffect(() => {
    const fetchRiceCodes = async () => {
      try {
        const data = await riceCodesAPI.getAllRiceCodes();
        setRiceCodes(data);
      } catch (error) {
        console.error('Failed to fetch rice codes:', error);
      }
    };
    const fetchRiceTypes = async () => {
      try {
        const data = await riceCodesAPI.getRiceTypes();
        setRiceTypes(data);
      } catch (error) {
        console.error('Failed to fetch rice types:', error);
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
      fetchRiceTypes();
      fetchDefaultRecipient();
    }
  }, [open]);

  const getRiceCodeName = (riceCodeId: string | null | undefined): string => {
    if (!riceCodeId) return '';
    const riceCode = riceCodes.find((rc) => rc.rice_code_id === riceCodeId);
    return riceCode ? riceCode.rice_code_name : '';
  };

  const getPurchaserName = (sauda: Sauda): string => getSaudaPurchaserName(sauda, vendors);

  const getSaudaDisplayName = (sauda: Sauda): string => {
    const parts: string[] = [];
    
    const purchaserName = getPurchaserName(sauda);
    if (purchaserName) parts.push(purchaserName);
    
    const riceCodeName = getRiceCodeName(sauda.rice_code_id);
    if (riceCodeName) parts.push(riceCodeName);
    
    const riceTypeLabel = getRiceTypeLabel(sauda.rice_type, riceTypes);
    if (riceTypeLabel) parts.push(riceTypeLabel);
    
    return parts.join(' - ') || 'Sauda';
  };

  /** Same S. No. as the Saudas directory table (order from GET /saudas, no type filter). */
  const getSaudaSerial = (sauda: Sauda): number | null => getSaudaSerialNumber(sauda.id, saudas);

  const formatSaudaDate = (sauda: Sauda): string => {
    if (!sauda.sauda_date) return '';
    const d = new Date(sauda.sauda_date);
    if (Number.isNaN(d.getTime())) return sauda.sauda_date;
    return d.toLocaleDateString('en-IN');
  };

  const [formData, setFormData] = useState<CreateInwardSlipPassRequest>({
    godown_id: '',
    sauda_ids: [],
    date: new Date().toISOString().split('T')[0],
    vehicle_id: '',
    party_name: '',
    party_address: null,
    party_gst_number: null,
    party_pan_number: null,
    transporter_id: null,
    transportation_cost: null,
    notes: null,
  });
  const [displaySlipNumber, setDisplaySlipNumber] = useState<string>(''); // For display in edit mode
  const [otherBills, setOtherBills] = useState<OtherBill[]>([]);
  const [pendingOtherBills, setPendingOtherBills] = useState<PendingOtherBill[]>([]);
  const [pendingFiles, setPendingFiles] = useState<FileUploadState>({
    purchase_bill: null,
    bilti: null,
    eway_bill: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingISP, setLoadingISP] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadSuccess, setUploadSuccess] = useState<Record<string, boolean>>({});
  const [uploadingOtherBill, setUploadingOtherBill] = useState(false);
  const [newBillName, setNewBillName] = useState('');
  const [newBillFile, setNewBillFile] = useState<File | null>(null);
  const [billNumber, setBillNumber] = useState<string>('');
  const [billDate, setBillDate] = useState<string>('');
  /** True when ISP already has a purchase bill PDF from the server (edit mode). */
  const [hasExistingPurchaseBill, setHasExistingPurchaseBill] = useState(false);
  /** Latest known attachment URLs (from server load or after upload) for inline preview. */
  const [billAttachmentPreviewUrls, setBillAttachmentPreviewUrls] = useState<{
    purchase_bill: string | null;
    bilti: string | null;
    eway_bill: string | null;
  }>({ purchase_bill: null, bilti: null, eway_bill: null });
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [saudaSearchQuery, setSaudaSearchQuery] = useState('');
  const [saudaDropdownOpen, setSaudaDropdownOpen] = useState(false);
  const saudaDropdownRef = useRef<HTMLDivElement>(null);

  const [ispQualityParameterId, setIspQualityParameterId] = useState<string | null>(null);
  const [ispQualityDraft, setIspQualityDraft] = useState(emptyQualityParameterDraft());

  useEffect(() => {
    if (open && ispId && isEditMode) {
      loadISPData();
    } else if (open && !ispId) {
      resetForm();
    }
  }, [open, ispId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (saudaDropdownRef.current && !saudaDropdownRef.current.contains(event.target as Node)) {
        setSaudaDropdownOpen(false);
      }
    };

    if (saudaDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [saudaDropdownOpen]);

  // Fill party details from sauda vendor (embedded name + vendor master for GST/address).
  useEffect(() => {
    if (!open || !formData.sauda_ids?.length) return;

    const sauda = saudas.find((s) => s.id === formData.sauda_ids![0]);
    if (!sauda) return;

    let cancelled = false;

    void (async () => {
      let vendor = vendors.find((v) => v.id === sauda.purchaser_id) ?? null;
      if (!vendor && sauda.purchaser_id) {
        try {
          vendor = await vendorsAPI.getVendorById(sauda.purchaser_id);
        } catch {
          // Vendor list may be incomplete; sauda embed still supplies party name.
        }
      }
      if (cancelled) return;

      const vendorList =
        vendor && !vendors.some((v) => v.id === vendor!.id) ? [...vendors, vendor] : vendors;
      const party = partyDetailsFromSaudaVendor(sauda, vendor, vendorList);

      setFormData((prev) => {
        if (!prev.sauda_ids?.length || prev.sauda_ids[0] !== sauda.id) return prev;
        return { ...prev, ...party };
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [open, formData.sauda_ids, saudas, vendors]);

  const loadISPData = async () => {
    if (!ispId) return;
    setLoadingISP(true);
    try {
      const isp = await inwardSlipPassesAPI.getInwardSlipPassById(ispId);
      setFormData({
        godown_id: isp.godown_id || '',
        sauda_ids: isp.sauda_ids || [],
        date: isp.date,
        vehicle_id: isp.vehicle_id,
        party_name: isp.party_name,
        party_address: isp.party_address || null,
        party_gst_number: isp.party_gst_number || null,
        party_pan_number: isp.party_pan_number || null,
        transporter_id: isp.transporter_id || null,
        transportation_cost: isp.transportation_cost ?? null,
        notes: isp.notes || null,
      });
      setDisplaySlipNumber(isp.slip_number); // Store for display only
      setOtherBills(isp.other_bills || []); // Load other_bills array
      setHasExistingPurchaseBill(Boolean(isp.bill_pdf_url));
      setBillAttachmentPreviewUrls({
        purchase_bill: isp.bill_pdf_url ?? null,
        bilti: isp.bilti_image_url ?? isp.bilti_pdf_url ?? null,
        eway_bill: isp.eway_bill_url ?? null,
      });
      // Load bill number and date
      setBillNumber(isp.bill_number || '');
      setBillDate(isp.bill_date || '');
      // Load selected vehicle details
      if (isp.vehicle_id) {
        try {
          const vehicle = await vehiclesAPI.getVehicleById(isp.vehicle_id);
          setSelectedVehicle(vehicle);
          setVehicleNumberInput(vehicle.vehicle_number);
        } catch (err) {
          console.error('Failed to load vehicle:', err);
        }
      }
      try {
        const rows = await parametersAPI.list({ inward_slip_pass_id: ispId });
        const row = rows?.[0] ?? null;
        setIspQualityParameterId(row?.id ?? null);
        setIspQualityDraft(draftFromQualityParameter(row));
      } catch (err) {
        console.error('Failed to load quality parameters for ISP:', err);
        setIspQualityParameterId(null);
        setIspQualityDraft(emptyQualityParameterDraft());
      }
      setErrors({});
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to load ISP data');
      setAlertOpen(true);
    } finally {
      setLoadingISP(false);
    }
  };

  const resetForm = () => {
    setFormData({
      godown_id: '',
      sauda_ids: [],
      date: new Date().toISOString().split('T')[0],
      vehicle_id: '',
      party_name: '',
      party_address: null,
      party_gst_number: null,
      party_pan_number: null,
      transporter_id: null,
      transportation_cost: null,
      notes: null,
    });
    setDisplaySlipNumber('');
    setOtherBills([]);
    setPendingOtherBills([]);
    setPendingFiles({
      purchase_bill: null,
      bilti: null,
      eway_bill: null,
    });
    setUploadSuccess({});
    setErrors({});
    setNewBillName('');
    setNewBillFile(null);
    setBillNumber('');
    setBillDate('');
    setHasExistingPurchaseBill(false);
    setBillAttachmentPreviewUrls({ purchase_bill: null, bilti: null, eway_bill: null });
    // Reset vehicle state
    setVehicleNumberInput('');
    setSelectedVehicle(null);
    setVehicleDropdownOpen(false);
    setTransporterDropdownOpen(false);
    setTransporterSearchQuery('');
    setIspQualityParameterId(null);
    setIspQualityDraft(emptyQualityParameterDraft());
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // sauda_ids is optional, but if provided must have at least 1 item (API contract)
    if (formData.sauda_ids && formData.sauda_ids.length === 0) {
      newErrors.sauda_ids = 'If provided, at least one sauda is required';
    }
    
    // date is required (API contract: ISO date format YYYY-MM-DD)
    if (!formData.date) {
      newErrors.date = 'Date is required';
    } else {
      // Validate ISO date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(formData.date)) {
        newErrors.date = 'Date must be in ISO format (YYYY-MM-DD)';
      } else {
        // Validate it's a valid date
        const dateObj = new Date(formData.date);
        if (isNaN(dateObj.getTime())) {
          newErrors.date = 'Invalid date';
        }
      }
    }
    
    if (!formData.godown_id || !formData.godown_id.trim()) {
      newErrors.godown_id = 'Receiving godown is required';
    }

    // vehicle_id is required (API contract: UUID, must exist in vehicles table)
    if (!formData.vehicle_id || formData.vehicle_id.trim() === '') {
      newErrors.vehicle_id = 'Vehicle is required';
    }
    
    // party_name is required, max 255 chars (API contract)
    if (!formData.party_name || !formData.party_name.trim()) {
      newErrors.party_name = 'Party name is required';
    } else if (formData.party_name.trim().length > 255) {
      newErrors.party_name = 'Party name must be at most 255 characters';
    }
    
    if (formData.party_gst_number?.trim()) {
      const gstError = getGstValidationError(formData.party_gst_number);
      if (gstError) newErrors.party_gst_number = gstError;
    }

    if (formData.party_pan_number?.trim()) {
      const panError = getPanValidationError(formData.party_pan_number);
      if (panError) newErrors.party_pan_number = panError;
    }

    if (formData.party_gst_number?.trim() && formData.party_pan_number?.trim()) {
      const mismatchError = getGstPanMismatchError(formData.party_gst_number, formData.party_pan_number);
      if (mismatchError) newErrors.party_pan_number = mismatchError;
    }
    
    // transportation_cost is optional, but if provided must be >= 0 with 2 decimal places (API contract)
    if (formData.transportation_cost != null) {
      if (formData.transportation_cost < 0) {
        newErrors.transportation_cost = 'Transportation cost cannot be negative';
      }
      // Check precision (2 decimal places)
      const costStr = formData.transportation_cost.toString();
      const decimalParts = costStr.split('.');
      if (decimalParts.length > 1 && decimalParts[1].length > 2) {
        newErrors.transportation_cost = 'Transportation cost must have at most 2 decimal places';
      }
    }
    
    // notes is optional, max 1000 chars (API contract)
    if (formData.notes && formData.notes.length > 1000) {
      newErrors.notes = 'Notes cannot exceed 1000 characters';
    }

    if (!billNumber.trim()) {
      newErrors.bill_number = 'Bill number is required';
    }
    if (!billDate.trim()) {
      newErrors.bill_date = 'Bill date is required';
    } else {
      const billDateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!billDateRegex.test(billDate)) {
        newErrors.bill_date = 'Bill date must be in ISO format (YYYY-MM-DD)';
      } else {
        const d = new Date(billDate);
        if (Number.isNaN(d.getTime())) {
          newErrors.bill_date = 'Invalid bill date';
        }
      }
    }

    const purchaseBillOk =
      hasExistingPurchaseBill ||
      Boolean(uploadSuccess.purchase_bill) ||
      Boolean(pendingFiles.purchase_bill);
    if (!purchaseBillOk) {
      newErrors.purchase_bill = 'Purchase bill file is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadPendingFiles = async (newIspId: string) => {
    const uploadPromises: Promise<void>[] = [];
    const fileFields = Object.keys(pendingFiles) as (keyof FileUploadState)[];
    
    for (const field of fileFields) {
      const file = pendingFiles[field];
      if (file) {
        uploadPromises.push(
          (async () => {
            try {
              await handleFileUpload(field, file, newIspId);
            } catch (error) {
              console.error(`Failed to upload ${field}:`, error);
            }
          })()
        );
      }
    }
    
    // Upload pending other bills
    for (const pendingBill of pendingOtherBills) {
      uploadPromises.push(
        (async () => {
          try {
            await handleUploadOtherBill(newIspId, pendingBill.name, pendingBill.file);
          } catch (error) {
            console.error(`Failed to upload other bill ${pendingBill.name}:`, error);
          }
        })()
      );
    }
    
    if (uploadPromises.length > 0) {
      await Promise.all(uploadPromises);
    }
    
    // Clear pending other bills after successful upload
    if (pendingOtherBills.length > 0) {
      setPendingOtherBills([]);
    }
    
    // Reload ISP data to get updated other_bills
    if (isEditMode && newIspId) {
      try {
        const updatedISP = await inwardSlipPassesAPI.getInwardSlipPassById(newIspId);
        setOtherBills(updatedISP.other_bills || []);
      } catch (error) {
        console.error('Failed to reload ISP data:', error);
      }
    }
  };

  const setIspQualityField = (key: QualityParameterFieldKey, value: string) => {
    setIspQualityDraft((prev) => ({ ...prev, [key]: value }));
  };

  const persistIspQualityParameters = async (targetIspId: string) => {
    const hasValues = qualityDraftHasAnyValue(ispQualityDraft);
    const fields = qualityDraftToNullableFields(ispQualityDraft);
    if (ispQualityParameterId) {
      if (!hasValues) {
        await parametersAPI.delete(ispQualityParameterId);
      } else {
        await parametersAPI.update(ispQualityParameterId, fields);
      }
    } else {
      if (!hasValues) return;
      await parametersAPI.create({
        inward_slip_pass_id: targetIspId,
        ...fields,
      });
    }

    const rows = await parametersAPI.list({ inward_slip_pass_id: targetIspId });
    const row = rows?.[0] ?? null;
    setIspQualityParameterId(row?.id ?? null);
    setIspQualityDraft(draftFromQualityParameter(row));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Clean and prepare data according to API contract
      const cleanedData: CreateInwardSlipPassRequest | UpdateInwardSlipPassRequest = {
        godown_id: formData.godown_id.trim(),
        sauda_ids: formData.sauda_ids && formData.sauda_ids.length > 0 ? formData.sauda_ids : [],
        date: formData.date, // Already in ISO format (YYYY-MM-DD)
        vehicle_id: formData.vehicle_id.trim(),
        party_name: formData.party_name.trim(),
        party_address: formData.party_address?.trim() || null,
        party_gst_number: formData.party_gst_number?.trim().toUpperCase() || null, // Convert to uppercase
        party_pan_number: formData.party_pan_number?.trim().toUpperCase() || null, // Convert to uppercase
        transporter_id: formData.transporter_id || null,
        notes: formData.notes?.trim() || null, // Convert empty string to null
      };

      // Joi: optional() allows omit, not null — only include when a real cost is set (never for FOR saudas)
      const selectedHaveFor = saudas
        .filter((s) => (formData.sauda_ids || []).includes(s.id))
        .some((s) => s.sauda_type === 'for');
      if (!selectedHaveFor && formData.transportation_cost != null) {
        cleanedData.transportation_cost = parseFloat(formData.transportation_cost.toFixed(2));
      }
      
      let targetIspId: string;

      if (isEditMode && ispId) {
        await updateInwardSlipPass(ispId, cleanedData as UpdateInwardSlipPassRequest);
        await uploadPendingFiles(ispId);
        targetIspId = ispId;
      } else {
        const { slip_number, ...createData } = cleanedData as CreateInwardSlipPassRequest & {
          slip_number?: string | null;
        };
        void slip_number;
        const newISP = await createInwardSlipPass(createData as CreateInwardSlipPassRequest);
        if (!newISP?.id) {
          throw new Error('Create inward slip pass did not return an id.');
        }
        await uploadPendingFiles(newISP.id);
        targetIspId = newISP.id;
      }

      try {
        await persistIspQualityParameters(targetIspId);
      } catch (paramErr: any) {
        setAlertType('warning');
        setAlertTitle('ISP saved');
        setAlertMessage(
          paramErr?.message
            ? `Quality parameters could not be saved: ${paramErr.message}`
            : 'Quality parameters could not be saved. Try saving again.'
        );
        setAlertOpen(true);
        return;
      }

      setAlertType('success');
      setAlertTitle('Success');
      setAlertMessage(isEditMode ? 'ISP updated successfully' : 'ISP created successfully');
      setAlertOpen(true);
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 1500);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to save ISP');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (field: string, file: File, targetIspId?: string) => {
    const uploadIspId = targetIspId || ispId;
    if (!uploadIspId) {
      // Store file for later upload after creation
      setPendingFiles(prev => ({ ...prev, [field]: file }));
      return;
    }

    setUploading(prev => ({ ...prev, [field]: true }));
    try {
      let result: unknown;
      switch (field) {
        case 'purchase_bill':
          result = await inwardSlipPassesAPI.uploadPurchaseBill(
            uploadIspId,
            file,
            billNumber || undefined,
            billDate || undefined
          );
          break;
        case 'bilti':
          result = await inwardSlipPassesAPI.uploadBilti(uploadIspId, file);
          break;
        case 'eway_bill':
          result = await inwardSlipPassesAPI.uploadEwayBill(uploadIspId, file);
          break;
        default:
          throw new Error('Unknown upload field');
      }
      const uploadedUrl = extractUploadResponseUrl(result);
      if (
        uploadedUrl &&
        (field === 'purchase_bill' || field === 'bilti' || field === 'eway_bill')
      ) {
        setBillAttachmentPreviewUrls((prev) => ({ ...prev, [field]: uploadedUrl }));
      }
      if (field === 'purchase_bill') {
        setHasExistingPurchaseBill(true);
      }
      setUploadSuccess((prev) => ({ ...prev, [field]: true }));
      if (isEditMode) {
        setAlertType('success');
        setAlertTitle('Success');
        setAlertMessage('Document uploaded successfully');
        setAlertOpen(true);
      }
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to upload document');
      setAlertOpen(true);
    } finally {
      setUploading(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleUploadOtherBill = async (targetIspId: string, name: string, file: File) => {
    try {
      if (isEditMode && ispId) {
        await inwardSlipPassesAPI.uploadOtherBill(targetIspId, name, file);
        const updatedISP = await inwardSlipPassesAPI.getInwardSlipPassById(ispId);
        setOtherBills(updatedISP.other_bills || []);
      } else {
        const { bill } = await inwardSlipPassesAPI.uploadOtherBill(targetIspId, name, file);
        setOtherBills((prev) => [...prev, bill]);
      }
      setAlertType('success');
      setAlertTitle('Success');
      setAlertMessage('Bill uploaded successfully');
      setAlertOpen(true);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to upload bill');
      setAlertOpen(true);
      throw error;
    }
  };

  const handleDeleteOtherBill = async (billUrl: string) => {
    if (!ispId) return;
    
    if (!confirm('Are you sure you want to delete this bill?')) {
      return;
    }

    try {
      await inwardSlipPassesAPI.deleteOtherBill(ispId, billUrl);
      // Reload ISP data to get updated other_bills array
      const updatedISP = await inwardSlipPassesAPI.getInwardSlipPassById(ispId);
      setOtherBills(updatedISP.other_bills || []);
      setAlertType('success');
      setAlertTitle('Success');
      setAlertMessage('Bill deleted successfully');
      setAlertOpen(true);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to delete bill');
      setAlertOpen(true);
    }
  };

  const handleAddOtherBill = () => {
    if (!newBillName.trim() || !newBillFile) {
      setAlertType('error');
      setAlertTitle('Validation Error');
      setAlertMessage('Please provide a bill name and select a file');
      setAlertOpen(true);
      return;
    }

    // Validate file size (10MB max)
    if (newBillFile.size > 10 * 1024 * 1024) {
      setAlertType('error');
      setAlertTitle('File Too Large');
      setAlertMessage('File size must be less than 10MB');
      setAlertOpen(true);
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!validTypes.includes(newBillFile.type)) {
      setAlertType('error');
      setAlertTitle('Invalid File Type');
      setAlertMessage('Only JPEG, PNG, GIF images and PDF files are allowed');
      setAlertOpen(true);
      return;
    }

    if (isEditMode && ispId) {
      // Upload immediately in edit mode
      setUploadingOtherBill(true);
      handleUploadOtherBill(ispId, newBillName.trim(), newBillFile)
        .then(() => {
          setNewBillName('');
          setNewBillFile(null);
        })
        .finally(() => setUploadingOtherBill(false));
    } else {
      // Store for later upload after creation
      setPendingOtherBills(prev => [...prev, { name: newBillName.trim(), file: newBillFile }]);
      setNewBillName('');
      setNewBillFile(null);
    }
  };

  const handleFileSelect = (field: keyof FileUploadState, file: File | null) => {
    if (!file) return;

    if (isEditMode && ispId) {
      handleFileUpload(field, file);
    } else {
      setPendingFiles(prev => ({ ...prev, [field]: file }));
    }
    if (field === 'purchase_bill') {
      setErrors((prev) => ({ ...prev, purchase_bill: '' }));
    }
  };


  const toggleSaudaSelection = (saudaId: string) => {
    setFormData(prev => {
      const currentIds = prev.sauda_ids || [];
      const isAdding = !currentIds.includes(saudaId);
      
      if (isAdding) {
        const selectedSauda = saudas.find(s => s.id === saudaId);
        if (selectedSauda) {
          // Check if any saudas are already selected
          if (currentIds.length > 0) {
            // Get vendor from first selected sauda
            const firstSauda = saudas.find(s => s.id === currentIds[0]);
            if (firstSauda && firstSauda.purchaser_id !== selectedSauda.purchaser_id) {
              // Different vendor - show error
              setAlertType('error');
              setAlertTitle('Vendor Mismatch');
              setAlertMessage('All selected saudas must have the same vendor. Please deselect other saudas first.');
              setAlertOpen(true);
              return prev; // Don't add this sauda
            }
          }
          
          const newIds = [...currentIds, saudaId];
          const vendor = vendors.find((v) => v.id === selectedSauda.purchaser_id);
          const party = partyDetailsFromSaudaVendor(selectedSauda, vendor, vendors);

          return {
            ...prev,
            sauda_ids: newIds,
            ...party,
            ...(selectedSauda.sauda_type === 'for' ? { transportation_cost: null } : {}),
          };
        }
      }
      
      // Removing a sauda
      const newIds = currentIds.filter(id => id !== saudaId);
      
      // If no saudas left, allow editing party details
      if (newIds.length === 0) {
        return {
          ...prev,
          sauda_ids: newIds,
          party_name: '',
          party_address: null,
          party_gst_number: null,
          party_pan_number: null,
        };
      }
      
      // If saudas remain, keep party details locked (they're already set)
      return { ...prev, sauda_ids: newIds };
    });
  };

  const removeSauda = (saudaId: string) => {
    setFormData((prev) => {
      const newIds = (prev.sauda_ids || []).filter((id) => id !== saudaId);
      if (newIds.length === 0) {
        return {
          ...prev,
          sauda_ids: newIds,
          party_name: '',
          party_address: null,
          party_gst_number: null,
          party_pan_number: null,
        };
      }
      return { ...prev, sauda_ids: newIds };
    });
  };

  const getFilteredSaudas = () => {
    let filtered = saudas;
    
    // If saudas are already selected, only show saudas with the same vendor
    if (formData.sauda_ids && formData.sauda_ids.length > 0) {
      const firstSauda = saudas.find(s => s.id === formData.sauda_ids[0]);
      if (firstSauda) {
        filtered = saudas.filter(s => s.purchaser_id === firstSauda.purchaser_id);
      }
    }
    
    // Apply search filter
    if (saudaSearchQuery.trim()) {
      const query = saudaSearchQuery.toLowerCase();
      filtered = filtered.filter(sauda => {
        const displayName = getSaudaDisplayName(sauda).toLowerCase();
        const rate = sauda.rate.toString();
        const dateLabel = formatSaudaDate(sauda).toLowerCase();
        const rawDate = (sauda.sauda_date || '').toLowerCase();
        return (
          displayName.includes(query) ||
          rate.includes(query) ||
          dateLabel.includes(query) ||
          rawDate.includes(query)
        );
      });
    }
    
    return filtered;
  };

  const getSelectedSaudas = () => {
    return saudas.filter(s => (formData.sauda_ids || []).includes(s.id));
  };

  const hasForSauda = getSelectedSaudas().some((s) => s.sauda_type === 'for');

  // Get transporter name
  const getTransporterName = (transporterId: string | null): string => {
    if (!transporterId) return '-';
    const transporter = transporters.find(t => t.id === transporterId);
    return transporter ? transporter.business_name : '-';
  };


  // Filter transporters for dropdown
  const getFilteredTransporters = () => {
    const active = transporters.filter((t) => t.is_active);
    if (!transporterSearchQuery.trim()) return active;
    const query = transporterSearchQuery.toLowerCase();
    return active.filter(
      (t) =>
        t.business_name.toLowerCase().includes(query) ||
        t.gst_number?.toLowerCase().includes(query) ||
        t.pan_number?.toLowerCase().includes(query) ||
        t.contact_persons?.some(
          (cp) =>
            cp.name.toLowerCase().includes(query) ||
            cp.phones?.some((phone) => phone.includes(query))
        )
    );
  };

  const selectTransporter = (transporterId: string | null) => {
    setFormData((prev) => ({ ...prev, transporter_id: transporterId }));
    setTransporterDropdownOpen(false);
    setTransporterSearchQuery('');
  };

  const getFilteredVehicles = () => {
    const query = vehicleNumberInput.trim().toLowerCase();
    if (!query) return vehicles;
    return vehicles.filter(
      (v) =>
        v.vehicle_number.toLowerCase().includes(query) ||
        v.owner_name?.toLowerCase().includes(query) ||
        v.maker_model?.toLowerCase().includes(query) ||
        v.rc_number?.toLowerCase().includes(query)
    );
  };

  // Close transporter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (transporterDropdownRef.current && !transporterDropdownRef.current.contains(event.target as Node)) {
        setTransporterDropdownOpen(false);
      }
    };
    if (transporterDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [transporterDropdownOpen]);

  // Close vehicle dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (vehicleDropdownRef.current && !vehicleDropdownRef.current.contains(event.target as Node)) {
        setVehicleDropdownOpen(false);
      }
    };
    if (vehicleDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [vehicleDropdownOpen]);

  // Select existing vehicle
  const selectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData(prev => ({ ...prev, vehicle_id: vehicle.id }));
    setVehicleNumberInput(vehicle.vehicle_number);
    setVehicleDropdownOpen(false);
    // Link transporter if vehicle has one
    if (vehicle.transporter_ids?.length && !formData.transporter_id) {
      setFormData(prev => ({ ...prev, transporter_id: vehicle.transporter_ids[0] }));
    }
  };

  // Create vehicle from manual entry (number only; use directory for full RC details)
  const handleCreateVehicle = async () => {
    const normalizedNumber = sanitizeVehicleNumberInput(vehicleNumberInput);
    if (!normalizedNumber) return;

    const formatError = getVehicleNumberValidationError(normalizedNumber);
    if (formatError) {
      setErrors((prev) => ({ ...prev, vehicle_id: formatError }));
      return;
    }

    setCreatingVehicle(true);
    try {
      try {
        const existingVehicle = await vehiclesAPI.getVehicleByNumber(normalizedNumber);
        if (existingVehicle) {
          selectVehicle(existingVehicle);
          setAlertType('info');
          setAlertTitle('Vehicle Found');
          setAlertMessage('This vehicle already exists in the system.');
          setAlertOpen(true);
          return;
        }
      } catch {
        // Not found — create below
      }

      const vehicleData = {
        vehicle_number: normalizedNumber,
        transporter_ids: formData.transporter_id ? [formData.transporter_id] : [],
        is_verified: false,
        verified_at: null,
        is_active: true,
      };

      const newVehicle = await vehiclesAPI.createVehicle(vehicleData);
      selectVehicle(newVehicle);
      await refetchVehicles();
      setAlertType('success');
      setAlertTitle('Vehicle Created');
      setAlertMessage('Vehicle added successfully.');
      setAlertOpen(true);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(getUserFacingApiErrorMessage(error, 'Failed to create vehicle.'));
      setAlertOpen(true);
    } finally {
      setCreatingVehicle(false);
    }
  };

  // PDF Download function
  const handleDownloadPDF = async () => {
    if (!previewRef.current) return;
    
    // Check if ISP has kaantas before allowing download
    if (!ispId) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage('Cannot download PDF. ISP must be saved first.');
      setAlertOpen(true);
      return;
    }
    
    try {
      // Check if kaantas exist for this ISP
      const kaantas = await kaantasAPI.getAllKaantas(undefined, ispId);
      
      if (!kaantas || kaantas.length === 0) {
        setAlertType('error');
        setAlertTitle('Kaanta Required');
        setAlertMessage('Cannot download PDF. Please create a kaanta first before downloading the PDF.');
        setAlertOpen(true);
        return;
      }
    } catch (error: any) {
      // If error fetching kaantas, still show error
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage('Cannot download PDF. Please create a kaanta first before downloading the PDF.');
      setAlertOpen(true);
      return;
    }
    
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
            <title>Inward Slip Pass - ${formData.slip_number || 'ISP'}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: 'Courier New', monospace; 
                padding: 20px;
                background: white;
                color: black;
                font-size: 11px;
              }
              .preview-container {
                max-width: 700px;
                margin: 0 auto;
                border: 2px solid #333;
                padding: 15px;
              }
              .thanks { text-align: center; font-size: 10px; margin-bottom: 20px; }
              .header { text-align: center; border-bottom: 2px dashed #333; padding-bottom: 10px; margin-bottom: 15px; }
              .header h2 { font-size: 20px; margin-bottom: 3px; letter-spacing: 2px; }
              .header p { font-size: 9px; color: #666; }
              .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; padding: 5px 0; border-bottom: 1px dotted #999; }
              .info-pair { display: flex; gap: 8px; }
              .info-label { color: #666; }
              .info-value { font-weight: bold; }
              .weight-section { margin: 15px 0; }
              .weight-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dotted #999; }
              .weight-label { flex: 1; }
              .weight-value { font-weight: bold; font-size: 14px; min-width: 100px; text-align: right; }
              .weight-date { font-size: 10px; color: #666; margin-left: 20px; min-width: 150px; }
              .net-weight { background: #f5f5f5; padding: 10px; font-size: 16px; font-weight: bold; border: 2px solid #333; }
              .charges { margin-top: 15px; padding-top: 10px; border-top: 2px dashed #333; }
              .sauda-section { margin-top: 15px; padding: 10px; background: #f9f9f9; }
              .sauda-item { padding: 5px 0; border-bottom: 1px dotted #ccc; }
              @media print {
                body { padding: 0; }
                .preview-container { border: none; }
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
                  {isEditMode ? 'Edit Inward Slip Pass' : 'Create Inward Slip Pass'}
                </Dialog.Title>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {loadingISP ? (
                <div className="flex justify-center py-10">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Receiving at godown *</label>
                    <select
                      className={`w-full px-2 py-1.5 text-sm border rounded-md bg-background ${errors.godown_id ? 'border-red-500' : 'border-border'}`}
                      value={formData.godown_id}
                      onChange={(e) => {
                        setFormData({ ...formData, godown_id: e.target.value });
                        if (errors.godown_id) setErrors({ ...errors, godown_id: '' });
                      }}
                    >
                      <option value="">Select godown</option>
                      {godowns
                        .filter((g) => g.is_active)
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                    </select>
                    {errors.godown_id && <p className="text-xs text-red-600 mt-1">{errors.godown_id}</p>}
                  </div>
                  {/* Sauda Selection */}
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Saudas
                    </label>
                    {getSelectedSaudas().length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {getSelectedSaudas().map((sauda) => {
                          const saudaDateStr = formatSaudaDate(sauda);
                          const sn = getSaudaSerial(sauda);
                          return (
                          <div key={sauda.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                            <span>
                              {sn != null ? `S. No. ${sn} · ` : ''}
                              {getSaudaDisplayName(sauda)} - ₹{sauda.rate}
                              {saudaDateStr ? ` · ${saudaDateStr}` : ''}
                            </span>
                            <button type="button" onClick={() => removeSauda(sauda.id)} className="hover:bg-primary/20 rounded-full p-0.5">
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                          );
                        })}
                      </div>
                    )}
                    <div ref={saudaDropdownRef} className="relative">
                        <button
                          type="button"
                          onClick={() => setSaudaDropdownOpen(!saudaDropdownOpen)}
                          className={`w-full px-2 py-1.5 text-sm border rounded-md bg-background flex items-center justify-between ${errors.sauda_ids ? 'border-red-500' : 'border-border'}`}
                        >
                          <span className="text-xs text-muted-foreground">
                            {getSelectedSaudas().length === 0 ? 'Select saudas...' : `${getSelectedSaudas().length} selected`}
                          </span>
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${saudaDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {saudaDropdownOpen && (
                          <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg">
                            <div className="p-1.5 border-b border-border">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <input
                                  type="text"
                                  value={saudaSearchQuery}
                                  onChange={(e) => setSaudaSearchQuery(e.target.value)}
                                  placeholder="Search..."
                                  className="w-full pl-7 pr-2 py-1 text-xs border border-border rounded-md bg-background"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                            <div className="max-h-40 overflow-y-auto p-1">
                              {saudas.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-1 px-2">No saudas</p>
                              ) : getFilteredSaudas().length === 0 ? (
                                <div className="px-2 py-1">
                                  <p className="text-xs text-muted-foreground">No match</p>
                                  {formData.sauda_ids && formData.sauda_ids.length > 0 && (
                                    <p className="text-[10px] text-primary/80 mt-1">Only saudas with the same vendor can be selected together</p>
                                  )}
                                </div>
                              ) : (
                                <>
                                  {formData.sauda_ids && formData.sauda_ids.length > 0 && (
                                    <div className="px-2 py-1 mb-1 bg-primary/5 border-b border-primary/20">
                                      <p className="text-[10px] text-primary/90 font-medium">Only saudas with the same vendor are shown</p>
                                    </div>
                                  )}
                                  {getFilteredSaudas().map((sauda) => {
                                    const isSelected = (formData.sauda_ids || []).includes(sauda.id);
                                    const sn = getSaudaSerial(sauda);
                                    return (
                                      <button key={sauda.id} type="button" onClick={() => { toggleSaudaSelection(sauda.id); setSaudaSearchQuery(''); }}
                                        className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}>
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className="shrink-0 tabular-nums text-muted-foreground">{sn != null ? `S. No. ${sn}` : '—'}</span>
                                            <span className="min-w-0 truncate">{getSaudaDisplayName(sauda)} - ₹{sauda.rate}</span>
                                            {sauda.completion_percentage !== null && (
                                              <span className={`text-[9px] px-1 py-0.5 rounded-full ${getCompletionStatus(sauda.completion_percentage).bgColor} ${getCompletionStatus(sauda.completion_percentage).color} border ${getCompletionStatus(sauda.completion_percentage).borderColor}`}>
                                                {formatCompletionPercentage(sauda.completion_percentage)}
                                              </span>
                                            )}
                                          </div>
                                          {isSelected && <Check className="h-3 w-3" />}
                                        </div>
                                        {(sauda.sauda_date || sauda.quantity) && (
                                          <div className="text-[10px] text-muted-foreground mt-0.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                                            {sauda.sauda_date && (
                                              <span>Sauda date: {formatSaudaDate(sauda) || sauda.sauda_date}</span>
                                            )}
                                            {sauda.quantity && (
                                              <span>{formatWeightDisplay(sauda.received_until_now, sauda.quantity)}</span>
                                            )}
                                          </div>
                                        )}
                                      </button>
                                    );
                                  })}
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    {errors.sauda_ids && <p className="mt-0.5 text-xs text-red-500">{errors.sauda_ids}</p>}
                  </div>

                  {/* Party Details */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Party Details</h3>
                      {formData.sauda_ids && formData.sauda_ids.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">Locked (from sauda vendor)</span>
                      )}
                    </div>
                    {formData.sauda_ids && formData.sauda_ids.length > 0 && (
                      <div className="rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 mb-2">
                        <p className="text-[10px] text-primary/90">
                          Party details are automatically filled from the selected sauda's vendor and cannot be edited.
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium mb-0.5">GST No.</label>
                        <input 
                          type="text" 
                          value={formData.party_gst_number || ''} 
                          onChange={(e) => setFormData({ ...formData, party_gst_number: e.target.value.toUpperCase() || null })}
                          className={`w-full px-2 py-1.5 text-sm border rounded-md bg-background read-only:cursor-not-allowed ${errors.party_gst_number ? 'border-red-500' : 'border-border'}`} 
                          placeholder={GST_EXAMPLE}
                          readOnly={formData.sauda_ids && formData.sauda_ids.length > 0}
                          maxLength={GST_MAX_LENGTH}
                        />
                        {errors.party_gst_number && <p className="mt-0.5 text-xs text-red-500">{errors.party_gst_number}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-0.5">PAN No.</label>
                        <input 
                          type="text" 
                          value={formData.party_pan_number || ''} 
                          onChange={(e) => setFormData({ ...formData, party_pan_number: e.target.value.toUpperCase() || null })}
                          className={`w-full px-2 py-1.5 text-sm border rounded-md bg-background read-only:cursor-not-allowed ${errors.party_pan_number ? 'border-red-500' : 'border-border'}`} 
                          placeholder={PAN_EXAMPLE}
                          readOnly={formData.sauda_ids && formData.sauda_ids.length > 0}
                          maxLength={PAN_MAX_LENGTH}
                        />
                        {errors.party_pan_number && <p className="mt-0.5 text-xs text-red-500">{errors.party_pan_number}</p>}
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium mb-0.5">Party Name <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          value={formData.party_name} 
                          onChange={(e) => setFormData({ ...formData, party_name: e.target.value })}
                          className={`w-full px-2 py-1.5 text-sm border rounded-md bg-background read-only:cursor-not-allowed ${errors.party_name ? 'border-red-500' : 'border-border'}`} 
                          placeholder="Party Name"
                          readOnly={formData.sauda_ids && formData.sauda_ids.length > 0}
                          maxLength={255}
                        />
                        {errors.party_name && <p className="mt-0.5 text-xs text-red-500">{errors.party_name}</p>}
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium mb-0.5">Address</label>
                        <input 
                          type="text" 
                          value={formData.party_address || ''} 
                          onChange={(e) => setFormData({ ...formData, party_address: e.target.value || null })}
                          className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background read-only:cursor-not-allowed" 
                          placeholder="Party Address"
                          readOnly={formData.sauda_ids && formData.sauda_ids.length > 0}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Slip & Date */}
                  <div className="grid grid-cols-2 gap-2">
                    {isEditMode && displaySlipNumber && (
                      <div>
                        <label className="block text-xs font-medium mb-0.5">Slip No.</label>
                        <input 
                          type="text" 
                          value={displaySlipNumber} 
                          readOnly
                          className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-muted/50 cursor-not-allowed" 
                        />
                      </div>
                    )}
                    <div className={isEditMode && displaySlipNumber ? '' : 'col-span-2'}>
                      <label className="block text-xs font-medium mb-0.5">Date <span className="text-red-500">*</span></label>
                      <DateInputWithSteppers
                        className="w-full"
                        inputClassName="py-1.5 text-sm"
                        invalid={Boolean(errors.date)}
                        value={formData.date}
                        onChange={(v) => setFormData({ ...formData, date: v })}
                      />
                      {errors.date && <p className="mt-0.5 text-xs text-red-500">{errors.date}</p>}
                    </div>
                  </div>

                  {/* Transporter & Vehicle */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Transport & Vehicle</h3>
                    <div>
                      <label className="block text-xs font-medium mb-0.5">Transporter</label>
                      <div className="flex gap-1 flex-wrap items-stretch">
                        <div ref={transporterDropdownRef} className="relative flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => setTransporterDropdownOpen((open) => !open)}
                            className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background flex items-center justify-between gap-2"
                          >
                            <span className={`truncate text-left ${formData.transporter_id ? '' : 'text-muted-foreground'}`}>
                              {formData.transporter_id
                                ? getTransporterName(formData.transporter_id)
                                : 'Select transporter'}
                            </span>
                            <ChevronDown
                              className={`h-3.5 w-3.5 shrink-0 transition-transform ${transporterDropdownOpen ? 'rotate-180' : ''}`}
                            />
                          </button>
                          {transporterDropdownOpen && (
                            <div className="absolute z-20 w-full mt-1 bg-background border border-border rounded-md shadow-lg">
                              <div className="p-1.5 border-b border-border">
                                <div className="relative">
                                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                  <input
                                    type="text"
                                    value={transporterSearchQuery}
                                    onChange={(e) => setTransporterSearchQuery(e.target.value)}
                                    placeholder="Search transporters..."
                                    className="w-full pl-7 pr-2 py-1 text-xs border border-border rounded-md bg-background"
                                    onClick={(e) => e.stopPropagation()}
                                    autoFocus
                                  />
                                </div>
                              </div>
                              <div className="max-h-40 overflow-y-auto p-1">
                                <button
                                  type="button"
                                  onClick={() => selectTransporter(null)}
                                  className={`w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted ${
                                    !formData.transporter_id ? 'bg-muted font-medium' : ''
                                  }`}
                                >
                                  None
                                </button>
                                {getFilteredTransporters().length === 0 ? (
                                  <p className="text-xs text-muted-foreground py-1 px-2">No transporters found</p>
                                ) : (
                                  getFilteredTransporters().map((t) => (
                                    <button
                                      key={t.id}
                                      type="button"
                                      onClick={() => selectTransporter(t.id)}
                                      className={`w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted flex items-center justify-between gap-2 ${
                                        formData.transporter_id === t.id ? 'bg-primary/10 text-primary' : ''
                                      }`}
                                    >
                                      <span className="truncate">
                                        {t.business_name}
                                        {!t.is_verified ? ' (unverified)' : ''}
                                      </span>
                                      {formData.transporter_id === t.id && <Check className="h-3 w-3 shrink-0" />}
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <button type="button" onClick={() => refetchTransporters()} disabled={loadingTransporters} className="flex-shrink-0 p-1.5 border border-border rounded-md bg-background hover:bg-muted disabled:opacity-50" title="Refresh list">
                          <RefreshCw className={`h-3.5 w-3.5 ${loadingTransporters ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTransporterFormOpen(true)}
                          className="flex-shrink-0 px-2 py-1.5 text-xs border border-border rounded-md bg-background hover:bg-muted whitespace-nowrap"
                        >
                          Add transporter
                        </button>
                      </div>
                    </div>
                    
                    {/* Vehicle Selection */}
                    <div>
                      <label className="block text-xs font-medium mb-0.5">Vehicle <span className="text-red-500">*</span></label>
                      {selectedVehicle ? (
                        <div className={`flex items-center gap-2 px-2 py-1.5 border rounded-md bg-emerald-50 border-emerald-200 ${errors.vehicle_id ? 'border-red-500' : ''}`}>
                          <Truck className="h-4 w-4 text-emerald-600" />
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-sm">{selectedVehicle.vehicle_number}</span>
                            {selectedVehicle.owner_name && <span className="text-xs text-muted-foreground ml-2">({selectedVehicle.owner_name})</span>}
                            {selectedVehicle.is_verified && (
                              <span title="Verified">
                                <Shield className="inline h-3 w-3 text-emerald-600 ml-1" />
                              </span>
                            )}
                          </div>
                          <button type="button" onClick={() => { setSelectedVehicle(null); setFormData(prev => ({ ...prev, vehicle_id: '' })); setVehicleNumberInput(''); }} className="p-1 hover:bg-emerald-100 rounded">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div ref={vehicleDropdownRef} className="relative space-y-1">
                          <div className="flex gap-1 flex-wrap items-stretch">
                            <input 
                              type="text" 
                              value={vehicleNumberInput} 
                              onChange={(e) => {
                                setVehicleNumberInput(sanitizeVehicleNumberInput(e.target.value));
                                setVehicleDropdownOpen(true);
                                setErrors((prev) => {
                                  const next = { ...prev };
                                  delete next.vehicle_id;
                                  return next;
                                });
                              }}
                              onFocus={() => setVehicleDropdownOpen(true)}
                              maxLength={VEHICLE_NUMBER_MAX_LENGTH}
                              placeholder="Search or enter vehicle no."
                              className={`flex-1 min-w-[140px] px-2 py-1.5 text-sm border rounded-md bg-background uppercase ${errors.vehicle_id ? 'border-red-500' : 'border-border'}`}
                            />
                            <button
                              type="button"
                              onClick={() => void refetchVehicles()}
                              disabled={loadingVehicles}
                              className="flex-shrink-0 p-1.5 border border-border rounded-md bg-background hover:bg-muted disabled:opacity-50"
                              title="Refresh list"
                            >
                              <RefreshCw className={`h-3.5 w-3.5 ${loadingVehicles ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setVehicleFormOpen(true)}
                              className="flex-shrink-0 px-2 py-1.5 text-xs border border-border rounded-md bg-background hover:bg-muted whitespace-nowrap"
                            >
                              Add vehicle
                            </button>
                          </div>
                          
                          {/* Vehicle Dropdown */}
                          {vehicleDropdownOpen && (
                            <div className="absolute z-20 left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg">
                              <div className="max-h-32 overflow-y-auto p-1">
                                {vehicles.length === 0 ? (
                                  <p className="text-xs text-muted-foreground py-1 px-2">No vehicles in directory</p>
                                ) : getFilteredVehicles().length === 0 ? (
                                  <p className="text-xs text-muted-foreground py-1 px-2">No vehicles match your search</p>
                                ) : (
                                  getFilteredVehicles().slice(0, 15).map((v) => (
                                    <button 
                                      key={v.id} 
                                      type="button" 
                                      onClick={() => selectVehicle(v)}
                                      className="w-full text-left px-2 py-1 rounded text-xs hover:bg-muted flex items-center justify-between"
                                    >
                                      <div>
                                        <span className="font-medium">{v.vehicle_number}</span>
                                        {v.owner_name && <span className="text-muted-foreground ml-1">- {v.owner_name}</span>}
                                      </div>
                                      {v.is_verified && <Shield className="h-3 w-3 text-emerald-500" />}
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          )}

                          {/* Create from typed number if not in list */}
                          {vehicleNumberInput.trim() && !selectedVehicle && (
                            <div className="flex items-center gap-2">
                              <button 
                                type="button" 
                                onClick={handleCreateVehicle} 
                                disabled={creatingVehicle} 
                                className="flex-shrink-0 px-2 py-1 text-xs border border-primary text-primary rounded-md hover:bg-primary/10 disabled:opacity-50 flex items-center gap-1"
                              >
                                {creatingVehicle ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                                Add Vehicle
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {errors.vehicle_id && <p className="text-xs text-red-500 mt-0.5">{errors.vehicle_id}</p>}
                    </div>

                    {!hasForSauda && (
                    <div>
                      <label className="block text-xs font-medium mb-0.5">Transport Cost (₹)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        min="0"
                        value={formData.transportation_cost == null ? '' : formData.transportation_cost}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') {
                            setFormData({ ...formData, transportation_cost: null });
                            setErrors({ ...errors, transportation_cost: '' });
                            return;
                          }
                          const value = parseFloat(raw);
                          if (Number.isNaN(value)) return;
                          if (value < 0) {
                            setErrors({ ...errors, transportation_cost: 'Negative values not allowed' });
                            setFormData({ ...formData, transportation_cost: null });
                          } else {
                            setFormData({ ...formData, transportation_cost: value });
                            setErrors({ ...errors, transportation_cost: '' });
                          }
                        }}
                        className={`w-full px-2 py-1.5 text-sm border rounded-md bg-background ${
                          errors.transportation_cost ? 'border-red-500' : 'border-border'
                        }`}
                        placeholder="0" 
                      />
                      {errors.transportation_cost && (
                        <p className="text-xs text-red-500 mt-0.5">{errors.transportation_cost}</p>
                      )}
                    </div>
                    )}
                  </div>

                  {/* Bills Upload Section */}
                  <div className="pt-2 border-t border-border">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2 space-y-1.5">
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="block text-[10px] font-medium mb-0.5">
                              Purchase Bill Number <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={billNumber}
                              onChange={(e) => {
                                setBillNumber(e.target.value);
                                setErrors((prev) => ({ ...prev, bill_number: '' }));
                              }}
                              placeholder="e.g., BILL-2024-001"
                              className={`w-full px-1.5 py-1 text-[10px] border rounded-md bg-background ${
                                errors.bill_number ? 'border-red-500' : 'border-border'
                              }`}
                            />
                            {errors.bill_number && (
                              <p className="mt-0.5 text-[9px] text-red-500">{errors.bill_number}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium mb-0.5">
                              Purchase Bill Date <span className="text-red-500">*</span>
                            </label>
                            <DateInputWithSteppers
                              className="w-full"
                              inputClassName="py-1 text-[10px]"
                              invalid={Boolean(errors.bill_date)}
                              value={billDate}
                              onChange={(v) => {
                                setBillDate(v);
                                setErrors((prev) => ({ ...prev, bill_date: '' }));
                              }}
                            />
                            {errors.bill_date && (
                              <p className="mt-0.5 text-[9px] text-red-500">{errors.bill_date}</p>
                            )}
                          </div>
                        </div>
                        <div className="relative">
                          <label className="block text-[10px] font-medium mb-0.5">
                            Purchase Bill <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => {
                              handleFileSelect('purchase_bill', e.target.files?.[0] || null);
                            }}
                            disabled={uploading.purchase_bill}
                            className={`w-full px-1.5 py-1 text-[10px] border rounded-md bg-background file:mr-1 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[10px] file:bg-primary/10 file:text-primary disabled:opacity-50 ${
                              errors.purchase_bill ? 'border-red-500' : 'border-border'
                            }`}
                          />
                          {uploading.purchase_bill && (
                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                              <Loader2 className="h-3 w-3 animate-spin text-primary" />
                            </div>
                          )}
                          {uploadSuccess.purchase_bill && !uploading.purchase_bill && (
                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                              <Check className="h-3 w-3 text-emerald-500" />
                            </div>
                          )}
                          {errors.purchase_bill && (
                            <p className="mt-0.5 text-[9px] text-red-500">{errors.purchase_bill}</p>
                          )}
                          <UploadedDocumentPreview
                            url={billAttachmentPreviewUrls.purchase_bill}
                            compact
                            alt="Purchase bill"
                            className="mt-1"
                          />
                        </div>
                      </div>
                      {/* Bilti and Eway Bill */}
                      {(['bilti', 'eway_bill'] as const).map((field) => (
                        <div key={field} className="relative">
                          <label className="block text-[10px] font-medium mb-0.5 capitalize">{field.replace(/_/g, ' ')}</label>
                          <div className="relative">
                            <input type="file" accept="image/*,.pdf" onChange={(e) => { handleFileSelect(field, e.target.files?.[0] || null); }} disabled={uploading[field]}
                              className="w-full px-1.5 py-1 text-[10px] border border-border rounded-md bg-background file:mr-1 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[10px] file:bg-primary/10 file:text-primary disabled:opacity-50" />
                            {uploading[field] && <div className="absolute right-1.5 top-1/2 -translate-y-1/2"><Loader2 className="h-3 w-3 animate-spin text-primary" /></div>}
                            {uploadSuccess[field] && !uploading[field] && <div className="absolute right-1.5 top-1/2 -translate-y-1/2"><Check className="h-3 w-3 text-emerald-500" /></div>}
                          </div>
                          <UploadedDocumentPreview
                            url={billAttachmentPreviewUrls[field]}
                            compact
                            alt={field.replace(/_/g, ' ')}
                            className="mt-1"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Other Bills */}
                  <div className="pt-2 border-t border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase">Other Documents</h3>
                      {!isEditMode && <span className="text-[10px] text-muted-foreground">Upload after save</span>}
                    </div>
                    
                    {/* Display existing bills */}
                    {(otherBills.length > 0 || pendingOtherBills.length > 0) && (
                      <div className="space-y-1.5">
                        {otherBills.map((bill, index) => (
                          <div key={index} className="flex items-start gap-2 p-1.5 bg-muted/30 rounded border border-border">
                            <UploadedDocumentPreview
                              url={bill.url}
                              compact
                              alt={bill.name}
                              className="w-[4.5rem] shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate">{bill.name}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {new Date(bill.uploaded_at).toLocaleString('en-IN')}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <a
                                href={bill.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 hover:bg-muted rounded text-primary"
                                title="View"
                              >
                                <FileText className="h-3 w-3" />
                              </a>
                              {isEditMode && ispId && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteOtherBill(bill.url)}
                                  className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-500"
                                  title="Delete"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        {pendingOtherBills.map((bill, index) => (
                          <div key={`pending-${index}`} className="flex items-center justify-between p-1.5 bg-primary/10 rounded border border-primary/30">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate">{bill.name}</div>
                              <div className="text-[10px] text-muted-foreground">Pending upload</div>
                            </div>
                            {!isEditMode && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPendingOtherBills(prev => prev.filter((_, i) => i !== index));
                                }}
                                className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-500"
                                title="Remove"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload new bill form */}
                    <div className="space-y-1.5 p-2 bg-muted/20 rounded border border-border">
                      <div>
                        <label className="block text-[10px] font-medium mb-0.5">Document Name</label>
                        <input
                          type="text"
                          value={newBillName}
                          onChange={(e) => setNewBillName(e.target.value)}
                          placeholder="e.g., Transportation Bill"
                          className="w-full px-1.5 py-1 text-xs border border-border rounded-md bg-background"
                          disabled={uploadingOtherBill}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium mb-0.5">File (Image/PDF, max 10MB)</label>
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => setNewBillFile(e.target.files?.[0] || null)}
                            disabled={uploadingOtherBill}
                            className="w-full px-1.5 py-1 text-[10px] border border-border rounded-md bg-background file:mr-1 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[10px] file:bg-primary/10 file:text-primary disabled:opacity-50"
                          />
                          {uploadingOtherBill && (
                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                              <Loader2 className="h-3 w-3 animate-spin text-primary" />
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddOtherBill}
                        disabled={uploadingOtherBill || !newBillName.trim() || !newBillFile}
                        className="w-full px-2 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        {uploadingOtherBill ? 'Uploading...' : 'Add Document'}
                      </button>
                    </div>
                  </div>

                  {/* Quality parameters — persisted with Create / Update */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div>
                      <label className="block text-xs font-medium">Quality parameters</label>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Optional rice inspection fields. Cleared fields remove stored values when you save.
                      </p>
                    </div>
                    <QualityParametersFields
                      draft={ispQualityDraft}
                      onChange={setIspQualityField}
                      disabled={loading || loadingISP}
                      compact
                    />
                  </div>

                  {/* Notes */}
                  <div className="space-y-1 pt-2 border-t border-border">
                    <label className="block text-xs font-medium">Notes</label>
                    <textarea 
                      value={formData.notes || ''} 
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                      className={`w-full px-2 py-1.5 text-sm border rounded-md bg-background resize-none ${errors.notes ? 'border-red-500' : 'border-border'}`} 
                      placeholder="Additional notes (max 1000 chars)"
                      rows={3}
                      maxLength={1000}
                    />
                    {errors.notes && <p className="mt-0.5 text-xs text-red-500">{errors.notes}</p>}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-3 border-t border-border">
                    <button type="button" onClick={() => onOpenChange(false)} className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-muted transition-colors">Cancel</button>
                    <button type="submit" disabled={loading} className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50">
                      {loading ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>

                {/* Preview Section - Weighbridge Slip Style */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      ISP Preview
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
                    className="border-2 border-border rounded-lg p-4 bg-background font-mono text-xs overflow-y-auto max-h-[65vh]"
                  >
                      {/* Thanks Message */}
                      <div className="text-center mb-4 text-[10px] text-muted-foreground">
                        ! Thanks for your visit !
                      </div>

                      {/* Company Header */}
                      <div className="text-center border-b-2 border-dashed border-border pb-3 mb-4">
                        <h2 className="font-bold text-lg tracking-wider">{defaultRecipient?.name || 'Loading...'}</h2>
                        <p className="text-[9px] text-muted-foreground mt-1">{defaultRecipient?.address || '-'}</p>
                        <p className="text-[9px] text-muted-foreground">LLPIN: {defaultRecipient?.llpin || '-'}</p>
                      </div>

                      {/* Slip Info Row */}
                      <div className="border-b border-dotted border-border pb-2 mb-3">
                        <div className="flex justify-between gap-4 flex-wrap">
                          <div className="flex gap-2">
                            <span className="text-muted-foreground">RST No.:</span>
                            <span className="font-bold">{isEditMode ? displaySlipNumber : (formData.slip_number || 'Auto-generated')}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-muted-foreground">Vehicle No.:</span>
                            <span className="font-bold">{selectedVehicle?.vehicle_number || vehicleNumberInput || '-'}</span>
                          </div>
                        </div>
                        <div className="flex justify-between gap-4 mt-2 flex-wrap">
                          <div className="flex gap-2">
                            <span className="text-muted-foreground">Party Name:</span>
                            <span className="font-bold">{formData.party_name || '-'}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-muted-foreground">Item:</span>
                            <span className="font-bold">RICE</span>
                          </div>
                        </div>
                      </div>

                      {/* Address Row */}
                      {formData.party_address && (
                        <div className="border-b border-dotted border-border pb-2 mb-3">
                          <span className="text-muted-foreground">Address:</span>
                          <span className="font-semibold ml-2">{formData.party_address}</span>
                        </div>
                      )}

                      {/* Date */}
                      <div className="flex justify-between border-b border-dotted border-border pb-2 mb-3">
                        <span className="text-muted-foreground">Date:</span>
                        <span className="font-bold">{formData.date || '-'}</span>
                      </div>

                      {/* Charges */}
                      {formData.transportation_cost != null && (
                        <div className="border-t-2 border-dashed border-border pt-3 mt-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Transportation Cost:</span>
                            <span className="font-bold">₹ {formData.transportation_cost.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      )}

                      {/* Transporter Info */}
                      {formData.transporter_id && (
                        <div className="border-t border-dotted border-border pt-2 mt-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Transporter:</span>
                            <span className="font-semibold inline-flex items-center gap-1">
                              {getTransporterName(formData.transporter_id)}
                              {transporters.find((t) => t.id === formData.transporter_id)?.is_verified && (
                                <span title="Verified">
                                  <Shield className="h-3 w-3 text-emerald-600" />
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Linked Saudas */}
                      {getSelectedSaudas().length > 0 && (
                        <div className="border-t-2 border-dashed border-border pt-3 mt-3">
                          <div className="font-bold mb-2">Linked Saudas ({getSelectedSaudas().length})</div>
                          <div className="space-y-1 bg-muted/30 p-2 rounded">
                            {getSelectedSaudas().map((sauda) => {
                              const sn = getSaudaSerial(sauda);
                              return (
                              <div key={sauda.id} className="flex justify-between items-center py-1 border-b border-dotted border-border last:border-0">
                                <span className="text-muted-foreground whitespace-nowrap tabular-nums">{sn != null ? `S. No. ${sn}` : '—'}</span>
                                <div className="flex-1 ml-2">
                                  <div className="flex items-center gap-2">
                                    <span>{getSaudaDisplayName(sauda)}</span>
                                    {sauda.completion_percentage !== null && (
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getCompletionStatus(sauda.completion_percentage).bgColor} ${getCompletionStatus(sauda.completion_percentage).color} border ${getCompletionStatus(sauda.completion_percentage).borderColor}`}>
                                        {formatCompletionPercentage(sauda.completion_percentage)}
                                      </span>
                                    )}
                                  </div>
                                  {sauda.quantity && (
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      {formatWeightDisplay(sauda.received_until_now, sauda.quantity)}
                                    </div>
                                  )}
                                </div>
                                <span className="font-semibold">₹{sauda.rate}/kg</span>
                              </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {formData.notes && (
                        <div className="border-t border-dotted border-border pt-2 mt-3">
                          <span className="text-muted-foreground">Notes:</span>
                          <p className="mt-1">{formData.notes}</p>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="text-center border-t-2 border-dashed border-border pt-3 mt-4">
                        <p className="text-[9px] text-muted-foreground">Generated on {new Date().toLocaleString('en-IN')}</p>
                        <p className="text-[9px] text-muted-foreground">This is a computer-generated document</p>
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

      <TransporterFormModal
        open={transporterFormOpen}
        onOpenChange={(open) => {
          setTransporterFormOpen(open);
          if (!open) void refetchTransporters();
        }}
        nested
      />

      <VehicleFormModal
        open={vehicleFormOpen}
        onOpenChange={(open) => {
          setVehicleFormOpen(open);
          if (!open) void refetchVehicles();
        }}
        nested
      />
    </>
  );
}


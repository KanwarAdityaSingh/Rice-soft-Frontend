import * as Dialog from '@radix-ui/react-dialog';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Plus, RefreshCw, Check, Loader2, Download, FileText, Mail, MessageCircle } from 'lucide-react';
import { useSaudas } from '../../../hooks/useSaudas';
import { saudasAPI } from '../../../services/saudas.api';
import { useVendors } from '../../../hooks/useVendors';
import { useBrokers } from '../../../hooks/useBrokers';
import { riceCodesAPI, type CreateRiceCodeRequest } from '../../../services/riceCodes.api';
import { riceLengthsAPI, type CreateRiceLengthRequest } from '../../../services/riceLengths.api';
import { RiceCodeFormModal } from '../../admin/rice-codes/RiceCodeFormModal';
import { RiceLengthFormModal } from '../../admin/rice-codes/RiceLengthFormModal';
import { VendorFormModal } from '../../admin/vendors/VendorFormModal';
import { BrokerFormModal } from '../../admin/brokers/BrokerFormModal';
import { vendorsAPI } from '../../../services/vendors.api';
import { CustomSelect } from '../../shared/CustomSelect';
import { AlertDialog } from '../../shared/AlertDialog';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { DateInputWithSteppers, shiftIsoDate, toIsoDateString } from '../../shared/DateInputWithSteppers';
import { NotificationModal } from '../../shared/NotificationModal';
import { isAdmin } from '../../../utils/permissions';
import { getRiceCategoryLabel, formatRiceCategoryFallback } from '../../../utils/riceCategory';
import { formatVendorAddress } from '../../../utils/saudaDisplay';
import { prepareSaudaPdfDownload, saudaLikeFromFormData } from '../../../utils/saudaPdfData';
import { downloadSaudaPurchaseOrderPdf } from '../../../utils/saudaPdfPrint';
import { getRiceCodeVariantKeys } from '../../../utils/riceCodeVariants';
import {
  buildSaudaParametersPayload,
  formatSaudaAvgGrainLengthDisplay,
  formatSaudaWhitenessDisplay,
  saudaParametersFromSauda,
  SAUDA_AVG_GRAIN_LENGTH_MAX,
  SAUDA_AVG_GRAIN_LENGTH_MIN,
  SAUDA_WHITENESS_MAX,
  SAUDA_WHITENESS_MIN,
  validateSaudaAvgGrainLength,
  validateSaudaWhiteness,
  processSaudaDecimalFieldInput,
} from '../../../utils/saudaParameters';
import {
  cashDiscountMaxForType,
  SAUDA_MAX_BAGS,
  SAUDA_MAX_RATE,
  validateSaudaBrokerCommission,
  validateSaudaCashDiscount,
  validateSaudaNoOfBags,
  validateSaudaQuantity,
  validateSaudaRate,
  type SaudaWeightUnit,
} from '../../../utils/saudaFormLimits';
import type {
  CreateSaudaRequest,
  UpdateSaudaRequest,
  RiceCategory,
  RiceCode,
  RiceLengthRecord,
  RiceType,
  CashDiscountType,
  BrokerCommissionType,
} from '../../../types/entities';

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

const SAUDA_BAG_WEIGHT_KG_OPTIONS = [50, 55] as const;

function unitToKgFactor(unit: SaudaWeightUnit): number {
  return unit === 'kg' ? 1 : unit === 'quintal' ? 100 : 1000;
}

function quantityFromBags(
  noOfBags: number | null | undefined,
  bagWeightKg: number | null | undefined,
  unit: SaudaWeightUnit,
): number | null {
  if (noOfBags == null || bagWeightKg == null || noOfBags <= 0) return null;
  const totalKg = noOfBags * bagWeightKg;
  return parseFloat((totalKg / unitToKgFactor(unit)).toFixed(4));
}

function applyBagFieldPatch(
  prev: CreateSaudaRequest,
  patch: Partial<Pick<CreateSaudaRequest, 'no_of_bags' | 'bag_weight'>>,
  unit: SaudaWeightUnit,
): CreateSaudaRequest {
  const next = { ...prev, ...patch };
  const autoQty = quantityFromBags(next.no_of_bags, next.bag_weight, unit);
  if (autoQty != null) {
    next.quantity = autoQty;
  }
  return next;
}

export function SaudaFormModal({ open, onOpenChange, saudaId, onSuccess }: SaudaFormModalProps) {
  const { createSauda, updateSauda } = useSaudas();
  const { vendors, refetch: refetchVendors, loading: loadingVendors } = useVendors();
  const { brokers, refetch: refetchBrokers, loading: loadingBrokers } = useBrokers();
  const isEditMode = !!saudaId;
  const [riceCodes, setRiceCodes] = useState<RiceCode[]>([]);
  const [riceCategories, setRiceCategories] = useState<RiceType[]>([
    { value: 'basmati', label: 'Basmati' },
    { value: 'non_basmati', label: 'Non Basmati' },
  ]);
  const [categoryVariants, setCategoryVariants] = useState<RiceType[]>([]);
  const [riceLengths, setRiceLengths] = useState<RiceLengthRecord[]>([]);
  const [loadingRiceCodes, setLoadingRiceCodes] = useState(false);
  const [loadingCategoryVariants, setLoadingCategoryVariants] = useState(false);
  const [loadingRiceLengths, setLoadingRiceLengths] = useState(false);
  const [unit, setUnit] = useState<'kg' | 'quintal' | 'ton'>('kg');
  const [brokerCommissionUnit, setBrokerCommissionUnit] = useState<'kg' | 'quintal' | 'ton'>('kg');
  const [defaultRecipient, setDefaultRecipient] = useState<DefaultRecipient | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  /** Original sauda_date when editing — expands the ±3 day window so non-admins can keep it unchanged. */
  const loadedSaudaDateRef = useRef<string | null>(null);
  const loadedSaudaMetaRef = useRef<{ id?: string; display_id?: string | null }>({});
  const [formData, setFormData] = useState<CreateSaudaRequest>({
    sauda_type: 'exgodown',
    rice_category: null,
    rice_code_id: null,
    rice_type: null,
    rice_length_id: null,
    rate: 0,
    purchaser_id: '',
    broker_id: null,
    broker_commission: null,
    broker_commission_type: 'percentage',
    cash_discount: null,
    cash_discount_type: 'rupees',
    quantity: null,
    no_of_bags: null,
    bag_weight: null,
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
  const [riceCodeFormOpen, setRiceCodeFormOpen] = useState(false);
  const [riceLengthFormOpen, setRiceLengthFormOpen] = useState(false);
  const [vendorFormOpen, setVendorFormOpen] = useState(false);
  const [brokerFormOpen, setBrokerFormOpen] = useState(false);
  const [parameterFields, setParameterFields] = useState({
    whiteness: '',
    average_grain_length: '',
  });

  const todayIso = useMemo(() => toIsoDateString(new Date()), [open]);

  const saudaDateBounds = useMemo((): { min?: string; max?: string } => {
    if (isAdmin()) return {};
    let min = shiftIsoDate(todayIso, -3);
    let max = shiftIsoDate(todayIso, 3);
    const loaded = loadedSaudaDateRef.current;
    if (isEditMode && loaded) {
      if (loaded < min) min = loaded;
      if (loaded > max) max = loaded;
    }
    return { min, max };
  }, [isEditMode, todayIso, formData.sauda_date]);
  const refetchRiceCodes = useCallback(async () => {
    setLoadingRiceCodes(true);
    try {
      const data = await riceCodesAPI.getAllRiceCodes();
      setRiceCodes(data);
    } catch (error) {
      console.error('Failed to fetch rice codes:', error);
    } finally {
      setLoadingRiceCodes(false);
    }
  }, []);

  const handleCreateRiceCode = async (data: CreateRiceCodeRequest) => {
    const created = await riceCodesAPI.createRiceCode(data);
    setRiceCodes((prev) =>
      [...prev, created].sort((a, b) => a.rice_code_name.localeCompare(b.rice_code_name)),
    );
    setFormData((prev) => ({
      ...prev,
      rice_category: created.category,
      rice_code_id: created.rice_code_id,
      rice_type: null,
    }));
    return created;
  };

  const riceCodesForCategory = useMemo(() => {
    if (!formData.rice_category) return [];
    return riceCodes
      .filter((rc) => rc.category === formData.rice_category)
      .sort((a, b) => a.rice_code_name.localeCompare(b.rice_code_name));
  }, [riceCodes, formData.rice_category]);

  const selectedRiceCode = useMemo(
    () => riceCodes.find((rc) => rc.rice_code_id === formData.rice_code_id) ?? null,
    [riceCodes, formData.rice_code_id],
  );

  const variantOptionsForForm = useMemo(() => {
    const allowedKeys = getRiceCodeVariantKeys(selectedRiceCode?.variants);
    const base =
      !allowedKeys.length
        ? categoryVariants
        : categoryVariants.filter((v) => new Set(allowedKeys).has(v.value));
    // Keep saved variant visible while category variant catalog is still loading
    if (
      formData.rice_type &&
      !base.some((v) => v.value === formData.rice_type)
    ) {
      return [
        ...base,
        {
          value: formData.rice_type,
          label: formData.rice_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        },
      ];
    }
    return base;
  }, [selectedRiceCode, categoryVariants, formData.rice_type]);

  const handleCategoryChange = (value: string | null) => {
    setFormData((prev) => ({
      ...prev,
      rice_category: (value as RiceCategory) || null,
      rice_code_id: null,
      rice_type: null,
    }));
  };

  const handleRiceCodeChange = (value: string | null) => {
    setFormData((prev) => {
      const code = riceCodes.find((rc) => rc.rice_code_id === value);
      const allowed = new Set(getRiceCodeVariantKeys(code?.variants));
      const keepType = prev.rice_type && allowed.has(prev.rice_type) ? prev.rice_type : null;
      return {
        ...prev,
        rice_code_id: value,
        rice_type: keepType,
      };
    });
  };

  useEffect(() => {
    if (open && saudaId && isEditMode) {
      loadSaudaData();
    } else if (open && !saudaId) {
      resetForm();
    }
  }, [open, saudaId]);

  useEffect(() => {
    const fetchDefaultRecipient = async () => {
      try {
        const recipient = await vendorsAPI.getDefaultRecipient();
        setDefaultRecipient(recipient);
      } catch (error) {
        console.error('Failed to fetch default recipient:', error);
      }
    };
    if (open) {
      void refetchRiceCodes();
      fetchDefaultRecipient();
      void (async () => {
        try {
          const cats = await riceCodesAPI.getRiceCategories();
          setRiceCategories(cats);
        } catch {
          setRiceCategories([
            { value: 'basmati', label: 'Basmati' },
            { value: 'non_basmati', label: 'Non Basmati' },
          ]);
        }
      })();
    }
  }, [open, refetchRiceCodes]);

  useEffect(() => {
    if (!open || !formData.rice_category) {
      setCategoryVariants([]);
      setLoadingCategoryVariants(false);
      return;
    }
    let cancelled = false;
    setLoadingCategoryVariants(true);
    riceCodesAPI
      .getRiceVariants(formData.rice_category)
      .then((data) => {
        if (!cancelled) setCategoryVariants(data);
      })
      .catch((error) => {
        console.error('Failed to fetch category variants:', error);
        if (!cancelled) setCategoryVariants([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCategoryVariants(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, formData.rice_category]);

  const refetchRiceLengths = useCallback(async () => {
    setLoadingRiceLengths(true);
    try {
      const data = await riceLengthsAPI.getAllRiceLengths();
      setRiceLengths(data);
    } catch (error) {
      console.error('Failed to fetch rice lengths:', error);
    } finally {
      setLoadingRiceLengths(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void refetchRiceLengths();
    }
  }, [open, refetchRiceLengths]);

  const handleCreateRiceLength = async (data: CreateRiceLengthRequest) => {
    const created = await riceLengthsAPI.createRiceLength(data);
    setRiceLengths((prev) =>
      [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setFormData((prev) => ({ ...prev, rice_length_id: created.id }));
    return created;
  };

  const loadSaudaData = async () => {
    if (!saudaId) return;
    setLoadingSauda(true);
    try {
      const [sauda, codes] = await Promise.all([
        saudasAPI.getSaudaById(saudaId),
        riceCodesAPI.getAllRiceCodes(),
      ]);
      let matchedCode = codes.find((rc) => rc.rice_code_id === sauda.rice_code_id) ?? null;
      let nextCodes = codes;
      if (!matchedCode && sauda.rice_code_id) {
        matchedCode = await riceCodesAPI.getRiceCodeById(sauda.rice_code_id);
        if (matchedCode) {
          nextCodes = [...codes, matchedCode].sort((a, b) =>
            a.rice_code_name.localeCompare(b.rice_code_name),
          );
        }
      }
      setRiceCodes(nextCodes);
      const riceCategory =
        sauda.rice_category ?? matchedCode?.category ?? null;
      // Prefetch variants so edit form does not stick on "Loading..."
      if (riceCategory) {
        try {
          const variants = await riceCodesAPI.getRiceVariants(riceCategory);
          setCategoryVariants(variants);
          setLoadingCategoryVariants(false);
        } catch {
          setCategoryVariants([]);
          setLoadingCategoryVariants(false);
        }
      } else {
        setCategoryVariants([]);
        setLoadingCategoryVariants(false);
      }
      loadedSaudaDateRef.current = sauda.sauda_date || null;
      loadedSaudaMetaRef.current = { id: sauda.id, display_id: sauda.display_id ?? null };
      setFormData({
        sauda_type: sauda.sauda_type,
        rice_category: riceCategory,
        rice_code_id: sauda.rice_code_id || null,
        rice_type: sauda.rice_type || null,
        rice_length_id: sauda.rice_length_id ?? null,
        rate: sauda.rate,
        purchaser_id: sauda.purchaser_id,
        broker_id: sauda.broker_id || null,
        broker_commission: sauda.broker_commission || null,
        broker_commission_type: sauda.broker_commission_type || 'percentage',
        cash_discount: sauda.cash_discount || null,
        cash_discount_type: sauda.cash_discount_type || 'rupees',
        quantity: sauda.quantity ?? null,
        no_of_bags: sauda.no_of_bags ?? null,
        bag_weight: sauda.bag_weight ?? null,
        estimated_delivery_time: sauda.estimated_delivery_time || null,
        cooked_rice_image_url: sauda.cooked_rice_image_url || null,
        uncooked_rice_image_url: sauda.uncooked_rice_image_url || null,
        notes: sauda.notes || null,
        is_dana_required: sauda.is_dana_required ?? true, // Default to true if not set
        sauda_date: sauda.sauda_date || new Date().toISOString().split('T')[0],
      });
      setParameterFields(saudaParametersFromSauda(sauda));
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
    loadedSaudaDateRef.current = null;
    loadedSaudaMetaRef.current = {};
    setFormData({
      sauda_type: 'exgodown',
      rice_category: null,
      rice_code_id: null,
      rice_type: null,
      rice_length_id: null,
      rate: 0,
      purchaser_id: '',
      broker_id: null,
      broker_commission: null,
      broker_commission_type: 'percentage',
      cash_discount: null,
      cash_discount_type: 'rupees',
      quantity: null,
      no_of_bags: null,
      bag_weight: null,
      estimated_delivery_time: null,
      cooked_rice_image_url: null,
      uncooked_rice_image_url: null,
      notes: null,
      is_dana_required: true, // Default to true
      sauda_date: new Date().toISOString().split('T')[0], // Default to today's date
    });
    setParameterFields({ whiteness: '', average_grain_length: '' });
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
    
    if (!formData.rice_category) {
      newErrors.rice_category = 'Category is required';
    }

    if (!formData.rice_type) {
      newErrors.rice_type = 'Variant is required';
    }
    
    if (formData.rate === undefined || formData.rate === null || isNaN(formData.rate)) {
      newErrors.rate = 'Rate is required';
    } else {
      const rateError = validateSaudaRate(formData.rate);
      if (rateError) newErrors.rate = rateError;
    }
    
    if (!formData.purchaser_id || formData.purchaser_id.trim() === '') {
      newErrors.purchaser_id = 'Vendor (purchaser) is required';
    }

    const brokerCommissionError = validateSaudaBrokerCommission(
      formData.broker_commission,
      formData.broker_commission_type,
    );
    if (brokerCommissionError) newErrors.broker_commission = brokerCommissionError;

    const cashDiscountError = validateSaudaCashDiscount(
      formData.cash_discount,
      formData.cash_discount_type,
    );
    if (cashDiscountError) newErrors.cash_discount = cashDiscountError;

    const quantityError = validateSaudaQuantity(formData.quantity, unit);
    if (quantityError) newErrors.quantity = quantityError;

    const bagsError = validateSaudaNoOfBags(formData.no_of_bags);
    if (bagsError) newErrors.no_of_bags = bagsError;
    if (formData.no_of_bags != null && formData.bag_weight == null) {
      newErrors.bag_weight = 'Bag weight is required when number of bags is entered';
    } else if (
      formData.bag_weight != null &&
      !SAUDA_BAG_WEIGHT_KG_OPTIONS.includes(formData.bag_weight as (typeof SAUDA_BAG_WEIGHT_KG_OPTIONS)[number])
    ) {
      newErrors.bag_weight = 'Bag weight must be 50 or 55 kg';
    }
    // Validate notes max length (API contract: max 1000 chars)
    if (formData.notes != null && formData.notes.length > 1000) {
      newErrors.notes = 'Notes cannot exceed 1000 characters';
    }
    
    if (
      formData.rice_type &&
      !variantOptionsForForm.some((row) => row.value === formData.rice_type)
    ) {
      newErrors.rice_type = 'Invalid variant for selected rice code';
    }
    if (
      formData.rice_length_id != null &&
      !riceLengths.some((row) => row.id === formData.rice_length_id)
    ) {
      newErrors.rice_length_id = 'Invalid rice length';
    }

    const whitenessError = validateSaudaWhiteness(parameterFields.whiteness);
    if (whitenessError) {
      newErrors.whiteness = whitenessError;
    }

    const avgGrainLengthError = validateSaudaAvgGrainLength(
      parameterFields.average_grain_length,
    );
    if (avgGrainLengthError) {
      newErrors.average_grain_length = avgGrainLengthError;
    }

    if (!isAdmin() && formData.sauda_date) {
      const { min, max } = saudaDateBounds;
      if (min && formData.sauda_date < min) {
        newErrors.sauda_date = 'Sauda date cannot be more than 3 days in the past';
      } else if (max && formData.sauda_date > max) {
        newErrors.sauda_date = 'Sauda date cannot be more than 3 days in the future';
      }
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
      const imageUrl = result.url;
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
      const parameters = buildSaudaParametersPayload(
        parameterFields.whiteness,
        parameterFields.average_grain_length,
      );

      const cleanedData: CreateSaudaRequest | UpdateSaudaRequest = {
        sauda_type: formData.sauda_type,
        rice_category: formData.rice_category ?? null,
        rice_type: formData.rice_type || null,
        rice_length_id: formData.rice_length_id ?? null,
        rice_code_id: formData.rice_code_id || null,
        rate: parseFloat(((formData.rate || 0) / f).toFixed(2)), // API contract: precision 2 decimal places
        purchaser_id: formData.purchaser_id,
        broker_id: formData.broker_id || null,
        broker_commission: brokerCommissionInKg != null ? parseFloat(brokerCommissionInKg.toFixed(2)) : null, // API contract: precision 2 decimal places
        broker_commission_type: formData.broker_commission_type || 'percentage',
        cash_discount: formData.cash_discount != null ? parseFloat(formData.cash_discount.toFixed(2)) : null, // API contract: precision 2 decimal places
        cash_discount_type: formData.cash_discount_type || 'rupees',
        quantity: formData.quantity != null ? parseFloat(((formData.quantity as number) * f).toFixed(2)) : null, // API contract: precision 2 decimal places
        no_of_bags: formData.no_of_bags ?? null,
        bag_weight: formData.bag_weight != null ? parseFloat(formData.bag_weight.toFixed(2)) : null,
        estimated_delivery_time: formData.estimated_delivery_time != null ? Math.floor(formData.estimated_delivery_time) : null, // API contract: integer
        cooked_rice_image_url: formData.cooked_rice_image_url || null,
        uncooked_rice_image_url: formData.uncooked_rice_image_url || null,
        notes: formData.notes?.trim() || null, // Convert empty string to null
        is_dana_required: formData.is_dana_required ?? true,
        sauda_date: formData.sauda_date || null, // Date in YYYY-MM-DD format
        ...(parameters ? { parameters } : {}),
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

  const selectedVendor = useMemo(
    () =>
      formData.purchaser_id
        ? vendors.find((v) => v.id === formData.purchaser_id) ?? null
        : null,
    [formData.purchaser_id, vendors],
  );

  const formatVendorDetail = (value: string | null | undefined) =>
    value?.trim() ? value.trim() : '—';

  const formatVendorRegistrationLabel = (
    registrationType: 'registered' | 'unregistered' | undefined,
  ) => (registrationType === 'unregistered' ? 'Unregistered' : 'Registered');

  const blockInvalidDecimalKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e', 'E', '+', '-'].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleWhitenessInput = (raw: string) => {
    const { value, error, reject } = processSaudaDecimalFieldInput(
      raw,
      SAUDA_WHITENESS_MAX,
      validateSaudaWhiteness,
    );
    if (reject) {
      setErrors((prev) => ({
        ...prev,
        whiteness:
          error ||
          `Whiteness (W) must be between ${SAUDA_WHITENESS_MIN} and ${SAUDA_WHITENESS_MAX}`,
      }));
      return;
    }
    setParameterFields((prev) => ({ ...prev, whiteness: value }));
    setErrors((prev) => ({ ...prev, whiteness: error }));
  };

  const handleAvgGrainLengthInput = (raw: string) => {
    const { value, error, reject } = processSaudaDecimalFieldInput(
      raw,
      SAUDA_AVG_GRAIN_LENGTH_MAX,
      validateSaudaAvgGrainLength,
    );
    if (reject) {
      setErrors((prev) => ({
        ...prev,
        average_grain_length:
          error ||
          `Avg grain length must be between ${SAUDA_AVG_GRAIN_LENGTH_MIN} and ${SAUDA_AVG_GRAIN_LENGTH_MAX} mm`,
      }));
      return;
    }
    setParameterFields((prev) => ({ ...prev, average_grain_length: value }));
    setErrors((prev) => ({ ...prev, average_grain_length: error }));
  };

  // Helper functions for preview
  const getRiceCodeName = (riceCodeId: string | null) => {
    if (!riceCodeId) return '-';
    const riceCode = riceCodes.find(rc => rc.rice_code_id === riceCodeId);
    return riceCode ? riceCode.rice_code_name : '-';
  };

  const getRiceTypeName = (riceType: string | null) => {
    if (!riceType) return '-';
    const type = categoryVariants.find((rt) => rt.value === riceType);
    return type ? type.label : riceType.replace(/_/g, ' ');
  };

  const getRiceLengthName = (riceLengthId: string | null | undefined) => {
    if (!riceLengthId) return '-';
    const row = riceLengths.find((r) => r.id === riceLengthId);
    return row ? row.name : '-';
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
  const handleDownloadPDF = async () => {
    if (!defaultRecipient) return;

    const vendorName = getVendorName(formData.purchaser_id);
    try {
      const saudaLike = saudaLikeFromFormData(
        formData,
        parameterFields,
        saudaId
          ? { id: saudaId, display_id: loadedSaudaMetaRef.current.display_id ?? null }
          : undefined,
        unit,
        brokerCommissionUnit,
      );
      const { pdfData, filename } = await prepareSaudaPdfDownload(
        {
          sauda: saudaLike,
          vendors,
          brokers,
          riceCodes,
          riceTypes: categoryVariants.length > 0 ? categoryVariants : riceCategories,
          riceLengths,
          company: {
            name: defaultRecipient.name,
            address: defaultRecipient.address,
            llpin: defaultRecipient.llpin,
          },
        },
        {
          sauda: saudaId
            ? {
                id: saudaId,
                display_id: loadedSaudaMetaRef.current.display_id ?? null,
                sauda_date: formData.sauda_date,
                purchaser_id: formData.purchaser_id,
              }
            : null,
          saudaDate: formData.sauda_date,
          partyName: vendorName !== '-' ? vendorName : undefined,
          vendors,
        },
      );
      await downloadSaudaPurchaseOrderPdf(pdfData, filename);
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                        <label className="block text-xs font-medium mb-0.5">
                          1 · Category <span className="text-red-500">*</span>
                        </label>
                        <div className={errors.rice_category ? 'border border-red-500 rounded-md' : ''}>
                          <CustomSelect
                            value={formData.rice_category || null}
                            onChange={handleCategoryChange}
                            options={riceCategories.map((cat) => ({
                              value: cat.value,
                              label: cat.label,
                            }))}
                            valueLabel={
                              formData.rice_category
                                ? formatRiceCategoryFallback(formData.rice_category)
                                : null
                            }
                            placeholder="Basmati or Non Basmati"
                            allowClear={false}
                          />
                        </div>
                        {errors.rice_category && (
                          <p className="text-xs text-red-500 mt-0.5">{errors.rice_category}</p>
                        )}
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium mb-0.5">2 · Rice Code</label>
                        <div className="flex gap-1.5">
                          <div className="min-w-0 flex-1">
                            {loadingRiceCodes && !formData.rice_code_id ? (
                              <div className="w-full rounded-md border border-border bg-background/60 px-2 py-1.5 text-sm flex items-center gap-2 min-h-[38px]">
                                <LoadingSpinner size="sm" />
                                <span className="text-muted-foreground text-xs">Loading...</span>
                              </div>
                            ) : (
                              <CustomSelect
                                value={formData.rice_code_id || null}
                                onChange={handleRiceCodeChange}
                                options={riceCodesForCategory.map((riceCode) => ({
                                  value: riceCode.rice_code_id,
                                  label: riceCode.rice_code_name,
                                }))}
                                valueLabel={
                                  selectedRiceCode?.rice_code_name ||
                                  riceCodes.find((rc) => rc.rice_code_id === formData.rice_code_id)
                                    ?.rice_code_name
                                }
                                placeholder={
                                  formData.rice_category
                                    ? 'Select rice code'
                                    : 'Select category first'
                                }
                                allowClear={true}
                                clearLabel="None"
                                disabled={!formData.rice_category}
                              />
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => void refetchRiceCodes()}
                            disabled={loadingRiceCodes || !formData.rice_category}
                            className="flex-shrink-0 p-1.5 border border-border rounded-md bg-background hover:bg-muted transition-colors disabled:opacity-50"
                            title="Refresh"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${loadingRiceCodes ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setRiceCodeFormOpen(true)}
                            disabled={!formData.rice_category}
                            className="flex-shrink-0 p-1.5 border border-border rounded-md bg-background hover:bg-muted transition-colors disabled:opacity-50"
                            title="Add new rice code"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-0.5">
                          3 · Variant <span className="text-red-500">*</span>
                        </label>
                        {loadingCategoryVariants && !formData.rice_type ? (
                          <div className="w-full rounded-md border border-border bg-background/60 px-2 py-1.5 text-sm flex items-center gap-2">
                            <LoadingSpinner size="sm" />
                            <span className="text-muted-foreground text-xs">Loading...</span>
                          </div>
                        ) : (
                          <div className={errors.rice_type ? 'border border-red-500 rounded-md' : ''}>
                            <CustomSelect
                              value={formData.rice_type || null}
                              onChange={(value) => setFormData({ ...formData, rice_type: value || null })}
                              options={variantOptionsForForm.map((riceType) => ({
                                value: riceType.value,
                                label: riceType.label,
                              }))}
                              placeholder={
                                !formData.rice_category
                                  ? 'Select category first'
                                  : !formData.rice_code_id
                                    ? 'Select rice code first'
                                    : variantOptionsForForm.length
                                      ? 'Select variant'
                                      : 'No variants for this code'
                              }
                              allowClear={false}
                              disabled={
                                !formData.rice_category ||
                                !formData.rice_code_id ||
                                (variantOptionsForForm.length === 0 && !formData.rice_type)
                              }
                            />
                          </div>
                        )}
                        {errors.rice_type && (
                          <p className="text-xs text-red-500 mt-0.5">{errors.rice_type}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-0.5">4 · Rice Length</label>
                        <div className="flex gap-1.5">
                          <div className="min-w-0 flex-1">
                            {loadingRiceLengths ? (
                              <div className="w-full rounded-md border border-border bg-background/60 px-2 py-1.5 text-sm flex items-center gap-2 min-h-[38px]">
                                <LoadingSpinner size="sm" />
                                <span className="text-muted-foreground text-xs">Loading...</span>
                              </div>
                            ) : (
                              <div className={errors.rice_length_id ? 'border border-red-500 rounded-md' : ''}>
                                <CustomSelect
                                  value={formData.rice_length_id ?? null}
                                  onChange={(value) =>
                                    setFormData({
                                      ...formData,
                                      rice_length_id: value || null,
                                    })
                                  }
                                  options={riceLengths.map((r) => ({
                                    value: r.id,
                                    label: r.name,
                                  }))}
                                  placeholder="Optional"
                                  allowClear={true}
                                  clearLabel="None"
                                />
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => void refetchRiceLengths()}
                            disabled={loadingRiceLengths}
                            className="flex-shrink-0 p-1.5 border border-border rounded-md bg-background hover:bg-muted transition-colors disabled:opacity-50"
                            title="Refresh"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${loadingRiceLengths ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setRiceLengthFormOpen(true)}
                            className="flex-shrink-0 p-1.5 border border-border rounded-md bg-background hover:bg-muted transition-colors"
                            title="Add rice length"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {errors.rice_length_id && (
                          <p className="text-xs text-red-500 mt-0.5">{errors.rice_length_id}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-0.5">Whiteness (W)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          value={parameterFields.whiteness}
                          onChange={(e) => handleWhitenessInput(e.target.value)}
                          onKeyDown={blockInvalidDecimalKey}
                          onBlur={(e) => {
                            const err = validateSaudaWhiteness(e.target.value);
                            if (err) {
                              setErrors((prev) => ({ ...prev, whiteness: err }));
                              setParameterFields((prev) => ({ ...prev, whiteness: '' }));
                            }
                          }}
                          className={`w-full px-2 py-1.5 text-sm border rounded-md bg-background ${
                            errors.whiteness ? 'border-red-500' : 'border-border'
                          }`}
                          placeholder={`${SAUDA_WHITENESS_MIN} – ${SAUDA_WHITENESS_MAX} W`}
                        />
                        {errors.whiteness && (
                          <p className="text-xs text-red-500 mt-0.5">{errors.whiteness}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-0.5">Avg Grain Length (mm)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          value={parameterFields.average_grain_length}
                          onChange={(e) => handleAvgGrainLengthInput(e.target.value)}
                          onKeyDown={blockInvalidDecimalKey}
                          onBlur={(e) => {
                            const err = validateSaudaAvgGrainLength(e.target.value);
                            if (err) {
                              setErrors((prev) => ({ ...prev, average_grain_length: err }));
                              setParameterFields((prev) => ({ ...prev, average_grain_length: '' }));
                            }
                          }}
                          className={`w-full px-2 py-1.5 text-sm border rounded-md bg-background ${
                            errors.average_grain_length ? 'border-red-500' : 'border-border'
                          }`}
                          placeholder={`${SAUDA_AVG_GRAIN_LENGTH_MIN} – ${SAUDA_AVG_GRAIN_LENGTH_MAX} mm`}
                        />
                        {errors.average_grain_length && (
                          <p className="text-xs text-red-500 mt-0.5">{errors.average_grain_length}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2">
                      <label className="block text-xs font-medium mb-0.5">Sauda Date</label>
                      <DateInputWithSteppers
                        className="w-full"
                        inputClassName="py-1.5 text-sm"
                        value={formData.sauda_date || ''}
                        min={saudaDateBounds.min}
                        max={saudaDateBounds.max}
                        invalid={Boolean(errors.sauda_date)}
                        onChange={(v) => {
                          const next = v || null;
                          if (!isAdmin() && next) {
                            const { min, max } = saudaDateBounds;
                            if (min && next < min) return;
                            if (max && next > max) return;
                          }
                          setFormData({ ...formData, sauda_date: next });
                          if (errors.sauda_date) {
                            setErrors((prev) => ({ ...prev, sauda_date: '' }));
                          }
                        }}
                      />
                      {!isAdmin() && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Date must be within 3 days of today. Administrators can set any date.
                        </p>
                      )}
                      {errors.sauda_date && (
                        <p className="text-xs text-red-500 mt-0.5">{errors.sauda_date}</p>
                      )}
                    </div>
                  </div>

                  {/* Section: Pricing & Quantity */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-1">
                      Pricing & Quantity
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium mb-0.5">No. of Bags</label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max={SAUDA_MAX_BAGS}
                          value={formData.no_of_bags ?? ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === '') {
                              setFormData((prev) => applyBagFieldPatch(prev, { no_of_bags: null }, unit));
                              setErrors({ ...errors, no_of_bags: '', quantity: '', bag_weight: '' });
                              return;
                            }
                            const value = parseInt(raw, 10);
                            const bagsError = validateSaudaNoOfBags(value);
                            if (bagsError) {
                              setErrors({ ...errors, no_of_bags: bagsError });
                              return;
                            }
                            setFormData((prev) => {
                              const next = applyBagFieldPatch(prev, { no_of_bags: value }, unit);
                              const qtyError = validateSaudaQuantity(next.quantity, unit);
                              if (qtyError) {
                                setErrors((err) => ({
                                  ...err,
                                  no_of_bags: `Too many bags — ${qtyError.charAt(0).toLowerCase()}${qtyError.slice(1)}`,
                                  quantity: qtyError,
                                }));
                                return prev;
                              }
                              setErrors((err) => ({ ...err, no_of_bags: '', quantity: '' }));
                              return next;
                            });
                          }}
                          className={`w-full px-2 py-1.5 text-sm border rounded-md bg-background ${
                            errors.no_of_bags ? 'border-red-500' : 'border-border'
                          }`}
                          placeholder="Optional"
                        />
                        {errors.no_of_bags && (
                          <p className="text-xs text-red-500 mt-0.5">{errors.no_of_bags}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-0.5">
                          Bag Weight (kg)
                          {formData.no_of_bags != null ? (
                            <span className="text-red-500"> *</span>
                          ) : (
                            <span className="text-muted-foreground text-xs font-normal"> (Optional)</span>
                          )}
                        </label>
                        <select
                          value={formData.bag_weight ?? ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === '') {
                              setFormData((prev) => applyBagFieldPatch(prev, { bag_weight: null }, unit));
                              setErrors({ ...errors, bag_weight: '' });
                              return;
                            }
                            const value = parseInt(raw, 10);
                            setFormData((prev) => {
                              const next = applyBagFieldPatch(prev, { bag_weight: value }, unit);
                              const qtyError = validateSaudaQuantity(next.quantity, unit);
                              if (qtyError) {
                                setErrors((err) => ({
                                  ...err,
                                  bag_weight: `Bag count exceeds limit — ${qtyError.charAt(0).toLowerCase()}${qtyError.slice(1)}`,
                                  quantity: qtyError,
                                }));
                                return prev;
                              }
                              setErrors((err) => ({ ...err, bag_weight: '', quantity: '' }));
                              return next;
                            });
                          }}
                          className={`w-full px-2 py-1.5 text-sm border rounded-md bg-background ${
                            errors.bag_weight ? 'border-red-500' : 'border-border'
                          }`}
                        >
                          <option value="">{formData.no_of_bags != null ? 'Select' : 'Optional'}</option>
                          {formData.bag_weight != null &&
                            !SAUDA_BAG_WEIGHT_KG_OPTIONS.includes(
                              formData.bag_weight as (typeof SAUDA_BAG_WEIGHT_KG_OPTIONS)[number],
                            ) && (
                              <option value={formData.bag_weight}>{formData.bag_weight} kg</option>
                            )}
                          {SAUDA_BAG_WEIGHT_KG_OPTIONS.map((kg) => (
                            <option key={kg} value={kg}>
                              {kg} kg
                            </option>
                          ))}
                        </select>
                        {errors.bag_weight && (
                          <p className="text-xs text-red-500 mt-0.5">{errors.bag_weight}</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-medium mb-0.5">
                          Rate (₹/{unit}) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={SAUDA_MAX_RATE}
                          value={formData.rate || ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === '') {
                              setFormData({ ...formData, rate: 0 });
                              setErrors({ ...errors, rate: '' });
                              return;
                            }
                            const value = parseFloat(raw);
                            if (Number.isNaN(value)) return;
                            const rateError = validateSaudaRate(value);
                            if (rateError) {
                              setErrors({ ...errors, rate: rateError });
                              return;
                            }
                            setFormData({ ...formData, rate: value });
                            setErrors({ ...errors, rate: '' });
                          }}
                          className={`w-full px-2 py-1.5 text-sm border rounded-md bg-background ${
                            errors.rate ? 'border-red-500' : 'border-border'
                          }`}
                          placeholder="0.00"
                        />
                        {errors.rate && (
                          <p className="text-xs text-red-500 mt-0.5">{errors.rate}</p>
                        )}
                        <label
                          htmlFor="is_dana_required"
                          className="mt-1.5 flex items-center gap-1.5 cursor-pointer"
                          title="If checked, dana deduction (300gm per quintal) applies in payment advice for this sauda."
                        >
                          <input
                            type="checkbox"
                            id="is_dana_required"
                            checked={formData.is_dana_required ?? true}
                            onChange={(e) =>
                              setFormData({ ...formData, is_dana_required: e.target.checked })
                            }
                            className="h-3 w-3 shrink-0 rounded border-border text-primary focus:ring-primary"
                          />
                          <span className="text-[10px] text-muted-foreground leading-none">
                            Dana required
                          </span>
                        </label>
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
                              const raw = e.target.value;
                              if (raw === '') {
                                setFormData({ ...formData, quantity: null });
                                setErrors({ ...errors, quantity: '' });
                                return;
                              }
                              const value = parseFloat(raw);
                              if (Number.isNaN(value) || value === 0) {
                                setFormData({ ...formData, quantity: null });
                                setErrors({ ...errors, quantity: '' });
                                return;
                              }
                              const qtyError = validateSaudaQuantity(value, unit);
                              if (qtyError) {
                                setErrors({ ...errors, quantity: qtyError });
                                return;
                              }
                              setFormData({ ...formData, quantity: value });
                              setErrors({ ...errors, quantity: '' });
                            }}
                            className={`flex-1 min-w-0 px-2 py-1.5 text-sm border rounded-md bg-background ${
                              errors.quantity ? 'border-red-500' : 'border-border'
                            }`}
                            placeholder="0"
                          />
                          <select
                            value={unit}
                            onChange={(e) => {
                              const newUnit = e.target.value as SaudaWeightUnit;
                              const currentFactor = unitToKgFactor(unit);
                              const nextFactor = unitToKgFactor(newUnit);
                              const rate = formData.rate || 0;
                              const bagsQty = quantityFromBags(formData.no_of_bags, formData.bag_weight, newUnit);
                              const convertedRate = (rate / currentFactor) * nextFactor;
                              let convertedQty: number | null;
                              if (bagsQty != null) {
                                convertedQty = bagsQty;
                              } else {
                                const quantity = formData.quantity;
                                convertedQty =
                                  quantity != null
                                    ? parseFloat(((quantity * currentFactor) / nextFactor).toFixed(4))
                                    : null;
                              }
                              setFormData({
                                ...formData,
                                rate: Number.isFinite(convertedRate) ? parseFloat(convertedRate.toFixed(4)) : 0,
                                quantity:
                                  convertedQty != null && Number.isFinite(convertedQty) ? convertedQty : null,
                              });
                              setUnit(newUnit);
                              const qtyError =
                                convertedQty != null ? validateSaudaQuantity(convertedQty, newUnit) : null;
                              const rateError = validateSaudaRate(
                                Number.isFinite(convertedRate) ? convertedRate : 0,
                              );
                              setErrors((err) => ({
                                ...err,
                                quantity: qtyError ?? '',
                                rate: rateError ?? '',
                              }));
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
                            max={cashDiscountMaxForType(formData.cash_discount_type)}
                            value={formData.cash_discount || ''}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '') {
                                setFormData({ ...formData, cash_discount: null });
                                setErrors({ ...errors, cash_discount: '' });
                                return;
                              }
                              const value = parseFloat(raw);
                              if (Number.isNaN(value) || value === 0) {
                                setFormData({ ...formData, cash_discount: null });
                                setErrors({ ...errors, cash_discount: '' });
                                return;
                              }
                              const discountError = validateSaudaCashDiscount(
                                value,
                                formData.cash_discount_type,
                              );
                              if (discountError) {
                                setErrors({ ...errors, cash_discount: discountError });
                                return;
                              }
                              setFormData({ ...formData, cash_discount: value });
                              setErrors({ ...errors, cash_discount: '' });
                            }}
                            className={`flex-1 min-w-0 px-2 py-1.5 text-sm border rounded-md bg-background ${
                              errors.cash_discount ? 'border-red-500' : 'border-border'
                            }`}
                            placeholder="0"
                          />
                          <select
                            value={formData.cash_discount_type || 'rupees'}
                            onChange={(e) => {
                              const newType = e.target.value as CashDiscountType;
                              const discountError = validateSaudaCashDiscount(
                                formData.cash_discount,
                                newType,
                              );
                              setFormData({ ...formData, cash_discount_type: newType });
                              setErrors({ ...errors, cash_discount: discountError ?? '' });
                            }}
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
                            onClick={() => setVendorFormOpen(true)}
                            className="flex-shrink-0 p-1.5 border border-border rounded-md bg-background hover:bg-muted transition-colors"
                            title="Add New"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {errors.purchaser_id && (
                          <p className="text-xs text-red-500 mt-0.5">{errors.purchaser_id}</p>
                        )}
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
                            onClick={() => setBrokerFormOpen(true)}
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
                          value={formData.broker_commission ?? ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === '') {
                              setFormData({ ...formData, broker_commission: null });
                              setErrors({ ...errors, broker_commission: '' });
                              return;
                            }
                            const value = parseFloat(raw);
                            if (Number.isNaN(value)) return;
                            const commissionError = validateSaudaBrokerCommission(
                              value === 0 ? null : value,
                              formData.broker_commission_type,
                            );
                            setFormData({
                              ...formData,
                              broker_commission: value === 0 ? null : value,
                            });
                            setErrors({ ...errors, broker_commission: commissionError ?? '' });
                          }}
                          className={`min-w-0 flex-1 px-2 py-1.5 text-sm border rounded-md bg-background ${
                            errors.broker_commission ? 'border-red-500' : 'border-border'
                          }`}
                          placeholder="0"
                        />
                        <select
                          value={formData.broker_commission_type || 'percentage'}
                          onChange={(e) => {
                            const newType = e.target.value as BrokerCommissionType;
                            const commissionError = validateSaudaBrokerCommission(
                              formData.broker_commission,
                              newType,
                            );
                            setFormData({ ...formData, broker_commission_type: newType });
                            setErrors({ ...errors, broker_commission: commissionError ?? '' });
                          }}
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
                      {errors.broker_commission && (
                        <p className="text-xs text-red-500 mt-0.5">{errors.broker_commission}</p>
                      )}
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
                            <span className="text-muted-foreground">Category:</span>
                            <span className="font-semibold">
                              {formData.rice_category
                                ? getRiceCategoryLabel(formData.rice_category, riceCategories) ||
                                  formatRiceCategoryFallback(formData.rice_category)
                                : '—'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Rice Code:</span>
                            <span className="font-semibold">{getRiceCodeName(formData.rice_code_id ?? null)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Variant:</span>
                            <span className="font-semibold">{getRiceTypeName(formData.rice_type ?? null)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Rice Length:</span>
                            <span className="font-semibold">{getRiceLengthName(formData.rice_length_id)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Whiteness (W):</span>
                            <span className="font-semibold">
                              {formatSaudaWhitenessDisplay(parameterFields.whiteness)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Avg Grain Length (mm):</span>
                            <span className="font-semibold">
                              {formatSaudaAvgGrainLengthDisplay(parameterFields.average_grain_length)}
                            </span>
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
                          {formData.no_of_bags != null && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">No. of Bags:</span>
                              <span className="font-semibold">{formData.no_of_bags}</span>
                            </div>
                          )}
                          {formData.bag_weight != null && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Bag Weight:</span>
                              <span className="font-semibold">{formData.bag_weight.toFixed(2)} kg</span>
                            </div>
                          )}
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
                          {selectedVendor && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Registration:</span>
                                <span className="font-semibold">
                                  {formatVendorRegistrationLabel(selectedVendor.registration_type)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">GST:</span>
                                <span className="font-semibold font-mono tabular-nums">
                                  {formatVendorDetail(selectedVendor.business_details?.gst_number)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">PAN:</span>
                                <span className="font-semibold font-mono tabular-nums">
                                  {formatVendorDetail(selectedVendor.business_details?.pan_number)}
                                </span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-muted-foreground shrink-0">Party Address:</span>
                                <span
                                  className="font-semibold text-right max-w-[65%]"
                                  title={formatVendorAddress(selectedVendor.address) || undefined}
                                >
                                  {formatVendorAddress(selectedVendor.address) || '—'}
                                </span>
                              </div>
                            </>
                          )}
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

      <RiceCodeFormModal
        open={riceCodeFormOpen}
        onOpenChange={setRiceCodeFormOpen}
        onCreate={handleCreateRiceCode}
        defaultCategory={formData.rice_category ?? undefined}
        nested
      />

      <RiceLengthFormModal
        open={riceLengthFormOpen}
        onOpenChange={setRiceLengthFormOpen}
        onCreate={handleCreateRiceLength}
        onUpdate={(id, data) => riceLengthsAPI.updateRiceLength(id, data)}
      />

      <VendorFormModal
        open={vendorFormOpen}
        onOpenChange={(open) => {
          setVendorFormOpen(open);
          if (!open) void refetchVendors();
        }}
        defaultType="seller"
        lockType
        nested
      />

      <BrokerFormModal
        open={brokerFormOpen}
        onOpenChange={(open) => {
          setBrokerFormOpen(open);
          if (!open) void refetchBrokers();
        }}
        nested
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


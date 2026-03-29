import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X, Search, Plus } from 'lucide-react';
import { CustomSelect } from '../../shared/CustomSelect';
import { useBrokers } from '../../../hooks/useBrokers';
import { brokersAPI } from '../../../services/brokers.api';
import { bankAPI } from '../../../services/bank.api';
import { validateEmail, validatePAN, validateAadhaar, validatePhone, validateGST } from '../../../utils/validation';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { BrokerPreviewDialog } from './BrokerPreviewDialog';
import { AlertDialog } from '../../shared/AlertDialog';
import type { CreateBrokerRequest, BrokerBankDetails, Broker, UpdateBrokerRequest } from '../../../types/entities';
import {
  BROKER_CREATE_LENIENT_BANK_MESSAGE,
  BROKER_UPDATE_LENIENT_BANK_MESSAGE,
} from '../../../services/brokers.api';

interface BrokerFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, loads broker and saves via `POST /brokers/updateBroker/:id` */
  brokerId?: string | null;
}

const INITIAL_BROKER_FORM: CreateBrokerRequest = {
  business_name: '',
  contact_persons: [{ name: '', phones: [''], emails: [''] }],
  address: {
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
  },
  business_details: {
    pan_number: '',
    aadhaar_number: '',
    gst_number: '',
    business_type: 'individual',
  },
  bank_details: {
    account_holder_name: '',
    account_number: '',
    ifsc_code: '',
    bank_name: '',
    branch: '',
  },
  type: 'both',
  is_active: true,
};

/**
 * API only accepts `individual` | `company`. Dropdown uses those two; GST/PAN may return
 * other values; CustomSelect may pass `null`. Never send empty or invalid enums.
 */
function normalizeBrokerBusinessType(
  raw: string | null | undefined
): 'individual' | 'company' {
  if (raw == null || String(raw).trim() === '') return 'individual';
  const v = String(raw).toLowerCase().trim();
  if (v === 'individual') return 'individual';
  if (v === 'company') return 'company';
  // partnership, llp, etc. from upstream lookups → treat as company for this form/API
  return 'company';
}

/** Normalize form data for create/update API (shared by preview confirm and direct update). */
function cleanBrokerFormPayload(data: CreateBrokerRequest): CreateBrokerRequest {
  const cleanedFormData: CreateBrokerRequest = { ...data };
  delete (cleanedFormData as { contact_person?: unknown }).contact_person;

  if (cleanedFormData.business_details) {
    cleanedFormData.business_details = {
      ...cleanedFormData.business_details,
      business_type: normalizeBrokerBusinessType(
        cleanedFormData.business_details.business_type as string | undefined
      ),
    };
  }

  if (cleanedFormData.business_name !== undefined) {
    const trimmed = cleanedFormData.business_name.trim();
    cleanedFormData.business_name = trimmed || undefined;
  }

  if (cleanedFormData.business_details) {
    if (cleanedFormData.business_details.pan_number !== undefined) {
      const pan = cleanedFormData.business_details.pan_number.trim().toUpperCase();
      cleanedFormData.business_details.pan_number = pan || undefined;
    }
    if (cleanedFormData.business_details.aadhaar_number !== undefined) {
      const aadhaar = cleanedFormData.business_details.aadhaar_number.replace(/\s/g, '').trim();
      cleanedFormData.business_details.aadhaar_number = aadhaar || undefined;
    }
    if (cleanedFormData.business_details.gst_number !== undefined) {
      const gst = cleanedFormData.business_details.gst_number.trim().toUpperCase();
      cleanedFormData.business_details.gst_number = gst || undefined;
    }
  }

  if (cleanedFormData.address?.pincode !== undefined) {
    cleanedFormData.address.pincode = cleanedFormData.address.pincode.trim();
  }

  if (cleanedFormData.bank_details) {
    const bankDetails = cleanedFormData.bank_details;
    if (bankDetails.account_holder_name !== undefined) {
      const trimmed = bankDetails.account_holder_name?.trim();
      bankDetails.account_holder_name = trimmed || undefined;
    }
    if (bankDetails.account_number !== undefined) {
      const trimmed = bankDetails.account_number?.trim();
      bankDetails.account_number = trimmed || undefined;
    }
    if (bankDetails.ifsc_code !== undefined) {
      const trimmed = bankDetails.ifsc_code?.trim().toUpperCase();
      bankDetails.ifsc_code = trimmed || undefined;
    }
    if (bankDetails.bank_name !== undefined) {
      const trimmed = bankDetails.bank_name?.trim();
      bankDetails.bank_name = trimmed || undefined;
    }
    if (bankDetails.branch !== undefined) {
      const trimmed = bankDetails.branch?.trim();
      bankDetails.branch = trimmed || undefined;
    }
  }

  if (cleanedFormData.contact_persons) {
    cleanedFormData.contact_persons = cleanedFormData.contact_persons
      .filter((cp) => cp.name && cp.name.trim().length > 0)
      .map((cp) => ({
        name: cp.name.trim(),
        phones: cp.phones.filter((phone) => phone && phone.trim().length > 0),
        emails: cp.emails
          ? cp.emails.filter((email) => email && email.trim().length > 0).map((email) => email.trim())
          : [],
      }))
      .filter((cp) => cp.phones.length > 0);
  }

  return cleanedFormData;
}

function brokerEntityToForm(b: Broker): CreateBrokerRequest {
  const contact_persons =
    b.contact_persons?.length > 0
      ? b.contact_persons.map((p) => ({
          name: p.name ?? '',
          phones: p.phones?.length ? [...p.phones] : [''],
          emails: p.emails?.length ? [...p.emails] : [''],
        }))
      : [{ name: '', phones: [''], emails: [''] }];
  return {
    business_name: b.business_name ?? '',
    contact_persons,
    address: {
      street: b.address?.street ?? '',
      city: b.address?.city ?? '',
      state: b.address?.state ?? '',
      pincode: b.address?.pincode ?? '',
      country: b.address?.country ?? 'India',
    },
    business_details: {
      pan_number: b.business_details?.pan_number ?? '',
      aadhaar_number: b.business_details?.aadhaar_number ?? '',
      gst_number: b.business_details?.gst_number ?? '',
      business_type: normalizeBrokerBusinessType(b.business_details?.business_type),
    },
    bank_details: {
      account_holder_name: b.bank_details?.account_holder_name ?? '',
      account_number: b.bank_details?.account_number ?? '',
      ifsc_code: b.bank_details?.ifsc_code ?? '',
      bank_name: b.bank_details?.bank_name ?? '',
      branch: b.bank_details?.branch ?? '',
    },
    broker_details: b.broker_details ?? undefined,
    type: b.type ?? 'both',
    is_active: b.is_active ?? true,
  };
}

/** Backend `verify_bank` requires complete bank fields for its verify schema — align with account + IFSC + holder (create + update). */
function shouldVerifyBank(bd: BrokerBankDetails | undefined | null): boolean {
  if (!bd) return false;
  const accountNumber = bd.account_number?.trim();
  const ifsc = bd.ifsc_code?.trim().toUpperCase();
  const holder = bd.account_holder_name?.trim();
  return Boolean(accountNumber && holder && ifsc && ifsc.length === 11);
}

function getBrokerSaveAlert(
  isEdit: boolean,
  message: string,
  verification_error?: string,
  verification_message?: string
): { alertType: 'success' | 'warning'; alertTitle: string; alertMessage: string } {
  const lenientMsg = isEdit ? BROKER_UPDATE_LENIENT_BANK_MESSAGE : BROKER_CREATE_LENIENT_BANK_MESSAGE;
  const isLenientBank =
    message.trim() === lenientMsg.trim() || /bank could not be verified/i.test(message);
  if (isLenientBank) {
    const main = message || lenientMsg;
    const detail = verification_error?.trim();
    return {
      alertType: 'warning',
      alertTitle: isEdit ? 'Broker Updated' : 'Broker Created',
      alertMessage: detail ? `${main}\n\n${detail}` : main,
    };
  }
  const defaultSuccess = isEdit
    ? 'The broker has been updated successfully.'
    : 'The broker has been created successfully.';
  const baseMsg = message?.trim() || defaultSuccess;
  const bankLine = verification_message?.trim() || '';
  return {
    alertType: 'success',
    alertTitle: isEdit ? 'Broker Updated Successfully' : 'Broker Created Successfully',
    alertMessage: bankLine ? `${baseMsg}\n\n${bankLine}` : baseMsg,
  };
}

// Helper function to convert ALL CAPS text to Title Case
const toTitleCase = (str: string | undefined | null): string => {
  if (!str) return '';
  // Check if the string is mostly uppercase (more than 60% uppercase letters)
  const uppercaseCount = (str.match(/[A-Z]/g) || []).length;
  const letterCount = (str.match(/[a-zA-Z]/g) || []).length;
  const isAllCaps = letterCount > 0 && uppercaseCount / letterCount > 0.6;
  
  if (!isAllCaps) return str; // Don't modify if not all caps
  
  return str
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

export function BrokerFormModal({ open, onOpenChange, brokerId = null }: BrokerFormModalProps) {
  const { createBroker, updateBroker } = useBrokers();
  const isEdit = Boolean(brokerId);
  const [formData, setFormData] = useState<CreateBrokerRequest>(() => structuredClone(INITIAL_BROKER_FORM));
  const [loadingInitial, setLoadingInitial] = useState(false);


  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [ifscLoading, setIfscLoading] = useState(false);
  const [gstAutoFilledFields, setGstAutoFilledFields] = useState<Set<string>>(new Set());
  /** Snapshot from server — in edit, GST/PAN cannot be changed (same pattern as VendorFormModal). */
  const [originalGstNumber, setOriginalGstNumber] = useState('');
  const [originalPanNumber, setOriginalPanNumber] = useState('');
  /** Name field read-only when filled from PAN / Aadhaar lookup (per contact row index). */
  const [contactPersonNameFromGovApi, setContactPersonNameFromGovApi] = useState<boolean[]>([false]);

  useEffect(() => {
    if (!open) return;
    if (!brokerId) {
      setFormData(structuredClone(INITIAL_BROKER_FORM));
      setErrors({});
      setStep(1);
      setGstAutoFilledFields(new Set());
      setOriginalGstNumber('');
      setOriginalPanNumber('');
      setContactPersonNameFromGovApi([false]);
      return;
    }
    let cancelled = false;
    setLoadingInitial(true);
    brokersAPI
      .getBrokerById(brokerId)
      .then((b) => {
        if (cancelled) return;
        setFormData(brokerEntityToForm(b));
        const gst = (b.business_details?.gst_number ?? '').trim();
        const pan = (b.business_details?.pan_number ?? '').trim();
        setOriginalGstNumber(gst);
        setOriginalPanNumber(pan);
        // First contact name typically tied to PAN — lock in edit when PAN exists (gov identity)
        const n = Math.max(1, b.contact_persons?.length ?? 1);
        const nameLocks = new Array(n).fill(false);
        if (pan.length > 0 && n >= 1) nameLocks[0] = true;
        setContactPersonNameFromGovApi(nameLocks);
        setErrors({});
        setStep(1);
        setGstAutoFilledFields(new Set());
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Could not load broker details.';
        setAlertType('error');
        setAlertTitle('Failed to load broker');
        setAlertMessage(msg);
        setAlertOpen(true);
        onOpenChange(false);
      })
      .finally(() => {
        if (!cancelled) setLoadingInitial(false);
      });
    return () => {
      cancelled = true;
    };
    // Intentionally omit onOpenChange — stable close handler would still change identity per parent render
  }, [open, brokerId]);

  const handleIFSCLookup = async (ifscCode: string) => {
    // Only lookup if IFSC is exactly 11 characters (basic validation, let API handle detailed validation)
    if (!ifscCode || ifscCode.length !== 11) {
      setErrors({ ...errors, ifsc_code: 'IFSC code must be exactly 11 characters' });
      return;
    }

    setIfscLoading(true);
    setErrors({ ...errors, ifsc_code: '' });
    
    try {
      console.log('Calling IFSC lookup API for:', ifscCode);
      const response = await bankAPI.lookupIFSC(ifscCode);
      console.log('IFSC lookup response:', response);
      
      if (response.bank_details) {
        setFormData({
          ...formData,
          bank_details: {
            ...formData.bank_details,
            bank_name: toTitleCase(response.bank_details.bank_name) || formData.bank_details?.bank_name || '',
            branch: toTitleCase(response.bank_details.branch) || formData.bank_details?.branch || '',
            ifsc_code: response.bank_details.ifsc_code || ifscCode,
          }
        });
        setErrors({ ...errors, ifsc_code: '' });
      }
    } catch (error: any) {
      console.error('IFSC lookup error:', error);
      setErrors({ ...errors, ifsc_code: error?.message || 'IFSC code not found' });
    } finally {
      setIfscLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate contact_persons: must have at least one with name and at least one phone
    if (!formData.contact_persons || formData.contact_persons.length === 0) {
      newErrors.contact_persons = 'At least one contact person is required';
    } else {
      formData.contact_persons.forEach((cp, idx) => {
        if (!cp.name || cp.name.trim().length < 2) {
          newErrors[`contact_person_${idx}_name`] = 'Name required (min 2 chars)';
        }
        if (!cp.phones || cp.phones.length === 0 || !cp.phones[0]) {
          newErrors[`contact_person_${idx}_phone`] = 'At least one phone required';
        } else {
          cp.phones.forEach((phone, phoneIdx) => {
            if (phone && !validatePhone(phone)) {
              newErrors[`contact_person_${idx}_phone_${phoneIdx}`] = 'Invalid phone format';
            }
          });
        }
        // Validate emails if provided
        cp.emails?.forEach((email, emailIdx) => {
          if (email && !validateEmail(email)) {
            newErrors[`contact_person_${idx}_email_${emailIdx}`] = 'Valid email required';
          }
        });
      });
    }

    // Business type validation (API contract rules)
    const businessType = formData.business_details.business_type;
    if (businessType === 'individual') {
      // Individual requires PAN or Aadhaar (at least one must be provided)
      const pan = formData.business_details.pan_number?.trim();
      const aadhaar = formData.business_details.aadhaar_number?.replace(/\s/g, '').trim();
      if (!pan && !aadhaar) {
        newErrors.business_details = 'Either PAN or Aadhaar is required for individual';
      }
    } else {
      // Company requires GST
      const gst = formData.business_details.gst_number?.trim();
      if (!gst) {
        newErrors.gst_number = 'GST number is required for company';
      }
    }

    // Validate PAN format if provided
    if (formData.business_details.pan_number && !validatePAN(formData.business_details.pan_number)) {
      newErrors.pan_number = 'Invalid PAN format (e.g., ABCDE1234F)';
    }

    // Validate Aadhaar format if provided
    if (formData.business_details.aadhaar_number && !validateAadhaar(formData.business_details.aadhaar_number)) {
      newErrors.aadhaar_number = 'Invalid Aadhaar format (12 digits, cannot start with 0 or 1)';
    }

    // Validate GST format if provided (API contract: exactly 15 characters, uppercase)
    if (formData.business_details.gst_number && !validateGST(formData.business_details.gst_number)) {
      newErrors.gst_number = 'Invalid GST format (exactly 15 characters, e.g., 27ABCDE1234F1Z5)';
    }

    // Validate address (API contract: street, city, state, country are REQUIRED)
    if (!formData.address.street?.trim()) {
      newErrors.street = 'Street address is required';
    } else if (formData.address.street.trim().length > 255) {
      newErrors.street = 'Street address must be max 255 characters';
    }
    
    if (!formData.address.city?.trim()) {
      newErrors.city = 'City is required';
    } else if (formData.address.city.trim().length > 100) {
      newErrors.city = 'City must be max 100 characters';
    }
    
    if (!formData.address.state?.trim()) {
      newErrors.state = 'State is required';
    } else if (formData.address.state.trim().length > 100) {
      newErrors.state = 'State must be max 100 characters';
    }
    
    if (!formData.address.country?.trim()) {
      newErrors.country = 'Country is required';
    } else if (formData.address.country.trim().length > 100) {
      newErrors.country = 'Country must be max 100 characters';
    }
    
    // Pincode is optional but has max length
    if (formData.address.pincode && formData.address.pincode.trim().length > 10) {
      newErrors.pincode = 'Pincode must be max 10 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Navigate to step with errors
      if (newErrors.business_name || newErrors.contact_persons || newErrors.email || newErrors.phone || newErrors.pan_number || newErrors.aadhaar_number || newErrors.gst_number || newErrors.business_details) {
        setStep(1);
      } else if (newErrors.street || newErrors.city || newErrors.state || newErrors.country || newErrors.pincode) {
        setStep(2);
      }
      return false;
    }

    return true;
  };

  const handlePANLookup = async () => {
    if (!formData.business_details.pan_number) {
      setErrors({ ...errors, pan_number: 'Please enter a PAN number' });
      return;
    }
    
    if (!validatePAN(formData.business_details.pan_number)) {
      setErrors({ ...errors, pan_number: 'Invalid PAN format' });
      return;
    }

    setLookupLoading(true);
    setErrors({ ...errors, pan_number: '' });
    
    try {
      const response = await brokersAPI.lookupPAN(formData.business_details.pan_number);
      
      // The API service returns response.data, which is { pan_data: {...}, mapped_data: {...} }
      const mapped = response.mapped_data;
      const panData = response.pan_data;
      
      // Track which fields are being auto-filled (merge so GST-locked fields e.g. account_holder_name stay)
      const autoFilledFields = new Set(gstAutoFilledFields);
      
      // Populate business name if available (convert to title case)
      let businessName = formData.business_name;
      if (mapped?.business_name) {
        businessName = toTitleCase(mapped.business_name);
        autoFilledFields.add('business_name');
      }
      
      // If PAN data is for a person, add to contact_persons if not already present
      let contactPersons = [...(formData.contact_persons || [])];
      let nextLocks = [...contactPersonNameFromGovApi];
      while (nextLocks.length < contactPersons.length) nextLocks.push(false);
      if (nextLocks.length > contactPersons.length) {
        nextLocks = nextLocks.slice(0, contactPersons.length);
      }
      if (panData?.category === 'person' && panData?.name) {
        const panName = toTitleCase(panData.name);
        const existingContact = contactPersons.find(cp => cp.name && cp.name.trim() === panName.trim());
        
        if (!existingContact) {
          // Check if there's an empty contact person to replace
          const emptyContactIndex = contactPersons.findIndex(cp => !cp.name || cp.name.trim() === '');
          
          if (emptyContactIndex >= 0) {
            // Replace the empty contact person
            contactPersons[emptyContactIndex] = { name: panName, phones: [''], emails: [''] };
            nextLocks[emptyContactIndex] = true;
          } else {
            // No empty contact person, add a new one
            contactPersons = [
              ...contactPersons,
              { name: panName, phones: [''], emails: [''] }
            ];
            nextLocks.push(true);
          }
        }
      }
      
      // Populate address fields (only fill non-empty values, convert to title case)
      // Note: Address fields are NOT added to autoFilledFields, so they remain editable
      const addressUpdate: any = { ...formData.address };
      if (mapped?.address) {
        if (mapped.address.street) addressUpdate.street = toTitleCase(mapped.address.street);
        if (mapped.address.city) addressUpdate.city = toTitleCase(mapped.address.city);
        if (mapped.address.state) addressUpdate.state = toTitleCase(mapped.address.state);
        if (mapped.address.pincode) addressUpdate.pincode = mapped.address.pincode;
        if (mapped.address.country) addressUpdate.country = toTitleCase(mapped.address.country);
      }
      
      // Update business details
      const businessDetailsUpdate: any = {
        ...formData.business_details,
      };
      
      // Ensure PAN number is set
      if (mapped?.business_details?.pan_number) {
        businessDetailsUpdate.pan_number = mapped.business_details.pan_number;
        autoFilledFields.add('pan_number');
      }
      
      // Set business type if available (map to API enum individual | company)
      if (
        mapped?.business_details?.business_type != null &&
        String(mapped.business_details.business_type).trim() !== ''
      ) {
        businessDetailsUpdate.business_type = normalizeBrokerBusinessType(
          mapped.business_details.business_type
        );
        autoFilledFields.add('business_type');
      }
      
      // Auto-fill account holder from PAN-derived business name — lock field like GST path
      const bankDetailsUpdate = {
        ...formData.bank_details,
        account_holder_name: businessName,
      };
      autoFilledFields.add('account_holder_name');

      setFormData({
        ...formData,
        business_name: businessName,
        contact_persons: contactPersons,
        address: addressUpdate,
        business_details: businessDetailsUpdate,
        bank_details: bankDetailsUpdate,
      });
      setContactPersonNameFromGovApi(nextLocks);
      
      setGstAutoFilledFields(autoFilledFields);
      
      // Clear any previous errors
      setErrors({ ...errors, pan_number: '' });
    } catch (error: any) {
      console.error('PAN lookup error:', error);
      setErrors({ ...errors, pan_number: error?.message || 'Failed to lookup PAN details' });
    } finally {
      setLookupLoading(false);
    }
  };

  const handleGSTLookup = async () => {
    if (!formData.business_details.gst_number) {
      setErrors({ ...errors, gst_number: 'Please enter a GST number' });
      return;
    }
    
    if (!validateGST(formData.business_details.gst_number)) {
      setErrors({ ...errors, gst_number: 'Invalid GST format' });
      return;
    }

    setLookupLoading(true);
    setErrors({ ...errors, gst_number: '' });
    
    try {
      const response = await brokersAPI.lookupGST(formData.business_details.gst_number);
      
      const mapped = response.mapped_data;
      
      // Track which fields are being auto-filled (merge so prior PAN/GST locks are preserved)
      const autoFilledFields = new Set(gstAutoFilledFields);
      
      // Populate business name if available (convert to title case)
      let businessName = formData.business_name;
      if (mapped?.business_name) {
        businessName = toTitleCase(mapped.business_name);
        autoFilledFields.add('business_name');
      }
      
      // Populate address fields (only fill non-empty values, convert to title case)
      // Note: Address fields are NOT added to autoFilledFields, so they remain editable
      const addressUpdate: any = { ...formData.address };
      if (mapped?.address) {
        if (mapped.address.street) {
          addressUpdate.street = toTitleCase(mapped.address.street);
        }
        if (mapped.address.city) {
          addressUpdate.city = toTitleCase(mapped.address.city);
        }
        if (mapped.address.state) {
          addressUpdate.state = toTitleCase(mapped.address.state);
        }
        if (mapped.address.pincode) {
          addressUpdate.pincode = mapped.address.pincode;
        }
        if (mapped.address.country) {
          addressUpdate.country = toTitleCase(mapped.address.country);
        }
      }
      
      // Update business details - extract PAN from GST (characters 3-12)
      const businessDetailsUpdate: any = {
        ...formData.business_details,
      };
      
      if (mapped?.business_details?.gst_number) {
        businessDetailsUpdate.gst_number = mapped.business_details.gst_number;
        autoFilledFields.add('gst_number');
      }
      
      if (mapped?.business_details?.pan_number) {
        businessDetailsUpdate.pan_number = mapped.business_details.pan_number;
        autoFilledFields.add('pan_number');
      } else if (formData.business_details.gst_number && formData.business_details.gst_number.length >= 12) {
        // Extract PAN from GST (characters 3-12, 0-indexed: 2-11)
        businessDetailsUpdate.pan_number = formData.business_details.gst_number.slice(2, 12);
        autoFilledFields.add('pan_number');
      }
      
      if (
        mapped?.business_details?.business_type != null &&
        String(mapped.business_details.business_type).trim() !== ''
      ) {
        businessDetailsUpdate.business_type = normalizeBrokerBusinessType(
          mapped.business_details.business_type
        );
        autoFilledFields.add('business_type');
      }
      
      // Auto-fill account holder name with business name (locked after GST lookup)
      autoFilledFields.add('account_holder_name');
      const bankDetailsUpdate = {
        ...formData.bank_details,
        account_holder_name: businessName,
      };
      
      setFormData({
        ...formData,
        business_name: businessName,
        address: addressUpdate,
        business_details: businessDetailsUpdate,
        bank_details: bankDetailsUpdate,
      });
      
      // Set the auto-filled fields
      setGstAutoFilledFields(autoFilledFields);
      
      // Clear any previous errors
      setErrors({ ...errors, gst_number: '' });
    } catch (error: any) {
      console.error('GST lookup error:', error);
      setErrors({ ...errors, gst_number: error?.message || 'Failed to lookup GST details' });
    } finally {
      setLookupLoading(false);
    }
  };

  const handleAadhaarLookup = async () => {
    if (!formData.business_details.aadhaar_number) {
      setErrors({ ...errors, aadhaar_number: 'Please enter an Aadhaar number' });
      return;
    }
    
    if (!validateAadhaar(formData.business_details.aadhaar_number)) {
      setErrors({ ...errors, aadhaar_number: 'Invalid Aadhaar format' });
      return;
    }

    setLookupLoading(true);
    setErrors({ ...errors, aadhaar_number: '' });
    
    try {
      const response = await brokersAPI.lookupAadhaar(formData.business_details.aadhaar_number);
      
      // Aadhaar lookup might return different structure - check if it has mapped_data
      // For now, we'll handle it similar to PAN if the structure is similar
      // If the API only returns validation, we'll just clear the error
      if (response && typeof response === 'object' && 'mapped_data' in response) {
        const mapped = (response as any).mapped_data;
        const aadhaarData = (response as any).aadhaar_data;
        
        // Populate business name if available (convert to title case)
        const businessName = toTitleCase(mapped?.business_name) || formData.business_name;
        
        // If Aadhaar data has a name, add to contact_persons if not already present
        let contactPersons = [...(formData.contact_persons || [])];
        let nextLocks = [...contactPersonNameFromGovApi];
        while (nextLocks.length < contactPersons.length) nextLocks.push(false);
        if (nextLocks.length > contactPersons.length) {
          nextLocks = nextLocks.slice(0, contactPersons.length);
        }
        const aadhaarName = toTitleCase(aadhaarData?.name || mapped?.contact_person);
        if (aadhaarName?.trim()) {
          const trimmed = aadhaarName.trim();
          const existingContact = contactPersons.find(
            (cp) => cp.name && cp.name.trim() === trimmed
          );
          if (!existingContact) {
            const emptyContactIndex = contactPersons.findIndex(
              (cp) => !cp.name || cp.name.trim() === ''
            );
            if (emptyContactIndex >= 0) {
              contactPersons[emptyContactIndex] = {
                name: aadhaarName,
                phones: [''],
                emails: [''],
              };
              nextLocks[emptyContactIndex] = true;
            } else {
              contactPersons = [
                ...contactPersons,
                { name: aadhaarName, phones: [''], emails: [''] },
              ];
              nextLocks.push(true);
            }
          }
        }
        
        // Populate address fields (only fill non-empty values, convert to title case)
        const addressUpdate: any = { ...formData.address };
        if (mapped?.address) {
          if (mapped.address.street) addressUpdate.street = toTitleCase(mapped.address.street);
          if (mapped.address.city) addressUpdate.city = toTitleCase(mapped.address.city);
          if (mapped.address.state) addressUpdate.state = toTitleCase(mapped.address.state);
          if (mapped.address.pincode) addressUpdate.pincode = mapped.address.pincode;
          if (mapped.address.country) addressUpdate.country = toTitleCase(mapped.address.country);
        }
        
        setFormData({
          ...formData,
          business_name: businessName,
          contact_persons: contactPersons,
          address: addressUpdate,
        });
        setContactPersonNameFromGovApi(nextLocks);
      }
      
      // Clear any previous errors
      setErrors({ ...errors, aadhaar_number: '' });
    } catch (error: any) {
      console.error('Aadhaar lookup error:', error);
      setErrors({ ...errors, aadhaar_number: error?.message || 'Failed to lookup Aadhaar details' });
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Edit: save directly via updateBroker (no preview step)
    if (brokerId) {
      setLoading(true);
      try {
        const cleanedFormData = cleanBrokerFormPayload(formData);
        const updatePayload: UpdateBrokerRequest = {
          ...cleanedFormData,
          ...(shouldVerifyBank(cleanedFormData.bank_details) ? { verify_bank: true } : {}),
        };
        const { message, verification_error, verification_message } = await updateBroker(
          brokerId,
          updatePayload
        );
        setFormData(structuredClone(INITIAL_BROKER_FORM));
        setErrors({});
        setStep(1);
        setGstAutoFilledFields(new Set());
        setContactPersonNameFromGovApi([false]);
        const alert = getBrokerSaveAlert(true, message, verification_error, verification_message);
        setAlertType(alert.alertType);
        setAlertTitle(alert.alertTitle);
        setAlertMessage(alert.alertMessage);
        setAlertOpen(true);
        onOpenChange(false);
      } catch (error: unknown) {
        handlePersistError(error);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Create: close form and open review dialog
    onOpenChange(false);
    setPreviewOpen(true);
  };

  const handlePersistError = (error: unknown) => {
    const err = error as {
      message?: string;
      data?: { message?: string };
      response?: { data?: { message?: string } };
      error?: string;
    };
    setAlertType('error');
    setAlertTitle(brokerId ? 'Failed to Update Broker' : 'Failed to Create Broker');

    let errorMessage =
      err?.message ||
      err?.data?.message ||
      err?.response?.data?.message ||
      err?.error ||
      'An error occurred while saving the broker. Please try again.';

    const errorText = (err?.error || errorMessage || '').toLowerCase();
    const fullErrorString = JSON.stringify(error || {}).toLowerCase();
    const updatedAutoFilledFields = new Set(gstAutoFilledFields);

    if (
      errorText.includes('brokers_email_unique_idx') ||
      errorText.includes('duplicate key value violates unique constraint') ||
      fullErrorString.includes('brokers_email_unique_idx') ||
      fullErrorString.includes('duplicate key value violates unique constraint') ||
      (errorText.includes('duplicate') && errorText.includes('email'))
    ) {
      errorMessage = 'A broker with this email address already exists. Please use a different email address.';
    }

    if (errorText.includes('pan number already exists') || errorText.includes('pan already exists')) {
      updatedAutoFilledFields.delete('pan_number');
    }
    if (errorText.includes('gst number already exists') || errorText.includes('gst already exists')) {
      updatedAutoFilledFields.delete('gst_number');
    }

    if (errorText.includes('already exists') || errorText.includes('duplicate') || errorText.includes('invalid')) {
      setGstAutoFilledFields(new Set());
    } else {
      setGstAutoFilledFields(updatedAutoFilledFields);
    }

    setAlertMessage(errorMessage);
    setAlertOpen(true);
    setPreviewOpen(false);
    onOpenChange(true);
  };

  const handlePreviewConfirm = async (data: CreateBrokerRequest) => {
    setLoading(true);
    try {
      const cleanedFormData = cleanBrokerFormPayload(data);

      const createPayload: CreateBrokerRequest = {
        ...cleanedFormData,
        ...(shouldVerifyBank(cleanedFormData.bank_details) ? { verify_bank: true } : {}),
      };

      const { message, verification_error, verification_message } = await createBroker(createPayload);
      setPreviewOpen(false);
      setFormData(structuredClone(INITIAL_BROKER_FORM));
      setErrors({});
      setStep(1);
      setGstAutoFilledFields(new Set());
      setContactPersonNameFromGovApi([false]);

      const alert = getBrokerSaveAlert(false, message, verification_error, verification_message);
      setAlertType(alert.alertType);
      setAlertTitle(alert.alertTitle);
      setAlertMessage(alert.alertMessage);
      setAlertOpen(true);
      onOpenChange(false);
    } catch (error: unknown) {
      handlePersistError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-3xl translate-x-[-50%] translate-y-[-50%]">
          <div className="glass rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-semibold">{isEdit ? 'Edit Broker' : 'Create Broker'}</Dialog.Title>
              <button onClick={() => onOpenChange(false)} className="rounded-lg p-1 hover:bg-muted/50 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingInitial ? (
              <div className="flex justify-center py-16">
                <LoadingSpinner />
              </div>
            ) : (
            <>
            {/* Steps */}
            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`flex-1 rounded-lg p-2 text-center text-sm font-medium transition-colors ${
                  step >= 1 ? 'bg-primary/20 text-primary' : 'bg-muted hover:bg-muted/80'
                }`}
              >
                1. Basic Info
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className={`flex-1 rounded-lg p-2 text-center text-sm font-medium transition-colors ${
                  step >= 2 ? 'bg-primary/20 text-primary' : 'bg-muted hover:bg-muted/80'
                }`}
              >
                2. Address & Business
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className={`flex-1 rounded-lg p-2 text-center text-sm font-medium transition-colors ${
                  step >= 3 ? 'bg-primary/20 text-primary' : 'bg-muted hover:bg-muted/80'
                }`}
              >
                3. Bank Details
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} className="space-y-4">
              {/* Step 1: Basic Info */}
              {step === 1 && (
                <div className="space-y-4">
                  {/* Business Type Selector */}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Business Type *</label>
                    <CustomSelect
                      value={normalizeBrokerBusinessType(formData.business_details.business_type)}
                      onChange={(value) =>
                        setFormData({
                          ...formData,
                          business_details: {
                            ...formData.business_details,
                            business_type: normalizeBrokerBusinessType(value ?? undefined),
                          },
                        })
                      }
                      options={[
                        { value: 'individual', label: 'Individual (Person)' },
                        { value: 'company', label: 'Company (Pvt Ltd / Ltd)' }
                      ]}
                      placeholder="Select Business Type"
                      disabled={isEdit || gstAutoFilledFields.has('business_type')}
                    />
                  </div>

                  <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 mb-2">
                    <p className="text-sm text-primary/90">
                      <span className="font-medium">Note:</span> {formData.business_details.business_type === 'individual' 
                        ? 'For individuals, either PAN or Aadhaar is required.' 
                        : 'For companies, GST number is required.'}
                    </p>
                  </div>

                  {/* GST Number - shown for company */}
                  {formData.business_details.business_type !== 'individual' && (
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">GST Number *</label>
                      {isEdit && originalGstNumber.trim().length > 0 ? (
                        <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm pointer-events-none select-none">
                          {originalGstNumber}
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={formData.business_details.gst_number || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                business_details: {
                                  ...formData.business_details,
                                  gst_number: e.target.value.toUpperCase(),
                                },
                              })
                            }
                            className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                            placeholder="27ABCDE1234F1Z5"
                          />
                          <button type="button" onClick={handleGSTLookup} disabled={lookupLoading} className="btn-secondary flex items-center gap-2">
                            {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                          </button>
                        </div>
                      )}
                      {errors.gst_number && <p className="mt-1 text-xs text-red-600">{errors.gst_number}</p>}
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">PAN Number{formData.business_details.business_type === 'individual' ? ' *' : ''}</label>
                    {isEdit && originalPanNumber.trim().length > 0 ? (
                      <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm pointer-events-none select-none">
                        {originalPanNumber}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.business_details.pan_number}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              business_details: {
                                ...formData.business_details,
                                pan_number: e.target.value.toUpperCase(),
                              },
                            })
                          }
                          className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary read-only:cursor-not-allowed"
                          placeholder="ABCDE1234F"
                          readOnly={gstAutoFilledFields.has('pan_number')}
                        />
                        <button type="button" onClick={handlePANLookup} disabled={lookupLoading} className="btn-secondary flex items-center gap-2">
                          {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                        </button>
                      </div>
                    )}
                    {errors.pan_number && <p className="mt-1 text-xs text-red-600">{errors.pan_number}</p>}
                  </div>

                  {/* Aadhaar Number - shown only for individual */}
                  {formData.business_details.business_type === 'individual' && (
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Aadhaar Number</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.business_details.aadhaar_number}
                          onChange={(e) => {
                            // Remove spaces from Aadhaar number (API contract: spaces removed automatically)
                            const value = e.target.value.replace(/\s/g, '').replace(/\D/g, '').slice(0, 12);
                            setFormData({ ...formData, business_details: { ...formData.business_details, aadhaar_number: value } });
                          }}
                          className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                          placeholder="234567890123"
                          maxLength={12}
                        />
                        <button type="button" onClick={handleAadhaarLookup} disabled={lookupLoading} className="btn-secondary flex items-center gap-2">
                          {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.aadhaar_number && <p className="mt-1 text-xs text-red-600">{errors.aadhaar_number}</p>}
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Business Name</label>
                    <input
                      type="text"
                      value={formData.business_name}
                      onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary read-only:cursor-not-allowed"
                      readOnly={isEdit || gstAutoFilledFields.has('business_name')}
                    />
                    {errors.business_name && <p className="mt-1 text-xs text-red-600">{errors.business_name}</p>}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Contact Persons *</label>
                    <div className="space-y-3">
                      {(formData.contact_persons || []).map((contact, index) => (
                        <div key={index} className="space-y-2 p-3 border border-border rounded-lg">
                          <div className="flex gap-2 items-start">
                            <input
                              type="text"
                              placeholder="Name"
                              value={contact.name}
                              readOnly={contactPersonNameFromGovApi[index] === true}
                              onChange={(e) => {
                                const updated = [...(formData.contact_persons || [])];
                                updated[index] = { ...updated[index], name: e.target.value };
                                setFormData({ ...formData, contact_persons: updated });
                              }}
                              className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary read-only:cursor-not-allowed"
                            />
                            {(formData.contact_persons || []).length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (formData.contact_persons || []).filter((_, i) => i !== index);
                                  setContactPersonNameFromGovApi((prev) =>
                                    prev.filter((_, i) => i !== index)
                                  );
                                  setFormData({ ...formData, contact_persons: updated });
                                }}
                                className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                title="Remove contact person"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          <div className="space-y-2 pl-0">
                            <label className="text-xs text-muted-foreground">Phone Numbers *</label>
                            {(contact.phones || ['']).map((phone, phoneIndex) => (
                              <div key={phoneIndex} className="flex gap-2 items-center">
                                <input
                                  type="tel"
                                  placeholder="Phone (10 digits)"
                                  value={phone}
                                  onChange={(e) => {
                                    // Only allow digits and limit to 10 digits
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                    const updated = [...(formData.contact_persons || [])];
                                    const updatedPhones = [...(updated[index].phones || [''])];
                                    updatedPhones[phoneIndex] = value;
                                    updated[index] = { ...updated[index], phones: updatedPhones };
                                    setFormData({ ...formData, contact_persons: updated });
                                    // Validate and set error immediately
                                    const errorKey = `contact_person_${index}_phone_${phoneIndex}`;
                                    if (value.length > 0 && value.length < 10) {
                                      setErrors({ ...errors, [errorKey]: 'Phone must be exactly 10 digits' });
                                    } else if (value.length === 10 && !validatePhone(value)) {
                                      setErrors({ ...errors, [errorKey]: 'Invalid phone number format' });
                                    } else {
                                      const newErrors = { ...errors };
                                      delete newErrors[errorKey];
                                      setErrors(newErrors);
                                    }
                                  }}
                                  onBlur={(e) => {
                                    const value = e.target.value.trim();
                                    const errorKey = `contact_person_${index}_phone_${phoneIndex}`;
                                    if (value.length > 0 && value.length < 10) {
                                      setErrors({ ...errors, [errorKey]: 'Phone must be exactly 10 digits' });
                                    } else if (value.length === 10 && !validatePhone(value)) {
                                      setErrors({ ...errors, [errorKey]: 'Invalid phone number format' });
                                    }
                                  }}
                                  className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                                  maxLength={10}
                                />
                                {errors[`contact_person_${index}_phone_${phoneIndex}`] && (
                                  <p className="text-xs text-red-600 mt-0.5">{errors[`contact_person_${index}_phone_${phoneIndex}`]}</p>
                                )}
                                {(contact.phones || ['']).length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...(formData.contact_persons || [])];
                                      const updatedPhones = updated[index].phones.filter((_, i) => i !== phoneIndex);
                                      updated[index] = { ...updated[index], phones: updatedPhones.length > 0 ? updatedPhones : [''] };
                                      setFormData({ ...formData, contact_persons: updated });
                                    }}
                                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                    title="Remove phone number"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...(formData.contact_persons || [])];
                                updated[index] = { ...updated[index], phones: [...(updated[index].phones || ['']), ''] };
                                setFormData({ ...formData, contact_persons: updated });
                              }}
                              className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                            >
                              <Plus className="h-3 w-3" />
                              Add Phone Number
                            </button>
                          </div>
                          <div className="space-y-2 pl-0">
                            <label className="text-xs text-muted-foreground">Email Addresses</label>
                            {(contact.emails || ['']).map((email, emailIndex) => (
                              <div key={emailIndex} className="flex gap-2 items-center">
                                <input
                                  type="email"
                                  placeholder="Email"
                                  value={email}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    const updated = [...(formData.contact_persons || [])];
                                    const updatedEmails = [...(updated[index].emails || [''])];
                                    updatedEmails[emailIndex] = value;
                                    updated[index] = { ...updated[index], emails: updatedEmails };
                                    setFormData({ ...formData, contact_persons: updated });
                                    // Validate email format
                                    const errorKey = `contact_person_${index}_email_${emailIndex}`;
                                    if (value.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                                      setErrors({ ...errors, [errorKey]: 'Invalid email format' });
                                    } else {
                                      const newErrors = { ...errors };
                                      delete newErrors[errorKey];
                                      setErrors(newErrors);
                                    }
                                  }}
                                  onBlur={(e) => {
                                    const value = e.target.value.trim();
                                    const errorKey = `contact_person_${index}_email_${emailIndex}`;
                                    if (value.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                                      setErrors({ ...errors, [errorKey]: 'Invalid email format' });
                                    }
                                  }}
                                  className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                                />
                                {errors[`contact_person_${index}_email_${emailIndex}`] && (
                                  <p className="text-xs text-red-600 mt-0.5">{errors[`contact_person_${index}_email_${emailIndex}`]}</p>
                                )}
                                {(contact.emails || ['']).length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...(formData.contact_persons || [])];
                                      const updatedEmails = updated[index].emails?.filter((_, i) => i !== emailIndex) || [];
                                      updated[index] = { ...updated[index], emails: updatedEmails.length > 0 ? updatedEmails : [''] };
                                      setFormData({ ...formData, contact_persons: updated });
                                    }}
                                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                    title="Remove email"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...(formData.contact_persons || [])];
                                updated[index] = { ...updated[index], emails: [...(updated[index].emails || ['']), ''] };
                                setFormData({ ...formData, contact_persons: updated });
                              }}
                              className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                            >
                              <Plus className="h-3 w-3" />
                              Add Email
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setContactPersonNameFromGovApi((prev) => [...prev, false]);
                          setFormData({
                            ...formData,
                            contact_persons: [...(formData.contact_persons || []), { name: '', phones: [''], emails: [''] }]
                          });
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg border border-dashed border-primary/50 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        Add Contact Person
                      </button>
                    </div>
                    {errors.contact_persons && <p className="mt-1 text-xs text-red-600">{errors.contact_persons}</p>}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Type *</label>
                    <CustomSelect
                      value={formData.type}
                      onChange={(value) => setFormData({ ...formData, type: value as any })}
                      options={[
                        { value: 'purchase', label: 'Purchase' },
                        { value: 'sale', label: 'Sale' },
                        { value: 'both', label: 'Both' }
                      ]}
                      placeholder="Select Type"
                    />
                  </div>

                  <button type="button" onClick={() => setStep(2)} className="btn-primary w-full">
                    Next: Address & Business
                  </button>
                </div>
              )}

              {/* Step 2: Address & Business Details */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Street *</label>
                    <input
                      type="text"
                      value={formData.address.street}
                      onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary read-only:cursor-not-allowed"
                      readOnly={gstAutoFilledFields.has('address.street')}
                    />
                    {errors.street && <p className="mt-1 text-xs text-red-600">{errors.street}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">City *</label>
                      <input
                        type="text"
                        value={formData.address.city}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary read-only:cursor-not-allowed"
                        readOnly={gstAutoFilledFields.has('address.city')}
                      />
                      {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1.5 block">State *</label>
                      <input
                        type="text"
                        value={formData.address.state}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary read-only:cursor-not-allowed"
                        readOnly={gstAutoFilledFields.has('address.state')}
                      />
                      {errors.state && <p className="mt-1 text-xs text-red-600">{errors.state}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Pincode</label>
                      <input
                        type="text"
                        value={formData.address.pincode}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, pincode: e.target.value } })}
                        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                        placeholder="Enter pincode"
                        maxLength={10}
                      />
                      {errors.pincode && <p className="mt-1 text-xs text-red-600">{errors.pincode}</p>}
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Country *</label>
                      <input
                        type="text"
                        value={formData.address.country}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, country: e.target.value } })}
                        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary read-only:cursor-not-allowed"
                        readOnly={gstAutoFilledFields.has('address.country')}
                      />
                      {errors.country && <p className="mt-1 text-xs text-red-600">{errors.country}</p>}
                    </div>
                  </div>

                  {errors.business_details && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                      <p className="text-xs text-red-600">{errors.business_details}</p>
                    </div>
                  )}


                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">
                      Back
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setStep(3)}
                      className="btn-primary flex-1"
                    >
                      Next: Bank Details
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Bank Details */}
              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Account Holder Name</label>
                    <input
                      type="text"
                      value={formData.bank_details?.account_holder_name || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        bank_details: { 
                          ...formData.bank_details, 
                          account_holder_name: e.target.value 
                        } 
                      })}
                      readOnly={
                        (isEdit && originalPanNumber.trim().length > 0) ||
                        gstAutoFilledFields.has('account_holder_name')
                      }
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary read-only:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Account Number</label>
                    <input
                      type="text"
                      value={formData.bank_details?.account_number || ''}
                      onChange={(e) => {
                        setFormData({ 
                          ...formData, 
                          bank_details: { 
                            ...formData.bank_details, 
                            account_number: e.target.value 
                          } 
                        });
                      }}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">IFSC Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.bank_details?.ifsc_code || ''}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
                          setFormData({ 
                            ...formData, 
                            bank_details: { 
                              ...formData.bank_details, 
                              ifsc_code: value 
                            } 
                          });
                          // Auto-lookup when 11 characters are entered
                          if (value.length === 11) {
                            handleIFSCLookup(value);
                          }
                        }}
                        className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                        placeholder="HDFC0001234"
                        maxLength={11}
                      />
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const ifscCode = formData.bank_details?.ifsc_code || '';
                          if (ifscCode && ifscCode.length === 11) {
                            handleIFSCLookup(ifscCode);
                          }
                        }} 
                        disabled={ifscLoading || !formData.bank_details?.ifsc_code || formData.bank_details.ifsc_code.length !== 11}
                        className="btn-secondary flex items-center gap-2"
                      >
                        {ifscLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.ifsc_code && <p className="mt-1 text-xs text-red-600">{errors.ifsc_code}</p>}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Bank Name (auto-filled)</label>
                    <input
                      type="text"
                      value={formData.bank_details?.bank_name || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        bank_details: { 
                          ...formData.bank_details, 
                          bank_name: e.target.value 
                        } 
                      })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Branch (auto-filled)</label>
                    <input
                      type="text"
                      value={formData.bank_details?.branch || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        bank_details: { 
                          ...formData.bank_details, 
                          branch: e.target.value 
                        } 
                      })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1">
                      Back
                    </button>
                    <button 
                      type="button" 
                      onClick={handleSubmit}
                      disabled={loading}
                      className="btn-primary flex-1"
                    >
                      {loading && brokerId ? (
                        'Updating…'
                      ) : isEdit ? (
                        'Update broker'
                      ) : (
                        'Create Broker'
                      )}
                    </button>
                  </div>
                </div>
              )}

            </form>
            </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
      
      {/* Preview Dialog */}
      <BrokerPreviewDialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) {
            // If preview is closed without confirming, optionally reopen the form
            // For now, we'll just close it
          }
        }}
        formData={formData}
        onConfirm={handlePreviewConfirm}
        mode="create"
      />

      {/* Alert Dialog for API Response */}
      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        buttonText="OK"
      />
    </Dialog.Root>
  );
}
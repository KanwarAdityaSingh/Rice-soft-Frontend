import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X, Search, Plus, ShieldCheck, Shield } from 'lucide-react';
import { CustomSelect } from '../../shared/CustomSelect';
import { useBrokers } from '../../../hooks/useBrokers';
import { brokersAPI } from '../../../services/brokers.api';
import { kycAPI } from '../../../services/kyc.api';
import {
  validateEmail,
  validateAadhaar,
  validatePhone,
  getGstValidationError,
  getPanValidationError,
  getGstPanMismatchError,
  getPhoneValidationError,
  GST_EXAMPLE,
  PAN_EXAMPLE,
  GST_MAX_LENGTH,
  PAN_MAX_LENGTH,
} from '../../../utils/validation';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { BrokerPreviewDialog } from './BrokerPreviewDialog';
import { AlertDialog } from '../../shared/AlertDialog';
import { EmailVerifyButton } from '../../shared/EmailVerifyButton';
import { PhoneInput } from '../../shared/PhoneInput';
import type { CreateBrokerRequest, BrokerBankDetails, Broker, UpdateBrokerRequest, EntityKycVerificationDetails } from '../../../types/entities';
import {
  buildEntitySavePayload,
  buildSurepassSnapshot,
  brokerPersist,
  isEmailVerifiedInKyc,
  isEntityBankVerified,
  mergeEntityKycSnapshot,
  persistAadhaarValidationSnapshot,
  persistBankVerificationSnapshot,
  resolveEntityBankVerifiedAt,
} from '../../../utils/kycVerification';
import {
  applyAadhaarStateToAddress,
  buildAadhaarValidationAutofill,
  formatAadhaarValidationSummary,
} from '../../../utils/aadhaarValidationAutofill';
import {
  applyAutofillAddress,
  buildPanLookupAutofill,
  mergePanContactIntoContactPersons,
  persistEnrichedPanLookupSnapshots,
  runEnrichedPanLookup,
} from '../../../utils/panLookupEnrichment';
import {
  buildEnrichedGstLookupAutofill,
  mergeGstContactPersons,
  persistEnrichedGstLookupSnapshots,
  runEnrichedGstLookup,
} from '../../../utils/gstLookupAutofill';
import { verifyAutofilledEmails, isVerifiedEmailInput, VERIFIED_EMAIL_INPUT_CLASS } from '../../../utils/emailVerification';
import { canVerifyBankAccountLookup, getBankAccountHolderNameMismatchError, mapBankVerifyToBankDetails } from '../../../utils/bankVerification';
import { assertEntityNotDuplicateBeforeVerification } from '../../../utils/entityDuplicateCheck';
import {
  applyAadhaarOcrToNestedParty,
  applyGstOcrToNestedParty,
  applyPanOcrToNestedParty,
} from '../../../utils/documentOcrPrefill';
import { KycDocumentOcrSection } from '../../shared/KycDocumentOcrSection';
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
  const [aadhaarValidated, setAadhaarValidated] = useState(false);
  const [aadhaarValidationSummary, setAadhaarValidationSummary] = useState<string | null>(null);
  const [kycVerificationDetails, setKycVerificationDetails] = useState<EntityKycVerificationDetails>({});
  const [bankDetailsVerifiedAt, setBankDetailsVerifiedAt] = useState<string | null>(null);
  const [bankVerifiedInSession, setBankVerifiedInSession] = useState(false);
  const [bankVerificationError, setBankVerificationError] = useState<string | null>(null);
  const brokerPersistContext = brokerPersist(brokerId);
  const displayBankVerifiedAt = resolveEntityBankVerifiedAt(
    bankDetailsVerifiedAt,
    kycVerificationDetails,
  );
  const showBankVerified = isEntityBankVerified(
    bankDetailsVerifiedAt,
    kycVerificationDetails,
    bankVerifiedInSession,
  );
  const [gstAutoFilledFields, setGstAutoFilledFields] = useState<Set<string>>(new Set());
  /** Snapshot from server — in edit, GST/PAN cannot be changed (same pattern as VendorFormModal). */
  const [originalGstNumber, setOriginalGstNumber] = useState('');
  const [originalPanNumber, setOriginalPanNumber] = useState('');
  const [originalAadhaarNumber, setOriginalAadhaarNumber] = useState('');
  const [originalBankAccount, setOriginalBankAccount] = useState('');
  const [originalBankIfsc, setOriginalBankIfsc] = useState('');
  /** Name field read-only when filled from PAN / Aadhaar lookup (per contact row index). */
  const [contactPersonNameFromGovApi, setContactPersonNameFromGovApi] = useState<boolean[]>([false]);

  useEffect(() => {
    if (!open) {
      setPreviewOpen(false);
    }
  }, [open]);

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
      setAadhaarValidated(false);
      setAadhaarValidationSummary(null);
      setKycVerificationDetails({});
      setBankDetailsVerifiedAt(null);
      setBankVerifiedInSession(false);
      setBankVerificationError(null);
      return;
    }
    let cancelled = false;
    setLoadingInitial(true);
    brokersAPI
      .getBrokerById(brokerId)
      .then((b) => {
        if (cancelled) return;
        setFormData(brokerEntityToForm(b));
        setKycVerificationDetails(b.kyc_verification_details ?? {});
        setBankDetailsVerifiedAt(b.bank_details_verified_at ?? null);
        setBankVerifiedInSession(Boolean(b.bank_details_verified_at));
        setBankVerificationError(b.bank_verification_error ?? null);
        const gst = (b.business_details?.gst_number ?? '').trim();
        const pan = (b.business_details?.pan_number ?? '').trim();
        setOriginalGstNumber(gst);
        setOriginalPanNumber(pan);
        setOriginalAadhaarNumber((b.business_details?.aadhaar_number ?? '').replace(/\s/g, ''));
        setOriginalBankAccount((b.bank_details?.account_number ?? '').replace(/\s/g, ''));
        setOriginalBankIfsc((b.bank_details?.ifsc_code ?? '').trim().toUpperCase());
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

  const duplicateCheckOptions = () => ({
    excludeId: brokerId,
    unchangedFrom: {
      gst_number: originalGstNumber,
      pan_number: originalPanNumber,
      aadhaar_number: originalAadhaarNumber,
      account_number: originalBankAccount,
      ifsc_code: originalBankIfsc,
    },
  });

  const handleBankVerifySearch = async () => {
    const bd = formData.bank_details;
    const accountNumber = bd?.account_number?.trim();
    const ifscCode = bd?.ifsc_code?.trim();

    if (!canVerifyBankAccountLookup(accountNumber, ifscCode)) {
      setErrors((prev) => ({
        ...prev,
        bank_account_number: !accountNumber ? 'Account number is required for bank verify' : prev.bank_account_number ?? '',
        ifsc_code: !ifscCode || ifscCode.length !== 11 ? 'Valid IFSC is required for bank verify' : prev.ifsc_code ?? '',
      }));
      return;
    }

    setIfscLoading(true);
    setErrors((prev) => ({ ...prev, ifsc_code: '', bank_account_number: '' }));

    try {
      await assertEntityNotDuplicateBeforeVerification(
        'broker',
        { account_number: accountNumber, ifsc_code: ifscCode },
        'bank',
        duplicateCheckOptions(),
      );
      const result = await kycAPI.verifyBank(accountNumber!, ifscCode!, brokerPersistContext);
      const nextBankDetails = mapBankVerifyToBankDetails(result, formData.bank_details);
      setFormData((prev) => ({ ...prev, bank_details: nextBankDetails }));

      const holderMismatch = getBankAccountHolderNameMismatchError(
        bd?.account_holder_name,
        result.account_holder_name,
      );
      if (result.surepass_response) {
        setKycVerificationDetails((prev) => persistBankVerificationSnapshot(prev, result));
      }
      if (holderMismatch) {
        setErrors((prev) => ({
          ...prev,
          account_holder_name: holderMismatch,
        }));
        return;
      }
      setBankVerifiedInSession(true);
      setBankVerificationError(null);
    } catch (error: unknown) {
      setErrors((prev) => ({
        ...prev,
        ifsc_code: error instanceof Error ? error.message : 'Bank verification failed',
      }));
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

    if (formData.business_details.pan_number) {
      const panError = getPanValidationError(formData.business_details.pan_number);
      if (panError) newErrors.pan_number = panError;
    }

    // Validate Aadhaar format if provided
    if (formData.business_details.aadhaar_number && !validateAadhaar(formData.business_details.aadhaar_number)) {
      newErrors.aadhaar_number = 'Invalid Aadhaar format (12 digits, cannot start with 0 or 1)';
    }

    if (formData.business_details.gst_number) {
      const gstError = getGstValidationError(formData.business_details.gst_number);
      if (gstError) newErrors.gst_number = gstError;
    }

    if (formData.business_details.gst_number && formData.business_details.pan_number) {
      const mismatchError = getGstPanMismatchError(
        formData.business_details.gst_number,
        formData.business_details.pan_number,
      );
      if (mismatchError) newErrors.pan_number = mismatchError;
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
    
    const panError = getPanValidationError(formData.business_details.pan_number);
    if (panError) {
      setErrors({ ...errors, pan_number: panError });
      return;
    }

    setLookupLoading(true);
    setErrors({ ...errors, pan_number: '' });
    
    try {
      await assertEntityNotDuplicateBeforeVerification(
        'broker',
        { pan_number: formData.business_details.pan_number },
        'pan',
        duplicateCheckOptions(),
      );
      const result = await runEnrichedPanLookup(
        formData.business_details.pan_number,
        brokerPersistContext,
      );
      const autofill = buildPanLookupAutofill(result);
      const autoFilledFields = new Set(gstAutoFilledFields);
      autofill.lockedFields.forEach((field) => autoFilledFields.add(field));

      const businessName = autofill.businessName ?? formData.business_name;

      let contactPersons = mergePanContactIntoContactPersons(formData.contact_persons || [], autofill);
      let nextLocks = [...contactPersonNameFromGovApi];
      while (nextLocks.length < contactPersons.length) nextLocks.push(false);
      if (nextLocks.length > contactPersons.length) {
        nextLocks = nextLocks.slice(0, contactPersons.length);
      }

      if (autofill.contactPersonName) {
        const panName = autofill.contactPersonName;
        const existingIndex = contactPersons.findIndex(
          (cp) => cp.name && cp.name.trim() === panName.trim(),
        );

        if (existingIndex >= 0) {
          nextLocks[existingIndex] = true;
        } else {
          const emptyContactIndex = contactPersons.findIndex((cp) => !cp.name || cp.name.trim() === '');
          if (emptyContactIndex >= 0) {
            contactPersons[emptyContactIndex] = {
              ...contactPersons[emptyContactIndex],
              name: panName,
            };
            nextLocks[emptyContactIndex] = true;
          } else {
            contactPersons = [...contactPersons, { name: panName, phones: [''], emails: [''] }];
            nextLocks.push(true);
          }
        }
      }

      const businessDetailsUpdate = {
        ...formData.business_details,
        ...(autofill.panNumber ? { pan_number: autofill.panNumber } : {}),
        ...(autofill.gstNumber ? { gst_number: autofill.gstNumber } : {}),
        ...(autofill.businessType
          ? { business_type: normalizeBrokerBusinessType(autofill.businessType) }
          : {}),
      };

      if (autofill.businessType) {
        autoFilledFields.add('business_type');
      }
      autoFilledFields.add('account_holder_name');

      let nextKycDetails = persistEnrichedPanLookupSnapshots(kycVerificationDetails, result);
      const emailVerification = await verifyAutofilledEmails(
        autofill.emails,
        contactPersons,
        nextKycDetails,
        brokerPersistContext,
      );
      nextKycDetails = emailVerification.kycDetails;

      setFormData({
        ...formData,
        business_name: businessName,
        contact_persons: contactPersons,
        address: applyAutofillAddress(formData.address, autofill.address),
        business_details: businessDetailsUpdate,
        bank_details: {
          ...formData.bank_details,
          account_holder_name: businessName,
        },
      });
      setContactPersonNameFromGovApi(nextLocks);
      setGstAutoFilledFields(autoFilledFields);
      setKycVerificationDetails(nextKycDetails);
      setErrors({ ...errors, pan_number: '', ...emailVerification.fieldErrors });
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
    
    const gstError = getGstValidationError(formData.business_details.gst_number);
    if (gstError) {
      setErrors({ ...errors, gst_number: gstError });
      return;
    }

    setLookupLoading(true);
    setErrors({ ...errors, gst_number: '' });
    
    try {
      await assertEntityNotDuplicateBeforeVerification(
        'broker',
        { gst_number: formData.business_details.gst_number },
        'gst',
        duplicateCheckOptions(),
      );
      const result = await runEnrichedGstLookup(
        formData.business_details.gst_number,
        brokerPersistContext,
      );
      const autofill = buildEnrichedGstLookupAutofill(result);
      const autoFilledFields = new Set(gstAutoFilledFields);

      if (autofill.gstNumber) autoFilledFields.add('gst_number');
      if (autofill.panNumber) autoFilledFields.add('pan_number');
      if (autofill.businessType) autoFilledFields.add('business_type');
      autoFilledFields.add('account_holder_name');

      const businessName = autofill.businessName ?? formData.business_name;
      const updatedContactPersons = mergeGstContactPersons(formData.contact_persons, autofill);

      let nextKycDetails = persistEnrichedGstLookupSnapshots(kycVerificationDetails, result);
      const emailVerification = await verifyAutofilledEmails(
        autofill.emails,
        updatedContactPersons,
        nextKycDetails,
        brokerPersistContext,
      );
      nextKycDetails = emailVerification.kycDetails;

      setFormData({
        ...formData,
        business_name: businessName,
        contact_persons: updatedContactPersons,
        address: applyAutofillAddress(formData.address, autofill.address),
        business_details: {
          ...formData.business_details,
          ...(autofill.panNumber ? { pan_number: autofill.panNumber } : {}),
          ...(autofill.gstNumber ? { gst_number: autofill.gstNumber } : {}),
          ...(autofill.businessType
            ? { business_type: normalizeBrokerBusinessType(autofill.businessType) }
            : {}),
        },
        bank_details: {
          ...formData.bank_details,
          account_holder_name: businessName,
        },
      });

      setGstAutoFilledFields(autoFilledFields);
      setKycVerificationDetails(nextKycDetails);
      setErrors({ ...errors, gst_number: '', ...emailVerification.fieldErrors });
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
    setAadhaarValidated(false);
    setAadhaarValidationSummary(null);
    
    try {
      await assertEntityNotDuplicateBeforeVerification(
        'broker',
        { aadhaar_number: formData.business_details.aadhaar_number },
        'aadhaar',
        duplicateCheckOptions(),
      );
      const response = await brokersAPI.lookupAadhaar(
        formData.business_details.aadhaar_number,
        brokerPersistContext,
      );
      const autofill = buildAadhaarValidationAutofill(response);
      const summary = formatAadhaarValidationSummary(autofill);

      setFormData({
        ...formData,
        business_details: {
          ...formData.business_details,
          aadhaar_number: autofill.aadhaarNumber,
        },
        address: applyAadhaarStateToAddress(formData.address, autofill),
      });

      setKycVerificationDetails((prev) => persistAadhaarValidationSnapshot(prev, response));
      setAadhaarValidated(true);
      setAadhaarValidationSummary(summary);
      setErrors({ ...errors, aadhaar_number: '' });
    } catch (error: any) {
      console.error('Aadhaar lookup error:', error);
      setErrors({ ...errors, aadhaar_number: error?.message || 'Failed to validate Aadhaar number' });
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
        const updatePayload = buildEntitySavePayload(cleanedFormData, {
          kycVerificationDetails,
          bankDetailsVerifiedAt,
        });
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

    // Create: open review dialog (form hides via open && !previewOpen)
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

      const createPayload = buildEntitySavePayload(cleanedFormData, {
        kycVerificationDetails,
        bankDetailsVerifiedAt,
      });

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
    <>
    <Dialog.Root
      open={open && !previewOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && previewOpen) return;
        onOpenChange(nextOpen);
      }}
    >
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

                  <KycDocumentOcrSection
                    docs={
                      formData.business_details.business_type === 'individual'
                        ? ['pan', 'aadhaar']
                        : ['gst', 'pan']
                    }
                    disabled={lookupLoading || loading}
                    onGstResult={(result) => {
                      setFormData((prev) => ({
                        ...prev,
                        ...applyGstOcrToNestedParty(prev, result),
                      }));
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.gst_number;
                        delete next.pan_number;
                        return next;
                      });
                    }}
                    onPanResult={(result) => {
                      setFormData((prev) => ({
                        ...prev,
                        ...applyPanOcrToNestedParty(prev, result),
                      }));
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.pan_number;
                        return next;
                      });
                    }}
                    onAadhaarResult={(result) => {
                      setFormData((prev) => ({
                        ...prev,
                        ...applyAadhaarOcrToNestedParty(prev, result),
                      }));
                      setAadhaarValidated(false);
                      setAadhaarValidationSummary(null);
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.aadhaar_number;
                        return next;
                      });
                    }}
                    onSuccess={(title, message) => {
                      setAlertType('success');
                      setAlertTitle(title);
                      setAlertMessage(message);
                      setAlertOpen(true);
                    }}
                    onError={(title, message) => {
                      setAlertType('error');
                      setAlertTitle(title);
                      setAlertMessage(message);
                      setAlertOpen(true);
                    }}
                  />

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
                            placeholder={GST_EXAMPLE}
                            maxLength={GST_MAX_LENGTH}
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
                          placeholder={PAN_EXAMPLE}
                          maxLength={PAN_MAX_LENGTH}
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
                            setAadhaarValidated(false);
                            setAadhaarValidationSummary(null);
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
                      {aadhaarValidated && !errors.aadhaar_number && (
                        <p className="mt-1 text-xs text-emerald-600 flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3 shrink-0" /> {aadhaarValidationSummary ?? 'Aadhaar validated via Surepass'}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Business Name</label>
                    <input
                      type="text"
                      value={formData.business_name}
                      onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary read-only:cursor-not-allowed"
                      readOnly={isEdit}
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
                                <PhoneInput
                                  value={phone}
                                  onChange={(value) => {
                                    const updated = [...(formData.contact_persons || [])];
                                    const updatedPhones = [...(updated[index].phones || [''])];
                                    updatedPhones[phoneIndex] = value;
                                    updated[index] = { ...updated[index], phones: updatedPhones };
                                    setFormData({ ...formData, contact_persons: updated });
                                    const errorKey = `contact_person_${index}_phone_${phoneIndex}`;
                                    const phoneError = value ? getPhoneValidationError(value) : null;
                                    if (phoneError) {
                                      setErrors({ ...errors, [errorKey]: phoneError });
                                    } else {
                                      const newErrors = { ...errors };
                                      delete newErrors[errorKey];
                                      setErrors(newErrors);
                                    }
                                  }}
                                  className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
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
                                    if (isVerifiedEmailInput(email, { kyc: kycVerificationDetails })) return;
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
                                  readOnly={isVerifiedEmailInput(email, { kyc: kycVerificationDetails })}
                                  className={`flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary ${
                                    isVerifiedEmailInput(email, { kyc: kycVerificationDetails })
                                      ? VERIFIED_EMAIL_INPUT_CLASS
                                      : ''
                                  }`}
                                />
                                <EmailVerifyButton
                                  email={email}
                                  persist={brokerPersistContext}
                                  verifiedFromSnapshot={isEmailVerifiedInKyc(kycVerificationDetails, email)}
                                  onError={(message) => {
                                    setErrors({
                                      ...errors,
                                      [`contact_person_${index}_email_${emailIndex}`]: message,
                                    });
                                  }}
                                  onVerified={() => {
                                    const errorKey = `contact_person_${index}_email_${emailIndex}`;
                                    const nextErrors = { ...errors };
                                    delete nextErrors[errorKey];
                                    setErrors(nextErrors);
                                  }}
                                  onSnapshotSaved={(result) => {
                                    if (!result.surepass_response) return;
                                    setKycVerificationDetails((prev) =>
                                      mergeEntityKycSnapshot(
                                        prev,
                                        'emails',
                                        buildSurepassSnapshot(result.surepass_response, result),
                                        email,
                                      ),
                                    );
                                  }}
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
                  {showBankVerified && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400"
                      title={
                        displayBankVerifiedAt
                          ? `Bank verified ${new Date(displayBankVerifiedAt).toLocaleString('en-IN')}`
                          : 'Bank verified in this session — save to persist'
                      }
                    >
                      <Shield className="h-3.5 w-3.5" />
                      Bank verified
                    </span>
                  )}
                  {!showBankVerified && bankVerificationError?.trim() && (
                    <p className="text-xs text-amber-700 dark:text-amber-300 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2">
                      {bankVerificationError.trim()}
                    </p>
                  )}
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
                    {errors.account_holder_name && (
                      <p className="mt-1 text-xs text-red-600">{errors.account_holder_name}</p>
                    )}
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
                        }}
                        className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                        placeholder="HDFC0001234"
                        maxLength={11}
                      />
                      <button 
                        type="button" 
                        onClick={() => void handleBankVerifySearch()}
                        disabled={
                          ifscLoading ||
                          !canVerifyBankAccountLookup(
                            formData.bank_details?.account_number,
                            formData.bank_details?.ifsc_code,
                          )
                        }
                        className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Verify bank account via Surepass"
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
    </Dialog.Root>

      <BrokerPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        formData={formData}
        onConfirm={handlePreviewConfirm}
        mode="create"
      />

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        buttonText="OK"
      />
    </>
  );
}
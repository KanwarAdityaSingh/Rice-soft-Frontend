import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X, Search, ExternalLink, Check, Shield, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CustomSelect } from '../../shared/CustomSelect';
import { useSalesParties } from '../../../hooks/useSalesParties';
import { salesPartiesAPI } from '../../../services/salesParties.api';
import { leadsAPI } from '../../../services/leads.api';
import { pincodeAPI } from '../../../services/pincode.api';
import { kycAPI } from '../../../services/kyc.api';
import {
  validateEmail,
  validateGoogleLocationLink,
  validateAadhaar,
  getGstValidationError,
  getPanValidationError,
  getGstPanMismatchError,
  GST_EXAMPLE,
  PAN_EXAMPLE,
  GST_MAX_LENGTH,
  PAN_MAX_LENGTH,
  formatPhoneDisplay,
  formatPhonesForDisplay,
} from '../../../utils/validation';
import { sanitizeBankAccountInput } from '../../../utils/bankAccountFormatting';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { SalesPartyPreviewDialog } from './SalesPartyPreviewDialog';
import { AlertDialog } from '../../shared/AlertDialog';
import { EmailVerifyButton } from '../../shared/EmailVerifyButton';
import { GoogleMapsLinkFieldLabel } from '../../shared/GoogleMapsLinkGuide';
import { PhoneInput } from '../../shared/PhoneInput';
import { BankAccountInput } from '../../shared/BankAccountInput';
import type {
  CreateSalesPartyRequest,
  UpdateSalesPartyRequest,
  Lead,
  VendorBankDetails,
  ContactPerson,
  EntityKycVerificationDetails,
} from '../../../types/entities';
import {
  buildEntitySavePayload,
  clearBankKycSnapshot,
  isEmailVerifiedInKyc,
  isEntityBankVerified,
  persistAadhaarValidationSnapshot,
  persistBankVerificationSnapshot,
  resolveEntityBankVerifiedAt,
  salesPartyPersist,
  mergeEntityKycSnapshot,
  buildSurepassSnapshot,
  shouldVerifyBankFields,
} from '../../../utils/kycVerification';
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
import {
  verifyAutofilledEmails,
  isVerifiedEmailInput,
  VERIFIED_EMAIL_INPUT_CLASS,
  applyAutofillEmailVerificationToErrors,
  shouldShowEmailFieldError,
} from '../../../utils/emailVerification';
import {
  applyAadhaarStateToAddress,
  buildAadhaarValidationAutofill,
  formatAadhaarValidationSummary,
} from '../../../utils/aadhaarValidationAutofill';
import {
  collectGstLookupAutofillLocks,
  collectAadhaarAutofillLocks,
  collectLockedFieldsFromSavedVendorKyc,
  collectPanLookupAutofillLocks,
  collectVendorBankFieldLocks,
  collectVerifiedEmailFieldLocksFromList,
  isVendorFieldLocked,
  lockedClassFor,
  mergeFieldLocks,
} from '../../../utils/vendorAutofillLocks';
import {
  computeSalesPartyVerifiedFromKyc,
  formatSalesPartyVerifiedAt,
} from '../../../utils/salesPartyVerification';
import { assertEntityNotDuplicateBeforeVerification } from '../../../utils/entityDuplicateCheck';
import {
  applyAadhaarOcrToNestedParty,
  applyGstOcrToNestedParty,
  applyPanOcrToNestedParty,
} from '../../../utils/documentOcrPrefill';
import { KycDocumentOcrSection } from '../../shared/KycDocumentOcrSection';
import {
  canVerifyBankAccountLookup,
  getBankAccountHolderNameMismatchError,
  mapBankVerifyToBankDetails,
} from '../../../utils/bankVerification';

interface SalesPartyFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salesPartyId?: string | null;
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
      // Keep common abbreviations uppercase
      const abbreviations = ['pvt', 'ltd', 'llp', 'llc', 'inc', 'co', 'and'];
      if (abbreviations.includes(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

export function SalesPartyFormModal({ open, onOpenChange, salesPartyId }: SalesPartyFormModalProps) {
  const { createSalesParty, updateSalesParty } = useSalesParties();
  const navigate = useNavigate();
  const isEditMode = !!salesPartyId;
  const [formData, setFormData] = useState<CreateSalesPartyRequest>({
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
      gst_number: '',
    },
    bank_details: {
      account_holder_name: '',
      account_number: '',
      ifsc_code: '',
      bank_name: '',
      branch: '',
    } as VendorBankDetails,
    registration_type: 'registered',
    aadhar_number: null,
    is_active: true,
    google_location_link: null,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [loadingSalesParty, setLoadingSalesParty] = useState(false);
  const [originalGstNumber, setOriginalGstNumber] = useState<string>('');
  const [originalPanNumber, setOriginalPanNumber] = useState<string>('');
  const [originalAadharNumber, setOriginalAadharNumber] = useState<string>('');
  const [originalBankAccount, setOriginalBankAccount] = useState<string>('');
  const [originalBankIfsc, setOriginalBankIfsc] = useState<string>('');
  const [leadData, setLeadData] = useState<Lead | null>(null);
  const [apiLockedFields, setApiLockedFields] = useState<Set<string>>(new Set());
  const [kycVerificationDetails, setKycVerificationDetails] = useState<EntityKycVerificationDetails>({});
  const [aadhaarValidated, setAadhaarValidated] = useState(false);
  const [aadhaarValidationSummary, setAadhaarValidationSummary] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [bankDetailsVerifiedAt, setBankDetailsVerifiedAt] = useState<string | null>(null);
  const [bankVerifiedInSession, setBankVerifiedInSession] = useState(false);
  const [bankVerificationError, setBankVerificationError] = useState<string | null>(null);
  const [ifscLoading, setIfscLoading] = useState(false);
  const salesPartyPersistContext = salesPartyPersist(salesPartyId);
  const isFieldLocked = (key: string) => isVendorFieldLocked(apiLockedFields, key);
  const lockedClass = (key: string) => lockedClassFor(apiLockedFields, key);

  const isIdentityVerified = (
    registrationType: 'registered' | 'unregistered' = formData.registration_type,
  ) =>
    isVerified || computeSalesPartyVerifiedFromKyc(registrationType, kycVerificationDetails);

  const displayBankVerifiedAt = resolveEntityBankVerifiedAt(
    bankDetailsVerifiedAt,
    kycVerificationDetails,
  );
  const showBankVerified = isEntityBankVerified(
    bankDetailsVerifiedAt,
    kycVerificationDetails,
    bankVerifiedInSession,
  );

  const syncVerifiedFromKyc = (
    registrationType: 'registered' | 'unregistered',
    kyc: EntityKycVerificationDetails,
    serverVerified?: { is_verified: boolean; verified_at: string | null },
  ) => {
    if (serverVerified) {
      setIsVerified(serverVerified.is_verified);
      setVerifiedAt(serverVerified.verified_at);
      return;
    }
    const computed = computeSalesPartyVerifiedFromKyc(registrationType, kyc);
    setIsVerified(computed);
    setVerifiedAt(computed ? new Date().toISOString() : null);
  };

  const refreshVerifiedFromServer = async () => {
    if (!salesPartyId) return;
    try {
      const salesParty = await salesPartiesAPI.getById(salesPartyId);
      setIsVerified(salesParty.is_verified);
      setVerifiedAt(salesParty.verified_at);
      if (salesParty.kyc_verification_details) {
        setKycVerificationDetails(salesParty.kyc_verification_details);
      }
    } catch {
      // Non-blocking — local KYC state still reflects the lookup
    }
  };

  // Load sales party data when in edit mode
  useEffect(() => {
    if (open && salesPartyId && isEditMode) {
      loadSalesPartyData();
    } else if (open && !salesPartyId) {
      resetForm();
    }
  }, [open, salesPartyId]);

  useEffect(() => {
    if (!open) {
      setPreviewOpen(false);
    }
  }, [open]);

  // Load lead data when sales party has lead_id
  useEffect(() => {
    if (open && salesPartyId && isEditMode && leadData === null) {
      loadLeadData();
    } else if (!open) {
      setLeadData(null);
    }
  }, [open, salesPartyId, isEditMode]);

  const loadSalesPartyData = async () => {
    if (!salesPartyId) return;
    
    setLoadingSalesParty(true);
    try {
      const vendor = await salesPartiesAPI.getById(salesPartyId);
      const gstNumber = vendor.business_details?.gst_number || '';
      const panNumber = vendor.business_details?.pan_number || '';
      const aadharNumber = vendor.aadhar_number || '';

      setOriginalGstNumber(gstNumber);
      setOriginalPanNumber(panNumber);
      setOriginalAadharNumber(aadharNumber);
      setOriginalBankAccount(sanitizeBankAccountInput(vendor.bank_details?.account_number || ''));
      setOriginalBankIfsc(vendor.bank_details?.ifsc_code?.trim().toUpperCase() || '');
      setApiLockedFields(new Set());

      setFormData({
        business_name: vendor.business_name || '',
        contact_persons: vendor.contact_persons && vendor.contact_persons.length > 0
          ? vendor.contact_persons.map(cp => ({
              name: cp.name || '',
              phones: cp.phones?.length > 0 ? cp.phones : [''],
              emails: (cp.emails?.length ?? 0) > 0 ? cp.emails : [''],
            }))
          : [{ name: '', phones: [''], emails: [''] }],
        address: {
          street: vendor.address?.street || '',
          city: vendor.address?.city || '',
          state: vendor.address?.state || '',
          pincode: vendor.address?.pincode || '',
          country: vendor.address?.country || 'India',
        },
        business_details: {
          pan_number: panNumber,
          gst_number: gstNumber,
        },
        bank_details: vendor.bank_details ? {
          account_holder_name: vendor.bank_details.account_holder_name || '',
          account_number: sanitizeBankAccountInput(vendor.bank_details.account_number || ''),
          ifsc_code: vendor.bank_details.ifsc_code || '',
          bank_name: vendor.bank_details.bank_name || '',
          branch: vendor.bank_details.branch || '',
        } : {
          account_holder_name: '',
          account_number: '',
          ifsc_code: '',
          bank_name: '',
          branch: '',
        },
        registration_type: vendor.registration_type || 'registered',
        aadhar_number: aadharNumber || null,
        is_active: vendor.is_active ?? true,
        google_location_link: vendor.google_location_link || null,
      });
      setKycVerificationDetails(vendor.kyc_verification_details ?? {});
      setIsVerified(vendor.is_verified);
      setVerifiedAt(vendor.verified_at);
      setAadhaarValidated(Boolean(vendor.kyc_verification_details?.aadhaar));
      setBankDetailsVerifiedAt(vendor.bank_details_verified_at ?? null);
      setBankVerifiedInSession(Boolean(vendor.bank_details_verified_at));
      setBankVerificationError(vendor.bank_verification_error ?? null);
      const savedKyc = vendor.kyc_verification_details ?? {};
      const loadedForm = {
        business_name: vendor.business_name || '',
        business_details: { gst_number: gstNumber, pan_number: panNumber },
        aadhar_number: aadharNumber || null,
        address: {
          street: vendor.address?.street || '',
          city: vendor.address?.city || '',
          state: vendor.address?.state || '',
          pincode: vendor.address?.pincode || '',
          country: vendor.address?.country || 'India',
        },
        contact_persons: vendor.contact_persons ?? [],
      };
      setApiLockedFields(
        mergeFieldLocks(
          collectLockedFieldsFromSavedVendorKyc(savedKyc, loadedForm),
          collectVendorBankFieldLocks(vendor.bank_details, savedKyc, {
            bankDetailsVerifiedAt: vendor.bank_details_verified_at,
          }),
        ),
      );
      setStep(1);
      setErrors({});
    } catch (error: any) {
      console.error('Failed to load sales party:', error);
      setAlertType('error');
      setAlertTitle('Failed to Load Sales Party');
      setAlertMessage(error?.message || 'Could not load sales party data. Please try again.');
      setAlertOpen(true);
      onOpenChange(false);
    } finally {
      setLoadingSalesParty(false);
    }
  };

  const loadLeadData = async () => {
    if (!salesPartyId) return;
    
    try {
      const vendor = await salesPartiesAPI.getById(salesPartyId);
      if (vendor.lead_id) {
        const lead = await leadsAPI.getLeadById(vendor.lead_id);
        setLeadData(lead);
      }
    } catch (error: any) {
      console.error('Failed to load lead data:', error);
      // Don't show error, just log it
    }
  };

  const resetForm = () => {
    setFormData({
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
        gst_number: '',
      },
      bank_details: {
        account_holder_name: '',
        account_number: '',
        ifsc_code: '',
        bank_name: '',
        branch: '',
      },
      registration_type: 'registered',
      aadhar_number: null,
      is_active: true,
      google_location_link: null,
    });
    setStep(1);
    setErrors({});
    setOriginalGstNumber('');
    setOriginalPanNumber('');
    setOriginalAadharNumber('');
    setOriginalBankAccount('');
    setOriginalBankIfsc('');
    setApiLockedFields(new Set());
    setKycVerificationDetails({});
    setAadhaarValidated(false);
    setAadhaarValidationSummary(null);
    setIsVerified(false);
    setVerifiedAt(null);
    setBankDetailsVerifiedAt(null);
    setBankVerifiedInSession(false);
    setBankVerificationError(null);
  };

  // Contact persons management functions
  const addContactPerson = () => {
    setFormData({
      ...formData,
      contact_persons: [...formData.contact_persons, { name: '', phones: [''], emails: [''] }]
    });
  };

  const removeContactPerson = (index: number) => {
    if (formData.contact_persons.length > 1) {
      setFormData({
        ...formData,
        contact_persons: formData.contact_persons.filter((_, i) => i !== index)
      });
    }
  };

  const updateContactPerson = (index: number, field: keyof ContactPerson, value: any) => {
    const updated = [...formData.contact_persons];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, contact_persons: updated });
  };

  const addPhone = (personIndex: number) => {
    const updated = [...formData.contact_persons];
    updated[personIndex] = { 
      ...updated[personIndex], 
      phones: [...updated[personIndex].phones, ''] 
    };
    setFormData({ ...formData, contact_persons: updated });
  };

  const removePhone = (personIndex: number, phoneIndex: number) => {
    const updated = [...formData.contact_persons];
    if (updated[personIndex].phones.length > 1) {
      updated[personIndex] = {
        ...updated[personIndex],
        phones: updated[personIndex].phones.filter((_, i) => i !== phoneIndex)
      };
      setFormData({ ...formData, contact_persons: updated });
    }
  };

  const updatePhone = (personIndex: number, phoneIndex: number, value: string) => {
    const updated = [...formData.contact_persons];
    updated[personIndex].phones[phoneIndex] = value;
    setFormData({ ...formData, contact_persons: updated });
  };

  const addEmail = (personIndex: number) => {
    const updated = [...formData.contact_persons];
    updated[personIndex] = {
      ...updated[personIndex],
      emails: [...(updated[personIndex].emails || []), '']
    };
    setFormData({ ...formData, contact_persons: updated });
  };

  const removeEmail = (personIndex: number, emailIndex: number) => {
    const updated = [...formData.contact_persons];
    const emails = updated[personIndex].emails || [];
    if (emails.length > 0) {
      updated[personIndex] = {
        ...updated[personIndex],
        emails: emails.filter((_, i) => i !== emailIndex)
      };
      setFormData({ ...formData, contact_persons: updated });
    }
  };

  const updateEmail = (personIndex: number, emailIndex: number, value: string) => {
    const updated = [...formData.contact_persons];
    if (!updated[personIndex].emails) updated[personIndex].emails = [];
    updated[personIndex].emails![emailIndex] = value;
    setFormData({ ...formData, contact_persons: updated });
  };

  const duplicateCheckOptions = () => ({
    excludeId: salesPartyId,
    unchangedFrom: {
      gst_number: originalGstNumber,
      pan_number: originalPanNumber,
      aadhar_number: originalAadharNumber,
      account_number: originalBankAccount,
      ifsc_code: originalBankIfsc,
    },
  });

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
        'sales_party',
        { gst_number: formData.business_details.gst_number },
        'gst',
        duplicateCheckOptions(),
      );
      const result = await runEnrichedGstLookup(
        formData.business_details.gst_number,
        salesPartyPersistContext,
      );
      const autofill = buildEnrichedGstLookupAutofill(result);
      const businessName = autofill.businessName ?? formData.business_name;
      const updatedContactPersons = mergeGstContactPersons(formData.contact_persons, autofill);

      let nextKycDetails = persistEnrichedGstLookupSnapshots(kycVerificationDetails, result);
      const emailVerification = await verifyAutofilledEmails(
        autofill.emails,
        updatedContactPersons,
        nextKycDetails,
        salesPartyPersistContext,
      );
      nextKycDetails = emailVerification.kycDetails;
      const autofillLocks = collectGstLookupAutofillLocks(autofill, updatedContactPersons);
      const verifiedEmailLocks = collectVerifiedEmailFieldLocksFromList(
        updatedContactPersons,
        emailVerification.verifiedEmails,
      );

      setFormData({
        ...formData,
        business_name: businessName,
        contact_persons: updatedContactPersons,
        address: applyAutofillAddress(formData.address, autofill.address),
        business_details: {
          ...formData.business_details,
          ...(autofill.panNumber ? { pan_number: autofill.panNumber } : {}),
          ...(autofill.gstNumber ? { gst_number: autofill.gstNumber } : {}),
          ...(autofill.businessType ? { business_type: autofill.businessType } : {}),
        },
      });

      setApiLockedFields((prev) => mergeFieldLocks(prev, mergeFieldLocks(autofillLocks, verifiedEmailLocks)));
      setKycVerificationDetails(nextKycDetails);
      setErrors((prev) =>
        applyAutofillEmailVerificationToErrors(prev, emailVerification, updatedContactPersons, {
          gst_number: '',
        }),
      );
      if (salesPartyId) {
        await refreshVerifiedFromServer();
      } else {
        syncVerifiedFromKyc(formData.registration_type, nextKycDetails);
      }
    } catch (error: any) {
      console.error('GST lookup error:', error);
      setErrors({ ...errors, gst_number: error?.message || 'Failed to lookup GST details' });
    } finally {
      setLookupLoading(false);
    }
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
        'sales_party',
        { pan_number: formData.business_details.pan_number },
        'pan',
        duplicateCheckOptions(),
      );
      const panResult = await runEnrichedPanLookup(
        formData.business_details.pan_number,
        salesPartyPersistContext,
      );
      let nextKycDetails = persistEnrichedPanLookupSnapshots(kycVerificationDetails, panResult);
      const panAutofill = buildPanLookupAutofill(panResult);
      const gstNumber = panAutofill.gstNumber?.trim();

      if (gstNumber && formData.registration_type === 'registered') {
        try {
          await assertEntityNotDuplicateBeforeVerification(
            'sales_party',
            { gst_number: gstNumber },
            'gst',
            duplicateCheckOptions(),
          );
          const gstResult = await runEnrichedGstLookup(gstNumber, salesPartyPersistContext);
          const autofill = buildEnrichedGstLookupAutofill(gstResult);
          const businessName = autofill.businessName ?? panAutofill.businessName ?? formData.business_name;
          const updatedContactPersons = mergeGstContactPersons(formData.contact_persons, autofill);

          nextKycDetails = persistEnrichedGstLookupSnapshots(nextKycDetails, gstResult);
          const emailVerification = await verifyAutofilledEmails(
            autofill.emails,
            updatedContactPersons,
            nextKycDetails,
            salesPartyPersistContext,
          );
          nextKycDetails = emailVerification.kycDetails;
          const autofillLocks = collectGstLookupAutofillLocks(autofill, updatedContactPersons);
          const verifiedEmailLocks = collectVerifiedEmailFieldLocksFromList(
            updatedContactPersons,
            emailVerification.verifiedEmails,
          );

          setFormData({
            ...formData,
            business_name: businessName,
            contact_persons: updatedContactPersons,
            address: applyAutofillAddress(formData.address, autofill.address),
            business_details: {
              ...formData.business_details,
              ...(autofill.panNumber ? { pan_number: autofill.panNumber } : {}),
              ...(autofill.gstNumber ? { gst_number: autofill.gstNumber } : {}),
              ...(autofill.businessType ? { business_type: autofill.businessType } : {}),
            },
          });

          setApiLockedFields((prev) => mergeFieldLocks(prev, mergeFieldLocks(autofillLocks, verifiedEmailLocks)));
          setKycVerificationDetails(nextKycDetails);
          setErrors((prev) =>
            applyAutofillEmailVerificationToErrors(prev, emailVerification, updatedContactPersons, {
              pan_number: '',
              gst_number: '',
            }),
          );
          if (salesPartyId) {
            await refreshVerifiedFromServer();
          } else {
            syncVerifiedFromKyc('registered', nextKycDetails);
          }
          return;
        } catch (gstError: unknown) {
          const msg = gstError instanceof Error ? gstError.message : '';
          if (msg.includes('already exists')) {
            setErrors((prev) => ({ ...prev, gst_number: msg }));
            return;
          }
          console.warn('GST lookup after PAN failed; applying PAN autofill with GST number', gstError);
        }
      }

      const businessName = panAutofill.businessName ?? formData.business_name;
      const businessDetailsUpdate = {
        ...formData.business_details,
        ...(panAutofill.panNumber ? { pan_number: panAutofill.panNumber } : {}),
        ...(panAutofill.gstNumber ? { gst_number: panAutofill.gstNumber } : {}),
        ...(panAutofill.businessType ? { business_type: panAutofill.businessType } : {}),
      };
      const updatedContactPersons = mergePanContactIntoContactPersons(formData.contact_persons, panAutofill);

      const emailVerification = await verifyAutofilledEmails(
        panAutofill.emails,
        updatedContactPersons,
        nextKycDetails,
        salesPartyPersistContext,
      );
      nextKycDetails = emailVerification.kycDetails;
      const autofillLocks = collectPanLookupAutofillLocks(panAutofill, updatedContactPersons);
      const verifiedEmailLocks = collectVerifiedEmailFieldLocksFromList(
        updatedContactPersons,
        emailVerification.verifiedEmails,
      );

      setFormData({
        ...formData,
        business_name: businessName,
        contact_persons: updatedContactPersons,
        address: applyAutofillAddress(formData.address, panAutofill.address),
        business_details: businessDetailsUpdate,
      });

      setApiLockedFields((prev) => mergeFieldLocks(prev, mergeFieldLocks(autofillLocks, verifiedEmailLocks)));
      setKycVerificationDetails(nextKycDetails);
      setErrors((prev) =>
        applyAutofillEmailVerificationToErrors(prev, emailVerification, updatedContactPersons, {
          pan_number: '',
        }),
      );
      if (salesPartyId) {
        await refreshVerifiedFromServer();
      } else {
        syncVerifiedFromKyc(formData.registration_type, nextKycDetails);
      }
    } catch (error: any) {
      console.error('PAN lookup error:', error);
      setErrors({ ...errors, pan_number: error?.message || 'Failed to lookup PAN details' });
    } finally {
      setLookupLoading(false);
    }
  };

  const handleAadhaarLookup = async () => {
    if (!formData.aadhar_number?.trim()) {
      setErrors({ ...errors, aadhar_number: 'Please enter an Aadhaar number' });
      return;
    }

    if (!validateAadhaar(formData.aadhar_number)) {
      setErrors({ ...errors, aadhar_number: 'Invalid Aadhaar format (12 digits, cannot start with 0 or 1)' });
      return;
    }

    setLookupLoading(true);
    setErrors({ ...errors, aadhar_number: '' });
    setAadhaarValidated(false);
    setAadhaarValidationSummary(null);

    try {
      await assertEntityNotDuplicateBeforeVerification(
        'sales_party',
        { aadhar_number: formData.aadhar_number },
        'aadhaar',
        duplicateCheckOptions(),
      );
      const response = await salesPartiesAPI.lookupAadhaar(formData.aadhar_number, salesPartyId);
      const autofill = buildAadhaarValidationAutofill(response);
      const summary = formatAadhaarValidationSummary(autofill);
      const nextAddress = applyAadhaarStateToAddress(formData.address, autofill);

      setFormData({
        ...formData,
        aadhar_number: autofill.aadhaarNumber,
        address: nextAddress,
      });

      setApiLockedFields((prev) =>
        mergeFieldLocks(prev, collectAadhaarAutofillLocks(autofill, nextAddress)),
      );

      const nextKyc = persistAadhaarValidationSnapshot(kycVerificationDetails, response);
      setKycVerificationDetails(nextKyc);
      setAadhaarValidated(true);
      setAadhaarValidationSummary(summary);
      setErrors({ ...errors, aadhar_number: '' });
      if (salesPartyId) {
        await refreshVerifiedFromServer();
      } else {
        syncVerifiedFromKyc('unregistered', nextKyc);
      }
    } catch (error: any) {
      console.error('Aadhaar lookup error:', error);
      setErrors({ ...errors, aadhar_number: error?.message || 'Failed to validate Aadhaar number' });
    } finally {
      setLookupLoading(false);
    }
  };

  const handlePincodeLookup = async (pincode: string) => {
    // Only lookup if pincode is exactly 6 digits
    if (!/^\d{6}$/.test(pincode)) {
      return;
    }

    setPincodeLoading(true);
    const errorKey = 'pincode';
    setErrors({ ...errors, [errorKey]: '' });

    try {
      const response = await pincodeAPI.lookupPincode(pincode);
      
      // Extract post office data from response
      const postOffice = response.postOffices?.[0];
      
      if (!postOffice) {
        console.warn('No post office data found in pincode lookup response');
        return;
      }

      // Update address fields from pincode lookup response
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          pincode: postOffice.Pincode || pincode,
          // Fill city, state from response (convert to title case)
          city: toTitleCase(postOffice.Block || postOffice.District || postOffice.Name) || formData.address?.city || '',
          state: toTitleCase(postOffice.State) || formData.address?.state || '',
          country: toTitleCase(postOffice.Country) || formData.address?.country || 'India',
        },
      });

      setErrors({ ...errors, [errorKey]: '' });
    } catch (error: any) {
      console.error('Pincode lookup error:', error);
      // Don't show error if pincode is invalid - user might still be typing
    } finally {
      setPincodeLoading(false);
    }
  };

  const handleBankCredentialChange = () => {
    setBankVerificationError(null);
    const serverBankVerified = Boolean(bankDetailsVerifiedAt);
    if (serverBankVerified || bankVerifiedInSession) {
      setBankVerifiedInSession(false);
      setBankDetailsVerifiedAt(null);
      setApiLockedFields((prev) => {
        const next = new Set(prev);
        ['account_holder_name', 'account_number', 'ifsc_code', 'bank_name', 'branch'].forEach((key) =>
          next.delete(key),
        );
        return next;
      });
    }
    if (serverBankVerified || bankVerifiedInSession || kycVerificationDetails.bank) {
      setKycVerificationDetails((prev) => clearBankKycSnapshot(prev));
    }
  };

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
    setErrors((prev) => ({ ...prev, ifsc_code: '', bank_account_number: '', account_holder_name: '' }));

    try {
      await assertEntityNotDuplicateBeforeVerification(
        'sales_party',
        { account_number: accountNumber, ifsc_code: ifscCode },
        'bank',
        duplicateCheckOptions(),
      );
      const result = await kycAPI.verifyBank(accountNumber!, ifscCode!, salesPartyPersistContext);
      const nextBankDetails = mapBankVerifyToBankDetails(result, formData.bank_details);
      setFormData((prev) => ({ ...prev, bank_details: nextBankDetails }));
      setApiLockedFields((prev) =>
        mergeFieldLocks(
          prev,
          collectVendorBankFieldLocks(nextBankDetails, kycVerificationDetails, { ifscLookupOnly: true }),
        ),
      );

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
      setApiLockedFields((prev) => {
        const next = new Set(prev);
        next.delete('bank_name');
        next.delete('branch');
        return next;
      });
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

    if (!formData.business_name) newErrors.business_name = 'Business name required';
    
    // Validate contact persons
    if (!formData.contact_persons || formData.contact_persons.length === 0) {
      newErrors.contact_persons = 'At least one contact person is required';
    } else {
      formData.contact_persons.forEach((cp, idx) => {
        if (!cp.name || cp.name.trim().length < 2) {
          newErrors[`contact_person_${idx}_name`] = 'Name required (min 2 chars)';
        }
        if (!cp.phones || cp.phones.length === 0 || !cp.phones[0]) {
          newErrors[`contact_person_${idx}_phone`] = 'At least one phone required';
        }
        // Validate emails if provided
        cp.emails?.forEach((email, emailIdx) => {
          if (email && !validateEmail(email)) {
            newErrors[`contact_person_${idx}_email_${emailIdx}`] = 'Valid email required';
          }
        });
      });
    }
    if (!formData.address.street) newErrors.street = 'Street required';
    if (!formData.address.city) newErrors.city = 'City required';
    if (!formData.address.state) newErrors.state = 'State required';
    if (!formData.address.pincode) newErrors.pincode = 'Pincode required';

    if (formData.registration_type === 'registered') {
      if (!formData.business_details.gst_number?.trim()) {
        newErrors.gst_number = 'GST number is required for registered sales parties';
      } else {
        const gstError = getGstValidationError(formData.business_details.gst_number);
        if (gstError) newErrors.gst_number = gstError;
      }
      if (formData.business_details.pan_number) {
        const panError = getPanValidationError(formData.business_details.pan_number);
        if (panError) newErrors.pan_number = panError;
      }
      if (formData.business_details.gst_number && formData.business_details.pan_number) {
        const mismatchError = getGstPanMismatchError(
          formData.business_details.gst_number,
          formData.business_details.pan_number,
        );
        if (mismatchError) newErrors.pan_number = mismatchError;
      }
    } else {
      if (!formData.aadhar_number?.trim()) {
        newErrors.aadhar_number = 'Aadhaar number is required for unregistered sales parties';
      } else if (!validateAadhaar(formData.aadhar_number)) {
        newErrors.aadhar_number = 'Invalid Aadhaar format (12 digits, cannot start with 0 or 1)';
      }
      if (formData.business_details.pan_number?.trim()) {
        const panError = getPanValidationError(formData.business_details.pan_number);
        if (panError) newErrors.pan_number = panError;
      }
    }

    if (formData.google_location_link) {
      const val = formData.google_location_link.trim();
      if (!validateGoogleLocationLink(val)) {
        newErrors.google_location_link = 'Invalid Google Maps link format';
      } else if (val.length > 500) {
        newErrors.google_location_link = 'Link must be at most 500 characters';
      }
    }

    const bankReady = shouldVerifyBankFields(formData.bank_details);
    if (bankReady && !kycVerificationDetails.bank?.verified_at) {
      newErrors.bank_account_number =
        'Verify bank account (search on IFSC) before saving — snapshot is required for bank verification';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Navigate to step with errors
      const hasStep1Errors = Object.keys(newErrors).some(
        (key) =>
          key === 'business_name' ||
          key === 'contact_persons' ||
          key.startsWith('contact_person_') ||
          key === 'gst_number' ||
          key === 'pan_number' ||
          key === 'aadhar_number',
      );
      if (hasStep1Errors) {
        setStep(1);
      } else if (newErrors.street || newErrors.city || newErrors.state || newErrors.pincode) {
        setStep(2);
      } else if (newErrors.bank_account_number || newErrors.ifsc_code || newErrors.account_holder_name) {
        setStep(3);
      }
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }

    if (isEditMode && salesPartyId) {
      setLoading(true);
      try {
        const updatePayload = buildEntitySavePayload(formData as UpdateSalesPartyRequest, {
          kycVerificationDetails,
          bankDetailsVerifiedAt,
          identityVerified: isIdentityVerified(),
        });
        await updateSalesParty(salesPartyId, updatePayload);
        setAlertType('success');
        setAlertTitle('Sales Party Updated Successfully');
        setAlertMessage('The sales party has been updated successfully.');
        setAlertOpen(true);
        onOpenChange(false);
      } catch (error: any) {
        setAlertType('error');
        setAlertTitle('Failed to Update Sales Party');
        const errorMessage =
          error?.message ||
          error?.data?.message ||
          error?.response?.data?.message ||
          'An error occurred while updating the sales party. Please try again.';
        setAlertMessage(errorMessage);
        setAlertOpen(true);
      } finally {
        setLoading(false);
      }
    } else {
      // In create mode, open review dialog (form hides via open && !previewOpen)
      setPreviewOpen(true);
    }
  };

  const handlePreviewConfirm = async (data: CreateSalesPartyRequest | UpdateSalesPartyRequest) => {
    setLoading(true);
    try {
      if (isEditMode && salesPartyId) {
        const updatePayload = buildEntitySavePayload(data as UpdateSalesPartyRequest, {
          kycVerificationDetails,
          bankDetailsVerifiedAt,
          identityVerified: isIdentityVerified(
            (data as CreateSalesPartyRequest).registration_type,
          ),
        });
        await updateSalesParty(salesPartyId, updatePayload);
        setAlertType('success');
        setAlertTitle('Sales Party Updated Successfully');
        setAlertMessage('The sales party has been updated successfully.');
      } else {
        const createPayload = buildEntitySavePayload(data as CreateSalesPartyRequest, {
          kycVerificationDetails,
          bankDetailsVerifiedAt,
          identityVerified: isIdentityVerified(
            (data as CreateSalesPartyRequest).registration_type,
          ),
        });
        await createSalesParty(createPayload);
        resetForm();
        setAlertType('success');
        setAlertTitle('Sales Party Created Successfully');
        setAlertMessage('The sales party has been created successfully.');
      }
      setPreviewOpen(false);
      setAlertOpen(true);
      onOpenChange(false);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle(isEditMode ? 'Failed to Update Sales Party' : 'Failed to Create Sales Party');
      const errorMessage =
        error?.message ||
        error?.data?.message ||
        error?.response?.data?.message ||
        error?.error ||
        `An error occurred while ${isEditMode ? 'updating' : 'creating'} the sales party. Please try again.`;
      
      // Check for errors and clear auto-filled fields so user can edit them
      const errorText = (error?.error || errorMessage || '').toLowerCase();
      const updatedLockedFields = new Set(apiLockedFields);

      if (errorText.includes('pan number already exists') || errorText.includes('pan already exists')) {
        updatedLockedFields.delete('pan_number');
      }
      if (errorText.includes('gst number already exists') || errorText.includes('gst already exists')) {
        updatedLockedFields.delete('gst_number');
      }
      if (errorText.includes('aadhaar') && errorText.includes('already exists')) {
        updatedLockedFields.delete('aadhar_number');
      }

      if (errorText.includes('already exists') || errorText.includes('duplicate') || errorText.includes('invalid')) {
        setApiLockedFields(new Set());
      } else {
        setApiLockedFields(updatedLockedFields);
      }
      
      setAlertMessage(errorMessage);
      setAlertOpen(true);
      setPreviewOpen(false);
      // Reopen the form modal so user can edit
      onOpenChange(true);
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
              <Dialog.Title className="text-xl font-semibold">
                {isEditMode ? 'Update Sales Party' : 'Create Sales Party'}
              </Dialog.Title>
              <button onClick={() => onOpenChange(false)} className="rounded-lg p-1 hover:bg-muted/50 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingSalesParty && (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
                <span className="ml-2 text-sm text-muted-foreground">Loading sales party data...</span>
              </div>
            )}

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
                2. Address
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
              {isEditMode && leadData && (
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className={`flex-1 rounded-lg p-2 text-center text-sm font-medium transition-colors ${
                    step >= 4 ? 'bg-primary/20 text-primary' : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  4. Lead Details
                </button>
              )}
            </div>

            {!loadingSalesParty && (
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} className="space-y-4">
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Registration Type <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      value={formData.registration_type}
                      onChange={(value) =>
                        setFormData({
                          ...formData,
                          registration_type: value as 'registered' | 'unregistered',
                        })
                      }
                      options={[
                        { value: 'registered', label: 'Registered' },
                        { value: 'unregistered', label: 'Unregistered' },
                      ]}
                      placeholder="Select Registration Type"
                    />
                  </div>

                  {(isVerified && verifiedAt) || (!isVerified && isEditMode && salesPartyId) ? (
                    <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 mb-2 space-y-1">
                      {!isVerified && isEditMode && salesPartyId && (
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          Unverified — run GST/PAN or Aadhaar lookup to verify via Surepass.
                        </p>
                      )}
                      {isVerified && verifiedAt && (
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <Check className="h-3 w-3 shrink-0" />
                          Verified {formatSalesPartyVerifiedAt(verifiedAt)}
                        </p>
                      )}
                    </div>
                  ) : null}

                  {!isVerified && (
                    <KycDocumentOcrSection
                      docs={
                        formData.registration_type === 'registered'
                          ? ['gst', 'pan']
                          : ['pan', 'aadhaar']
                      }
                      disabled={lookupLoading || loading}
                      onGstResult={(result) => {
                        setFormData((prev) => ({
                          ...prev,
                          ...applyGstOcrToNestedParty(
                            {
                              business_name: prev.business_name,
                              aadhar_number: prev.aadhar_number,
                              business_details: prev.business_details,
                              address: prev.address,
                              contact_persons: prev.contact_persons,
                            },
                            result,
                          ),
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
                          ...applyPanOcrToNestedParty(
                            {
                              business_name: prev.business_name,
                              aadhar_number: prev.aadhar_number,
                              business_details: prev.business_details,
                              address: prev.address,
                              contact_persons: prev.contact_persons,
                            },
                            result,
                          ),
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
                          ...applyAadhaarOcrToNestedParty(
                            {
                              business_name: prev.business_name,
                              aadhar_number: prev.aadhar_number,
                              business_details: prev.business_details,
                              address: prev.address,
                              contact_persons: prev.contact_persons,
                            },
                            result,
                          ),
                        }));
                        setAadhaarValidated(false);
                        setAadhaarValidationSummary(null);
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.aadhar_number;
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
                  )}

                  {formData.registration_type === 'registered' ? (
                    <>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">
                          GST Number <span className="text-red-500">*</span>
                        </label>
                        {isEditMode && originalGstNumber && originalGstNumber.trim().length > 0 ? (
                          <div className="flex gap-2">
                            <div className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm pointer-events-none select-none">
                              {originalGstNumber}
                            </div>
                            <button
                              type="button"
                              onClick={handleGSTLookup}
                              disabled={lookupLoading}
                              className="btn-secondary flex items-center gap-2 shrink-0"
                              title="Verify GST via Surepass"
                            >
                              {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={formData.business_details.gst_number}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  business_details: {
                                    ...formData.business_details,
                                    gst_number: e.target.value.toUpperCase(),
                                  },
                                })
                              }
                              className={`flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary read-only:cursor-not-allowed ${lockedClass('gst_number')}`}
                              placeholder={GST_EXAMPLE}
                              maxLength={GST_MAX_LENGTH}
                              readOnly={isFieldLocked('gst_number')}
                            />
                            <button
                              type="button"
                              onClick={handleGSTLookup}
                              disabled={lookupLoading}
                              className="btn-secondary flex items-center gap-2"
                            >
                              {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                            </button>
                          </div>
                        )}
                        {errors.gst_number && <p className="mt-1 text-xs text-red-600">{errors.gst_number}</p>}
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1.5 block">PAN Number</label>
                        {isEditMode && originalPanNumber && originalPanNumber.trim().length > 0 ? (
                          <div className="flex gap-2">
                            <div className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm pointer-events-none select-none">
                              {originalPanNumber}
                            </div>
                            <button
                              type="button"
                              onClick={handlePANLookup}
                              disabled={lookupLoading}
                              className="btn-secondary flex items-center gap-2 shrink-0"
                              title="Verify PAN via Surepass"
                            >
                              {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                            </button>
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
                              className={`flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary read-only:cursor-not-allowed ${lockedClass('pan_number')}`}
                              placeholder={PAN_EXAMPLE}
                              maxLength={PAN_MAX_LENGTH}
                              readOnly={isFieldLocked('pan_number')}
                            />
                            <button
                              type="button"
                              onClick={handlePANLookup}
                              disabled={lookupLoading}
                              className="btn-secondary flex items-center gap-2"
                            >
                              {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                            </button>
                          </div>
                        )}
                        {errors.pan_number && <p className="mt-1 text-xs text-red-600">{errors.pan_number}</p>}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground -mt-1 mb-1">
                        Aadhaar is required. PAN is optional for additional verification.
                      </p>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">
                          PAN Number
                        </label>
                        {isEditMode && originalPanNumber && originalPanNumber.trim().length > 0 ? (
                          <div className="flex gap-2">
                            <div className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm pointer-events-none select-none">
                              {originalPanNumber}
                            </div>
                            <button
                              type="button"
                              onClick={handlePANLookup}
                              disabled={lookupLoading}
                              className="btn-secondary flex items-center gap-2 shrink-0"
                              title="Verify PAN via Surepass"
                            >
                              {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                            </button>
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
                              className={`flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary read-only:cursor-not-allowed ${lockedClass('pan_number')}`}
                              placeholder={PAN_EXAMPLE}
                              maxLength={PAN_MAX_LENGTH}
                              readOnly={isFieldLocked('pan_number')}
                            />
                            <button
                              type="button"
                              onClick={handlePANLookup}
                              disabled={lookupLoading}
                              className="btn-secondary flex items-center gap-2"
                            >
                              {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                            </button>
                          </div>
                        )}
                        {errors.pan_number && <p className="mt-1 text-xs text-red-600">{errors.pan_number}</p>}
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1.5 block">
                          Aadhaar Number <span className="text-red-500">*</span>
                        </label>
                        {isEditMode && originalAadharNumber && originalAadharNumber.trim().length > 0 ? (
                          <div className="flex gap-2">
                            <div className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm pointer-events-none select-none">
                              {originalAadharNumber.replace(/(\d{4})(?=\d)/g, '$1 ').trim()}
                            </div>
                            <button
                              type="button"
                              onClick={handleAadhaarLookup}
                              disabled={lookupLoading}
                              className="btn-secondary flex items-center gap-2 shrink-0"
                              title="Verify Aadhaar via Surepass"
                            >
                              {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                            </button>
                          </div>
                        ) : isFieldLocked('aadhar_number') ? (
                          <div className={`w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm ${lockedClass('aadhar_number')}`}>
                            {formData.aadhar_number}
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={formData.aadhar_number || ''}
                              onChange={(e) => {
                                setFormData({ ...formData, aadhar_number: e.target.value || null });
                                setAadhaarValidated(false);
                                setAadhaarValidationSummary(null);
                              }}
                              className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                              placeholder="234567890123"
                              maxLength={14}
                            />
                            <button
                              type="button"
                              onClick={handleAadhaarLookup}
                              disabled={lookupLoading}
                              className="btn-secondary flex items-center gap-2"
                            >
                              {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                            </button>
                          </div>
                        )}
                        {aadhaarValidated && aadhaarValidationSummary && (
                          <p className="mt-1 text-xs text-emerald-600">{aadhaarValidationSummary}</p>
                        )}
                        {errors.aadhar_number && <p className="mt-1 text-xs text-red-600">{errors.aadhar_number}</p>}
                      </div>
                    </>
                  )}

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Business Name *</label>
                    <input
                      type="text"
                      value={formData.business_name}
                      onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                      className={`w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary ${isEditMode ? 'read-only:cursor-not-allowed' : ''}`}
                      readOnly={isEditMode}
                    />
                    {errors.business_name && <p className="mt-1 text-xs text-red-600">{errors.business_name}</p>}
                  </div>

                  {/* Contact Persons Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold">Contact Persons *</label>
                      <button
                        type="button"
                        onClick={addContactPerson}
                        className="text-xs text-primary hover:text-primary/80 font-medium"
                      >
                        + Add Contact Person
                      </button>
                    </div>
                    {errors.contact_persons && <p className="text-xs text-red-600">{errors.contact_persons}</p>}
                    
                    {formData.contact_persons.map((contactPerson, personIdx) => (
                      <div key={personIdx} className="p-3 border border-border rounded-lg space-y-3 bg-muted/20">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Contact Person {personIdx + 1}</span>
                          {formData.contact_persons.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeContactPerson(personIdx)}
                              className="text-xs text-red-500 hover:text-red-700"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        
                        {/* Name */}
                        <div>
                          <label className="text-xs font-medium mb-1 block">Name *</label>
                          <input
                            type="text"
                            value={contactPerson.name}
                            onChange={(e) => updateContactPerson(personIdx, 'name', e.target.value)}
                            className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                            placeholder="Contact person name"
                          />
                          {errors[`contact_person_${personIdx}_name`] && (
                            <p className="mt-1 text-xs text-red-600">{errors[`contact_person_${personIdx}_name`]}</p>
                          )}
                        </div>
                        
                        {/* Phones */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium">Phone Numbers *</label>
                            <button
                              type="button"
                              onClick={() => addPhone(personIdx)}
                              className="text-xs text-primary hover:text-primary/80"
                            >
                              + Add
                            </button>
                          </div>
                          <div className="space-y-2">
                            {contactPerson.phones.map((phone, phoneIdx) => (
                              <div key={phoneIdx} className="flex gap-2">
                                <PhoneInput
                                  value={phone}
                                  onChange={(value) => updatePhone(personIdx, phoneIdx, value)}
                                  readOnly={isFieldLocked(`contact_person_${personIdx}_phone_${phoneIdx}`)}
                                  disabled={isFieldLocked(`contact_person_${personIdx}_phone_${phoneIdx}`)}
                                  className={`flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary ${lockedClass(`contact_person_${personIdx}_phone_${phoneIdx}`)}`}
                                />
                                {contactPerson.phones.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removePhone(personIdx, phoneIdx)}
                                    className="px-2 text-red-500 hover:text-red-700"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                          {errors[`contact_person_${personIdx}_phone`] && (
                            <p className="mt-1 text-xs text-red-600">{errors[`contact_person_${personIdx}_phone`]}</p>
                          )}
                        </div>
                        
                        {/* Emails */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium">Email Addresses (optional)</label>
                            <button
                              type="button"
                              onClick={() => addEmail(personIdx)}
                              className="text-xs text-primary hover:text-primary/80"
                            >
                              + Add
                            </button>
                          </div>
                          <div className="space-y-2">
                            {(contactPerson.emails || []).map((email, emailIdx) => (
                              <div key={emailIdx} className="flex gap-2">
                                <input
                                  type="email"
                                  value={email}
                                  onChange={(e) => {
                                    if (
                                      isVerifiedEmailInput(email, { kyc: kycVerificationDetails }) ||
                                      isFieldLocked(`contact_person_${personIdx}_email_${emailIdx}`)
                                    ) {
                                      return;
                                    }
                                    updateEmail(personIdx, emailIdx, e.target.value);
                                  }}
                                  readOnly={
                                    isFieldLocked(`contact_person_${personIdx}_email_${emailIdx}`) ||
                                    isVerifiedEmailInput(email, { kyc: kycVerificationDetails })
                                  }
                                  className={`flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary ${lockedClass(`contact_person_${personIdx}_email_${emailIdx}`)} ${
                                    isVerifiedEmailInput(email, { kyc: kycVerificationDetails })
                                      ? VERIFIED_EMAIL_INPUT_CLASS
                                      : ''
                                  }`}
                                  placeholder="Email address"
                                />
                                <EmailVerifyButton
                                  email={email}
                                  persist={salesPartyPersistContext}
                                  verifiedFromSnapshot={isEmailVerifiedInKyc(kycVerificationDetails, email)}
                                  onError={(message) => {
                                    const errorKey = `contact_person_${personIdx}_email_${emailIdx}`;
                                    setErrors((prev) => ({ ...prev, [errorKey]: message }));
                                  }}
                                  onVerified={() => {
                                    const errorKey = `contact_person_${personIdx}_email_${emailIdx}`;
                                    setErrors((prev) => {
                                      const next = { ...prev };
                                      delete next[errorKey];
                                      return next;
                                    });
                                    setApiLockedFields((prev) =>
                                      mergeFieldLocks(prev, new Set([errorKey])),
                                    );
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
                                <button
                                  type="button"
                                  onClick={() => removeEmail(personIdx, emailIdx)}
                                  className="px-2 text-red-500 hover:text-red-700"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                          {contactPerson.emails?.map((email, emailIdx) => {
                            const error = errors[`contact_person_${personIdx}_email_${emailIdx}`];
                            if (!shouldShowEmailFieldError(email, error, kycVerificationDetails)) return null;
                            return (
                              <p key={emailIdx} className="mt-1 text-xs text-red-600">
                                {error}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button type="button" onClick={() => setStep(2)} className="btn-primary w-full">
                    Next: Address
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Street *</label>
                    <input
                      type="text"
                      value={formData.address.street}
                      onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                      className={`w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary read-only:cursor-not-allowed ${lockedClass('address.street')}`}
                      readOnly={isFieldLocked('address.street')}
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
                        className={`w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary read-only:cursor-not-allowed ${lockedClass('address.city')}`}
                        readOnly={isFieldLocked('address.city')}
                      />
                      {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1.5 block">State *</label>
                      <input
                        type="text"
                        value={formData.address.state}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                        className={`w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary read-only:cursor-not-allowed ${lockedClass('address.state')}`}
                        readOnly={isFieldLocked('address.state')}
                      />
                      {errors.state && <p className="mt-1 text-xs text-red-600">{errors.state}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Pincode *</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.address.pincode}
                          onChange={(e) => {
                            // Only allow digits and limit to 6 digits
                            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                            setFormData({ ...formData, address: { ...formData.address, pincode: value } });
                            // Auto-lookup when 6 digits are entered
                            if (value.length === 6) {
                              handlePincodeLookup(value);
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value.trim();
                            if (value.length === 6) {
                              handlePincodeLookup(value);
                            }
                          }}
                          className={`w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary read-only:cursor-not-allowed ${lockedClass('address.pincode')}`}
                          placeholder="6 digits"
                          maxLength={6}
                          readOnly={isFieldLocked('address.pincode')}
                        />
                        {pincodeLoading && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <LoadingSpinner size="sm" />
                          </div>
                        )}
                      </div>
                      {errors.pincode && <p className="mt-1 text-xs text-red-600">{errors.pincode}</p>}
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Country</label>
                      <input
                        type="text"
                        value={formData.address.country}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, country: e.target.value } })}
                        className={`w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary read-only:cursor-not-allowed ${lockedClass('address.country')}`}
                        readOnly={isFieldLocked('address.country')}
                      />
                    </div>
                  </div>

                  {/* Google Maps Location Link */}
                  <div>
                    <GoogleMapsLinkFieldLabel />
                    <input
                      type="text"
                      value={formData.google_location_link || ''}
                      onChange={(e) => {
                        const value = e.target.value.trim() || null;
                        setFormData({ ...formData, google_location_link: value });
                        if (errors.google_location_link) setErrors({ ...errors, google_location_link: '' });
                      }}
                      onBlur={() => {
                        const val = (formData.google_location_link || '').trim();
                        if (val) {
                          if (!validateGoogleLocationLink(val)) {
                            setErrors({ ...errors, google_location_link: 'Invalid Google Maps link format' });
                          } else {
                            setErrors({ ...errors, google_location_link: '' });
                          }
                        } else {
                          setFormData({ ...formData, google_location_link: null });
                        }
                      }}
                      placeholder="Paste Google Maps link or Plus Code"
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      maxLength={500}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Paste a Google Maps share link or Plus Code. Link will be stored with the sales party.
                    </p>
                    {errors.google_location_link && <p className="mt-1 text-xs text-red-600">{errors.google_location_link}</p>}
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">
                      Back
                    </button>
                    <button type="button" onClick={() => setStep(3)} className="btn-primary flex-1">
                      Next: Bank Details
                    </button>
                  </div>
                </div>
              )}

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
                      {isEditMode && (
                        <span className="block mt-1.5 text-amber-800/90 dark:text-amber-200/90">
                          Update bank details below, then use the verify button on IFSC to re-check before saving.
                        </span>
                      )}
                    </p>
                  )}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Account Holder Name</label>
                    <input
                      type="text"
                      value={formData.bank_details?.account_holder_name || ''}
                      onChange={(e) => {
                        if (isFieldLocked('account_holder_name')) return;
                        handleBankCredentialChange();
                        setFormData({
                          ...formData,
                          bank_details: {
                            ...formData.bank_details,
                            account_holder_name: e.target.value,
                          },
                        });
                      }}
                      readOnly={isFieldLocked('account_holder_name')}
                      className={`w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary read-only:cursor-not-allowed ${lockedClass('account_holder_name')}`}
                    />
                    {errors.account_holder_name && (
                      <p className="mt-1 text-xs text-red-600">{errors.account_holder_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Account Number</label>
                    <BankAccountInput
                      value={formData.bank_details?.account_number || ''}
                      onChange={(value) => {
                        if (isFieldLocked('account_number')) return;
                        handleBankCredentialChange();
                        setFormData({
                          ...formData,
                          bank_details: {
                            ...formData.bank_details,
                            account_number: value,
                          },
                        });
                      }}
                      readOnly={isFieldLocked('account_number')}
                      disabled={isFieldLocked('account_number')}
                      className={`w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary ${lockedClass('account_number')}`}
                    />
                    {errors.bank_account_number && (
                      <p className="mt-1 text-xs text-red-600">{errors.bank_account_number}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">IFSC Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.bank_details?.ifsc_code || ''}
                        onChange={(e) => {
                          if (isFieldLocked('ifsc_code')) return;
                          handleBankCredentialChange();
                          const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
                          setApiLockedFields((prev) => {
                            const next = new Set(prev);
                            next.delete('bank_name');
                            next.delete('branch');
                            return next;
                          });
                          setFormData({
                            ...formData,
                            bank_details: {
                              ...formData.bank_details,
                              ifsc_code: value,
                            },
                          });
                        }}
                        readOnly={isFieldLocked('ifsc_code')}
                        className={`flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary font-mono uppercase ${lockedClass('ifsc_code')}`}
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
                      readOnly={isFieldLocked('bank_name')}
                      className={`w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary read-only:cursor-not-allowed ${lockedClass('bank_name')}`}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Branch (auto-filled)</label>
                    <input
                      type="text"
                      value={formData.bank_details?.branch || ''}
                      readOnly={isFieldLocked('branch')}
                      className={`w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary read-only:cursor-not-allowed ${lockedClass('branch')}`}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1">
                      Back
                    </button>
                    {isEditMode && leadData ? (
                      <button type="button" onClick={() => setStep(4)} className="btn-primary flex-1">
                        Next: Lead Details
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="btn-primary flex-1 inline-flex items-center justify-center gap-2 disabled:opacity-70"
                      >
                        {loading && isEditMode && <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />}
                        {isEditMode ? 'Update Sales Party' : 'Create Sales Party'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {step === 4 && isEditMode && leadData && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Lead Details</h3>
                    <button
                      type="button"
                      onClick={() => navigate(`/crm/leads/${leadData.id}`)}
                      className="text-xs text-primary hover:text-primary/80 inline-flex items-center gap-1 transition-colors"
                    >
                      View Lead <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Company Name */}
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Company Name</label>
                      <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">
                        {leadData.company_name || '-'}
                      </div>
                    </div>

                    {/* GST Number */}
                    {leadData.business_details?.gst_number && (
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">GST Number</label>
                        <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">
                          {leadData.business_details.gst_number}
                        </div>
                      </div>
                    )}

                    {/* PAN Number */}
                    {leadData.business_details?.pan_number && (
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">PAN Number</label>
                        <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">
                          {leadData.business_details.pan_number}
                        </div>
                      </div>
                    )}

                    {/* Contact Persons */}
                    {leadData.contact_persons && leadData.contact_persons.length > 0 && (
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Contact Persons</label>
                        <div className="space-y-2">
                          {leadData.contact_persons.map((contact, index) => (
                            <div key={index} className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">
                              <div className="font-medium">{contact.name}</div>
                              {contact.phones && contact.phones.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Phones: {formatPhonesForDisplay(contact.phones.filter(p => p && p.trim())) || '-'}
                                </div>
                              )}
                              {contact.emails && contact.emails.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Emails: {contact.emails.filter(e => e && e.trim()).join(', ') || '-'}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Phone */}
                    {leadData.phone && (
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Phone</label>
                        <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">
                          {formatPhoneDisplay(leadData.phone)}
                        </div>
                      </div>
                    )}

                    {/* Email */}
                    {leadData.email && (
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Email</label>
                        <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">
                          {leadData.email}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setStep(3)} className="btn-secondary flex-1">
                      Back
                    </button>
                    <button 
                      type="button" 
                      onClick={handleSubmit}
                      disabled={loading}
                      className="btn-primary flex-1"
                    >
                      Update Sales Party
                    </button>
                  </div>
                </div>
              )}
            </form>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>

      <SalesPartyPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        formData={formData}
        onConfirm={handlePreviewConfirm}
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


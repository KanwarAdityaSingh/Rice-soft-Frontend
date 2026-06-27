import * as Dialog from '@radix-ui/react-dialog';
import React, { useState, useEffect } from 'react';
import { X, Plus, Search, ShieldCheck, Check, Shield } from 'lucide-react';
import { useTransporters } from '../../../hooks/useTransporters';
import { transportersAPI } from '../../../services/transporters.api';
import { kycAPI } from '../../../services/kyc.api';
import {
  validateAadhaar,
  validateIFSC,
  getGstValidationError,
  getPanValidationError,
  getGstPanMismatchError,
  GST_EXAMPLE,
  PAN_EXAMPLE,
  GST_MAX_LENGTH,
  PAN_MAX_LENGTH,
} from '../../../utils/validation';
import { CustomSelect } from '../../shared/CustomSelect';
import { AlertDialog } from '../../shared/AlertDialog';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import type { ContactPerson, CreateTransporterRequest, UpdateTransporterRequest, EntityKycVerificationDetails, Transporter } from '../../../types/entities';
import {
  buildEntitySavePayload,
  persistAadhaarValidationSnapshot,
  transporterPersist,
  buildSurepassSnapshot,
  isEmailVerifiedInKyc,
  mergeEntityKycSnapshot,
  clearBankKycSnapshot,
  shouldVerifyBankFields,
  persistBankVerificationSnapshot,
} from '../../../utils/kycVerification';
import { verifyAutofilledEmails, isVerifiedEmailInput, VERIFIED_EMAIL_INPUT_CLASS } from '../../../utils/emailVerification';
import { EmailVerifyButton } from '../../shared/EmailVerifyButton';
import { PhoneInput } from '../../shared/PhoneInput';
import {
  applyAadhaarStateToAddress,
  buildAadhaarValidationAutofill,
  formatAadhaarValidationSummary,
} from '../../../utils/aadhaarValidationAutofill';
import {
  persistEnrichedPanLookupSnapshots,
  runEnrichedPanLookup,
} from '../../../utils/panLookupEnrichment';
import { persistEnrichedGstLookupSnapshots, runEnrichedGstLookup } from '../../../utils/gstLookupAutofill';
import {
  applyTransporterKycAutofill,
  buildTransporterGstAutofill,
  buildTransporterPanAutofill,
} from '../../../utils/transporterKycAutofill';
import {
  applyAadhaarOcrToFlatParty,
  applyGstOcrToFlatParty,
  applyPanOcrToFlatParty,
} from '../../../utils/documentOcrPrefill';
import { KycDocumentOcrSection } from '../../shared/KycDocumentOcrSection';
import {
  collectAadhaarAutofillLocks,
  collectLockedFieldsFromSavedKyc,
  collectTransporterAutofillLocks,
  collectBankFieldLocks,
  collectVerifiedEmailFieldLocksFromList,
  contactRowHasLockedField,
  isTransporterFieldLocked,
  mergeFieldLocks,
  TRANSPORTER_LOCKED_INPUT_CLASS,
} from '../../../utils/transporterAutofillLocks';
import {
  computeTransporterVerifiedFromKyc,
  formatTransporterVerifiedAt,
  getTransporterSaveAlert,
} from '../../../utils/transporterVerification';
import {
  hasTransporterBankInput,
} from '../../../utils/transporterBank';
import { canVerifyBankAccountLookup, getBankAccountHolderNameMismatchError, mapBankVerifyToBankDetails } from '../../../utils/bankVerification';
import { assertEntityNotDuplicateBeforeVerification } from '../../../utils/entityDuplicateCheck';
import { TransporterBankDetailsStep } from './TransporterBankDetailsStep';

function isContactPersonRowEmpty(cp: ContactPerson): boolean {
  const name = (cp.name || '').trim();
  const hasPhone = (cp.phones || []).some((p) => p?.trim());
  const hasEmail = (cp.emails || []).some((e) => e?.trim());
  return !name && !hasPhone && !hasEmail;
}

function isStep1ErrorKey(key: string): boolean {
  return (
    key === 'business_name' ||
    key === 'gst_number' ||
    key === 'pan_number' ||
    key === 'aadhar_number' ||
    key.startsWith('contact_person_')
  );
}

function summarizeValidationErrors(errors: Record<string, string>): string {
  const messages = Object.values(errors).filter(Boolean);
  if (messages.length === 0) return 'Please fix the highlighted fields.';
  if (messages.length === 1) return messages[0];
  return `${messages.slice(0, 3).join(' · ')}${messages.length > 3 ? ` (+${messages.length - 3} more)` : ''}`;
}

function isStep2ErrorKey(key: string): boolean {
  return key.startsWith('address.');
}

interface TransporterFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transporterId?: string | null;
  initialStep?: 1 | 2 | 3;
}

export function TransporterFormModal({
  open,
  onOpenChange,
  transporterId,
  initialStep = 1,
}: TransporterFormModalProps) {
  const { createTransporter, updateTransporter } = useTransporters();
  const isEditMode = !!transporterId;
  
  const [formData, setFormData] = useState<CreateTransporterRequest>({
    business_name: '',
    contact_persons: [{ name: '', phones: [''], emails: [''] }],
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    },
    transport_type: 'registered',
    gst_number: null,
    pan_number: null,
    aadhar_number: null,
    bank_details: {},
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingTransporter, setLoadingTransporter] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [apiLockedFields, setApiLockedFields] = useState<Set<string>>(new Set());
  const [originalGstNumber, setOriginalGstNumber] = useState<string>('');
  const [originalPanNumber, setOriginalPanNumber] = useState<string>('');
  const [originalAadharNumber, setOriginalAadharNumber] = useState<string>('');
  const [originalBankAccount, setOriginalBankAccount] = useState<string>('');
  const [originalBankIfsc, setOriginalBankIfsc] = useState<string>('');
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [kycVerificationDetails, setKycVerificationDetails] = useState<EntityKycVerificationDetails>({});
  const [panLookupNotice, setPanLookupNotice] = useState<string | null>(null);
  const [aadhaarValidated, setAadhaarValidated] = useState(false);
  const [aadhaarValidationSummary, setAadhaarValidationSummary] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [ifscLoading, setIfscLoading] = useState(false);
  const [bankVerifiedInSession, setBankVerifiedInSession] = useState(false);
  const [bankDetailsVerifiedAt, setBankDetailsVerifiedAt] = useState<string | null>(null);
  const [bankVerificationError, setBankVerificationError] = useState<string | null>(null);
  const transporterPersistContext = transporterPersist(transporterId);
  const isFieldLocked = (key: string) => isTransporterFieldLocked(apiLockedFields, key);
  const lockedClass = (key: string) => (isFieldLocked(key) ? TRANSPORTER_LOCKED_INPUT_CLASS : '');

  const isIdentityVerified = (
    transportType: 'registered' | 'unregistered' = formData.transport_type,
  ) =>
    isVerified || computeTransporterVerifiedFromKyc(transportType, kycVerificationDetails);

  const syncVerifiedFromKyc = (
    transportType: 'registered' | 'unregistered',
    kyc: EntityKycVerificationDetails,
    serverVerified?: { is_verified: boolean; verified_at: string | null },
  ) => {
    if (serverVerified) {
      setIsVerified(serverVerified.is_verified);
      setVerifiedAt(serverVerified.verified_at);
      return;
    }
    const computed = computeTransporterVerifiedFromKyc(transportType, kyc);
    setIsVerified(computed);
    setVerifiedAt(computed ? new Date().toISOString() : null);
  };

  const refreshVerifiedFromServer = async () => {
    if (!transporterId) return;
    try {
      const transporter = await transportersAPI.getTransporterById(transporterId);
      setIsVerified(transporter.is_verified);
      setVerifiedAt(transporter.verified_at);
      if (transporter.kyc_verification_details) {
        setKycVerificationDetails(transporter.kyc_verification_details);
      }
    } catch {
      // Non-blocking — local KYC state still reflects the lookup
    }
  };

  useEffect(() => {
    if (open && transporterId && isEditMode) {
      loadTransporterData();
    } else if (open && !transporterId) {
      resetForm();
      setStep(initialStep);
    }
  }, [open, transporterId]);

  useEffect(() => {
    if (open && isEditMode && !loadingTransporter) {
      setStep(initialStep);
    }
  }, [open, initialStep, isEditMode, loadingTransporter]);

  const loadTransporterData = async () => {
    if (!transporterId) return;
    setLoadingTransporter(true);
    try {
      const transporter = await transportersAPI.getTransporterById(transporterId);
      const gstNumber = transporter.gst_number || '';
      const panNumber = transporter.pan_number || '';
      
      // Store original values to check if they should be disabled
      setOriginalGstNumber(gstNumber);
      setOriginalPanNumber(panNumber);
      setOriginalAadharNumber(transporter.aadhar_number || '');
      setOriginalBankAccount(transporter.bank_details?.account_number?.replace(/\s/g, '') || '');
      setOriginalBankIfsc(transporter.bank_details?.ifsc_code?.trim().toUpperCase() || '');
      
      setFormData({
        business_name: transporter.business_name,
        contact_persons: transporter.contact_persons && transporter.contact_persons.length > 0
          ? transporter.contact_persons.map(cp => ({
              name: cp.name || '',
              phones: cp.phones?.length > 0 ? cp.phones : [''],
              emails: (cp.emails?.length ?? 0) > 0 ? cp.emails : [''],
            }))
          : [{ name: '', phones: [''], emails: [''] }],
        address: transporter.address,
        transport_type: transporter.transport_type || 'registered',
        gst_number: transporter.gst_number || null,
        pan_number: transporter.pan_number || null,
        aadhar_number: transporter.aadhar_number || null,
        bank_details: transporter.bank_details || {},
        is_active: transporter.is_active,
      });
      const loadedForm = {
        business_name: transporter.business_name,
        gst_number: transporter.gst_number || null,
        pan_number: transporter.pan_number || null,
        aadhar_number: transporter.aadhar_number || null,
        address: transporter.address,
        contact_persons: transporter.contact_persons ?? [],
      };
      setKycVerificationDetails(transporter.kyc_verification_details ?? {});
      setIsVerified(transporter.is_verified);
      setVerifiedAt(transporter.verified_at);
      const savedKyc = transporter.kyc_verification_details ?? {};
      setBankDetailsVerifiedAt(transporter.bank_details_verified_at ?? null);
      setBankVerificationError(transporter.bank_verification_error ?? null);
      setBankVerifiedInSession(Boolean(transporter.bank_details_verified_at));
      setApiLockedFields(
        mergeFieldLocks(
          collectLockedFieldsFromSavedKyc(savedKyc, loadedForm),
          collectBankFieldLocks(transporter.bank_details, savedKyc, {
            bankDetailsVerifiedAt: transporter.bank_details_verified_at,
          }),
        ),
      );
      setErrors({});
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to load transporter data');
      setAlertOpen(true);
    } finally {
      setLoadingTransporter(false);
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
      transport_type: 'registered',
      gst_number: null,
      pan_number: null,
      aadhar_number: null,
      bank_details: {},
      is_active: true,
    });
    setErrors({});
    setApiLockedFields(new Set());
    setOriginalGstNumber('');
    setOriginalPanNumber('');
    setOriginalAadharNumber('');
    setOriginalBankAccount('');
    setOriginalBankIfsc('');
    setStep(1);
    setKycVerificationDetails({});
    setPanLookupNotice(null);
    setAadhaarValidated(false);
    setAadhaarValidationSummary(null);
    setIsVerified(false);
    setVerifiedAt(null);
    setBankVerifiedInSession(false);
    setBankDetailsVerifiedAt(null);
    setBankVerificationError(null);
  };

  const duplicateCheckOptions = () => ({
    excludeId: transporterId,
    unchangedFrom: {
      gst_number: originalGstNumber,
      pan_number: originalPanNumber,
      aadhar_number: originalAadharNumber,
      account_number: originalBankAccount,
      ifsc_code: originalBankIfsc,
    },
  });

  const handleGSTLookup = async () => {
    if (!formData.gst_number) {
      setErrors({ ...errors, gst_number: 'Please enter a GST number' });
      return;
    }
    
    const gstError = getGstValidationError(formData.gst_number);
    if (gstError) {
      setErrors({ ...errors, gst_number: gstError });
      return;
    }

    setLookupLoading(true);
    setErrors({ ...errors, gst_number: '' });
    setPanLookupNotice(null);
    
    try {
      await assertEntityNotDuplicateBeforeVerification(
        'transporter',
        { gst_number: formData.gst_number ?? undefined },
        'gst',
        duplicateCheckOptions(),
      );
      const result = await runEnrichedGstLookup(formData.gst_number, transporterPersistContext);
      const autofill = buildTransporterGstAutofill(result);
      let updatedForm = {
        ...formData,
        ...applyTransporterKycAutofill(formData, autofill),
      };
      const autofillLocks = collectTransporterAutofillLocks(autofill, updatedForm.contact_persons ?? []);
      if (autofill.fillBusinessName && autofill.businessName) {
        updatedForm = {
          ...updatedForm,
          bank_details: {
            ...formData.bank_details,
            account_holder_name: autofill.businessName,
          },
        };
        autofillLocks.add('bank_details.account_holder_name');
      }

      let nextKycDetails = persistEnrichedGstLookupSnapshots(kycVerificationDetails, result);
      const emailVerification = await verifyAutofilledEmails(
        autofill.emails,
        updatedForm.contact_persons ?? [],
        nextKycDetails,
        transporterPersistContext,
      );
      nextKycDetails = emailVerification.kycDetails;
      const verifiedEmailLocks = collectVerifiedEmailFieldLocksFromList(
        updatedForm.contact_persons ?? [],
        emailVerification.verifiedEmails,
      );

      setFormData(updatedForm);

      setApiLockedFields((prev) =>
        mergeFieldLocks(prev, mergeFieldLocks(autofillLocks, verifiedEmailLocks)),
      );
      setKycVerificationDetails(nextKycDetails);
      setErrors({ ...errors, gst_number: '', ...emailVerification.fieldErrors });
      if (transporterId) {
        await refreshVerifiedFromServer();
      } else {
        syncVerifiedFromKyc(updatedForm.transport_type, nextKycDetails);
      }
    } catch (error: any) {
      console.error('GST lookup error:', error);
      setErrors({ ...errors, gst_number: error?.message || 'Failed to lookup GST details' });
    } finally {
      setLookupLoading(false);
    }
  };

  const handlePANLookup = async () => {
    if (!formData.pan_number) {
      setErrors({ ...errors, pan_number: 'Please enter a PAN number' });
      return;
    }
    
    const panError = getPanValidationError(formData.pan_number);
    if (panError) {
      setErrors({ ...errors, pan_number: panError });
      return;
    }

    setLookupLoading(true);
    setErrors({ ...errors, pan_number: '' });
    setPanLookupNotice(null);
    
    try {
      await assertEntityNotDuplicateBeforeVerification(
        'transporter',
        { pan_number: formData.pan_number ?? undefined },
        'pan',
        duplicateCheckOptions(),
      );
      const result = await runEnrichedPanLookup(formData.pan_number, transporterPersistContext);
      const autofill = buildTransporterPanAutofill(result);
      const updatedForm = {
        ...formData,
        ...applyTransporterKycAutofill(formData, autofill),
      };
      const autofillLocks = collectTransporterAutofillLocks(autofill, updatedForm.contact_persons ?? []);

      let nextKycDetails = persistEnrichedPanLookupSnapshots(kycVerificationDetails, result);
      const emailVerification = await verifyAutofilledEmails(
        autofill.emails,
        updatedForm.contact_persons ?? [],
        nextKycDetails,
        transporterPersistContext,
      );
      nextKycDetails = emailVerification.kycDetails;
      const verifiedEmailLocks = collectVerifiedEmailFieldLocksFromList(
        updatedForm.contact_persons ?? [],
        emailVerification.verifiedEmails,
      );

      setFormData(updatedForm);

      setApiLockedFields((prev) =>
        mergeFieldLocks(prev, mergeFieldLocks(autofillLocks, verifiedEmailLocks)),
      );
      setKycVerificationDetails(nextKycDetails);
      setPanLookupNotice(autofill.lookupMessage ?? null);

      if (autofill.gstFound) {
        setAlertType('success');
        setAlertTitle('PAN lookup complete');
        setAlertMessage(autofill.lookupMessage ?? 'GST details found and filled.');
        setAlertOpen(true);
      } else {
        setAlertType('info');
        setAlertTitle('PAN lookup complete');
        setAlertMessage(
          autofill.lookupMessage ??
            'No GSTIN found for this PAN. PAN and contact details were filled.',
        );
        setAlertOpen(true);
      }

      setErrors({ ...errors, pan_number: '', ...emailVerification.fieldErrors });
      if (transporterId) {
        await refreshVerifiedFromServer();
      } else {
        syncVerifiedFromKyc(updatedForm.transport_type, nextKycDetails);
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
        'transporter',
        { aadhar_number: formData.aadhar_number ?? undefined },
        'aadhaar',
        duplicateCheckOptions(),
      );
      const response = await transportersAPI.lookupAadhaar(
        formData.aadhar_number,
        transporterPersistContext,
      );
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
      setAlertType('success');
      setAlertTitle('Aadhaar validated');
      setAlertMessage(summary);
      setAlertOpen(true);
      setErrors({ ...errors, aadhar_number: '' });
      if (transporterId) {
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

  const renderPanNumberField = () => (
    <div>
      <label className="block text-sm font-medium mb-1">PAN Number</label>
      {isFieldLocked('pan_number') ? (
        <div className={`w-full rounded-lg border border-border px-3 py-2 text-sm ${TRANSPORTER_LOCKED_INPUT_CLASS}`}>
          {formData.pan_number || originalPanNumber}
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={formData.pan_number || ''}
            onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() || null })}
            className="flex-1 px-3 py-2 border border-border rounded-lg bg-background"
            placeholder={PAN_EXAMPLE}
            maxLength={PAN_MAX_LENGTH}
          />
          <button
            type="button"
            onClick={handlePANLookup}
            disabled={lookupLoading}
            className="btn-secondary flex items-center gap-2 px-3"
            title="Lookup PAN details"
          >
            {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
          </button>
        </div>
      )}
      {errors.pan_number && (
        <p className="text-xs text-red-500 mt-1">{errors.pan_number}</p>
      )}
      {panLookupNotice && (
        <p className="text-xs text-amber-600 mt-1">{panLookupNotice}</p>
      )}
    </div>
  );

  const buildFormErrors = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!formData.business_name.trim()) {
      newErrors.business_name = 'Business name is required';
    }

    if (formData.transport_type === 'registered') {
      if (!formData.gst_number) {
        newErrors.gst_number = 'GST number is required for registered transporters';
      } else {
        const gstError = getGstValidationError(formData.gst_number);
        if (gstError) newErrors.gst_number = gstError;
      }

      if (formData.pan_number) {
        const panError = getPanValidationError(formData.pan_number);
        if (panError) newErrors.pan_number = panError;
      }

      if (formData.gst_number && formData.pan_number) {
        const mismatchError = getGstPanMismatchError(formData.gst_number, formData.pan_number);
        if (mismatchError) newErrors.pan_number = mismatchError;
      }
    } else {
      const hasPan = Boolean(formData.pan_number?.trim());
      const hasAadhaar = Boolean(formData.aadhar_number?.trim());
      if (!hasPan && !hasAadhaar) {
        const msg = 'Either PAN or Aadhaar is required for unregistered transporters';
        newErrors.pan_number = msg;
        newErrors.aadhar_number = msg;
      }
      if (hasPan) {
        const panError = getPanValidationError(formData.pan_number!);
        if (panError) newErrors.pan_number = panError;
      }
      if (hasAadhaar && !validateAadhaar(formData.aadhar_number!)) {
        newErrors.aadhar_number = 'Invalid Aadhaar format (12 digits, cannot start with 0 or 1)';
      }
    }

    (formData.contact_persons || []).forEach((cp, idx) => {
      if (isContactPersonRowEmpty(cp)) return;
      if (!cp.name || cp.name.trim().length < 2) {
        newErrors[`contact_person_${idx}_name`] = 'Name required (min 2 chars)';
      }
      if (!cp.phones || cp.phones.length === 0 || !cp.phones.some((p) => p?.trim())) {
        newErrors[`contact_person_${idx}_phone`] = 'At least one phone required';
      }
      cp.emails?.forEach((email, emailIdx) => {
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          newErrors[`contact_person_${idx}_email_${emailIdx}`] = 'Valid email required';
        }
      });
    });

    if (!formData.address.street.trim()) {
      newErrors['address.street'] = 'Street is required';
    }
    if (!formData.address.city.trim()) {
      newErrors['address.city'] = 'City is required';
    }
    if (!formData.address.state.trim()) {
      newErrors['address.state'] = 'State is required';
    }
    if (!formData.address.pincode.trim()) {
      newErrors['address.pincode'] = 'Pincode is required';
    }
    if (!formData.address.country.trim()) {
      newErrors['address.country'] = 'Country is required';
    }

    const bd = formData.bank_details;
    if (bd?.ifsc_code?.trim() && !validateIFSC(bd.ifsc_code)) {
      newErrors.bank_ifsc_code = 'Invalid IFSC format';
    }
    if (hasTransporterBankInput(bd) && !shouldVerifyBankFields(bd)) {
      if (!bd?.account_holder_name?.trim()) {
        newErrors.bank_account_holder_name = 'Account holder name is required';
      }
      if (!bd?.account_number?.trim()) {
        newErrors.bank_account_number = 'Account number is required';
      }
      if (!bd?.ifsc_code?.trim() || bd.ifsc_code.length !== 11) {
        newErrors.bank_ifsc_code = newErrors.bank_ifsc_code ?? 'Valid IFSC is required';
      }
    }

    return newErrors;
  };

  const applyBankFieldLocks = (
    bankDetails: CreateTransporterRequest['bank_details'],
    kyc: EntityKycVerificationDetails,
    verifiedAt?: string | null,
  ) => {
    setApiLockedFields((prev) =>
      mergeFieldLocks(
        prev,
        collectBankFieldLocks(bankDetails, kyc, { bankDetailsVerifiedAt: verifiedAt ?? bankDetailsVerifiedAt }),
      ),
    );
  };

  const handleBankCredentialChange = () => {
    setBankVerificationError(null);
    const serverBankVerified = Boolean(bankDetailsVerifiedAt);
    if (serverBankVerified || bankVerifiedInSession) {
      setBankVerifiedInSession(false);
      setBankDetailsVerifiedAt(null);
      setApiLockedFields((prev) => {
        const next = new Set(prev);
        next.delete('bank_details.account_holder_name');
        next.delete('bank_details.account_number');
        next.delete('bank_details.ifsc_code');
        next.delete('bank_details.bank_name');
        next.delete('bank_details.branch');
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
        bank_ifsc_code: !ifscCode || ifscCode.length !== 11 || !validateIFSC(ifscCode)
          ? 'Valid IFSC is required for bank verify'
          : prev.bank_ifsc_code ?? '',
      }));
      return;
    }
    if (isFieldLocked('bank_details.ifsc_code')) return;

    setIfscLoading(true);
    setErrors((prev) => ({ ...prev, bank_ifsc_code: '', bank_account_number: '', bank_account_holder_name: '' }));

    try {
      await assertEntityNotDuplicateBeforeVerification(
        'transporter',
        { account_number: accountNumber, ifsc_code: ifscCode },
        'bank',
        duplicateCheckOptions(),
      );
      const result = await kycAPI.verifyBank(accountNumber!, ifscCode!, transporterPersistContext);
      const nextBankDetails = mapBankVerifyToBankDetails(result, formData.bank_details);
      setFormData((prev) => ({ ...prev, bank_details: nextBankDetails }));
      setApiLockedFields((prev) =>
        mergeFieldLocks(prev, collectBankFieldLocks(nextBankDetails, kycVerificationDetails, { ifscLookupOnly: true })),
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
          bank_account_holder_name: holderMismatch,
        }));
        return;
      }
      setBankVerifiedInSession(true);
      setBankVerificationError(null);
    } catch (error: unknown) {
      setApiLockedFields((prev) => {
        const next = new Set(prev);
        next.delete('bank_details.bank_name');
        next.delete('bank_details.branch');
        return next;
      });
      setErrors((prev) => ({
        ...prev,
        bank_ifsc_code: error instanceof Error ? error.message : 'Bank verification failed',
      }));
    } finally {
      setIfscLoading(false);
    }
  };

  const buildStep1Errors = (): Record<string, string> => {
    const all = buildFormErrors();
    return Object.fromEntries(Object.entries(all).filter(([key]) => isStep1ErrorKey(key)));
  };

  const buildStep2Errors = (): Record<string, string> => {
    const all = buildFormErrors();
    return Object.fromEntries(Object.entries(all).filter(([key]) => isStep2ErrorKey(key)));
  };

  const handleNextStep = () => {
    const step1Errors = buildStep1Errors();
    setErrors(step1Errors);
    if (Object.keys(step1Errors).length > 0) {
      setAlertType('warning');
      setAlertTitle('Complete required fields');
      setAlertMessage(summarizeValidationErrors(step1Errors));
      setAlertOpen(true);
      return;
    }
    setErrors({});
    setStep(2);
  };

  const handleNextToBank = () => {
    const step2Errors = buildStep2Errors();
    setErrors(step2Errors);
    if (Object.keys(step2Errors).length > 0) {
      setAlertType('warning');
      setAlertTitle('Complete required fields');
      setAlertMessage(summarizeValidationErrors(step2Errors));
      setAlertOpen(true);
      return;
    }
    setErrors({});
    setStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formErrors = buildFormErrors();
    setErrors(formErrors);

    if (Object.keys(formErrors).length > 0) {
      const step1Errors = buildStep1Errors();
      const step2Errors = buildStep2Errors();
      if (Object.keys(step1Errors).length > 0) {
        setStep(1);
      } else if (Object.keys(step2Errors).length > 0) {
        setStep(2);
      } else {
        setStep(3);
      }
      setAlertType('warning');
      setAlertTitle('Cannot save transporter');
      setAlertMessage(
        Object.keys(step1Errors).length > 0
          ? `Fix the highlighted fields on the details step. ${summarizeValidationErrors(formErrors)}`
          : summarizeValidationErrors(formErrors),
      );
      setAlertOpen(true);
      return;
    }

    setLoading(true);
    try {
      // Remove vehicle_ids from payload - relationship is managed from vehicle side
      const { vehicle_ids, ...rest } = formData;
      const submitData = buildEntitySavePayload(
        {
          ...rest,
          contact_persons: (formData.contact_persons || []).filter((cp) => !isContactPersonRowEmpty(cp)),
        },
        {
          kycVerificationDetails,
          bankDetailsVerifiedAt,
          identityVerified: isIdentityVerified(),
        },
      );

      const applySavedTransporter = (saved: Transporter) => {
        setIsVerified(saved.is_verified);
        setVerifiedAt(saved.verified_at);
        setBankDetailsVerifiedAt(saved.bank_details_verified_at ?? null);
        setBankVerificationError(saved.bank_verification_error ?? null);
        const nextKyc = saved.kyc_verification_details ?? kycVerificationDetails;
        if (saved.kyc_verification_details) {
          setKycVerificationDetails(saved.kyc_verification_details);
        }
        setBankVerifiedInSession(Boolean(saved.bank_details_verified_at));
        applyBankFieldLocks(saved.bank_details, nextKyc, saved.bank_details_verified_at);
      };

      if (isEditMode && transporterId) {
        const {
          transporter,
          message,
          verification_error,
          verification_message,
          bank_verification_flagged,
        } = await updateTransporter(transporterId, submitData as UpdateTransporterRequest);
        applySavedTransporter(transporter);
        const alert = getTransporterSaveAlert(true, message, verification_error, verification_message, {
          bankVerificationFlagged: bank_verification_flagged,
          transporterBankVerificationError: transporter.bank_verification_error,
        });
        setAlertType(alert.alertType);
        setAlertTitle(alert.alertTitle);
        setAlertMessage(alert.alertMessage);
      } else {
        const {
          transporter,
          message,
          verification_error,
          verification_message,
          bank_verification_flagged,
        } = await createTransporter(submitData);
        applySavedTransporter(transporter);
        const alert = getTransporterSaveAlert(false, message, verification_error, verification_message, {
          bankVerificationFlagged: bank_verification_flagged,
          transporterBankVerificationError: transporter.bank_verification_error,
        });
        setAlertType(alert.alertType);
        setAlertTitle(alert.alertTitle);
        setAlertMessage(alert.alertMessage);
      }
      setAlertOpen(true);
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 1500);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to save transporter');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };


  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-[90vw] md:w-full max-w-3xl translate-x-[-50%] translate-y-[-50%]">
            <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 min-w-0">
                  <Dialog.Title className="text-xl sm:text-2xl font-semibold">
                    {isEditMode ? 'Edit Transporter' : 'Create Transporter'}
                  </Dialog.Title>
                  {isVerified && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 shrink-0"
                      title={verifiedAt ? `Verified ${formatTransporterVerifiedAt(verifiedAt)}` : 'Verified'}
                    >
                      <Shield className="h-3.5 w-3.5" />
                      Verified
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {loadingTransporter ? (
                <div className="flex justify-center py-10">
                  <LoadingSpinner />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Step 1: Basic Info & Contact Persons */}
                  {step === 1 && (
                    <>
                      {/* Transport Type Selector */}
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Transport Type <span className="text-red-500">*</span>
                        </label>
                        <CustomSelect
                          value={formData.transport_type}
                          onChange={(value) => setFormData({ 
                            ...formData, 
                            transport_type: value as 'registered' | 'unregistered'
                          })}
                          options={[
                            { value: 'registered', label: 'Registered' },
                            { value: 'unregistered', label: 'Unregistered' }
                          ]}
                          placeholder="Select Transport Type"
                        />
                      </div>

                      {/* Note about requirements */}
                      <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 space-y-1">
                        <p className="text-sm text-primary/90">
                          <span className="font-medium">Note:</span> {formData.transport_type === 'registered' 
                            ? 'For registered transporters, GST number is mandatory. Verified when GST or PAN Surepass lookup succeeds.' 
                            : 'For unregistered transporters, either PAN or Aadhaar is required. Verified when Surepass lookup succeeds.'}
                        </p>
                        {!isVerified && isEditMode && transporterPersistContext && (
                          <p className="text-xs text-amber-700 dark:text-amber-400">
                            Unverified — run GST/PAN or Aadhaar lookup to verify via Surepass.
                          </p>
                        )}
                        {isVerified && verifiedAt && (
                          <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <Check className="h-3 w-3 shrink-0" />
                            Verified {formatTransporterVerifiedAt(verifiedAt)}
                          </p>
                        )}
                      </div>

                      {!isVerified && (
                        <KycDocumentOcrSection
                          docs={
                            formData.transport_type === 'registered'
                              ? ['gst', 'pan']
                              : ['pan', 'aadhaar']
                          }
                          disabled={lookupLoading || loading}
                          onGstResult={(result) => {
                            setFormData((prev) => ({
                              ...prev,
                              ...applyGstOcrToFlatParty(
                                {
                                  business_name: prev.business_name,
                                  gst_number: prev.gst_number,
                                  pan_number: prev.pan_number,
                                  aadhar_number: prev.aadhar_number,
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
                              ...applyPanOcrToFlatParty(
                                {
                                  business_name: prev.business_name,
                                  gst_number: prev.gst_number,
                                  pan_number: prev.pan_number,
                                  aadhar_number: prev.aadhar_number,
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
                              ...applyAadhaarOcrToFlatParty(
                                {
                                  business_name: prev.business_name,
                                  gst_number: prev.gst_number,
                                  pan_number: prev.pan_number,
                                  aadhar_number: prev.aadhar_number,
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

                      {/* Conditional fields based on transport type */}
                      {formData.transport_type === 'registered' ? (
                        <>
                          {/* GST Number in first row (full width) */}
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              GST Number <span className="text-red-500">*</span>
                            </label>
                            {isFieldLocked('gst_number') ? (
                              <div className={`w-full rounded-lg border border-border px-3 py-2 text-sm ${TRANSPORTER_LOCKED_INPUT_CLASS}`}>
                                {formData.gst_number || originalGstNumber}
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={formData.gst_number || ''}
                                  onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() || null })}
                                  className="flex-1 px-3 py-2 border border-border rounded-lg bg-background"
                                  placeholder={GST_EXAMPLE}
                                  maxLength={GST_MAX_LENGTH}
                                />
                                <button 
                                  type="button" 
                                  onClick={handleGSTLookup} 
                                  disabled={lookupLoading} 
                                  className="btn-secondary flex items-center gap-2 px-3"
                                >
                                  {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                                </button>
                              </div>
                            )}
                            {errors.gst_number && (
                              <p className="text-xs text-red-500 mt-1">{errors.gst_number}</p>
                            )}
                          </div>

                          {/* PAN Number below GST (full width) */}
                          {renderPanNumberField()}
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-muted-foreground -mt-1 mb-1">
                            Either PAN or Aadhaar is required.
                          </p>
                          {renderPanNumberField()}

                          {/* Aadhaar Number for unregistered (full width) */}
                          <div>
                            <label className="block text-sm font-medium mb-1">Aadhaar Number</label>
                            {isFieldLocked('aadhar_number') ? (
                              <div className={`w-full rounded-lg border border-border px-3 py-2 text-sm ${TRANSPORTER_LOCKED_INPUT_CLASS}`}>
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
                                  className="flex-1 px-3 py-2 border border-border rounded-lg bg-background"
                                  placeholder="234567890123"
                                  maxLength={14}
                                />
                                <button
                                  type="button"
                                  onClick={handleAadhaarLookup}
                                  disabled={lookupLoading}
                                  className="btn-secondary flex items-center gap-2 px-3"
                                  title="Validate Aadhaar"
                                >
                                  {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                                </button>
                              </div>
                            )}
                            {errors.aadhar_number && (
                              <p className="text-xs text-red-500 mt-1">{errors.aadhar_number}</p>
                            )}
                            {aadhaarValidated && !errors.aadhar_number && (
                              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3 shrink-0" />
                                {aadhaarValidationSummary ?? 'Aadhaar validated via Surepass'}
                              </p>
                            )}
                          </div>
                        </>
                      )}

                      {/* Business Name below GST/PAN/Aadhaar */}
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Business Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.business_name}
                            onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-lg bg-background ${
                              errors.business_name ? 'border-red-500' : 'border-border'
                            }`}
                            placeholder="ABC Transport Services"
                          />
                          {errors.business_name && (
                            <p className="text-xs text-red-500 mt-1">{errors.business_name}</p>
                          )}
                          {formData.transport_type === 'unregistered' && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Enter the business or trade name manually. Contact and address are filled from PAN lookup.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        {/* Contact Persons Section */}
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Contact Persons <span className="text-muted-foreground font-normal">(optional)</span>
                          </label>
                          <p className="text-xs text-muted-foreground mb-2">
                            If you add a contact, name and at least one phone are required for that person.
                          </p>
                          <div className="space-y-3">
                            {(formData.contact_persons || []).map((contact, index) => (
                              <div key={index} className="space-y-2 p-3 border border-border rounded-lg bg-background/60">
                                <div className="flex gap-2 items-start">
                                  <input
                                    type="text"
                                    placeholder="Name"
                                    value={contact.name}
                                    onChange={(e) => {
                                      const updated = [...(formData.contact_persons || [])];
                                      updated[index] = { ...updated[index], name: e.target.value };
                                      setFormData({ ...formData, contact_persons: updated });
                                    }}
                                    readOnly={isFieldLocked(`contact_person_${index}_name`)}
                                    className={`flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary ${lockedClass(`contact_person_${index}_name`)}`}
                                  />
                                  {(formData.contact_persons || []).length > 1 && !contactRowHasLockedField(apiLockedFields, index) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = (formData.contact_persons || []).filter((_, i) => i !== index);
                                        setFormData({ ...formData, contact_persons: updated });
                                      }}
                                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                      title="Remove contact person"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                                {errors[`contact_person_${index}_name`] && (
                                  <p className="text-xs text-red-600">{errors[`contact_person_${index}_name`]}</p>
                                )}

                                {/* Phone Numbers */}
                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-muted-foreground">Phone Numbers</label>
                                  {(contact.phones || ['']).map((phone, phoneIndex) => (
                                    <div key={phoneIndex} className="flex gap-2">
                                      <PhoneInput
                                        value={phone}
                                        onChange={(value) => {
                                          const updated = [...(formData.contact_persons || [])];
                                          const updatedPhones = [...(updated[index].phones || [''])];
                                          updatedPhones[phoneIndex] = value;
                                          updated[index] = { ...updated[index], phones: updatedPhones };
                                          setFormData({ ...formData, contact_persons: updated });
                                        }}
                                        readOnly={isFieldLocked(`contact_person_${index}_phone_${phoneIndex}`)}
                                        className={`flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary ${lockedClass(`contact_person_${index}_phone_${phoneIndex}`)}`}
                                      />
                                      {(contact.phones || ['']).length > 1 && !isFieldLocked(`contact_person_${index}_phone_${phoneIndex}`) && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = [...(formData.contact_persons || [])];
                                            const updatedPhones = updated[index].phones?.filter((_, i) => i !== phoneIndex) || [];
                                            updated[index] = { ...updated[index], phones: updatedPhones.length > 0 ? updatedPhones : [''] };
                                            setFormData({ ...formData, contact_persons: updated });
                                          }}
                                          className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                          title="Remove phone"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  {errors[`contact_person_${index}_phone`] && (
                                    <p className="text-xs text-red-600">{errors[`contact_person_${index}_phone`]}</p>
                                  )}
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

                                {/* Email Addresses */}
                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-muted-foreground">Email Addresses</label>
                                  {(contact.emails || ['']).map((email, emailIndex) => (
                                    <div key={emailIndex}>
                                      <div className="flex gap-2">
                                        <input
                                          type="email"
                                          placeholder="Email"
                                          value={email}
                                          onChange={(e) => {
                                            if (
                                              isFieldLocked(`contact_person_${index}_email_${emailIndex}`) ||
                                              isVerifiedEmailInput(email, { kyc: kycVerificationDetails })
                                            ) {
                                              return;
                                            }
                                            const updated = [...(formData.contact_persons || [])];
                                            const updatedEmails = [...(updated[index].emails || [''])];
                                            updatedEmails[emailIndex] = e.target.value;
                                            updated[index] = { ...updated[index], emails: updatedEmails };
                                            setFormData({ ...formData, contact_persons: updated });
                                          }}
                                          readOnly={
                                            isFieldLocked(`contact_person_${index}_email_${emailIndex}`) ||
                                            isVerifiedEmailInput(email, { kyc: kycVerificationDetails })
                                          }
                                          className={`flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary ${lockedClass(`contact_person_${index}_email_${emailIndex}`)} ${
                                            isVerifiedEmailInput(email, { kyc: kycVerificationDetails })
                                              ? VERIFIED_EMAIL_INPUT_CLASS
                                              : ''
                                          }`}
                                        />
                                        {isFieldLocked(`contact_person_${index}_email_${emailIndex}`) ||
                                        isVerifiedEmailInput(email, { kyc: kycVerificationDetails }) ? (
                                          <span
                                            className="shrink-0 rounded-lg border border-border px-2 py-2 text-emerald-600"
                                            title="Email verified"
                                          >
                                            <Check className="h-4 w-4" />
                                          </span>
                                        ) : (
                                          <EmailVerifyButton
                                          email={email}
                                          persist={transporterPersistContext}
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
                                            setApiLockedFields((prev) =>
                                              mergeFieldLocks(
                                                prev,
                                                new Set([`contact_person_${index}_email_${emailIndex}`]),
                                              ),
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
                                            setApiLockedFields((prev) =>
                                              mergeFieldLocks(
                                                prev,
                                                new Set([`contact_person_${index}_email_${emailIndex}`]),
                                              ),
                                            );
                                          }}
                                        />
                                        )}
                                        {(contact.emails || ['']).length > 1 && !isFieldLocked(`contact_person_${index}_email_${emailIndex}`) && (
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
                                      {errors[`contact_person_${index}_email_${emailIndex}`] && (
                                        <p className="text-xs text-red-600 mt-0.5">{errors[`contact_person_${index}_email_${emailIndex}`]}</p>
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
                      </div>

                      {/* Next Button for Step 1 */}
                      <div className="flex justify-end pt-4">
                        <button
                          type="button"
                          onClick={handleNextStep}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Next: Address
                        </button>
                      </div>
                    </>
                  )}

                  {/* Step 2: Address & Vehicles */}
                  {step === 2 && (
                    <>
                      {Object.keys(errors).some(isStep1ErrorKey) && (
                        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
                          Some details from step 1 still need fixing. Click Back to review contact or business fields.
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium mb-1">
                            Street <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.address.street}
                            onChange={(e) => setFormData({
                              ...formData,
                              address: { ...formData.address, street: e.target.value },
                            })}
                            readOnly={isFieldLocked('address.street')}
                            className={`w-full px-3 py-2 border rounded-lg bg-background ${
                              errors['address.street'] ? 'border-red-500' : 'border-border'
                            } ${lockedClass('address.street')}`}
                            placeholder="123 Main Street"
                          />
                          {errors['address.street'] && (
                            <p className="text-xs text-red-500 mt-1">{errors['address.street']}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">
                            City <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.address.city}
                            onChange={(e) => setFormData({
                              ...formData,
                              address: { ...formData.address, city: e.target.value },
                            })}
                            readOnly={isFieldLocked('address.city')}
                            className={`w-full px-3 py-2 border rounded-lg bg-background ${
                              errors['address.city'] ? 'border-red-500' : 'border-border'
                            } ${lockedClass('address.city')}`}
                            placeholder="Mumbai"
                          />
                          {errors['address.city'] && (
                            <p className="text-xs text-red-500 mt-1">{errors['address.city']}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">
                            State <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.address.state}
                            onChange={(e) => setFormData({
                              ...formData,
                              address: { ...formData.address, state: e.target.value },
                            })}
                            readOnly={isFieldLocked('address.state')}
                            className={`w-full px-3 py-2 border rounded-lg bg-background ${
                              errors['address.state'] ? 'border-red-500' : 'border-border'
                            } ${lockedClass('address.state')}`}
                            placeholder="Maharashtra"
                          />
                          {errors['address.state'] && (
                            <p className="text-xs text-red-500 mt-1">{errors['address.state']}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Pincode <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.address.pincode}
                            onChange={(e) => setFormData({
                              ...formData,
                              address: { ...formData.address, pincode: e.target.value },
                            })}
                            readOnly={isFieldLocked('address.pincode')}
                            className={`w-full px-3 py-2 border rounded-lg bg-background ${
                              errors['address.pincode'] ? 'border-red-500' : 'border-border'
                            } ${lockedClass('address.pincode')}`}
                            placeholder="400001"
                          />
                          {errors['address.pincode'] && (
                            <p className="text-xs text-red-500 mt-1">{errors['address.pincode']}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Country <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.address.country}
                            onChange={(e) => setFormData({
                              ...formData,
                              address: { ...formData.address, country: e.target.value },
                            })}
                            readOnly={isFieldLocked('address.country')}
                            className={`w-full px-3 py-2 border rounded-lg bg-background ${
                              errors['address.country'] ? 'border-red-500' : 'border-border'
                            } ${lockedClass('address.country')}`}
                            placeholder="India"
                          />
                          {errors['address.country'] && (
                            <p className="text-xs text-red-500 mt-1">{errors['address.country']}</p>
                          )}
                        </div>
                      </div>

                      {/* Back and Next for Step 2 */}
                      <div className="flex justify-between gap-3 pt-4">
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                        >
                          Back
                        </button>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleNextToBank}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                          >
                            Next: Bank Details
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Step 3: Bank Details */}
                  {step === 3 && (
                    <>
                      <TransporterBankDetailsStep
                        formData={formData}
                        setFormData={setFormData}
                        errors={errors}
                        setErrors={setErrors}
                        kycVerificationDetails={kycVerificationDetails}
                        bankDetailsVerifiedAt={bankDetailsVerifiedAt}
                        bankVerificationError={bankVerificationError}
                        isEditMode={isEditMode}
                        isFieldLocked={isFieldLocked}
                        lockedClass={lockedClass}
                        ifscLoading={ifscLoading}
                        onBankVerifySearch={handleBankVerifySearch}
                        onBankCredentialChange={handleBankCredentialChange}
                      />

                      <div className="flex justify-between gap-3 pt-4">
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                        >
                          Back
                        </button>
                        <div className="flex gap-3">
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
                      </div>
                    </>
                  )}
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

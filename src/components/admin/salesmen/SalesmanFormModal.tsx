import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { X, Search, Shield, History } from 'lucide-react';
import { useSalesmen } from '../../../hooks/useSalesmen';
import { salesmenAPI } from '../../../services/salesmen.api';
import { kycAPI } from '../../../services/kyc.api';
import {
  validateEmail,
  sanitizePhoneInput,
  validatePhone,
  validateAadhaar,
  getPanValidationError,
  PAN_EXAMPLE,
  PAN_MAX_LENGTH,
} from '../../../utils/validation';
import { sanitizeBankAccountInput } from '../../../utils/bankAccountFormatting';
import { EmailVerifyButton } from '../../shared/EmailVerifyButton';
import {
  isVerifiedEmailInput,
  normalizeVerifiedEmail,
  VERIFIED_EMAIL_INPUT_CLASS,
} from '../../../utils/emailVerification';
import { PhoneInput } from '../../shared/PhoneInput';
import { DateInputWithSteppers } from '../../shared/DateInputWithSteppers';
import { BankAccountInput } from '../../shared/BankAccountInput';
import { KycDocumentOcrSection } from '../../shared/KycDocumentOcrSection';
import { SalespersonPreviewDialog } from './SalespersonPreviewDialog';
import { AlertDialog } from '../../shared/AlertDialog';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import type {
  CreateSalesmanRequest,
  EntityKycVerificationDetails,
  Salesman,
  SalesmanAddress,
  SalesmanBankDetails,
  SalesmanSalaryHistoryEntry,
  UpdateSalesmanRequest,
} from '../../../types/entities';
import {
  buildEntitySavePayload,
  isEntityBankVerified,
  persistAadhaarValidationSnapshot,
  persistBankVerificationSnapshot,
  resolveEntityBankVerifiedAt,
  salesmanPersist,
  shouldVerifyBankFields,
} from '../../../utils/kycVerification';
import {
  applyAutofillAddress,
  buildPanLookupAutofill,
  persistEnrichedPanLookupSnapshots,
  runEnrichedPanLookup,
} from '../../../utils/panLookupEnrichment';
import {
  applyAadhaarStateToAddress,
  buildAadhaarValidationAutofill,
  formatAadhaarValidationSummary,
} from '../../../utils/aadhaarValidationAutofill';
import {
  applyAadhaarOcrToFlatParty,
  applyPanOcrToFlatParty,
} from '../../../utils/documentOcrPrefill';
import { assertEntityNotDuplicateBeforeVerification } from '../../../utils/entityDuplicateCheck';
import {
  canVerifyBankAccountLookup,
  getBankAccountHolderNameMismatchError,
  mapBankVerifyToBankDetails,
} from '../../../utils/bankVerification';
import { getSalesmanSaveAlert } from '../../../utils/salesmanSaveAlert';
import { getUserFacingApiErrorMessage } from '../../../utils/errorHandler';

interface SalesmanFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSalesman?: Salesman | null;
}

const EMPTY_ADDRESS: SalesmanAddress = {
  street: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
};

const EMPTY_BANK: SalesmanBankDetails = {
  account_holder_name: '',
  account_number: '',
  ifsc_code: '',
  bank_name: '',
  branch: '',
};

const INITIAL_FORM: CreateSalesmanRequest = {
  name: '',
  phone: '',
  alternate_phone: null,
  email: null,
  date_of_birth: null,
  date_of_joining: null,
  designation: null,
  aadhar_number: null,
  pan_number: null,
  address: { ...EMPTY_ADDRESS },
  bank_details: { ...EMPTY_BANK },
  salary_type: 'monthly',
  basic_salary: null,
  salary_effective_from: null,
  is_active: true,
};

function cleanSalesmanPayload(data: CreateSalesmanRequest): CreateSalesmanRequest {
  const address = data.address;
  const hasAddress = Boolean(
    address?.street?.trim() || address?.city?.trim() || address?.state?.trim(),
  );
  const bank = data.bank_details;
  const hasBank = Boolean(
    bank?.account_number?.trim() ||
      bank?.ifsc_code?.trim() ||
      bank?.account_holder_name?.trim(),
  );

  const payload: CreateSalesmanRequest = {
    name: data.name.trim(),
    phone: sanitizePhoneInput(data.phone),
    alternate_phone: data.alternate_phone?.trim()
      ? sanitizePhoneInput(data.alternate_phone)
      : null,
    email: data.email?.trim() || null,
    date_of_birth: data.date_of_birth?.trim() || null,
    date_of_joining: data.date_of_joining?.trim() || null,
    designation: data.designation?.trim() || null,
    aadhar_number: data.aadhar_number?.replace(/\s/g, '').trim() || null,
    pan_number: data.pan_number?.trim().toUpperCase() || null,
    address: hasAddress
      ? {
          street: address?.street?.trim() || '',
          city: address?.city?.trim() || '',
          state: address?.state?.trim() || '',
          pincode: address?.pincode?.trim() || '',
          country: address?.country?.trim() || 'India',
        }
      : null,
    bank_details: hasBank
      ? {
          account_holder_name: bank?.account_holder_name?.trim() || '',
          account_number: sanitizeBankAccountInput(bank?.account_number || ''),
          ifsc_code: bank?.ifsc_code?.trim().toUpperCase() || '',
          bank_name: bank?.bank_name?.trim() || '',
          branch: bank?.branch?.trim() || '',
        }
      : null,
    salary_type: data.basic_salary != null || data.salary_effective_from ? 'monthly' : null,
    basic_salary:
      data.basic_salary != null && !Number.isNaN(Number(data.basic_salary))
        ? Number(data.basic_salary)
        : null,
    salary_effective_from: data.salary_effective_from?.trim() || null,
    is_active: data.is_active,
  };

  return payload;
}

export function SalesmanFormModal({
  open,
  onOpenChange,
  editingSalesman = null,
}: SalesmanFormModalProps) {
  const { createSalesman, updateSalesman, getSalaryHistory, confirmBankVerification } =
    useSalesmen();
  const isEdit = Boolean(editingSalesman);
  const salesmanId = editingSalesman?.id ?? null;

  const [formData, setFormData] = useState<CreateSalesmanRequest>({ ...INITIAL_FORM });
  const [salespersonCode, setSalespersonCode] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [ifscLoading, setIfscLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [kycVerificationDetails, setKycVerificationDetails] =
    useState<EntityKycVerificationDetails>({});
  const [aadhaarValidated, setAadhaarValidated] = useState(false);
  const [aadhaarValidationSummary, setAadhaarValidationSummary] = useState<string | null>(null);
  const [bankDetailsVerifiedAt, setBankDetailsVerifiedAt] = useState<string | null>(null);
  const [bankVerifiedInSession, setBankVerifiedInSession] = useState(false);
  const [bankVerificationError, setBankVerificationError] = useState<string | null>(null);
  const [originalPanNumber, setOriginalPanNumber] = useState('');
  const [originalAadharNumber, setOriginalAadharNumber] = useState('');
  const [originalBankAccount, setOriginalBankAccount] = useState('');
  const [originalBankIfsc, setOriginalBankIfsc] = useState('');
  const [salaryHistory, setSalaryHistory] = useState<SalesmanSalaryHistoryEntry[]>([]);
  const [salaryHistoryOpen, setSalaryHistoryOpen] = useState(false);
  const [salaryHistoryLoading, setSalaryHistoryLoading] = useState(false);
  const [confirmBankLoading, setConfirmBankLoading] = useState(false);
  const [basicSalaryInput, setBasicSalaryInput] = useState('');

  const persistContext = salesmanPersist(salesmanId);

  const displayBankVerifiedAt = resolveEntityBankVerifiedAt(
    bankDetailsVerifiedAt,
    kycVerificationDetails,
  );
  const showBankVerified = isEntityBankVerified(
    bankDetailsVerifiedAt,
    kycVerificationDetails,
    bankVerifiedInSession,
  );

  const resetForm = () => {
    setFormData({
      ...INITIAL_FORM,
      address: { ...EMPTY_ADDRESS },
      bank_details: { ...EMPTY_BANK },
    });
    setSalespersonCode(null);
    setErrors({});
    setStep(1);
    setVerifiedEmail(null);
    setKycVerificationDetails({});
    setAadhaarValidated(false);
    setAadhaarValidationSummary(null);
    setBankDetailsVerifiedAt(null);
    setBankVerifiedInSession(false);
    setBankVerificationError(null);
    setOriginalPanNumber('');
    setOriginalAadharNumber('');
    setOriginalBankAccount('');
    setOriginalBankIfsc('');
    setSalaryHistory([]);
    setBasicSalaryInput('');
  };

  useEffect(() => {
    if (!open) return;
    if (editingSalesman) {
      void loadSalesman(editingSalesman.id);
    } else {
      resetForm();
    }
  }, [open, editingSalesman?.id]);

  useEffect(() => {
    if (!open) setPreviewOpen(false);
  }, [open]);

  const loadSalesman = async (id: string) => {
    setLoading(true);
    try {
      const s = await salesmenAPI.getSalesmanById(id);
      setSalespersonCode(s.salesperson_code ?? null);
      setFormData({
        name: s.name || '',
        phone: s.phone || '',
        alternate_phone: s.alternate_phone ?? null,
        email: s.email ?? null,
        date_of_birth: s.date_of_birth ?? null,
        date_of_joining: s.date_of_joining ?? null,
        designation: s.designation ?? null,
        aadhar_number: s.aadhar_number ?? null,
        pan_number: s.pan_number ?? null,
        address: s.address
          ? {
              street: s.address.street || '',
              city: s.address.city || '',
              state: s.address.state || '',
              pincode: s.address.pincode || '',
              country: s.address.country || 'India',
            }
          : { ...EMPTY_ADDRESS },
        bank_details: s.bank_details
          ? {
              account_holder_name: s.bank_details.account_holder_name || '',
              account_number: sanitizeBankAccountInput(s.bank_details.account_number || ''),
              ifsc_code: s.bank_details.ifsc_code || '',
              bank_name: s.bank_details.bank_name || '',
              branch: s.bank_details.branch || '',
            }
          : { ...EMPTY_BANK },
        salary_type: s.salary_type ?? 'monthly',
        basic_salary: s.basic_salary ?? null,
        salary_effective_from: s.salary_effective_from ?? null,
        is_active: s.is_active ?? true,
      });
      setBasicSalaryInput(
        s.basic_salary != null && !Number.isNaN(Number(s.basic_salary))
          ? String(s.basic_salary)
          : '',
      );
      setOriginalPanNumber(s.pan_number || '');
      setOriginalAadharNumber(s.aadhar_number || '');
      setOriginalBankAccount(sanitizeBankAccountInput(s.bank_details?.account_number || ''));
      setOriginalBankIfsc(s.bank_details?.ifsc_code?.trim().toUpperCase() || '');
      setKycVerificationDetails(s.kyc_verification_details ?? {});
      setAadhaarValidated(Boolean(s.kyc_verification_details?.aadhaar));
      setBankDetailsVerifiedAt(s.bank_details_verified_at ?? null);
      setBankVerifiedInSession(Boolean(s.bank_details_verified_at));
      setBankVerificationError(s.bank_verification_error ?? null);
      setVerifiedEmail(null);
      setStep(1);
      setErrors({});
    } catch (error: unknown) {
      setAlertType('error');
      setAlertTitle('Failed to Load Salesperson');
      setAlertMessage(getUserFacingApiErrorMessage(error, 'Could not load salesperson.'));
      setAlertOpen(true);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const duplicateCheckOptions = () => ({
    excludeId: salesmanId,
    unchangedFrom: {
      pan_number: originalPanNumber,
      aadhar_number: originalAadharNumber,
      account_number: originalBankAccount,
      ifsc_code: originalBankIfsc,
    },
  });

  const handlePANLookup = async () => {
    const pan = formData.pan_number?.trim();
    if (!pan) {
      setErrors((prev) => ({ ...prev, pan_number: 'Please enter a PAN number' }));
      return;
    }
    const panError = getPanValidationError(pan);
    if (panError) {
      setErrors((prev) => ({ ...prev, pan_number: panError }));
      return;
    }

    setLookupLoading(true);
    setErrors((prev) => ({ ...prev, pan_number: '' }));
    try {
      await assertEntityNotDuplicateBeforeVerification(
        'salesman',
        { pan_number: pan },
        'pan',
        duplicateCheckOptions(),
      );
      const enriched = await runEnrichedPanLookup(pan, persistContext);
      const autofill = buildPanLookupAutofill(enriched);
      const nextKyc = persistEnrichedPanLookupSnapshots(kycVerificationDetails, enriched);
      setKycVerificationDetails(nextKyc);
      setFormData((prev) => ({
        ...prev,
        name: autofill.contactPersonName || autofill.businessName || prev.name,
        pan_number: autofill.panNumber || prev.pan_number,
        address: applyAutofillAddress(prev.address ?? EMPTY_ADDRESS, autofill.address),
        bank_details: {
          ...prev.bank_details,
          account_holder_name:
            prev.bank_details?.account_holder_name ||
            autofill.contactPersonName ||
            autofill.businessName ||
            '',
        },
      }));
    } catch (error: unknown) {
      setErrors((prev) => ({
        ...prev,
        pan_number: error instanceof Error ? error.message : 'Failed to lookup PAN',
      }));
    } finally {
      setLookupLoading(false);
    }
  };

  const handleAadhaarLookup = async () => {
    if (!formData.aadhar_number?.trim()) {
      setErrors((prev) => ({ ...prev, aadhar_number: 'Please enter an Aadhaar number' }));
      return;
    }
    if (!validateAadhaar(formData.aadhar_number)) {
      setErrors((prev) => ({
        ...prev,
        aadhar_number: 'Invalid Aadhaar format (12 digits, cannot start with 0 or 1)',
      }));
      return;
    }

    setLookupLoading(true);
    setErrors((prev) => ({ ...prev, aadhar_number: '' }));
    setAadhaarValidated(false);
    setAadhaarValidationSummary(null);
    try {
      await assertEntityNotDuplicateBeforeVerification(
        'salesman',
        { aadhar_number: formData.aadhar_number },
        'aadhaar',
        duplicateCheckOptions(),
      );
      const response = await salesmenAPI.lookupAadhaar(formData.aadhar_number, persistContext);
      const autofill = buildAadhaarValidationAutofill(response);
      setFormData((prev) => ({
        ...prev,
        aadhar_number: autofill.aadhaarNumber,
        address: applyAadhaarStateToAddress(prev.address ?? EMPTY_ADDRESS, autofill),
      }));
      setKycVerificationDetails((prev) => persistAadhaarValidationSnapshot(prev, response));
      setAadhaarValidated(true);
      setAadhaarValidationSummary(formatAadhaarValidationSummary(autofill));
    } catch (error: unknown) {
      setErrors((prev) => ({
        ...prev,
        aadhar_number: error instanceof Error ? error.message : 'Failed to validate Aadhaar',
      }));
    } finally {
      setLookupLoading(false);
    }
  };

  const handleBankVerifySearch = async () => {
    const bd = formData.bank_details;
    const accountNumber = bd?.account_number?.trim();
    const ifscCode = bd?.ifsc_code?.trim();

    if (!canVerifyBankAccountLookup(accountNumber, ifscCode)) {
      setErrors((prev) => ({
        ...prev,
        bank_account_number: !accountNumber
          ? 'Account number is required for bank verify'
          : prev.bank_account_number ?? '',
        ifsc_code:
          !ifscCode || ifscCode.length !== 11
            ? 'Valid IFSC is required for bank verify'
            : prev.ifsc_code ?? '',
      }));
      return;
    }

    setIfscLoading(true);
    setErrors((prev) => ({ ...prev, ifsc_code: '', bank_account_number: '' }));
    try {
      await assertEntityNotDuplicateBeforeVerification(
        'salesman',
        { account_number: accountNumber, ifsc_code: ifscCode },
        'bank',
        duplicateCheckOptions(),
      );
      const result = await kycAPI.verifyBank(accountNumber!, ifscCode!, persistContext);
      const nextBankDetails = mapBankVerifyToBankDetails(result, formData.bank_details);
      setFormData((prev) => ({ ...prev, bank_details: nextBankDetails }));
      if (result.surepass_response) {
        setKycVerificationDetails((prev) => persistBankVerificationSnapshot(prev, result));
      }
      const holderMismatch = getBankAccountHolderNameMismatchError(
        bd?.account_holder_name,
        result.account_holder_name,
      );
      if (holderMismatch) {
        setErrors((prev) => ({ ...prev, account_holder_name: holderMismatch }));
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

  const handleConfirmBankVerification = async () => {
    if (!salesmanId) return;
    setConfirmBankLoading(true);
    try {
      const updated = await confirmBankVerification(salesmanId);
      setBankDetailsVerifiedAt(updated.bank_details_verified_at ?? null);
      setBankVerifiedInSession(Boolean(updated.bank_details_verified_at));
      setBankVerificationError(updated.bank_verification_error ?? null);
      if (updated.kyc_verification_details) {
        setKycVerificationDetails(updated.kyc_verification_details);
      }
      setAlertType('success');
      setAlertTitle('Bank Verification');
      setAlertMessage(
        updated.bank_details_verified_at
          ? 'Bank details verified successfully.'
          : updated.bank_verification_error || 'Bank verification did not complete.',
      );
      setAlertOpen(true);
    } catch (error: unknown) {
      setAlertType('error');
      setAlertTitle('Bank Verification Failed');
      setAlertMessage(getUserFacingApiErrorMessage(error, 'Could not confirm bank verification.'));
      setAlertOpen(true);
    } finally {
      setConfirmBankLoading(false);
    }
  };

  const loadSalaryHistory = async () => {
    if (!salesmanId) return;
    setSalaryHistoryLoading(true);
    setSalaryHistoryOpen(true);
    try {
      const rows = await getSalaryHistory(salesmanId);
      setSalaryHistory(rows);
    } catch {
      setSalaryHistory([]);
    } finally {
      setSalaryHistoryLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) newErrors.name = 'Name is required';
    if (!formData.phone?.trim()) newErrors.phone = 'Phone is required';
    else if (!validatePhone(formData.phone)) newErrors.phone = 'Enter a valid 10-digit mobile number';

    if (formData.alternate_phone?.trim() && !validatePhone(formData.alternate_phone)) {
      newErrors.alternate_phone = 'Enter a valid 10-digit mobile number';
    }
    if (formData.email?.trim() && !validateEmail(formData.email)) {
      newErrors.email = 'Invalid email';
    }
    if (formData.pan_number?.trim()) {
      const panError = getPanValidationError(formData.pan_number);
      if (panError) newErrors.pan_number = panError;
    }
    if (formData.aadhar_number?.trim() && !validateAadhaar(formData.aadhar_number)) {
      newErrors.aadhar_number = 'Invalid Aadhaar format (12 digits, cannot start with 0 or 1)';
    }

    const address = formData.address;
    const addressPartial = Boolean(
      address?.street?.trim() || address?.city?.trim() || address?.state?.trim(),
    );
    if (addressPartial) {
      if (!address?.street?.trim()) newErrors.street = 'Street is required';
      if (!address?.city?.trim()) newErrors.city = 'City is required';
      if (!address?.state?.trim()) newErrors.state = 'State is required';
    }

    const salaryInput = basicSalaryInput.trim();
    const hasSalary = salaryInput !== '' || Boolean(formData.salary_effective_from?.trim());
    if (hasSalary) {
      if (salaryInput === '') {
        newErrors.basic_salary = 'Basic salary is required when setting salary';
      } else {
        const n = Number(salaryInput);
        if (Number.isNaN(n) || n < 0) newErrors.basic_salary = 'Enter a valid salary amount ≥ 0';
      }
      if (!formData.salary_effective_from?.trim()) {
        newErrors.salary_effective_from = 'Effective from date is required when setting salary';
      }
    }

    const bankReady = shouldVerifyBankFields(formData.bank_details);
    if (bankReady && !kycVerificationDetails.bank?.verified_at && !bankDetailsVerifiedAt) {
      newErrors.bank_account_number =
        'Verify bank account (search on IFSC) before saving — snapshot is required for bank verification';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.name || newErrors.phone || newErrors.email || newErrors.alternate_phone) {
        setStep(1);
      } else if (newErrors.pan_number || newErrors.aadhar_number) {
        setStep(2);
      } else if (newErrors.street || newErrors.city || newErrors.state) {
        setStep(3);
      } else if (
        newErrors.bank_account_number ||
        newErrors.ifsc_code ||
        newErrors.account_holder_name
      ) {
        setStep(4);
      } else if (newErrors.basic_salary || newErrors.salary_effective_from) {
        setStep(5);
      }
      return false;
    }
    return true;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validateForm()) return;

    const cleaned = cleanSalesmanPayload({
      ...formData,
      basic_salary: basicSalaryInput.trim() === '' ? null : Number(basicSalaryInput),
    });

    if (isEdit && salesmanId) {
      setLoading(true);
      try {
        const updatePayload = buildEntitySavePayload(cleaned as UpdateSalesmanRequest, {
          kycVerificationDetails,
          bankDetailsVerifiedAt,
          // is_active is not gated on KYC for salesmen
        });
        const { message, verification_error, verification_message } = await updateSalesman(
          salesmanId,
          updatePayload,
        );
        const alert = getSalesmanSaveAlert(true, message, verification_error, verification_message);
        setAlertType(alert.alertType);
        setAlertTitle(alert.alertTitle);
        setAlertMessage(alert.alertMessage);
        setAlertOpen(true);
        onOpenChange(false);
      } catch (error: unknown) {
        setAlertType('error');
        setAlertTitle('Failed to Update Salesperson');
        setAlertMessage(getUserFacingApiErrorMessage(error, 'Could not update salesperson.'));
        setAlertOpen(true);
      } finally {
        setLoading(false);
      }
      return;
    }

    onOpenChange(false);
    setPreviewOpen(true);
  };

  const handlePreviewConfirm = async (data: CreateSalesmanRequest) => {
    setLoading(true);
    try {
      const cleaned = cleanSalesmanPayload({
        ...data,
        basic_salary: basicSalaryInput.trim() === '' ? null : Number(basicSalaryInput),
      });
      const createPayload = buildEntitySavePayload(cleaned, {
        kycVerificationDetails,
        bankDetailsVerifiedAt,
      });
      const { message, verification_error, verification_message } =
        await createSalesman(createPayload);
      setPreviewOpen(false);
      resetForm();
      const alert = getSalesmanSaveAlert(false, message, verification_error, verification_message);
      setAlertType(alert.alertType);
      setAlertTitle(alert.alertTitle);
      setAlertMessage(alert.alertMessage);
      setAlertOpen(true);
      onOpenChange(false);
    } catch (error: unknown) {
      setAlertType('error');
      setAlertTitle('Failed to Create Salesperson');
      setAlertMessage(getUserFacingApiErrorMessage(error, 'Could not create salesperson.'));
      setAlertOpen(true);
      setPreviewOpen(false);
      onOpenChange(true);
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['Personal', 'Identity', 'Address', 'Bank', 'Salary'];

  return (
    <>
      <Dialog.Root open={open && !previewOpen} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[90vh] w-[95vw] max-w-2xl translate-x-[-50%] translate-y-[-50%] overflow-y-auto">
            <div className="glass rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <Dialog.Title className="text-xl font-semibold">
                  {isEdit ? 'Edit Salesperson' : 'Create Salesperson'}
                </Dialog.Title>
                <button
                  onClick={() => onOpenChange(false)}
                  className="rounded-lg p-1 hover:bg-muted/50 transition-colors"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4 flex flex-wrap gap-1">
                {stepLabels.map((label, idx) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setStep(idx + 1)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      step === idx + 1
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                  >
                    {idx + 1}. {label}
                  </button>
                ))}
              </div>

              {loading && isEdit && !formData.name ? (
                <div className="flex justify-center py-10">
                  <LoadingSpinner />
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSubmit(e);
                  }}
                  className="space-y-4"
                >
                  {step === 1 && (
                    <div className="space-y-4">
                      {salespersonCode && (
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">
                            Salesperson Code
                          </label>
                          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm font-medium tabular-nums">
                            {salespersonCode}
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Name *</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Phone *</label>
                        <PhoneInput
                          value={formData.phone}
                          onChange={(phone) => setFormData({ ...formData, phone })}
                          className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                        {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Alternate phone</label>
                        <PhoneInput
                          value={formData.alternate_phone ?? ''}
                          onChange={(phone) =>
                            setFormData({
                              ...formData,
                              alternate_phone: phone.trim() === '' ? null : phone,
                            })
                          }
                          className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                        {errors.alternate_phone && (
                          <p className="mt-1 text-xs text-red-600">{errors.alternate_phone}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Email</label>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            value={formData.email ?? ''}
                            onChange={(e) => {
                              if (
                                isVerifiedEmailInput(formData.email ?? '', {
                                  verifiedSingleEmail: verifiedEmail,
                                })
                              ) {
                                return;
                              }
                              setFormData({
                                ...formData,
                                email: e.target.value === '' ? null : e.target.value,
                              });
                            }}
                            readOnly={isVerifiedEmailInput(formData.email ?? '', {
                              verifiedSingleEmail: verifiedEmail,
                            })}
                            className={`flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary ${
                              isVerifiedEmailInput(formData.email ?? '', {
                                verifiedSingleEmail: verifiedEmail,
                              })
                                ? VERIFIED_EMAIL_INPUT_CLASS
                                : ''
                            }`}
                          />
                          <EmailVerifyButton
                            email={formData.email ?? ''}
                            verifiedFromSnapshot={
                              verifiedEmail === normalizeVerifiedEmail(formData.email ?? '')
                            }
                            onError={(message) => setErrors({ ...errors, email: message })}
                            onVerified={() => {
                              const nextErrors = { ...errors };
                              delete nextErrors.email;
                              setErrors(nextErrors);
                              setVerifiedEmail(normalizeVerifiedEmail(formData.email ?? ''));
                            }}
                          />
                        </div>
                        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">Date of birth</label>
                          <DateInputWithSteppers
                            className="w-full"
                            inputClassName="py-2 text-sm"
                            value={formData.date_of_birth ?? ''}
                            onChange={(v) =>
                              setFormData({ ...formData, date_of_birth: v || null })
                            }
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">Date of joining</label>
                          <DateInputWithSteppers
                            className="w-full"
                            inputClassName="py-2 text-sm"
                            value={formData.date_of_joining ?? ''}
                            onChange={(v) =>
                              setFormData({ ...formData, date_of_joining: v || null })
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Designation</label>
                        <input
                          type="text"
                          value={formData.designation ?? ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              designation: e.target.value === '' ? null : e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
                          placeholder="e.g. Field Sales"
                        />
                      </div>
                      {isEdit && (
                        <div className="flex items-center gap-2">
                          <input
                            id="salesman-active"
                            type="checkbox"
                            checked={formData.is_active !== false}
                            onChange={(e) =>
                              setFormData({ ...formData, is_active: e.target.checked })
                            }
                            className="h-4 w-4 rounded border-border"
                          />
                          <label htmlFor="salesman-active" className="text-sm font-medium">
                            Active
                          </label>
                        </div>
                      )}
                      <button type="button" onClick={() => setStep(2)} className="btn-primary w-full">
                        Next: Identity
                      </button>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-4">
                      <KycDocumentOcrSection
                        docs={['pan', 'aadhaar']}
                        disabled={lookupLoading || loading}
                        onPanResult={(result) => {
                          const flat = applyPanOcrToFlatParty(
                            {
                              business_name: formData.name,
                              pan_number: formData.pan_number,
                              aadhar_number: formData.aadhar_number,
                              address: formData.address ?? undefined,
                            },
                            result,
                          );
                          setFormData((prev) => ({
                            ...prev,
                            name: flat.business_name || prev.name,
                            pan_number: flat.pan_number ?? prev.pan_number,
                          }));
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.pan_number;
                            return next;
                          });
                        }}
                        onAadhaarResult={(result) => {
                          const flat = applyAadhaarOcrToFlatParty(
                            {
                              business_name: formData.name,
                              pan_number: formData.pan_number,
                              aadhar_number: formData.aadhar_number,
                              address: formData.address ?? undefined,
                            },
                            result,
                          );
                          setFormData((prev) => ({
                            ...prev,
                            name: flat.business_name || prev.name,
                            aadhar_number: flat.aadhar_number ?? prev.aadhar_number,
                            address: (flat.address as SalesmanAddress) ?? prev.address,
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

                      <div>
                        <label className="text-sm font-medium mb-1.5 block">PAN Number</label>
                        {isEdit && originalPanNumber.trim() ? (
                          <div className="flex gap-2">
                            <div className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                              {originalPanNumber}
                            </div>
                            <button
                              type="button"
                              onClick={() => void handlePANLookup()}
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
                              value={formData.pan_number ?? ''}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  pan_number: e.target.value.toUpperCase() || null,
                                })
                              }
                              className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
                              placeholder={PAN_EXAMPLE}
                              maxLength={PAN_MAX_LENGTH}
                            />
                            <button
                              type="button"
                              onClick={() => void handlePANLookup()}
                              disabled={lookupLoading}
                              className="btn-secondary flex items-center gap-2"
                            >
                              {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                            </button>
                          </div>
                        )}
                        {errors.pan_number && (
                          <p className="mt-1 text-xs text-red-600">{errors.pan_number}</p>
                        )}
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Aadhaar Number</label>
                        {isEdit && originalAadharNumber.trim() ? (
                          <div className="flex gap-2">
                            <div className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                              {originalAadharNumber.replace(/(\d{4})(?=\d)/g, '$1 ').trim()}
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleAadhaarLookup()}
                              disabled={lookupLoading}
                              className="btn-secondary flex items-center gap-2 shrink-0"
                            >
                              {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={formData.aadhar_number ?? ''}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  aadhar_number: e.target.value || null,
                                });
                                setAadhaarValidated(false);
                                setAadhaarValidationSummary(null);
                              }}
                              className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
                              placeholder="234567890123"
                              maxLength={14}
                            />
                            <button
                              type="button"
                              onClick={() => void handleAadhaarLookup()}
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
                        {errors.aadhar_number && (
                          <p className="mt-1 text-xs text-red-600">{errors.aadhar_number}</p>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">
                          Back
                        </button>
                        <button type="button" onClick={() => setStep(3)} className="btn-primary flex-1">
                          Next: Address
                        </button>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Street</label>
                        <input
                          type="text"
                          value={formData.address?.street ?? ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              address: { ...(formData.address ?? EMPTY_ADDRESS), street: e.target.value },
                            })
                          }
                          className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                        {errors.street && <p className="mt-1 text-xs text-red-600">{errors.street}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">City</label>
                          <input
                            type="text"
                            value={formData.address?.city ?? ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                address: { ...(formData.address ?? EMPTY_ADDRESS), city: e.target.value },
                              })
                            }
                            className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
                          />
                          {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">State</label>
                          <input
                            type="text"
                            value={formData.address?.state ?? ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                address: { ...(formData.address ?? EMPTY_ADDRESS), state: e.target.value },
                              })
                            }
                            className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
                          />
                          {errors.state && <p className="mt-1 text-xs text-red-600">{errors.state}</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">Pincode</label>
                          <input
                            type="text"
                            value={formData.address?.pincode ?? ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                address: {
                                  ...(formData.address ?? EMPTY_ADDRESS),
                                  pincode: e.target.value,
                                },
                              })
                            }
                            className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
                            maxLength={10}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">Country</label>
                          <input
                            type="text"
                            value={formData.address?.country ?? 'India'}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                address: {
                                  ...(formData.address ?? EMPTY_ADDRESS),
                                  country: e.target.value,
                                },
                              })
                            }
                            className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1">
                          Back
                        </button>
                        <button type="button" onClick={() => setStep(4)} className="btn-primary flex-1">
                          Next: Bank
                        </button>
                      </div>
                    </div>
                  )}

                  {step === 4 && (
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
                      {isEdit && salesmanId && !showBankVerified && (
                        <button
                          type="button"
                          onClick={() => void handleConfirmBankVerification()}
                          disabled={confirmBankLoading}
                          className="btn-secondary text-xs inline-flex items-center gap-2"
                        >
                          {confirmBankLoading && <LoadingSpinner size="sm" />}
                          Confirm bank verification
                        </button>
                      )}
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Account holder name</label>
                        <input
                          type="text"
                          value={formData.bank_details?.account_holder_name || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              bank_details: {
                                ...formData.bank_details,
                                account_holder_name: e.target.value,
                              },
                            })
                          }
                          className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                        {errors.account_holder_name && (
                          <p className="mt-1 text-xs text-red-600">{errors.account_holder_name}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Account number</label>
                        <BankAccountInput
                          value={formData.bank_details?.account_number || ''}
                          onChange={(account_number) =>
                            setFormData({
                              ...formData,
                              bank_details: { ...formData.bank_details, account_number },
                            })
                          }
                          className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
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
                              const value = e.target.value
                                .toUpperCase()
                                .replace(/[^A-Z0-9]/g, '')
                                .slice(0, 11);
                              setFormData({
                                ...formData,
                                bank_details: { ...formData.bank_details, ifsc_code: value },
                              });
                            }}
                            className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
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
                            className="btn-secondary flex items-center gap-2 disabled:opacity-50"
                            title="Verify bank account via Surepass"
                          >
                            {ifscLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                          </button>
                        </div>
                        {errors.ifsc_code && (
                          <p className="mt-1 text-xs text-red-600">{errors.ifsc_code}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Bank name</label>
                        <input
                          type="text"
                          value={formData.bank_details?.bank_name || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              bank_details: { ...formData.bank_details, bank_name: e.target.value },
                            })
                          }
                          className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Branch</label>
                        <input
                          type="text"
                          value={formData.bank_details?.branch || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              bank_details: { ...formData.bank_details, branch: e.target.value },
                            })
                          }
                          className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button type="button" onClick={() => setStep(3)} className="btn-secondary flex-1">
                          Back
                        </button>
                        <button type="button" onClick={() => setStep(5)} className="btn-primary flex-1">
                          Next: Salary
                        </button>
                      </div>
                    </div>
                  )}

                  {step === 5 && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Salary type</label>
                        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                          Monthly
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Basic salary</label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          inputMode="decimal"
                          value={basicSalaryInput}
                          onChange={(e) => setBasicSalaryInput(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
                          placeholder="e.g. 25000"
                        />
                        {errors.basic_salary && (
                          <p className="mt-1 text-xs text-red-600">{errors.basic_salary}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Effective from</label>
                        <DateInputWithSteppers
                          className="w-full"
                          inputClassName="py-2 text-sm"
                          value={formData.salary_effective_from ?? ''}
                          onChange={(v) =>
                            setFormData({ ...formData, salary_effective_from: v || null })
                          }
                        />
                        {errors.salary_effective_from && (
                          <p className="mt-1 text-xs text-red-600">{errors.salary_effective_from}</p>
                        )}
                      </div>
                      {isEdit && salesmanId && (
                        <button
                          type="button"
                          onClick={() => void loadSalaryHistory()}
                          className="btn-secondary inline-flex items-center gap-2 text-sm"
                        >
                          <History className="h-4 w-4" />
                          View salary history
                        </button>
                      )}
                      <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setStep(4)} className="btn-secondary flex-1">
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSubmit()}
                          disabled={loading}
                          className="btn-primary flex-1"
                        >
                          {loading
                            ? isEdit
                              ? 'Updating…'
                              : 'Creating…'
                            : isEdit
                              ? 'Update Salesperson'
                              : 'Create Salesperson'}
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

      <SalespersonPreviewDialog
        open={previewOpen}
        onOpenChange={(next) => {
          setPreviewOpen(next);
          if (!next) onOpenChange(true);
        }}
        formData={cleanSalesmanPayload({
          ...formData,
          basic_salary: basicSalaryInput.trim() === '' ? null : Number(basicSalaryInput),
        })}
        onConfirm={handlePreviewConfirm}
      />

      <Dialog.Root open={salaryHistoryOpen} onOpenChange={setSalaryHistoryOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-[60] w-[95vw] max-w-lg translate-x-[-50%] translate-y-[-50%] outline-none">
            {/* glass on inner wrapper — .glass:hover transform must not override centering translate */}
            <div className="glass rounded-2xl p-6 shadow-xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <Dialog.Title className="text-lg font-semibold">Salary History</Dialog.Title>
                <button
                  type="button"
                  onClick={() => setSalaryHistoryOpen(false)}
                  className="rounded-lg p-1 hover:bg-muted/50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {salaryHistoryLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : salaryHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No salary history yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left">
                        <th className="p-2 font-medium">Effective from</th>
                        <th className="p-2 font-medium">Type</th>
                        <th className="p-2 font-medium text-right">Basic salary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salaryHistory.map((row) => (
                        <tr key={row.id} className="border-b last:border-0">
                          <td className="p-2">{row.effective_from}</td>
                          <td className="p-2 capitalize">{row.salary_type}</td>
                          <td className="p-2 text-right tabular-nums">
                            ₹{Number(row.basic_salary).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
        buttonText="OK"
      />
    </>
  );
}

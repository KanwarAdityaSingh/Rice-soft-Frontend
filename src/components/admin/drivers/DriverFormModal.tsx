import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { X, IdCard, Shield, Loader2, Check, AlertTriangle } from 'lucide-react';
import { driversAPI } from '../../../services/drivers.api';
import { kycAPI } from '../../../services/kyc.api';
import { AlertDialog } from '../../shared/AlertDialog';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import type { CreateDriverRequest, Driver, DriverVerificationResponse, DrivingLicenseOcrResponse, SurepassVerificationSnapshot } from '../../../types/entities';
import { PhoneInput } from '../../shared/PhoneInput';
import { sanitizePhoneInput, validatePhone, sanitizeDrivingLicenseInput, getDrivingLicenseValidationError, validateDrivingLicense, DRIVING_LICENSE_DISPLAY_EXAMPLE, DRIVING_LICENSE_FORMAT_HINT, DRIVING_LICENSE_FORMAT_EXAMPLE, DRIVING_LICENSE_MAX_LENGTH } from '../../../utils/validation';
import { buildSurepassSnapshot } from '../../../utils/kycVerification';
import { formatDriverVerifiedAt, getDriverSaveAlert, getDriverTransportDoeWarning } from '../../../utils/driverVerification';
import {
  collectApiLockedFieldsFromDriver,
  collectApiLockedFieldsFromVerifyResult,
  DRIVER_LOCKED_INPUT_CLASS,
  isDriverFieldLocked,
  type DriverFieldLockKey,
} from '../../../utils/driverAutofillLocks';
import {
  resolveOcrDateOfBirth,
  resolveOcrLicenseNumber,
  resolveOcrName,
} from '../../../utils/driverOcr';
import {
  formatIsoDateAsDdMmYyyy,
  formatIndianDateInput,
  getIndianDateValidationError,
  INDIAN_DATE_FORMAT_HINT,
  INDIAN_DATE_INPUT_MAX_LENGTH,
  normalizeIsoDateInput,
  toIsoDateString,
} from '../../../utils/dateFormatting';
import { resolveDriverCityName, resolveDriverLicenseExpiry, resolveDriverLocationForSave, resolveDriverRegularLicenseExpiry, resolveDriverStateName, resolveDriverTransportLicenseExpiry } from '../../../utils/driverProfile';
import { DriverProfileSection } from './DriverProfileSection';
import { DriverLicenseOcrUpload } from './DriverLicenseOcrUpload';

interface DriverFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverId?: string | null;
}

function applyDriverToForm(d: Driver): CreateDriverRequest {
  return {
    license_number: d.license_number,
    phone: d.phone,
    name: d.name,
    address: d.address ?? null,
    pincode: d.pincode ?? null,
    gender: d.gender ?? null,
    date_of_birth: d.date_of_birth ? normalizeIsoDateInput(d.date_of_birth) || null : null,
    license_expires_at: resolveDriverRegularLicenseExpiry(d),
    transport_license_expires_at: resolveDriverTransportLicenseExpiry(d),
    father_or_husband_name: d.father_or_husband_name ?? null,
    state: resolveDriverStateName(d) ?? null,
    city_name: resolveDriverCityName(d) ?? null,
    profile_image: d.profile_image ?? null,
    vehicle_classes: d.vehicle_classes ?? null,
    is_verified: d.is_verified,
    verified_at: d.verified_at,
    verification_details: d.verification_details,
  };
}

export function DriverFormModal({ open, onOpenChange, driverId }: DriverFormModalProps) {
  const isEditMode = Boolean(driverId);

  const [formData, setFormData] = useState<CreateDriverRequest>({
    license_number: '',
    phone: '',
    name: null,
    address: null,
    pincode: null,
    gender: null,
    date_of_birth: null,
    license_expires_at: null,
    profile_image: null,
    vehicle_classes: null,
    is_verified: false,
    verified_at: null,
    verification_details: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingDriver, setLoadingDriver] = useState(false);
  const [loadedDriver, setLoadedDriver] = useState<Driver | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [scanningOcr, setScanningOcr] = useState(false);
  const [verifyDob, setVerifyDob] = useState('');
  const [apiLockedFields, setApiLockedFields] = useState<Set<DriverFieldLockKey>>(new Set());
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    if (driverId && isEditMode) {
      void loadDriver();
    } else {
      resetForm();
    }
  }, [open, driverId]);

  const loadDriver = async () => {
    if (!driverId) return;
    setLoadingDriver(true);
    try {
      const d = await driversAPI.getDriverById(driverId);
      setLoadedDriver(d);
      setFormData(applyDriverToForm(d));
      setApiLockedFields(collectApiLockedFieldsFromDriver(d));
      if (d.date_of_birth) setVerifyDob(formatIsoDateAsDdMmYyyy(d.date_of_birth));
      setErrors({});
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to load driver';
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(msg);
      setAlertOpen(true);
    } finally {
      setLoadingDriver(false);
    }
  };

  const refreshVerifiedFromServer = async () => {
    if (!driverId) return;
    try {
      const d = await driversAPI.getDriverById(driverId);
      setLoadedDriver(d);
      setFormData(applyDriverToForm(d));
      setApiLockedFields(collectApiLockedFieldsFromDriver(d));
      if (d.date_of_birth) setVerifyDob(formatIsoDateAsDdMmYyyy(d.date_of_birth));
    } catch {
      // Non-blocking — local verify state still reflects the lookup
    }
  };

  const resetForm = () => {
    setLoadedDriver(null);
    setFormData({
      license_number: '',
      phone: '',
      name: null,
      address: null,
      pincode: null,
      gender: null,
      date_of_birth: null,
      license_expires_at: null,
      profile_image: null,
      vehicle_classes: null,
      is_verified: false,
      verified_at: null,
      verification_details: null,
    });
    setErrors({});
    setApiLockedFields(new Set());
    setVerifyDob('');
    setScanningOcr(false);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const licenseError = getDrivingLicenseValidationError(formData.license_number);
    if (licenseError) newErrors.license_number = licenseError;

    const phoneSource =
      loadedDriver?.phone?.trim() ? loadedDriver.phone : formData.phone;
    const phone = sanitizePhoneInput(phoneSource);
    if (!phone) newErrors.phone = 'Phone is required';
    else if (!validatePhone(phone)) newErrors.phone = 'Enter a valid 10-digit mobile number';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildVerificationDetailsFromResponse = (
    r: DriverVerificationResponse,
  ): SurepassVerificationSnapshot => {
    const mappedFromApi = {
      license_number: r.license_number,
      full_name: r.full_name ?? r.name,
      date_of_birth: r.date_of_birth,
      date_of_expiry: r.date_of_expiry ?? r.doe,
      transport_date_of_expiry: r.transport_date_of_expiry ?? r.transport_doe,
      age: r.age,
      address: r.address,
      pincode: r.pincode,
      state: r.state,
      city_name: r.city_name,
      gender: r.gender,
      blood_group: r.blood_group,
      vehicle_classes: r.vehicle_classes,
      father_or_husband_name: r.father_or_husband_name,
      profile_image: r.profile_image,
    };

    if (r.surepass_response) {
      const snapshot = buildSurepassSnapshot(r.surepass_response, mappedFromApi);
      return {
        ...snapshot,
        mapped: {
          ...(snapshot.mapped && typeof snapshot.mapped === 'object' ? snapshot.mapped : {}),
          city_name: resolveDriverCityName({ city_name: r.city_name, verification_details: snapshot }),
          state:
            resolveDriverStateName({
              state: r.state,
              address: r.address,
              verification_details: snapshot,
            }) ?? null,
        },
      };
    }

    return {
      provider: 'surepass',
      verified_at: new Date().toISOString(),
      raw: { success: true, status_code: 200, message: null },
      mapped: mappedFromApi,
    };
  };

  const applyVerifyResult = (result: DriverVerificationResponse, persistedDriver?: Driver | null) => {
    const driver = persistedDriver ?? result.driver ?? null;
    const verificationDetails = buildVerificationDetailsFromResponse(result);

    if (driver) {
      setLoadedDriver(driver);
      setFormData(applyDriverToForm(driver));
      setApiLockedFields(collectApiLockedFieldsFromDriver(driver));
      if (driver.date_of_birth) setVerifyDob(formatIsoDateAsDdMmYyyy(driver.date_of_birth));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      license_number: result.license_number || prev.license_number,
      name: (result.full_name ?? result.name)?.trim() || prev.name,
      date_of_birth: result.date_of_birth ? normalizeIsoDateInput(result.date_of_birth) || null : prev.date_of_birth ?? null,
      license_expires_at: resolveDriverRegularLicenseExpiry(result) ?? prev.license_expires_at ?? null,
      transport_license_expires_at:
        resolveDriverTransportLicenseExpiry(result) ?? prev.transport_license_expires_at ?? null,
      address: result.address ?? prev.address ?? null,
      pincode: result.pincode ?? prev.pincode ?? null,
      gender: result.gender ?? prev.gender ?? null,
      father_or_husband_name: result.father_or_husband_name ?? prev.father_or_husband_name ?? null,
      state:
        resolveDriverStateName({
          state: result.state,
          address: result.address,
          verification_details: verificationDetails,
        }) ?? prev.state ?? null,
      city_name:
        resolveDriverCityName({
          city_name: result.city_name,
          verification_details: verificationDetails,
        }) ?? prev.city_name ?? null,
      profile_image: result.profile_image ?? prev.profile_image ?? null,
      vehicle_classes: result.vehicle_classes ?? prev.vehicle_classes ?? null,
      is_verified: true,
      verified_at: new Date().toISOString(),
      verification_details: verificationDetails,
    }));
    setApiLockedFields(collectApiLockedFieldsFromVerifyResult(result));
    if (result.date_of_birth) setVerifyDob(formatIsoDateAsDdMmYyyy(result.date_of_birth));
  };

  const applyOcrResult = (result: DrivingLicenseOcrResponse, persistedDriver?: Driver | null) => {
    const driver = persistedDriver ?? result.driver ?? null;

    if (driver) {
      setLoadedDriver(driver);
      setFormData(applyDriverToForm(driver));
      setApiLockedFields(collectApiLockedFieldsFromDriver(driver));
      if (driver.date_of_birth) setVerifyDob(formatIsoDateAsDdMmYyyy(driver.date_of_birth));
      return;
    }

    const license = resolveOcrLicenseNumber(result);
    const name = resolveOcrName(result);
    const dob = resolveOcrDateOfBirth(result);

    setFormData((prev) => ({
      ...prev,
      license_number: license ?? prev.license_number,
      name: name ?? prev.name,
      date_of_birth: dob ?? prev.date_of_birth ?? null,
      address: result.address?.trim() || prev.address || null,
      pincode: result.pincode?.trim() || prev.pincode || null,
      state: result.state?.trim() || prev.state || null,
    }));
    if (dob) setVerifyDob(formatIsoDateAsDdMmYyyy(dob));
  };

  const handleClearOcr = () => {
    if (loadedDriver && !loadedDriver.is_verified) {
      setFormData(applyDriverToForm(loadedDriver));
      if (loadedDriver.date_of_birth) {
        setVerifyDob(formatIsoDateAsDdMmYyyy(loadedDriver.date_of_birth));
      } else {
        setVerifyDob('');
      }
      return;
    }
    setFormData((prev) => ({
      ...prev,
      license_number: isDriverFieldLocked(apiLockedFields, 'license_number') ? prev.license_number : '',
      name: isDriverFieldLocked(apiLockedFields, 'name') ? prev.name : null,
      date_of_birth: isDriverFieldLocked(apiLockedFields, 'date_of_birth') ? prev.date_of_birth : null,
      address: isDriverFieldLocked(apiLockedFields, 'address') ? prev.address : null,
      pincode: isDriverFieldLocked(apiLockedFields, 'pincode') ? prev.pincode : null,
      state: isDriverFieldLocked(apiLockedFields, 'state') ? prev.state : null,
    }));
    if (!isDriverFieldLocked(apiLockedFields, 'date_of_birth')) {
      setVerifyDob('');
    }
  };

  const handleOcrScan = async (front: File, back?: File) => {
    const usePdf =
      front.type === 'application/pdf' || back?.type === 'application/pdf';

    setScanningOcr(true);
    try {
      let result: DrivingLicenseOcrResponse;
      if (isEditMode && driverId) {
        result = await driversAPI.ocrDriver(front, { back, usePdf, driverId });
        applyOcrResult(result, result.driver ?? undefined);
        if (!result.driver) {
          await refreshVerifiedFromServer();
        }
      } else {
        result = await kycAPI.ocrDrivingLicense(front, { back, usePdf });
        applyOcrResult(result);
      }

      setErrors((prev) => {
        const { license_number: _lic, verify_dob: _dob, ...rest } = prev;
        return rest;
      });

      const displayName = resolveOcrName(result) ?? 'Driver';
      const license = resolveOcrLicenseNumber(result);
      setAlertType('success');
      setAlertTitle('Licence scanned');
      setAlertMessage(
        `${displayName}${license ? ` · ${license}` : ''} — review prefilled fields, then Verify for full validation.`,
      );
      setAlertOpen(true);
    } catch (error: unknown) {
      setAlertType('error');
      setAlertTitle('Scan failed');
      setAlertMessage(
        error instanceof Error ? error.message : 'Could not read licence. Try again or enter details manually.',
      );
      setAlertOpen(true);
    } finally {
      setScanningOcr(false);
    }
  };

  const todayIso = toIsoDateString(new Date());

  const canVerify =
    validateDrivingLicense(formData.license_number) &&
    Boolean(verifyDob.trim()) &&
    !getIndianDateValidationError(verifyDob, true, { maxIso: todayIso });

  const handleVerify = async () => {
    const dobError = getIndianDateValidationError(verifyDob, true, { maxIso: todayIso });
    if (dobError) {
      setErrors((prev) => ({ ...prev, verify_dob: dobError }));
      return;
    }
    const normalizedDob = normalizeIsoDateInput(verifyDob);

    const licenseError = getDrivingLicenseValidationError(formData.license_number);
    if (licenseError) {
      setErrors({ license_number: licenseError });
      return;
    }
    const lic = sanitizeDrivingLicenseInput(formData.license_number);

    setVerifying(true);
    try {
      let result: DriverVerificationResponse;

      if (isEditMode && driverId) {
        result = await driversAPI.verifyDriverById(driverId, { dob: normalizedDob });
        applyVerifyResult(result, result.driver);
        await refreshVerifiedFromServer();
      } else {
        result = await driversAPI.verifyDriver(lic, normalizedDob, driverId ?? undefined);
        applyVerifyResult(result, result.driver);
      }

      setErrors((prev) => {
        const { license_number: _lic, verify_dob: _dob, ...rest } = prev;
        return rest;
      });

      const displayName = result.driver?.name ?? result.full_name ?? result.name;
      const expiry = result.driver ? resolveDriverLicenseExpiry(result.driver) : resolveDriverLicenseExpiry(result);
      setAlertType('success');
      setAlertTitle('Licence verified');
      setAlertMessage(
        `Name: ${displayName || 'N/A'}${expiry ? ` · Valid until ${expiry}` : ''}`,
      );
      setAlertOpen(true);
    } catch (error: unknown) {
      setAlertType('error');
      setAlertTitle('Verification failed');
      setAlertMessage(
        error instanceof Error ? error.message : 'Could not verify licence. You can still enter details manually.',
      );
      setAlertOpen(true);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload: CreateDriverRequest = {
      license_number: sanitizeDrivingLicenseInput(formData.license_number),
      phone: sanitizePhoneInput(loadedDriver?.phone?.trim() ? loadedDriver.phone : formData.phone),
      name: formData.name?.trim() || null,
    };

    if (formData.is_verified && !isEditMode) {
      payload.is_verified = true;
      payload.verified_at = formData.verified_at;
      payload.verification_details = formData.verification_details ?? null;
      payload.date_of_birth = formData.date_of_birth ?? null;
      payload.license_expires_at = formData.license_expires_at ?? null;
      payload.transport_license_expires_at = formData.transport_license_expires_at ?? null;
      payload.father_or_husband_name = formData.father_or_husband_name ?? null;
      const verifiedLocation = resolveDriverLocationForSave({
        city_name: formData.city_name,
        state: formData.state,
        address: formData.address,
        verification_details: formData.verification_details ?? null,
      });
      payload.state = verifiedLocation.state;
      payload.city_name = verifiedLocation.city_name;
      payload.address = formData.address ?? null;
      payload.pincode = formData.pincode ?? null;
      payload.gender = formData.gender ?? null;
      payload.profile_image = formData.profile_image ?? null;
      payload.vehicle_classes = formData.vehicle_classes ?? null;
    } else if (!isEditMode) {
      payload.date_of_birth = formData.date_of_birth ?? null;
      payload.address = formData.address ?? null;
      payload.pincode = formData.pincode ?? null;
      payload.state = formData.state ?? null;
    }

    if (isEditMode && driverId) {
      if (loadedDriver?.phone) {
        payload.phone = sanitizePhoneInput(loadedDriver.phone);
      }
      if (loadedDriver?.is_verified) {
        payload.is_verified = loadedDriver.is_verified;
        payload.verified_at = loadedDriver.verified_at;
        payload.verification_details = loadedDriver.verification_details;
        payload.date_of_birth = loadedDriver.date_of_birth ?? null;
        payload.license_expires_at = resolveDriverRegularLicenseExpiry(loadedDriver);
        payload.transport_license_expires_at = resolveDriverTransportLicenseExpiry(loadedDriver);
        payload.father_or_husband_name = loadedDriver.father_or_husband_name ?? null;
        const verifiedLocation = resolveDriverLocationForSave(loadedDriver);
        payload.state = verifiedLocation.state;
        payload.city_name = verifiedLocation.city_name;
        payload.address = loadedDriver.address ?? null;
        payload.pincode = loadedDriver.pincode ?? null;
        payload.gender = loadedDriver.gender ?? null;
        payload.profile_image = loadedDriver.profile_image ?? null;
        payload.vehicle_classes = loadedDriver.vehicle_classes ?? null;
        payload.name = loadedDriver.name ?? payload.name;
      }
      setLoading(true);
      try {
        const { driver, message, verification_error, transport_doe_not_found } =
          await driversAPI.updateDriver(driverId, payload);
        setLoadedDriver(driver);
        const alert = getDriverSaveAlert(true, message, verification_error, transport_doe_not_found);
        setAlertType(alert.alertType);
        setAlertTitle(alert.alertTitle);
        setAlertMessage(alert.alertMessage);
        setAlertOpen(true);
        if (alert.alertType === 'success') {
          onOpenChange(false);
        }
      } catch (error: unknown) {
        setAlertType('error');
        setAlertTitle('Failed to update');
        setAlertMessage(error instanceof Error ? error.message : 'Update failed');
        setAlertOpen(true);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const { driver: created, message, verification_error, transport_doe_not_found } =
        await driversAPI.createDriver(payload);

      if (verifyDob.trim() && validateDrivingLicense(formData.license_number)) {
        try {
          await driversAPI.verifyDriverById(created.id, { dob: normalizeIsoDateInput(verifyDob) });
        } catch {
          // Driver created; verify can be retried from edit
        }
      }

      const alert = getDriverSaveAlert(false, message, verification_error, transport_doe_not_found);
      setAlertType(alert.alertType);
      setAlertTitle(alert.alertTitle);
      setAlertMessage(alert.alertMessage);
      setAlertOpen(true);
      if (alert.alertType === 'success') {
        onOpenChange(false);
      } else {
        setLoadedDriver(created);
        setFormData(applyDriverToForm(created));
        setApiLockedFields(collectApiLockedFieldsFromDriver(created));
      }
    } catch (error: unknown) {
      setAlertType('error');
      setAlertTitle('Failed to create');
      setAlertMessage(error instanceof Error ? error.message : 'Create failed');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const isVerified = loadedDriver?.is_verified ?? formData.is_verified;
  const phoneLocked = isEditMode || Boolean(loadedDriver?.phone?.trim());
  const phoneValue = phoneLocked && loadedDriver?.phone?.trim() ? loadedDriver.phone : formData.phone;
  const transportDoeWarning = loadedDriver ? getDriverTransportDoeWarning(loadedDriver) : null;

  const isFieldLocked = (key: DriverFieldLockKey) => isDriverFieldLocked(apiLockedFields, key);
  const lockedClass = (key: DriverFieldLockKey) =>
    isFieldLocked(key) ? DRIVER_LOCKED_INPUT_CLASS : '';

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[90vh] w-[95vw] sm:w-[90vw] md:w-full max-w-3xl translate-x-[-50%] translate-y-[-50%] overflow-y-auto">
            <div className="glass m-4 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <IdCard className="h-6 w-6 text-primary" />
                  <Dialog.Title className="text-xl font-semibold">
                    {isEditMode ? 'Edit driver' : 'Add driver'}
                  </Dialog.Title>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="rounded-lg p-1 hover:bg-muted/50 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {loadingDriver ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {isVerified && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
                      <Shield className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="truncate">
                        Verified
                        {(loadedDriver?.verified_at ?? formData.verified_at)
                          ? ` · ${formatDriverVerifiedAt(loadedDriver?.verified_at ?? formData.verified_at)}`
                          : ''}
                      </span>
                    </div>
                  )}

                  {transportDoeWarning && (
                    <div
                      className="flex items-start gap-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
                      role="status"
                    >
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden />
                      <p className="min-w-0 break-words leading-snug">{transportDoeWarning}</p>
                    </div>
                  )}

                  {!isVerified && (
                    <DriverLicenseOcrUpload
                      scanning={scanningOcr}
                      disabled={verifying || loading}
                      onScan={(front, back) => void handleOcrScan(front, back)}
                      onClear={handleClearOcr}
                    />
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1">Licence number</label>
                    <div>
                      <input
                        type="text"
                        className={`w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono uppercase ${
                          errors.license_number ? 'border-red-500' : ''
                        } ${lockedClass('license_number')}`}
                        value={formData.license_number}
                        onChange={(e) => {
                          if (isFieldLocked('license_number')) return;
                          const sanitized = sanitizeDrivingLicenseInput(e.target.value);
                          setFormData((p) => ({ ...p, license_number: sanitized }));
                          if (errors.license_number) {
                            setErrors((prev) => {
                              const { license_number: _drop, ...rest } = prev;
                              return rest;
                            });
                          }
                        }}
                        placeholder={DRIVING_LICENSE_DISPLAY_EXAMPLE}
                        maxLength={DRIVING_LICENSE_MAX_LENGTH}
                        autoComplete="off"
                        disabled={isEditMode || isFieldLocked('license_number')}
                        readOnly={isFieldLocked('license_number')}
                      />
                    </div>
                    {errors.license_number && (
                      <p className="mt-1 text-xs text-red-600">{errors.license_number}</p>
                    )}
                    {!errors.license_number && (
                      <div className="mt-1 space-y-0.5">
                        <p className="text-xs text-muted-foreground">{DRIVING_LICENSE_FORMAT_HINT}</p>
                        <p className="text-xs text-muted-foreground">{DRIVING_LICENSE_FORMAT_EXAMPLE}</p>
                      </div>
                    )}
                    {!isVerified && (
                      <div className="mt-2">
                        <label className="block text-xs font-medium mb-1 text-muted-foreground">
                          Date of birth (required for Surepass verify)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="DD/MM/YYYY"
                            maxLength={INDIAN_DATE_INPUT_MAX_LENGTH}
                            className={`flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm ${
                              errors.verify_dob ? 'border-red-500' : ''
                            } ${lockedClass('date_of_birth')}`}
                            value={verifyDob}
                            onChange={(e) => {
                              if (isFieldLocked('date_of_birth')) return;
                              setVerifyDob(formatIndianDateInput(e.target.value));
                              if (errors.verify_dob) {
                                setErrors((prev) => {
                                  const { verify_dob: _drop, ...rest } = prev;
                                  return rest;
                                });
                              }
                            }}
                            disabled={isFieldLocked('date_of_birth')}
                            readOnly={isFieldLocked('date_of_birth')}
                          />
                          <button
                            type="button"
                            onClick={() => void handleVerify()}
                            disabled={verifying || !canVerify}
                            className="px-4 py-2 shrink-0 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                          >
                            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                            Verify
                          </button>
                        </div>
                        {errors.verify_dob ? (
                          <p className="mt-1 text-xs text-red-600">{errors.verify_dob}</p>
                        ) : (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {INDIAN_DATE_FORMAT_HINT} — sent to Surepass with the licence number
                          </p>
                        )}
                      </div>
                    )}
                    {formData.is_verified && !loadedDriver?.is_verified && (
                      <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                        <Check className="h-3 w-3 shrink-0" /> Verified via Surepass (will persist on save)
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <PhoneInput
                      className={`w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ${
                        phoneLocked ? DRIVER_LOCKED_INPUT_CLASS : ''
                      }`}
                      value={phoneValue}
                      onChange={(phone) => {
                        if (phoneLocked) return;
                        setFormData((p) => ({ ...p, phone }));
                      }}
                      readOnly={phoneLocked}
                      disabled={phoneLocked}
                    />
                    {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                      type="text"
                      className={`w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ${lockedClass('name')}`}
                      value={formData.name ?? ''}
                      onChange={(e) => {
                        if (isFieldLocked('name')) return;
                        setFormData((p) => ({ ...p, name: e.target.value || null }));
                      }}
                      placeholder="As on licence"
                      disabled={isFieldLocked('name')}
                      readOnly={isFieldLocked('name')}
                    />
                  </div>

                  <DriverProfileSection
                    loadedDriver={loadedDriver}
                    formData={formData}
                    lockedClass={lockedClass}
                  />

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      className="rounded-lg px-4 py-2 text-sm hover:bg-muted"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary rounded-xl inline-flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-60"
                    >
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      {isEditMode ? 'Save' : 'Create'}
                    </button>
                  </div>
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

import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { X, IdCard, Shield, Loader2, Check } from 'lucide-react';
import { driversAPI } from '../../../services/drivers.api';
import { AlertDialog } from '../../shared/AlertDialog';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import type { CreateDriverRequest, Driver, DriverVerificationResponse, SurepassVerificationSnapshot } from '../../../types/entities';
import { PhoneInput } from '../../shared/PhoneInput';
import { sanitizePhoneInput, validatePhone, sanitizeDrivingLicenseInput, getDrivingLicenseValidationError, validateDrivingLicense, DRIVING_LICENSE_DISPLAY_EXAMPLE, DRIVING_LICENSE_FORMAT_HINT, DRIVING_LICENSE_MAX_LENGTH } from '../../../utils/validation';
import { buildSurepassSnapshot } from '../../../utils/kycVerification';
import { formatDriverVerifiedAt } from '../../../utils/driverVerification';
import {
  collectApiLockedFieldsFromDriver,
  collectApiLockedFieldsFromVerifyResult,
  DRIVER_LOCKED_INPUT_CLASS,
  isDriverFieldLocked,
  type DriverFieldLockKey,
} from '../../../utils/driverAutofillLocks';
import { getIsoDateValidationError, ISO_DATE_FORMAT_HINT, normalizeIsoDateInput } from '../../../utils/dateFormatting';
import { resolveDriverLicenseExpiry } from '../../../utils/driverProfile';
import { DriverProfileSection } from './DriverProfileSection';

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
    license_expires_at: resolveDriverLicenseExpiry(d),
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
  const [markingUnverified, setMarkingUnverified] = useState(false);
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
      if (d.date_of_birth) setVerifyDob(normalizeIsoDateInput(d.date_of_birth));
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
      if (d.date_of_birth) setVerifyDob(normalizeIsoDateInput(d.date_of_birth));
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
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const licenseError = getDrivingLicenseValidationError(formData.license_number);
    if (licenseError) newErrors.license_number = licenseError;

    const phone = sanitizePhoneInput(formData.phone);
    if (!phone) newErrors.phone = 'Phone is required';
    else if (!validatePhone(phone)) newErrors.phone = 'Enter a valid 10-digit mobile number';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildVerificationDetailsFromResponse = (
    r: DriverVerificationResponse,
  ): SurepassVerificationSnapshot =>
    r.surepass_response
      ? buildSurepassSnapshot(r.surepass_response, {
          license_number: r.license_number,
          full_name: r.full_name,
          date_of_birth: r.date_of_birth,
          date_of_expiry: r.date_of_expiry,
          age: r.age,
          address: r.address,
          pincode: r.pincode,
          state: r.state,
          gender: r.gender,
          blood_group: r.blood_group,
          vehicle_classes: r.vehicle_classes,
          father_or_husband_name: r.father_or_husband_name,
          profile_image: r.profile_image,
        })
      : {
          provider: 'surepass',
          verified_at: new Date().toISOString(),
          raw: { success: true, status_code: 200, message: null },
          mapped: {
            license_number: r.license_number,
            full_name: r.full_name ?? r.name,
            date_of_birth: r.date_of_birth,
            date_of_expiry: r.date_of_expiry ?? r.doe,
            age: r.age,
            address: r.address,
            pincode: r.pincode,
            state: r.state,
            gender: r.gender,
            blood_group: r.blood_group,
            vehicle_classes: r.vehicle_classes,
            father_or_husband_name: r.father_or_husband_name,
            profile_image: r.profile_image,
          },
        };

  const applyVerifyResult = (result: DriverVerificationResponse, persistedDriver?: Driver | null) => {
    const driver = persistedDriver ?? result.driver ?? null;

    if (driver) {
      setLoadedDriver(driver);
      setFormData(applyDriverToForm(driver));
      setApiLockedFields(collectApiLockedFieldsFromDriver(driver));
      if (driver.date_of_birth) setVerifyDob(normalizeIsoDateInput(driver.date_of_birth));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      license_number: result.license_number || prev.license_number,
      name: (result.full_name ?? result.name)?.trim() || prev.name,
      date_of_birth: result.date_of_birth ? normalizeIsoDateInput(result.date_of_birth) || null : prev.date_of_birth ?? null,
      license_expires_at: resolveDriverLicenseExpiry(result) ?? prev.license_expires_at ?? null,
      address: result.address ?? prev.address ?? null,
      pincode: result.pincode ?? prev.pincode ?? null,
      gender: result.gender ?? prev.gender ?? null,
      profile_image: result.profile_image ?? prev.profile_image ?? null,
      vehicle_classes: result.vehicle_classes ?? prev.vehicle_classes ?? null,
      is_verified: true,
      verified_at: new Date().toISOString(),
      verification_details: buildVerificationDetailsFromResponse(result),
    }));
    setApiLockedFields(collectApiLockedFieldsFromVerifyResult(result));
    if (result.date_of_birth) setVerifyDob(normalizeIsoDateInput(result.date_of_birth));
  };

  const canVerify =
    validateDrivingLicense(formData.license_number) &&
    Boolean(verifyDob.trim()) &&
    !getIsoDateValidationError(verifyDob, true);

  const handleVerify = async () => {
    const dobError = getIsoDateValidationError(verifyDob, true);
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

  const handleMarkUnverified = async () => {
    if (!driverId || !loadedDriver?.is_verified) return;
    setMarkingUnverified(true);
    try {
      await driversAPI.updateDriver(driverId, { is_verified: false });
      await loadDriver();
      setAlertType('success');
      setAlertTitle('Marked unverified');
      setAlertMessage('Driver verification status cleared. You can verify again with DOB.');
      setAlertOpen(true);
    } catch (error: unknown) {
      setAlertType('error');
      setAlertTitle('Failed to update');
      setAlertMessage(error instanceof Error ? error.message : 'Could not mark driver unverified');
      setAlertOpen(true);
    } finally {
      setMarkingUnverified(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload: CreateDriverRequest = {
      license_number: sanitizeDrivingLicenseInput(formData.license_number),
      phone: sanitizePhoneInput(formData.phone),
      name: formData.name?.trim() || null,
    };

    if (formData.is_verified && !isEditMode) {
      payload.is_verified = true;
      payload.verified_at = formData.verified_at;
      payload.verification_details = formData.verification_details ?? null;
      payload.date_of_birth = formData.date_of_birth ?? null;
      payload.license_expires_at = formData.license_expires_at ?? null;
      payload.address = formData.address ?? null;
      payload.pincode = formData.pincode ?? null;
      payload.gender = formData.gender ?? null;
      payload.profile_image = formData.profile_image ?? null;
      payload.vehicle_classes = formData.vehicle_classes ?? null;
    }

    if (isEditMode && driverId) {
      if (loadedDriver?.is_verified) {
        payload.is_verified = loadedDriver.is_verified;
        payload.verified_at = loadedDriver.verified_at;
        payload.verification_details = loadedDriver.verification_details;
        payload.date_of_birth = loadedDriver.date_of_birth ?? null;
        payload.license_expires_at = resolveDriverLicenseExpiry(loadedDriver);
        payload.address = loadedDriver.address ?? null;
        payload.pincode = loadedDriver.pincode ?? null;
        payload.gender = loadedDriver.gender ?? null;
        payload.profile_image = loadedDriver.profile_image ?? null;
        payload.vehicle_classes = loadedDriver.vehicle_classes ?? null;
        payload.name = loadedDriver.name ?? payload.name;
      }
      setLoading(true);
      try {
        await driversAPI.updateDriver(driverId, payload);
        setAlertType('success');
        setAlertTitle('Success');
        setAlertMessage('Driver updated successfully');
        setAlertOpen(true);
        onOpenChange(false);
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
      const created = await driversAPI.createDriver(payload);

      if (verifyDob.trim() && validateDrivingLicense(formData.license_number)) {
        try {
          await driversAPI.verifyDriverById(created.id, { dob: normalizeIsoDateInput(verifyDob) });
        } catch {
          // Driver created; verify can be retried from edit
        }
      }

      setAlertType('success');
      setAlertTitle('Success');
      setAlertMessage('Driver created successfully');
      setAlertOpen(true);
      onOpenChange(false);
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
  const verificationPayload =
    loadedDriver?.verification_details ?? formData.verification_details ?? null;
  const verificationJson =
    verificationPayload != null ? JSON.stringify(verificationPayload, null, 2) : '';

  const isFieldLocked = (key: DriverFieldLockKey) => isDriverFieldLocked(apiLockedFields, key);
  const lockedClass = (key: DriverFieldLockKey) =>
    isFieldLocked(key) ? DRIVER_LOCKED_INPUT_CLASS : '';

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[90vh] max-w-xl translate-x-[-50%] translate-y-[-50%] w-full overflow-y-auto">
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
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <Shield className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="truncate">
                          Verified
                          {(loadedDriver?.verified_at ?? formData.verified_at)
                            ? ` · ${formatDriverVerifiedAt(loadedDriver?.verified_at ?? formData.verified_at)}`
                            : ''}
                        </span>
                      </div>
                      {isEditMode && loadedDriver?.is_verified && (
                        <button
                          type="button"
                          onClick={() => void handleMarkUnverified()}
                          disabled={markingUnverified}
                          className="shrink-0 text-xs text-muted-foreground hover:text-foreground underline disabled:opacity-50"
                        >
                          {markingUnverified ? 'Updating…' : 'Mark unverified'}
                        </button>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1">Licence number</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className={`flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono uppercase ${
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
                      {!isVerified && (
                        <button
                          type="button"
                          onClick={() => void handleVerify()}
                          disabled={verifying || !canVerify}
                          className="px-4 py-2 shrink-0 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                        >
                          {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                          Verify
                        </button>
                      )}
                    </div>
                    {errors.license_number && (
                      <p className="mt-1 text-xs text-red-600">{errors.license_number}</p>
                    )}
                    {!errors.license_number && (
                      <p className="mt-1 text-xs text-muted-foreground">{DRIVING_LICENSE_FORMAT_HINT}</p>
                    )}
                    {!isVerified && (
                      <div className="mt-2">
                        <label className="block text-xs font-medium mb-1 text-muted-foreground">
                          Date of birth (required for Surepass verify)
                        </label>
                        <input
                          type="date"
                          className={`w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ${
                            errors.verify_dob ? 'border-red-500' : ''
                          } ${lockedClass('date_of_birth')}`}
                          value={verifyDob}
                          onChange={(e) => {
                            if (isFieldLocked('date_of_birth')) return;
                            const normalized = normalizeIsoDateInput(e.target.value);
                            setVerifyDob(normalized);
                            if (errors.verify_dob) {
                              setErrors((prev) => {
                                const { verify_dob: _drop, ...rest } = prev;
                                return rest;
                              });
                            }
                          }}
                          max={new Date().toISOString().slice(0, 10)}
                          disabled={isFieldLocked('date_of_birth')}
                          readOnly={isFieldLocked('date_of_birth')}
                        />
                        {errors.verify_dob ? (
                          <p className="mt-1 text-xs text-red-600">{errors.verify_dob}</p>
                        ) : (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {ISO_DATE_FORMAT_HINT} — sent to Surepass with the licence number
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
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={formData.phone}
                      onChange={(phone) => setFormData((p) => ({ ...p, phone }))}
                    />
                    {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Name (optional)</label>
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

                  {verificationJson ? (
                    <div>
                      <p className="text-sm font-medium mb-1">Last verification payload</p>
                      <pre className="max-h-40 overflow-auto rounded-lg border border-border bg-muted/40 p-3 text-xs whitespace-pre-wrap">
                        {verificationJson}
                      </pre>
                    </div>
                  ) : null}

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

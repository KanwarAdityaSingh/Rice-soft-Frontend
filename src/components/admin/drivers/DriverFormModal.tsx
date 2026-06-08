import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { X, IdCard, Shield, Loader2, Check } from 'lucide-react';
import { driversAPI } from '../../../services/drivers.api';
import { AlertDialog } from '../../shared/AlertDialog';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import type { CreateDriverRequest, Driver, DriverVerificationResponse, SurepassVerificationSnapshot } from '../../../types/entities';
import { KycVerificationDetailsPanel } from '../../shared/KycVerificationDetailsPanel';
import { buildSurepassSnapshot, collectDriverKycEntries } from '../../../utils/kycVerification';

function normalizeLicenseInput(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toUpperCase();
}

/** Keep 10-digit Indian mobile; strip leading 91 or 0 */
function normalizeIndianPhone(value: string): string {
  const d = value.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) return d.slice(2);
  if (d.length === 11 && d.startsWith('0')) return d.slice(1);
  return d.slice(0, 10);
}

interface DriverFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverId?: string | null;
}

export function DriverFormModal({ open, onOpenChange, driverId }: DriverFormModalProps) {
  const isEditMode = Boolean(driverId);

  const [formData, setFormData] = useState<CreateDriverRequest>({
    license_number: '',
    phone: '',
    name: null,
    is_verified: false,
    verified_at: null,
    verification_details: null,
    is_active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingDriver, setLoadingDriver] = useState(false);
  const [loadedDriver, setLoadedDriver] = useState<Driver | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyDob, setVerifyDob] = useState('');
  const [verifiedFields, setVerifiedFields] = useState<Set<string>>(new Set());
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
      setFormData({
        license_number: d.license_number,
        phone: d.phone,
        name: d.name,
        is_verified: d.is_verified,
        verified_at: d.verified_at,
        verification_details: d.verification_details,
        is_active: d.is_active,
      });
      if (d.is_verified) {
        const next = new Set<string>();
        if (d.license_number) next.add('license_number');
        if (d.name) next.add('name');
        setVerifiedFields(next);
      } else {
        setVerifiedFields(new Set());
      }
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

  const resetForm = () => {
    setLoadedDriver(null);
    setFormData({
      license_number: '',
      phone: '',
      name: null,
      is_verified: false,
      verified_at: null,
      verification_details: null,
      is_active: true,
    });
    setErrors({});
    setVerifiedFields(new Set());
    setVerifyDob('');
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const lic = normalizeLicenseInput(formData.license_number);
    if (!lic) newErrors.license_number = 'License number is required';

    const phone = normalizeIndianPhone(formData.phone);
    if (!phone) newErrors.phone = 'Phone is required';
    else if (phone.length !== 10) newErrors.phone = 'Enter a valid 10-digit Indian mobile number';

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
        })
      : {
          provider: 'surepass',
          verified_at: new Date().toISOString(),
          raw: { success: true, status_code: 200, message: null },
          mapped: {
            license_number: r.license_number,
            full_name: r.full_name,
            date_of_birth: r.date_of_birth,
            date_of_expiry: r.date_of_expiry,
            age: r.age,
            address: r.address,
          },
        };

  const handleVerify = async () => {
    const lic = normalizeLicenseInput(formData.license_number);
    if (!lic) {
      setErrors({ license_number: 'Enter licence number first' });
      return;
    }

    setVerifying(true);
    try {
      const result = await driversAPI.verifyDriver(lic, verifyDob || undefined, driverId ?? undefined);
      const nextVerified = new Set<string>();
      if (result.license_number) nextVerified.add('license_number');
      if (result.full_name) nextVerified.add('name');

      setFormData((prev) => ({
        ...prev,
        license_number: result.license_number || prev.license_number,
        name: result.full_name?.trim() || prev.name,
        is_verified: true,
        verified_at: new Date().toISOString(),
        verification_details: buildVerificationDetailsFromResponse(result),
      }));
      setVerifiedFields(nextVerified);
      setErrors((prev) => {
        if (!prev.license_number) return prev;
        const { license_number: _drop, ...rest } = prev;
        return rest;
      });
      setAlertType('success');
      setAlertTitle('Licence verified');
      setAlertMessage(
        `Name: ${result.full_name || 'N/A'}${result.date_of_expiry ? ` · Valid until ${result.date_of_expiry}` : ''}`,
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
      license_number: normalizeLicenseInput(formData.license_number),
      phone: normalizeIndianPhone(formData.phone),
      name: formData.name?.trim() || null,
      is_active: formData.is_active ?? true,
    };

    if (formData.is_verified) {
      payload.is_verified = true;
      payload.verified_at = formData.verified_at;
      payload.verification_details = formData.verification_details ?? null;
    }

    if (isEditMode && driverId) {
      if (loadedDriver?.is_verified) {
        payload.is_verified = loadedDriver.is_verified;
        payload.verified_at = loadedDriver.verified_at;
        payload.verification_details = loadedDriver.verification_details;
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
      await driversAPI.createDriver(payload);
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

  const verificationPayload =
    loadedDriver?.verification_details ?? formData.verification_details ?? null;
  const verificationJson =
    verificationPayload != null ? JSON.stringify(verificationPayload, null, 2) : '';

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[90vh] max-w-lg translate-x-[-50%] translate-y-[-50%] w-full overflow-y-auto">
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
                  {loadedDriver?.is_verified && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
                      <Shield className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Verified{loadedDriver.verified_at ? ` · ${new Date(loadedDriver.verified_at).toLocaleString('en-IN')}` : ''}</span>
                    </div>
                  )}

                  {isEditMode && (
                    <KycVerificationDetailsPanel
                      entries={collectDriverKycEntries(loadedDriver?.verification_details ?? formData.verification_details)}
                      title="Stored Surepass verification"
                      emptyMessage="No full Surepass snapshot saved yet. Verify in edit mode (or after the driver record exists) to persist the raw API response."
                    />
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1">Licence number</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className={`flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm read-only:cursor-not-allowed ${
                          errors.license_number ? 'border-red-500' : ''
                        } ${isEditMode ? 'opacity-60' : ''}`}
                        value={formData.license_number}
                        onChange={(e) => setFormData((p) => ({ ...p, license_number: e.target.value }))}
                        placeholder="e.g. DL04 20110012345"
                        autoComplete="off"
                        disabled={isEditMode}
                        readOnly={!isEditMode && verifiedFields.has('license_number')}
                      />
                      {!isEditMode && (
                        <button
                          type="button"
                          onClick={() => void handleVerify()}
                          disabled={verifying || !normalizeLicenseInput(formData.license_number)}
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
                    {!isEditMode && (
                      <div className="mt-2">
                        <label className="block text-xs font-medium mb-1 text-muted-foreground">
                          Date of birth (for Surepass verify)
                        </label>
                        <input
                          type="date"
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                          value={verifyDob}
                          onChange={(e) => setVerifyDob(e.target.value)}
                          max={new Date().toISOString().slice(0, 10)}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          YYYY-MM-DD — required by Surepass for some licences
                        </p>
                      </div>
                    )}
                    {formData.is_verified && (
                      <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                        <Check className="h-3 w-3 shrink-0" /> Verified via Surepass
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <input
                      type="tel"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={formData.phone}
                      onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="10-digit mobile or 91…"
                      autoComplete="tel"
                    />
                    {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Name (optional)</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm read-only:cursor-not-allowed"
                      value={formData.name ?? ''}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value || null }))}
                      placeholder="As on licence"
                      readOnly={verifiedFields.has('name')}
                    />
                  </div>

                  {isEditMode && (
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_active ?? true}
                        onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
                      />
                      Active
                    </label>
                  )}

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

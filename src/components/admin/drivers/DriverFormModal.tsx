import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { X, IdCard, Shield, Loader2 } from 'lucide-react';
import { driversAPI } from '../../../services/drivers.api';
import { AlertDialog } from '../../shared/AlertDialog';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import type { CreateDriverRequest, Driver } from '../../../types/entities';

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
    is_active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingDriver, setLoadingDriver] = useState(false);
  const [loadedDriver, setLoadedDriver] = useState<Driver | null>(null);
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
      is_active: true,
    });
    setErrors({});
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload: CreateDriverRequest = {
      license_number: normalizeLicenseInput(formData.license_number),
      phone: normalizeIndianPhone(formData.phone),
      name: formData.name?.trim() || null,
      is_active: formData.is_active ?? true,
    };

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

  const verificationJson =
    loadedDriver?.verification_details != null
      ? JSON.stringify(loadedDriver.verification_details, null, 2)
      : '';

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

                  <div>
                    <label className="block text-sm font-medium mb-1">License number</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={formData.license_number}
                      onChange={(e) => setFormData((p) => ({ ...p, license_number: e.target.value }))}
                      placeholder="e.g. DL-1420110012345"
                      autoComplete="off"
                    />
                    {errors.license_number && (
                      <p className="mt-1 text-xs text-red-600">{errors.license_number}</p>
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
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={formData.name ?? ''}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value || null }))}
                      placeholder="As on licence"
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

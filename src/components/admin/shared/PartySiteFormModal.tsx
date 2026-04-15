import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { vendorSitesAPI } from '../../../services/vendorSites.api';
import { salesPartySitesAPI } from '../../../services/salesPartySites.api';
import type { VendorAddress } from '../../../types/entities';
import { validateGoogleLocationLink } from '../../../utils/validation';
import { AlertDialog } from '../../shared/AlertDialog';

export type PartySiteKind = 'vendor' | 'sales_party';

const emptyAddress = (): VendorAddress => ({
  street: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
});

interface PartySiteFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: PartySiteKind;
  partyId: string;
  partyName?: string;
  /** When set, load and update this site */
  siteId?: string | null;
  onSaved?: () => void;
}

export function PartySiteFormModal({
  open,
  onOpenChange,
  kind,
  partyId,
  partyName,
  siteId,
  onSaved,
}: PartySiteFormModalProps) {
  const isEdit = Boolean(siteId);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [address, setAddress] = useState<VendorAddress>(emptyAddress);
  const [googleLocationLink, setGoogleLocationLink] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    if (!open) return;

    if (!siteId) {
      setAddress(emptyAddress());
      setGoogleLocationLink('');
      setIsActive(true);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const site =
          kind === 'vendor'
            ? await vendorSitesAPI.getById(siteId)
            : await salesPartySitesAPI.getById(siteId);
        if (cancelled) return;
        setAddress({
          street: site.address?.street ?? '',
          city: site.address?.city ?? '',
          state: site.address?.state ?? '',
          pincode: site.address?.pincode ?? '',
          country: site.address?.country ?? 'India',
        });
        setGoogleLocationLink(site.google_location_link?.trim() ?? '');
        setIsActive(site.is_active !== false);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to load site';
        setAlertType('error');
        setAlertTitle('Error');
        setAlertMessage(msg);
        setAlertOpen(true);
        onOpenChange(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, siteId, kind, onOpenChange, partyName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const gl = googleLocationLink.trim();
    if (gl && validateGoogleLocationLink(gl) === false) {
      setAlertType('error');
      setAlertTitle('Validation');
      setAlertMessage('Please enter a valid Google Maps link, or leave it blank.');
      setAlertOpen(true);
      return;
    }

    if (!address.street.trim() || !address.city.trim() || !address.state.trim() || !address.pincode.trim()) {
      setAlertType('error');
      setAlertTitle('Validation');
      setAlertMessage('Street, city, state, and pincode are required.');
      setAlertOpen(true);
      return;
    }

    const siteName = partyName?.trim() || null;

    setSaving(true);
    try {
      if (kind === 'vendor') {
        if (isEdit && siteId) {
          await vendorSitesAPI.update(siteId, {
            name: siteName,
            address: { ...address, country: address.country.trim() || 'India' },
            google_location_link: gl || null,
            is_active: isActive,
          });
        } else {
          await vendorSitesAPI.create({
            vendor_id: partyId,
            name: siteName,
            address: { ...address, country: address.country.trim() || 'India' },
            google_location_link: gl || null,
            is_active: isActive,
          });
        }
      } else {
        if (isEdit && siteId) {
          await salesPartySitesAPI.update(siteId, {
            name: siteName,
            address: { ...address, country: address.country.trim() || 'India' },
            google_location_link: gl || null,
            is_active: isActive,
          });
        } else {
          await salesPartySitesAPI.create({
            sales_party_id: partyId,
            name: siteName,
            address: { ...address, country: address.country.trim() || 'India' },
            google_location_link: gl || null,
            is_active: isActive,
          });
        }
      }
      onSaved?.();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Could not save site.';
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(msg);
      setAlertOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const title = isEdit ? 'Edit site' : 'Add site';
  const displayPartyName = partyName?.trim() || '—';

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] w-[min(100vw-1.5rem,28rem)] max-h-[90vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-background p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
              </div>
              <Dialog.Close className="rounded-lg p-1.5 hover:bg-muted">
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Name</label>
                  <input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    className="mt-1 w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm text-foreground cursor-default"
                    value={displayPartyName}
                    aria-readonly="true"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Street *</label>
                  <input
                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    value={address.street}
                    onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">City *</label>
                    <input
                      className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      value={address.city}
                      onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">State *</label>
                    <input
                      className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      value={address.state}
                      onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Pincode *</label>
                    <input
                      className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      value={address.pincode}
                      onChange={(e) => setAddress((a) => ({ ...a, pincode: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Country</label>
                    <input
                      className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      value={address.country}
                      onChange={(e) => setAddress((a) => ({ ...a, country: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Google Maps link (optional)</label>
                  <input
                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    value={googleLocationLink}
                    onChange={(e) => setGoogleLocationLink(e.target.value)}
                    placeholder="https://maps.google.com/..."
                  />
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-border"
                  />
                  Active
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" className="btn-secondary rounded-lg px-4 py-2 text-sm" onClick={() => onOpenChange(false)}>
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="btn-primary rounded-lg px-4 py-2 text-sm inline-flex items-center gap-2">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isEdit ? 'Save' : 'Create'}
                  </button>
                </div>
              </form>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen} type={alertType} title={alertTitle} message={alertMessage} />
    </>
  );
}

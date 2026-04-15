import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, Pencil, Trash2, MapPin } from 'lucide-react';
import { vendorSitesAPI } from '../../../services/vendorSites.api';
import { salesPartySitesAPI } from '../../../services/salesPartySites.api';
import type { VendorSite, SalesPartySite } from '../../../types/entities';
import { PartySiteFormModal, type PartySiteKind } from './PartySiteFormModal';
import { ConfirmDialog } from './ConfirmDialog';
import { EmptyState } from './EmptyState';

type SiteRow = VendorSite | SalesPartySite;

interface PartySitesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: PartySiteKind;
  partyId: string;
  partyName: string;
  onSitesChanged?: () => void;
}

export function PartySitesDialog({
  open,
  onOpenChange,
  kind,
  partyId,
  partyName,
  onSitesChanged,
}: PartySitesDialogProps) {
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [editSiteId, setEditSiteId] = useState<string | null>(null);
  const [deleteSite, setDeleteSite] = useState<{ id: string; label: string } | null>(null);

  const load = useCallback(async () => {
    if (!partyId) return;
    setLoading(true);
    try {
      const list =
        kind === 'vendor'
          ? await vendorSitesAPI.list(partyId, true)
          : await salesPartySitesAPI.list(partyId, true);
      setSites(Array.isArray(list) ? list : []);
    } catch {
      setSites([]);
    } finally {
      setLoading(false);
    }
  }, [kind, partyId]);

  useEffect(() => {
    if (open) {
      load();
      setEditSiteId(null);
    }
  }, [open, load]);

  const handleDelete = async () => {
    const target = deleteSite;
    if (!target) return;
    try {
      if (kind === 'vendor') {
        await vendorSitesAPI.remove(target.id);
      } else {
        await salesPartySitesAPI.remove(target.id);
      }
      onSitesChanged?.();
      await load();
    } catch {
      // eslint-disable-next-line no-alert
      alert('Could not remove this site. Please try again.');
    } finally {
      setDeleteSite(null);
    }
  };

  const label = kind === 'vendor' ? 'purchase party' : 'sales party';
  const title = `Extra sites — ${partyName.trim() || partyId.slice(0, 8)}`;

  const formatAddress = (a: SiteRow['address']) =>
    [a.street, a.city, a.state, a.pincode, a.country].filter(Boolean).join(', ');

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[55] w-[min(100vw-1.5rem,42rem)] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 flex flex-col rounded-2xl border border-border bg-background shadow-xl overflow-hidden">
            <div className="flex-shrink-0 flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-border">
              <div>
                <Dialog.Title className="text-lg font-semibold pr-8">{title}</Dialog.Title>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Additional locations for this {label}. Primary address is on the {label} card.
                </p>
              </div>
              <Dialog.Close className="rounded-lg p-1.5 hover:bg-muted shrink-0">
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 min-h-[12rem]">
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : sites.length === 0 ? (
                <EmptyState
                  icon={MapPin}
                  title="No extra sites"
                  description="Use “Add site” on the card to record another address."
                />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left">
                        <th className="py-2.5 px-3 font-medium">Name</th>
                        <th className="py-2.5 px-3 font-medium">Address</th>
                        <th className="py-2.5 px-3 font-medium w-24">Status</th>
                        <th className="py-2.5 px-3 font-medium text-right w-28">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {sites.map((site) => (
                        <tr key={site.id} className="hover:bg-muted/20">
                          <td className="py-2.5 px-3 align-top">{site.name?.trim() || '—'}</td>
                          <td className="py-2.5 px-3 align-top text-muted-foreground max-w-[14rem]">
                            <span className="line-clamp-3">{formatAddress(site.address)}</span>
                          </td>
                          <td className="py-2.5 px-3 align-top">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-md ${
                                site.is_active ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {site.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 align-top text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium hover:bg-muted"
                                onClick={() => setEditSiteId(site.id)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                onClick={() =>
                                  setDeleteSite({
                                    id: site.id,
                                    label: site.name?.trim() || formatAddress(site.address).slice(0, 48),
                                  })
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
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

      <PartySiteFormModal
        open={editSiteId !== null}
        onOpenChange={(o) => {
          if (!o) setEditSiteId(null);
        }}
        kind={kind}
        partyId={partyId}
        partyName={partyName}
        siteId={editSiteId}
        onSaved={() => {
          onSitesChanged?.();
          load();
        }}
      />

      <ConfirmDialog
        open={deleteSite !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteSite(null);
        }}
        onConfirm={handleDelete}
        title="Remove site"
        description={
          deleteSite
            ? `Soft-delete this site (${deleteSite.label})? You can add it again later if needed.`
            : ''
        }
        confirmText="Remove"
      />
    </>
  );
}

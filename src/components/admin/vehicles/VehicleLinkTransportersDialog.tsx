import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { X, Truck, Check, RefreshCw, ChevronDown, ExternalLink } from 'lucide-react';
import { vehiclesAPI } from '../../../services/vehicles.api';
import { useTransporters } from '../../../hooks/useTransporters';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { AlertDialog } from '../../shared/AlertDialog';
import { getDirectoryTransportersPagePath } from '../../../utils/appRoutes';
import { getUserFacingApiErrorMessage } from '../../../utils/errorHandler';

interface VehicleLinkTransportersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  vehicleNumber?: string;
  onSaved?: () => void;
}

export function VehicleLinkTransportersDialog({
  open,
  onOpenChange,
  vehicleId,
  vehicleNumber,
  onSaved,
}: VehicleLinkTransportersDialogProps) {
  const { transporters, refetch: refetchTransporters, loading: loadingTransporters } = useTransporters();
  const [loadingVehicle, setLoadingVehicle] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    if (!open || !vehicleId) return;

    let cancelled = false;
    (async () => {
      setLoadingVehicle(true);
      try {
        const vehicle = await vehiclesAPI.getVehicleById(vehicleId);
        if (cancelled) return;
        setSelectedIds(vehicle.transporter_ids ?? []);
      } catch (error) {
        if (cancelled) return;
        setAlertMessage(getUserFacingApiErrorMessage(error, 'Failed to load vehicle'));
        setAlertOpen(true);
        onOpenChange(false);
      } finally {
        if (!cancelled) setLoadingVehicle(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, vehicleId, onOpenChange]);

  useEffect(() => {
    if (!open) {
      setDropdownOpen(false);
      setSelectedIds([]);
    }
  }, [open]);

  const toggleTransporter = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await vehiclesAPI.updateVehicle(vehicleId, { transporter_ids: selectedIds });
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      setAlertMessage(getUserFacingApiErrorMessage(error, 'Failed to update linked transporters'));
      setAlertOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const activeTransporters = transporters.filter((t) => t.is_active);

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-full max-w-md translate-x-[-50%] translate-y-[-50%]">
            <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-primary/20 rounded-lg shrink-0">
                    <Truck className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <Dialog.Title className="text-lg font-semibold">Add linked transporter</Dialog.Title>
                    <Dialog.Description className="text-sm text-muted-foreground mt-0.5 truncate">
                      {vehicleNumber ?? 'Vehicle'}
                    </Dialog.Description>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {loadingVehicle ? (
                <div className="flex justify-center py-10">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <label className="block text-sm font-medium">Linked transporters</label>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            window.open(getDirectoryTransportersPagePath({ create: true }), '_blank', 'noopener,noreferrer')
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          Add Transporter
                        </button>
                        <button
                          type="button"
                          onClick={() => refetchTransporters()}
                          disabled={loadingTransporters}
                          className="p-1 hover:bg-muted rounded"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${loadingTransporters ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">
                          {selectedIds.length > 0
                            ? `${selectedIds.length} selected`
                            : 'Select transporters...'}
                        </span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {dropdownOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {activeTransporters.map((t) => {
                            const isSelected = selectedIds.includes(t.id);
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => toggleTransporter(t.id)}
                                className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                                  isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                                }`}
                              >
                                <span>{t.business_name}</span>
                                {isSelected && <Check className="h-4 w-4" />}
                              </button>
                            );
                          })}
                          {activeTransporters.length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">No transporters available</div>
                          )}
                        </div>
                      )}
                    </div>
                    {selectedIds.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedIds.map((id) => {
                          const transporter = transporters.find((t) => t.id === id);
                          if (!transporter) return null;
                          return (
                            <div
                              key={id}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                            >
                              <span>{transporter.business_name}</span>
                              <button
                                type="button"
                                onClick={() => toggleTransporter(id)}
                                className="hover:bg-primary/20 rounded-full p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        type="error"
        title="Error"
        message={alertMessage}
      />
    </>
  );
}

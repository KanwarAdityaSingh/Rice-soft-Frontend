import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useMemo, useState } from 'react';
import { X, Car, Check, RefreshCw, ChevronDown, ExternalLink } from 'lucide-react';
import { vehiclesAPI } from '../../../services/vehicles.api';
import { useVehicles } from '../../../hooks/useVehicles';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { AlertDialog } from '../../shared/AlertDialog';
import { getDirectoryVehiclesPagePath } from '../../../utils/appRoutes';
import { getUserFacingApiErrorMessage } from '../../../utils/errorHandler';

interface TransporterLinkVehiclesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transporterId: string;
  transporterName?: string;
  onSaved?: () => void;
}

export function TransporterLinkVehiclesDialog({
  open,
  onOpenChange,
  transporterId,
  transporterName,
  onSaved,
}: TransporterLinkVehiclesDialogProps) {
  const { vehicles, refetch: refetchVehicles, loading: loadingVehicles } = useVehicles(undefined, {
    excludeVerificationDetails: true,
  });
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [initialIds, setInitialIds] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const activeVehicles = useMemo(
    () => vehicles.filter((v) => v.is_active),
    [vehicles],
  );

  useEffect(() => {
    if (!open || !transporterId) return;

    const linked = activeVehicles
      .filter((v) => v.transporter_ids?.includes(transporterId))
      .map((v) => v.id);
    setSelectedIds(linked);
    setInitialIds(linked);
  }, [open, transporterId, activeVehicles]);

  useEffect(() => {
    if (!open) {
      setDropdownOpen(false);
      setSelectedIds([]);
      setInitialIds([]);
    }
  }, [open]);

  const toggleVehicle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSave = async () => {
    const toLink = selectedIds.filter((id) => !initialIds.includes(id));
    const toUnlink = initialIds.filter((id) => !selectedIds.includes(id));

    if (toLink.length === 0 && toUnlink.length === 0) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      const updates = [
        ...toLink.map(async (vehicleId) => {
          const vehicle = activeVehicles.find((v) => v.id === vehicleId);
          if (!vehicle) return;
          const nextIds = [...new Set([...(vehicle.transporter_ids ?? []), transporterId])];
          await vehiclesAPI.updateVehicle(vehicleId, { transporter_ids: nextIds });
        }),
        ...toUnlink.map(async (vehicleId) => {
          const vehicle = activeVehicles.find((v) => v.id === vehicleId);
          if (!vehicle) return;
          const nextIds = (vehicle.transporter_ids ?? []).filter((id) => id !== transporterId);
          await vehiclesAPI.updateVehicle(vehicleId, { transporter_ids: nextIds });
        }),
      ];
      await Promise.all(updates);
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      setAlertMessage(getUserFacingApiErrorMessage(error, 'Failed to update linked vehicles'));
      setAlertOpen(true);
    } finally {
      setSaving(false);
    }
  };

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
                    <Car className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <Dialog.Title className="text-lg font-semibold">Add linked vehicle</Dialog.Title>
                    <Dialog.Description className="text-sm text-muted-foreground mt-0.5 truncate">
                      {transporterName ?? 'Transporter'}
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

              {loadingVehicles && activeVehicles.length === 0 ? (
                <div className="flex justify-center py-10">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium">Linked vehicles</label>
                      <button
                        type="button"
                        onClick={() => refetchVehicles()}
                        disabled={loadingVehicles}
                        className="p-1 hover:bg-muted rounded"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${loadingVehicles ? 'animate-spin' : ''}`} />
                      </button>
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
                            : 'Select vehicles...'}
                        </span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {dropdownOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {activeVehicles.map((v) => {
                            const isSelected = selectedIds.includes(v.id);
                            return (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => toggleVehicle(v.id)}
                                className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                                  isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                                }`}
                              >
                                <span>{v.vehicle_number}</span>
                                {isSelected && <Check className="h-4 w-4" />}
                              </button>
                            );
                          })}
                          {activeVehicles.length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">No vehicles available</div>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        window.open(getDirectoryVehiclesPagePath({ create: true }), '_blank', 'noopener,noreferrer')
                      }
                      className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      Add Vehicle
                    </button>
                    {selectedIds.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedIds.map((id) => {
                          const vehicle = activeVehicles.find((v) => v.id === id);
                          if (!vehicle) return null;
                          return (
                            <div
                              key={id}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                            >
                              <span>{vehicle.vehicle_number}</span>
                              <button
                                type="button"
                                onClick={() => toggleVehicle(id)}
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

import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState, type ReactNode } from 'react';
import { X, Car, Shield, Truck } from 'lucide-react';
import { vehiclesAPI } from '../../../services/vehicles.api';
import { useTransporters } from '../../../hooks/useTransporters';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { KycVerificationDetailsPanel } from '../../shared/KycVerificationDetailsPanel';
import { VehicleLinkedIspsList } from './VehicleLinkedIspsList';
import { collectVehicleKycEntries } from '../../../utils/kycVerification';
import type { InwardSlipPass, RiceCode, RiceType, RcFullData, Sauda, Vehicle } from '../../../types/entities';

interface VehicleDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string | null;
  inwardSlipPasses?: InwardSlipPass[];
  saudas?: Sauda[];
  riceCodes?: RiceCode[];
  riceTypes?: RiceType[];
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground uppercase tracking-wide">{label}</label>
      <p className="mt-1 text-sm font-medium break-words">{value ?? '-'}</p>
    </div>
  );
}

function getRcFullExtras(details?: Vehicle['verification_details']) {
  const mapped = details?.rc_full?.mapped as RcFullData | undefined;
  if (!mapped) return null;
  return {
    chassisNumber: mapped.vehicle_chasi_number?.trim().toUpperCase() || null,
    engineNumber: mapped.vehicle_engine_number?.trim().toUpperCase() || null,
    fatherName: mapped.father_name || null,
    presentAddress: mapped.present_address || null,
    permanentAddress: mapped.permanent_address || null,
    mobileNumber: mapped.mobile_number || null,
    color: mapped.color || null,
    bodyType: mapped.body_type || null,
  };
}

export function VehicleDetailDialog({
  open,
  onOpenChange,
  vehicleId,
  inwardSlipPasses = [],
  saudas = [],
  riceCodes = [],
  riceTypes = [],
}: VehicleDetailDialogProps) {
  const { transporters } = useTransporters();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !vehicleId) {
      setVehicle(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    vehiclesAPI
      .getVehicleById(vehicleId)
      .then((data) => {
        if (!cancelled) setVehicle(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setVehicle(null);
          setError(err instanceof Error ? err.message : 'Failed to load vehicle details');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, vehicleId]);

  const transporterNames =
    vehicle?.transporter_ids
      ?.map((id) => transporters.find((t) => t.id === id)?.business_name)
      .filter((name): name is string => !!name) ?? [];

  const rcExtras = vehicle ? getRcFullExtras(vehicle.verification_details) : null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-[90vw] md:w-full max-w-3xl translate-x-[-50%] translate-y-[-50%]">
          <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Car className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <Dialog.Title className="text-xl sm:text-2xl font-semibold">
                    Vehicle Details
                  </Dialog.Title>
                  <Dialog.Description className="text-sm text-muted-foreground mt-1">
                    {vehicle?.vehicle_number ?? 'Loading...'}
                  </Dialog.Description>
                </div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <p className="text-sm text-red-600 py-8 text-center">{error}</p>
            ) : vehicle ? (
              <div className="space-y-6">
                {vehicle.is_verified && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
                    <Shield className="h-4 w-4 shrink-0" />
                    <span>
                      Verified via Surepass
                      {vehicle.verified_at ? ` on ${formatDate(vehicle.verified_at)}` : ''}
                    </span>
                  </div>
                )}

                <section className="space-y-4">
                  <h3 className="text-sm font-semibold border-b border-border pb-2">Registration</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoRow label="Vehicle Number" value={vehicle.vehicle_number} />
                    <InfoRow label="RC Number" value={vehicle.rc_number || '-'} />
                    <InfoRow label="Owner Name" value={vehicle.owner_name || '-'} />
                    <InfoRow label="Maker / Model" value={vehicle.maker_model || '-'} />
                    <InfoRow label="Vehicle Class" value={vehicle.vehicle_class || '-'} />
                    <InfoRow label="Fuel Type" value={vehicle.fuel_type || '-'} />
                    {rcExtras?.chassisNumber && (
                      <InfoRow label="Chassis Number" value={rcExtras.chassisNumber} />
                    )}
                    {rcExtras?.engineNumber && (
                      <InfoRow label="Engine Number" value={rcExtras.engineNumber} />
                    )}
                    {rcExtras?.fatherName && <InfoRow label="Father Name" value={rcExtras.fatherName} />}
                    {rcExtras?.mobileNumber && <InfoRow label="Mobile" value={rcExtras.mobileNumber} />}
                    {rcExtras?.color && <InfoRow label="Color" value={rcExtras.color} />}
                    {rcExtras?.bodyType && <InfoRow label="Body Type" value={rcExtras.bodyType} />}
                    {rcExtras?.presentAddress && (
                      <div className="sm:col-span-2">
                        <InfoRow label="Present Address" value={rcExtras.presentAddress} />
                      </div>
                    )}
                    {rcExtras?.permanentAddress && (
                      <div className="sm:col-span-2">
                        <InfoRow label="Permanent Address" value={rcExtras.permanentAddress} />
                      </div>
                    )}
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-sm font-semibold border-b border-border pb-2">Validity</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <InfoRow label="Registration Date" value={formatDate(vehicle.registration_date)} />
                    <InfoRow label="Insurance Valid Until" value={formatDate(vehicle.insurance_validity)} />
                    <InfoRow label="Fitness Valid Until" value={formatDate(vehicle.fitness_validity)} />
                    <InfoRow label="Permit Valid Until" value={formatDate(vehicle.permit_validity)} />
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-sm font-semibold border-b border-border pb-2 flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Linked Transporters
                  </h3>
                  {transporterNames.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No transporters linked</p>
                  ) : (
                    <ul className="space-y-1">
                      {transporterNames.map((name) => (
                        <li key={name} className="text-sm font-medium">
                          {name}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="space-y-4">
                  <h3 className="text-sm font-semibold border-b border-border pb-2">Linked ISPs</h3>
                  <VehicleLinkedIspsList
                    vehicleId={vehicle.id}
                    vehicleNumber={vehicle.vehicle_number}
                    inwardSlipPasses={inwardSlipPasses}
                    saudas={saudas}
                    riceCodes={riceCodes}
                    riceTypes={riceTypes}
                  />
                </section>

                <KycVerificationDetailsPanel
                  entries={collectVehicleKycEntries(vehicle.verification_details)}
                  title="Stored Surepass verifications"
                  emptyMessage="No Surepass snapshots saved on this vehicle yet."
                />

                <section className="pt-4 border-t border-border">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <p>Status: {vehicle.is_active ? 'Active' : 'Inactive'}</p>
                    <p>Created: {new Date(vehicle.created_at).toLocaleString('en-IN')}</p>
                    {vehicle.updated_at !== vehicle.created_at && (
                      <p className="sm:col-span-2">
                        Updated: {new Date(vehicle.updated_at).toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                </section>
              </div>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

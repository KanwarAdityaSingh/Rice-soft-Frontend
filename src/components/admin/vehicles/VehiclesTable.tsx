import { useState, useMemo, useEffect } from 'react';
import { SearchBar } from '../shared/SearchBar';
import { FilterDropdown } from '../shared/FilterDropdown';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { EmptyState } from '../shared/EmptyState';
import { ActionButtons } from '../shared/ActionButtons';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { AlertDialog } from '../../shared/AlertDialog';
import { Car, Shield, AlertTriangle, Truck, ExternalLink } from 'lucide-react';
import { useVehicles } from '../../../hooks/useVehicles';
import { useTransporters } from '../../../hooks/useTransporters';
import { useVehicleIspReferenceData } from '../../../hooks/useVehicleIspReferenceData';
import { vehiclesAPI } from '../../../services/vehicles.api';
import { VehicleFormModal } from './VehicleFormModal';
import { VehicleDetailDialog } from './VehicleDetailDialog';
import { VehicleLinkedIspsList } from './VehicleLinkedIspsList';
import { VehicleLinkTransportersDialog } from './VehicleLinkTransportersDialog';
import { formatVehicleLinkedIspLine, getVehicleLinkedIsps } from '../../../utils/vehicleIspLinks';
import { getVehicleDeleteErrorMessage } from '../../../utils/errorHandler';
import { Link, useSearchParams } from 'react-router-dom';
import type { Vehicle } from '../../../types/entities';

export function VehiclesTable() {
  const { vehicles, loading, refetch } = useVehicles(undefined, {
    excludeVerificationDetails: true,
  });
  const { transporters } = useTransporters();
  const {
    inwardSlipPasses,
    saudas,
    riceCodes,
    riceTypes,
    loading: ispReferenceLoading,
    loaded: ispReferenceLoaded,
  } = useVehicleIspReferenceData({ enabled: !loading });
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationFilter, setVerificationFilter] = useState<string | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [linkTransportersCtx, setLinkTransportersCtx] = useState<{ id: string; number: string } | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('error');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // Open create modal when opened via e.g. /directory/vehicles?create=1 (new tab from ISP form)
  useEffect(() => {
    if (searchParams.get('create') !== '1') return;
    setCreateOpen(true);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('create');
        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);

  const getLinkedIspsForVehicle = (vehicleId: string) =>
    getVehicleLinkedIsps(vehicleId, inwardSlipPasses, saudas, riceCodes, riceTypes);

  // Check if a vehicle is used in any inward slip pass
  const isVehicleInUse = (vehicleId: string): boolean => {
    return inwardSlipPasses.some(isp => isp.vehicle_id === vehicleId);
  };

  const getVehicleIspAlertLines = (vehicleId: string): string[] =>
    getLinkedIspsForVehicle(vehicleId).map(
      (isp, index) => `${index + 1}. ${formatVehicleLinkedIspLine(isp)}`,
    );

  const showVehicleDeleteError = (vehicleId: string, error: unknown) => {
    const linkedIspLines = getVehicleIspAlertLines(vehicleId);
    setAlertType(linkedIspLines.length > 0 ? 'warning' : 'error');
    setAlertTitle('Cannot Delete Vehicle');
    setAlertMessage(
      getVehicleDeleteErrorMessage(error, {
        linkedIspLines,
        fallback: 'Failed to delete vehicle. Please try again.',
      }),
    );
    setAlertOpen(true);
  };

  const getTransporterNames = (transporterIds: string[]): string[] => {
    if (!transporterIds?.length) return [];
    return transporterIds
      .map(id => transporters.find(t => t.id === id)?.business_name)
      .filter((name): name is string => !!name);
  };

  const isExpired = (date: string | null): boolean => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const isExpiringSoon = (date: string | null): boolean => {
    if (!date) return false;
    const d = new Date(date);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return d > now && d < thirtyDaysFromNow;
  };

  const getValidityStatus = (date: string | null): 'expired' | 'expiring' | 'valid' | 'unknown' => {
    if (!date) return 'unknown';
    if (isExpired(date)) return 'expired';
    if (isExpiringSoon(date)) return 'expiring';
    return 'valid';
  };

  const formatDate = (date: string | null): string => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', { 
      day: '2-digit',
      month: 'short', 
      year: 'numeric' 
    });
  };

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = (
        v.vehicle_number.toLowerCase().includes(q) ||
        v.owner_name?.toLowerCase().includes(q) ||
        v.maker_model?.toLowerCase().includes(q) ||
        v.vehicle_class?.toLowerCase().includes(q)
      );

      const matchesVerification = verificationFilter
        ? (verificationFilter === 'verified' ? v.is_verified : !v.is_verified)
        : true;

      return matchesSearch && matchesVerification;
    });
  }, [vehicles, searchQuery, verificationFilter]);

  const handleDelete = async () => {
    if (!selectedVehicle) return;
    setDeleting(true);
    try {
      await vehiclesAPI.deleteVehicle(selectedVehicle.id);
      refetch();
      setDeleteDialogOpen(false);
      setSelectedVehicle(null);
    } catch (error: unknown) {
      showVehicleDeleteError(selectedVehicle.id, error);
      setDeleteDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <SearchBar 
            value={searchQuery} 
            onChange={setSearchQuery} 
            placeholder="Search by vehicle number, owner, model, or class..." 
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <FilterDropdown
            label="Verified"
            options={[
              { label: 'All', value: undefined },
              { label: 'Verified', value: 'verified' },
              { label: 'Unverified', value: 'unverified' },
            ]}
            value={verificationFilter}
            onChange={setVerificationFilter}
          />
          <button
            onClick={() => setCreateOpen(true)}
            className="btn-primary rounded-xl inline-flex items-center justify-center gap-2 px-4 py-2"
          >
            Add Vehicle
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Car}
          title="No vehicles found"
          description="Add your first vehicle or adjust filters."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-semibold">Vehicle Number</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Owner</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Model</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Class</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Validity</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Transporters</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Linked ISPs</th>
                <th className="text-right py-3 px-4 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((vehicle) => {
                const linkedTransporters = getTransporterNames(vehicle.transporter_ids);
                const insuranceStatus = getValidityStatus(vehicle.insurance_validity);
                const fitnessStatus = getValidityStatus(vehicle.fitness_validity);
                const permitStatus = getValidityStatus(vehicle.permit_validity);
                
                // Determine worst validity status for indicator
                const worstStatus = [insuranceStatus, fitnessStatus, permitStatus].includes('expired') 
                  ? 'expired' 
                  : [insuranceStatus, fitnessStatus, permitStatus].includes('expiring')
                    ? 'expiring'
                    : 'valid';

                return (
                  <tr 
                    key={vehicle.id} 
                    className="border-b border-border/60 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{vehicle.vehicle_number}</span>
                        {vehicle.is_verified && (
                          <Shield className="h-3.5 w-3.5 text-emerald-500" title="Verified via Surepass" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">{vehicle.owner_name || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm">{vehicle.maker_model || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm">{vehicle.vehicle_class || 'N/A'}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {vehicle.insurance_validity && (
                          <span 
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
                              insuranceStatus === 'expired' ? 'bg-red-500/10 text-red-600' :
                              insuranceStatus === 'expiring' ? 'bg-yellow-500/10 text-yellow-600' :
                              'bg-emerald-500/10 text-emerald-600'
                            }`}
                            title={`Insurance: ${formatDate(vehicle.insurance_validity)}`}
                          >
                            {insuranceStatus === 'expired' && <AlertTriangle className="h-2.5 w-2.5" />}
                            Ins: {new Date(vehicle.insurance_validity).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}
                          </span>
                        )}
                        {vehicle.fitness_validity && (
                          <span 
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
                              fitnessStatus === 'expired' ? 'bg-red-500/10 text-red-600' :
                              fitnessStatus === 'expiring' ? 'bg-yellow-500/10 text-yellow-600' :
                              'bg-emerald-500/10 text-emerald-600'
                            }`}
                            title={`Fitness: ${formatDate(vehicle.fitness_validity)}`}
                          >
                            {fitnessStatus === 'expired' && <AlertTriangle className="h-2.5 w-2.5" />}
                            Fit: {new Date(vehicle.fitness_validity).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}
                          </span>
                        )}
                        {vehicle.permit_validity && (
                          <span 
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
                              permitStatus === 'expired' ? 'bg-red-500/10 text-red-600' :
                              permitStatus === 'expiring' ? 'bg-yellow-500/10 text-yellow-600' :
                              'bg-emerald-500/10 text-emerald-600'
                            }`}
                            title={`Permit: ${formatDate(vehicle.permit_validity)}`}
                          >
                            {permitStatus === 'expired' && <AlertTriangle className="h-2.5 w-2.5" />}
                            Permit: {new Date(vehicle.permit_validity).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}
                          </span>
                        )}
                        {!vehicle.insurance_validity && !vehicle.fitness_validity && !vehicle.permit_validity && (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {linkedTransporters.length === 0 ? (
                        <span className="text-muted-foreground">None</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Truck className="h-3.5 w-3.5 text-primary" />
                          <span className="font-medium">{linkedTransporters.length}</span>
                          <span className="text-muted-foreground text-xs truncate max-w-[150px]">
                            ({linkedTransporters.slice(0, 2).join(', ')}{linkedTransporters.length > 2 ? '...' : ''})
                          </span>
                          <Link to="/directory/transporters" className="ml-1 text-primary hover:text-primary/80">
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 align-top">
                      {ispReferenceLoading && !ispReferenceLoaded ? (
                        <span className="text-xs text-muted-foreground">…</span>
                      ) : (
                        <VehicleLinkedIspsList
                          vehicleId={vehicle.id}
                          vehicleNumber={vehicle.vehicle_number}
                          inwardSlipPasses={inwardSlipPasses}
                          saudas={saudas}
                          riceCodes={riceCodes}
                          riceTypes={riceTypes}
                        />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <ActionButtons
                          onView={() => {
                            setSelectedVehicleId(vehicle.id);
                            setViewModalOpen(true);
                          }}
                          onAddLinkedTransporter={() =>
                            setLinkTransportersCtx({
                              id: vehicle.id,
                              number: vehicle.vehicle_number,
                            })
                          }
                          onEdit={() => {
                            setSelectedVehicleId(vehicle.id);
                            setEditModalOpen(true);
                          }}
                          onDelete={async () => {
                            if (isVehicleInUse(vehicle.id)) {
                              showVehicleDeleteError(vehicle.id, new Error('Vehicle is linked to inward slip passes'));
                              return;
                            }
                            setSelectedVehicle(vehicle);
                            setDeleteDialogOpen(true);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <VehicleFormModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) refetch();
        }}
      />

      <VehicleFormModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            setSelectedVehicleId(null);
            refetch();
          }
        }}
        vehicleId={selectedVehicleId}
      />

      <VehicleDetailDialog
        open={viewModalOpen}
        onOpenChange={(open) => {
          setViewModalOpen(open);
          if (!open) setSelectedVehicleId(null);
        }}
        vehicleId={viewModalOpen ? selectedVehicleId : null}
        inwardSlipPasses={inwardSlipPasses}
        saudas={saudas}
        riceCodes={riceCodes}
        riceTypes={riceTypes}
      />

      <VehicleLinkTransportersDialog
        open={linkTransportersCtx !== null}
        onOpenChange={(open) => {
          if (!open) setLinkTransportersCtx(null);
        }}
        vehicleId={linkTransportersCtx?.id ?? ''}
        vehicleNumber={linkTransportersCtx?.number}
        onSaved={() => refetch()}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Vehicle"
        description={`Are you sure you want to delete vehicle "${selectedVehicle?.vehicle_number}"? This action cannot be undone.`}
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        onConfirm={handleDelete}
        variant="danger"
      />

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
      />
    </div>
  );
}

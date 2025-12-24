import { useState, useMemo } from 'react';
import { SearchBar } from '../shared/SearchBar';
import { FilterDropdown } from '../shared/FilterDropdown';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { EmptyState } from '../shared/EmptyState';
import { ActionButtons } from '../shared/ActionButtons';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { Car, Shield, AlertTriangle, Truck, ExternalLink } from 'lucide-react';
import { useVehicles } from '../../../hooks/useVehicles';
import { useTransporters } from '../../../hooks/useTransporters';
import { vehiclesAPI } from '../../../services/vehicles.api';
import { VehicleFormModal } from './VehicleFormModal';
import { Link } from 'react-router-dom';
import type { Vehicle } from '../../../types/entities';

export function VehiclesTable() {
  const { vehicles, loading, refetch } = useVehicles(undefined, undefined);
  const { transporters } = useTransporters();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [verificationFilter, setVerificationFilter] = useState<string | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

      const matchesStatus = statusFilter
        ? (statusFilter === 'active' ? v.is_active : !v.is_active)
        : true;

      const matchesVerification = verificationFilter
        ? (verificationFilter === 'verified' ? v.is_verified : !v.is_verified)
        : true;

      return matchesSearch && matchesStatus && matchesVerification;
    });
  }, [vehicles, searchQuery, statusFilter, verificationFilter]);

  const handleDelete = async () => {
    if (!selectedVehicle) return;
    setDeleting(true);
    try {
      await vehiclesAPI.deleteVehicle(selectedVehicle.id);
      refetch();
      setDeleteDialogOpen(false);
      setSelectedVehicle(null);
    } catch (error: any) {
      alert(error.message || 'Failed to delete vehicle');
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
            label="Status"
            options={[
              { label: 'All', value: undefined },
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
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
                    className={`border-b border-border/60 hover:bg-muted/30 transition-colors ${!vehicle.is_active ? 'opacity-60' : ''}`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{vehicle.vehicle_number}</span>
                        {vehicle.is_verified && (
                          <Shield className="h-3.5 w-3.5 text-emerald-500" title="Verified via Surepass" />
                        )}
                        {!vehicle.is_active && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/10 text-red-600">Inactive</span>
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
                    <td className="py-3 px-4 text-right">
                      <ActionButtons
                        isActive={vehicle.is_active}
                        onEdit={() => {
                          setSelectedVehicleId(vehicle.id);
                          setEditModalOpen(true);
                        }}
                        onDelete={() => {
                          setSelectedVehicle(vehicle);
                          setDeleteDialogOpen(true);
                        }}
                      />
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

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Vehicle"
        description={`Are you sure you want to delete vehicle "${selectedVehicle?.vehicle_number}"? This action cannot be undone.`}
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        onConfirm={handleDelete}
        variant="danger"
      />
    </div>
  );
}

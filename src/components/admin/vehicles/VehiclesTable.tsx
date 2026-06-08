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
import { vehiclesAPI } from '../../../services/vehicles.api';
import { inwardSlipPassesAPI } from '../../../services/inwardSlipPasses.api';
import { VehicleFormModal } from './VehicleFormModal';
import { Link, useSearchParams } from 'react-router-dom';
import type { Vehicle, InwardSlipPass } from '../../../types/entities';

export function VehiclesTable() {
  const { vehicles, loading, refetch } = useVehicles(undefined, undefined);
  const { transporters } = useTransporters();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationFilter, setVerificationFilter] = useState<string | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [inwardSlipPasses, setInwardSlipPasses] = useState<InwardSlipPass[]>([]);
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

  // Fetch inward slip passes to check vehicle usage
  useEffect(() => {
    const fetchISPs = async () => {
      try {
        const data = await inwardSlipPassesAPI.getAllInwardSlipPasses();
        setInwardSlipPasses(data);
      } catch (error) {
        console.error('Failed to fetch inward slip passes:', error);
      }
    };
    fetchISPs();
  }, []);

  // Check if a vehicle is used in any inward slip pass
  const isVehicleInUse = (vehicleId: string): boolean => {
    return inwardSlipPasses.some(isp => isp.vehicle_id === vehicleId);
  };

  // Get count of ISPs using a vehicle
  const getISPCountForVehicle = (vehicleId: string): number => {
    return inwardSlipPasses.filter(isp => isp.vehicle_id === vehicleId).length;
  };

  // Get ISP names for a vehicle (for display in warning messages)
  const getISPNamesForVehicle = async (vehicleId: string): Promise<string[]> => {
    const ispsUsingVehicle = inwardSlipPasses.filter(isp => isp.vehicle_id === vehicleId);
    
    if (ispsUsingVehicle.length === 0) return [];
    
    // Build ISP display names (Slip Number - Vehicle Number - Party Name)
    const ispNames = ispsUsingVehicle.map(isp => {
      const parts: string[] = [];
      
      // Get slip number
      if (isp.slip_number) parts.push(`ISP-${isp.slip_number}`);
      
      // Get vehicle number (should be the vehicle we're checking)
      const vehicle = vehicles.find(v => v.id === vehicleId);
      if (vehicle?.vehicle_number) parts.push(vehicle.vehicle_number);
      
      // Get party name
      if (isp.party_name) parts.push(isp.party_name);
      
      return parts.join(' - ') || `ISP-${isp.slip_number || isp.id}`;
    });
    
    return ispNames;
  };

  // Parse error message to detect foreign key constraint errors and fetch related entities
  const parseVehicleForeignKeyError = async (error: any, vehicleId: string): Promise<string | null> => {
    const errorMessage = error?.data?.error || error?.error || error?.message || '';
    
    if (!errorMessage) return null;
    
    // Check for foreign key constraint violation
    if (errorMessage.includes('violates foreign key constraint')) {
      const errorParts: string[] = [];
      
      // Check for inward slip passes constraint (vehicle_id in ISPs)
      if (errorMessage.includes('inward_slip_pass') && errorMessage.includes('vehicle_id')) {
        try {
          const allISPs = await inwardSlipPassesAPI.getAllInwardSlipPasses();
          const ispsUsingVehicle = allISPs.filter(isp => isp.vehicle_id === vehicleId);
          
          if (ispsUsingVehicle.length > 0) {
            // Get vehicle number
            const vehicle = vehicles.find(v => v.id === vehicleId);
            const vehicleNumber = vehicle?.vehicle_number || 'Unknown';
            
            // Build ISP display names (Slip Number - Vehicle Number - Party Name)
            const ispNames = ispsUsingVehicle.map(isp => {
              const parts: string[] = [];
              
              // Get slip number
              if (isp.slip_number) parts.push(`ISP-${isp.slip_number}`);
              
              // Get vehicle number
              parts.push(vehicleNumber);
              
              // Get party name
              if (isp.party_name) parts.push(isp.party_name);
              
              return parts.join(' - ') || `ISP-${isp.slip_number || isp.id}`;
            });
            
            const ispCount = ispsUsingVehicle.length;
            const ispText = ispCount === 1 ? 'inward slip pass' : 'inward slip passes';
            // Format ISPs as a list
            const ispList = ispNames.map((name, index) => `${index + 1}. ${name}`).join('\n');
            errorParts.push(`${ispCount} ${ispText}:\n${ispList}`);
          }
        } catch (fetchError) {
          // If fetching ISPs fails, continue
        }
      }
      
      if (errorParts.length > 0) {
        return `This vehicle cannot be deleted because it is being used in:\n\n${errorParts.join('\n\n')}\n\nPlease remove the vehicle from all references before deleting it.`;
      }
      
      // Generic foreign key error
      return 'This vehicle cannot be deleted because it is being used by other records. Please remove all references to this vehicle before deleting it.';
    }
    
    return null;
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
    } catch (error: any) {
      // Parse foreign key constraint errors and fetch related ISPs
      const friendlyMessage = await parseVehicleForeignKeyError(error, selectedVehicle.id);
      
      if (friendlyMessage) {
        setAlertType('error');
        setAlertTitle('Cannot Delete Vehicle');
        setAlertMessage(friendlyMessage);
        setAlertOpen(true);
      } else {
        // Generic error handling
        setAlertType('error');
        setAlertTitle('Failed to Delete Vehicle');
        setAlertMessage(
          error?.message || 
          error?.data?.message || 
          error?.error || 
          'An error occurred while deleting the vehicle. Please try again.'
        );
        setAlertOpen(true);
      }
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
                        {(vehicle.challan_details?.length ?? 0) > 0 && (
                          <span
                            className="inline-flex items-center gap-0.5 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                            title={`${vehicle.challan_details!.length} challan(s) on record`}
                          >
                            <AlertTriangle className="h-2.5 w-2.5" />
                            {vehicle.challan_details!.length}
                          </span>
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
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {isVehicleInUse(vehicle.id) && (
                          <span className="text-xs text-amber-600 dark:text-amber-400">
                            Used in {getISPCountForVehicle(vehicle.id)} ISP(s)
                          </span>
                        )}
                        <ActionButtons
                          onEdit={() => {
                            setSelectedVehicleId(vehicle.id);
                            setEditModalOpen(true);
                          }}
                          onDelete={async () => {
                            if (isVehicleInUse(vehicle.id)) {
                              const ispNames = await getISPNamesForVehicle(vehicle.id);
                              const ispCount = ispNames.length;
                              const ispText = ispCount === 1 ? 'inward slip pass' : 'inward slip passes';
                              const ispList = ispNames.map((name, index) => `${index + 1}. ${name}`).join('\n');
                              
                              setAlertType('warning');
                              setAlertTitle('Cannot Delete Vehicle');
                              setAlertMessage(`This vehicle is currently used in ${ispCount} ${ispText}:\n\n${ispList}\n\nPlease remove it from all inward slip passes before deleting.`);
                              setAlertOpen(true);
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

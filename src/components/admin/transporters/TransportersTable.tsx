import { useState, useMemo, useEffect } from 'react';
import { SearchBar } from '../shared/SearchBar';
import { FilterDropdown } from '../shared/FilterDropdown';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { EmptyState } from '../shared/EmptyState';
import { ActionButtons } from '../shared/ActionButtons';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { AlertDialog } from '../../shared/AlertDialog';
import { Truck, Car, ExternalLink } from 'lucide-react';
import { useTransporters } from '../../../hooks/useTransporters';
import { useVehicles } from '../../../hooks/useVehicles';
import { TransporterFormModal } from './TransporterFormModal';
import { inwardSlipPassesAPI } from '../../../services/inwardSlipPasses.api';
import { vehiclesAPI } from '../../../services/vehicles.api';
import { Link } from 'react-router-dom';
import type { Transporter, InwardSlipPass } from '../../../types/entities';

export function TransportersTable() {
  const [includeInactive, setIncludeInactive] = useState(false);
  const { transporters, loading, deleteTransporter, refetch } = useTransporters(includeInactive);
  const { vehicles } = useVehicles();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTransporter, setSelectedTransporter] = useState<Transporter | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTransporterId, setSelectedTransporterId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [inwardSlipPasses, setInwardSlipPasses] = useState<InwardSlipPass[]>([]);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('error');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // Fetch inward slip passes to check transporter usage
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

  // Check if a transporter is used in any inward slip pass
  const isTransporterInUse = (transporterId: string): boolean => {
    return inwardSlipPasses.some(isp => isp.transporter_id === transporterId);
  };

  // Get count of ISPs using a transporter
  const getISPCountForTransporter = (transporterId: string): number => {
    return inwardSlipPasses.filter(isp => isp.transporter_id === transporterId).length;
  };

  // Get ISP names for a transporter (for display in warning messages)
  const getISPNamesForTransporter = async (transporterId: string): Promise<string[]> => {
    const ispsUsingTransporter = inwardSlipPasses.filter(isp => isp.transporter_id === transporterId);
    
    if (ispsUsingTransporter.length === 0) return [];
    
    try {
      // Fetch vehicles to get vehicle numbers
      const allVehicles = await vehiclesAPI.getAllVehicles();
      
      // Build ISP display names (Slip Number - Vehicle Number - Party Name)
      const ispNames = ispsUsingTransporter.map(isp => {
        const parts: string[] = [];
        
        // Get slip number
        if (isp.slip_number) parts.push(`ISP-${isp.slip_number}`);
        
        // Get vehicle number
        const vehicle = allVehicles.find(v => v.id === isp.vehicle_id);
        if (vehicle?.vehicle_number) parts.push(vehicle.vehicle_number);
        
        // Get party name
        if (isp.party_name) parts.push(isp.party_name);
        
        return parts.join(' - ') || `ISP-${isp.slip_number || isp.id}`;
      });
      
      return ispNames;
    } catch (error) {
      console.error('Failed to fetch ISP details:', error);
      return ispsUsingTransporter.map(isp => `ISP-${isp.slip_number || isp.id}`);
    }
  };

  // Parse error message to detect foreign key constraint errors and fetch related entities
  const parseTransporterForeignKeyError = async (error: any, transporterId: string): Promise<string | null> => {
    const errorMessage = error?.data?.error || error?.error || error?.message || '';
    
    if (!errorMessage) return null;
    
    // Check for foreign key constraint violation
    if (errorMessage.includes('violates foreign key constraint')) {
      const errorParts: string[] = [];
      
      // Check for inward slip passes constraint (transporter_id in ISPs)
      if (errorMessage.includes('inward_slip_pass') && errorMessage.includes('transporter_id')) {
        try {
          const allISPs = await inwardSlipPassesAPI.getAllInwardSlipPasses();
          const ispsUsingTransporter = allISPs.filter(isp => isp.transporter_id === transporterId);
          
          if (ispsUsingTransporter.length > 0) {
            // Fetch vehicles to get vehicle numbers
            const allVehicles = await vehiclesAPI.getAllVehicles();
            
            // Build ISP display names (Slip Number - Vehicle Number - Party Name)
            const ispNames = ispsUsingTransporter.map(isp => {
              const parts: string[] = [];
              
              // Get slip number
              if (isp.slip_number) parts.push(`ISP-${isp.slip_number}`);
              
              // Get vehicle number
              const vehicle = allVehicles.find(v => v.id === isp.vehicle_id);
              if (vehicle?.vehicle_number) parts.push(vehicle.vehicle_number);
              
              // Get party name
              if (isp.party_name) parts.push(isp.party_name);
              
              return parts.join(' - ') || `ISP-${isp.slip_number || isp.id}`;
            });
            
            const ispCount = ispsUsingTransporter.length;
            const ispText = ispCount === 1 ? 'inward slip pass' : 'inward slip passes';
            // Format ISPs as a list
            const ispList = ispNames.map((name, index) => `${index + 1}. ${name}`).join('\n');
            errorParts.push(`${ispCount} ${ispText}:\n${ispList}`);
          }
        } catch (fetchError) {
          // If fetching ISPs fails, continue
        }
      }
      
      // Check for vehicles constraint (transporter_ids array in vehicles)
      if (errorMessage.includes('vehicles') && errorMessage.includes('transporter')) {
        try {
          const allVehicles = await vehiclesAPI.getAllVehicles();
          const vehiclesUsingTransporter = allVehicles.filter(v => v.transporter_ids?.includes(transporterId));
          
          if (vehiclesUsingTransporter.length > 0) {
            const vehicleCount = vehiclesUsingTransporter.length;
            const vehicleText = vehicleCount === 1 ? 'vehicle' : 'vehicles';
            const vehicleList = vehiclesUsingTransporter.map((v, index) => `${index + 1}. ${v.vehicle_number}`).join('\n');
            errorParts.push(`${vehicleCount} ${vehicleText}:\n${vehicleList}`);
          }
        } catch (fetchError) {
          // If fetching vehicles fails, continue
        }
      }
      
      if (errorParts.length > 0) {
        return `This transporter cannot be deleted because it is being used in:\n\n${errorParts.join('\n\n')}\n\nPlease remove the transporter from all references before deleting it.`;
      }
      
      // Generic foreign key error
      return 'This transporter cannot be deleted because it is being used by other records. Please remove all references to this transporter before deleting it.';
    }
    
    return null;
  };

  // Get vehicles linked to a transporter
  const getLinkedVehicles = (transporterId: string) => {
    return vehicles.filter(v => v.transporter_ids?.includes(transporterId));
  };

  const filtered = useMemo(() => {
    return transporters.filter((transporter) => {
      const matchesSearch = 
        transporter.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (transporter.contact_persons && transporter.contact_persons.some(cp => 
          cp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cp.phones?.some(phone => phone.toLowerCase().includes(searchQuery.toLowerCase())) ||
          cp.emails?.some(email => email && email.toLowerCase().includes(searchQuery.toLowerCase()))
        ));
      
      const matchesStatus = statusFilter 
        ? (statusFilter === 'active' ? transporter.is_active : !transporter.is_active)
        : true;

      return matchesSearch && matchesStatus;
    });
  }, [transporters, searchQuery, statusFilter]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <SearchBar 
            value={searchQuery} 
            onChange={setSearchQuery} 
            placeholder="Search by business name, contact, phone, or email..." 
          />
        </div>
        <div className="flex gap-2">
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
          <button
            onClick={() => setCreateModalOpen(true)}
            className="btn-primary rounded-xl inline-flex items-center justify-center gap-2 px-4 py-2"
          >
            Add Transporter
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No transporters found"
          description="Create your first transporter or adjust filters."
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold">Business Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Contact Person</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Phone</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">City</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Vehicles</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((transporter) => {
                  const primaryContact = transporter.contact_persons?.[0];
                  const primaryPhone = primaryContact?.phones?.[0] || 'N/A';
                  const primaryEmail = primaryContact?.emails?.[0] || 'N/A';
                  
                  return (
                    <tr key={transporter.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 text-sm font-medium">{transporter.business_name}</td>
                      <td className="py-3 px-4 text-sm">{primaryContact?.name || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm">{primaryPhone}</td>
                      <td className="py-3 px-4 text-sm">{primaryEmail}</td>
                      <td className="py-3 px-4 text-sm">{transporter.address.city}</td>
                      <td className="py-3 px-4 text-sm">
                        {(() => {
                          const linkedVehicles = getLinkedVehicles(transporter.id);
                          if (linkedVehicles.length === 0) return <span className="text-muted-foreground">None</span>;
                          return (
                            <div className="flex items-center gap-1.5">
                              <Car className="h-3.5 w-3.5 text-primary" />
                              <span className="font-medium">{linkedVehicles.length}</span>
                              <span className="text-muted-foreground text-xs">
                                ({linkedVehicles.slice(0, 2).map(v => v.vehicle_number).join(', ')}{linkedVehicles.length > 2 ? '...' : ''})
                              </span>
                              <Link to="/directory/vehicles" className="ml-1 text-primary hover:text-primary/80">
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {isTransporterInUse(transporter.id) && (
                            <span className="text-xs text-amber-600 dark:text-amber-400">
                              Used in {getISPCountForTransporter(transporter.id)} ISP(s)
                            </span>
                          )}
                          <ActionButtons
                            isActive={transporter.is_active}
                            onEdit={() => {
                              setSelectedTransporterId(transporter.id);
                              setEditModalOpen(true);
                            }}
                            onDelete={async () => {
                              if (isTransporterInUse(transporter.id)) {
                                const ispNames = await getISPNamesForTransporter(transporter.id);
                                const ispCount = ispNames.length;
                                const ispText = ispCount === 1 ? 'inward slip pass' : 'inward slip passes';
                                const ispList = ispNames.map((name, index) => `${index + 1}. ${name}`).join('\n');
                                
                                setAlertType('warning');
                                setAlertTitle('Cannot Delete Transporter');
                                setAlertMessage(`This transporter is currently used in ${ispCount} ${ispText}:\n\n${ispList}\n\nPlease remove it from all inward slip passes before deleting.`);
                                setAlertOpen(true);
                                return;
                              }
                              setSelectedTransporter(transporter);
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

        </>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={async () => {
          if (selectedTransporter) {
            try {
              await deleteTransporter(selectedTransporter.id);
              setDeleteDialogOpen(false);
              setSelectedTransporter(null);
            } catch (error: any) {
              // Parse foreign key constraint errors and fetch related ISPs
              const friendlyMessage = await parseTransporterForeignKeyError(error, selectedTransporter.id);
              
              if (friendlyMessage) {
                setAlertType('error');
                setAlertTitle('Cannot Delete Transporter');
                setAlertMessage(friendlyMessage);
                setAlertOpen(true);
              } else {
                // Generic error handling
                setAlertType('error');
                setAlertTitle('Failed to Delete Transporter');
                setAlertMessage(
                  error?.message || 
                  error?.data?.message || 
                  error?.error || 
                  'An error occurred while deleting the transporter. Please try again.'
                );
                setAlertOpen(true);
              }
              setDeleteDialogOpen(false);
            }
          }
        }}
        title="Delete Transporter"
        description={`Are you sure you want to delete "${selectedTransporter?.business_name}"? This action cannot be undone.`}
        confirmText="Delete"
      />

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
      />

      <TransporterFormModal
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
          if (!open) {
            refetch();
          }
        }}
      />

      <TransporterFormModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            setSelectedTransporterId(null);
            refetch();
          }
        }}
        transporterId={selectedTransporterId}
      />
    </div>
  );
}


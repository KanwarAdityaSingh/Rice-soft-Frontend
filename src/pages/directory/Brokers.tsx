import { useMemo, useState, useEffect } from 'react'
import { UserCircle, Plus, Mail, Phone, MapPin } from 'lucide-react'
import { SearchBar } from '../../components/admin/shared/SearchBar'
import { FilterDropdown } from '../../components/admin/shared/FilterDropdown'
import { LoadingSpinner } from '../../components/admin/shared/LoadingSpinner'
import { EmptyState } from '../../components/admin/shared/EmptyState'
import { ActionButtons } from '../../components/admin/shared/ActionButtons'
import { ConfirmDialog } from '../../components/admin/shared/ConfirmDialog'
import { AlertDialog } from '../../components/shared/AlertDialog'
import { useBrokers } from '../../hooks/useBrokers'
import { BrokerFormModal } from '../../components/admin/brokers/BrokerFormModal'
import { saudasAPI } from '../../services/saudas.api'
import { vendorsAPI } from '../../services/vendors.api'
import { riceCodesAPI } from '../../services/riceCodes.api'
import { getRiceTypeLabel } from '../../utils/riceType'
import type { Sauda } from '../../types/entities'

export default function BrokersPage() {
  const { brokers, loading, deleteBroker, refetch } = useBrokers()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [typeFilter, setTypeFilter] = useState<string | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [saudas, setSaudas] = useState<Sauda[]>([])
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('error')
  const [alertTitle, setAlertTitle] = useState('')
  const [alertMessage, setAlertMessage] = useState('')

  // Fetch saudas to check broker usage
  useEffect(() => {
    const fetchSaudas = async () => {
      try {
        const data = await saudasAPI.getAllSaudas();
        setSaudas(data);
      } catch (error) {
        console.error('Failed to fetch saudas:', error);
      }
    };
    fetchSaudas();
  }, []);

  // Check if a broker is used in any sauda
  const isBrokerInUse = (brokerId: string): boolean => {
    return saudas.some(sauda => sauda.broker_id === brokerId);
  };

  // Get count of saudas using a broker
  const getSaudaCountForBroker = (brokerId: string): number => {
    return saudas.filter(sauda => sauda.broker_id === brokerId).length;
  };

  // Get sauda names for a broker (for display in warning messages)
  const getSaudaNamesForBroker = async (brokerId: string): Promise<string[]> => {
    const saudasUsingBroker = saudas.filter(sauda => sauda.broker_id === brokerId);
    
    if (saudasUsingBroker.length === 0) return [];
    
    try {
      // Fetch vendors, rice codes, and rice types to build display names
      const [allVendors, allRiceCodes, allRiceTypes] = await Promise.all([
        vendorsAPI.getAllVendors(false),
        riceCodesAPI.getAllRiceCodes(),
        riceCodesAPI.getRiceTypes()
      ]);
      
      // Build sauda display names (Purchaser - Rice Code - Rice Type)
      const saudaNames = saudasUsingBroker.map(sauda => {
        const parts: string[] = [];
        
        // Get purchaser name
        const purchaser = allVendors.find(v => v.id === sauda.purchaser_id);
        if (purchaser?.business_name) parts.push(purchaser.business_name);
        
        // Get rice code name
        const riceCode = allRiceCodes.find(rc => rc.rice_code_id === sauda.rice_code_id);
        if (riceCode?.rice_code_name) parts.push(riceCode.rice_code_name);
        
        // Get rice type label
        const riceTypeLabel = getRiceTypeLabel(sauda.rice_type, allRiceTypes);
        if (riceTypeLabel) parts.push(riceTypeLabel);
        
        return parts.join(' - ') || 'Sauda';
      });
      
      return saudaNames;
    } catch (error) {
      console.error('Failed to fetch sauda details:', error);
      return [];
    }
  };

  // Parse error message to detect foreign key constraint errors and fetch related entities
  const parseBrokerForeignKeyError = async (error: any, brokerId: string): Promise<string | null> => {
    const errorMessage = error?.data?.error || error?.error || error?.message || '';
    
    if (!errorMessage) return null;
    
    // Check for foreign key constraint violation
    if (errorMessage.includes('violates foreign key constraint')) {
      const errorParts: string[] = [];
      
      // Check for saudas constraint (broker_id in saudas)
      if (errorMessage.includes('saudas') && errorMessage.includes('broker_id')) {
        try {
          const allSaudas = await saudasAPI.getAllSaudas();
          const saudasUsingBroker = allSaudas.filter(sauda => sauda.broker_id === brokerId);
          
          if (saudasUsingBroker.length > 0) {
            // Fetch vendors, rice codes, and rice types to build display names
            const [allVendors, allRiceCodes, allRiceTypes] = await Promise.all([
              vendorsAPI.getAllVendors(false),
              riceCodesAPI.getAllRiceCodes(),
              riceCodesAPI.getRiceTypes()
            ]);
            
            // Build sauda display names (Purchaser - Rice Code - Rice Type)
            const saudaNames = saudasUsingBroker.map(sauda => {
              const parts: string[] = [];
              
              // Get purchaser name
              const purchaser = allVendors.find(v => v.id === sauda.purchaser_id);
              if (purchaser?.business_name) parts.push(purchaser.business_name);
              
              // Get rice code name
              const riceCode = allRiceCodes.find(rc => rc.rice_code_id === sauda.rice_code_id);
              if (riceCode?.rice_code_name) parts.push(riceCode.rice_code_name);
              
              // Get rice type label
              const riceTypeLabel = getRiceTypeLabel(sauda.rice_type, allRiceTypes);
              if (riceTypeLabel) parts.push(riceTypeLabel);
              
              return parts.join(' - ') || 'Sauda';
            });
            
            const saudaCount = saudasUsingBroker.length;
            const saudaText = saudaCount === 1 ? 'sauda' : 'saudas';
            // Format saudas as a list
            const saudaList = saudaNames.map((name, index) => `${index + 1}. ${name}`).join('\n');
            errorParts.push(`${saudaCount} ${saudaText}:\n${saudaList}`);
          }
        } catch (fetchError) {
          // If fetching saudas fails, continue
        }
      }
      
      if (errorParts.length > 0) {
        return `This broker cannot be deleted because it is being used in:\n\n${errorParts.join('\n\n')}\n\nPlease remove the broker from all references before deleting it.`;
      }
      
      // Generic foreign key error
      return 'This broker cannot be deleted because it is being used by other records. Please remove all references to this broker before deleting it.';
    }
    
    return null;
  };

  const filtered = useMemo(() => {
    return brokers.filter((b) => {
      const q = searchQuery.toLowerCase()
      const primaryContact = b.contact_persons?.[0]
      
      const matchesSearch =
        (b.business_name?.toLowerCase().includes(q) || false) ||
        (primaryContact?.name?.toLowerCase().includes(q) || false) ||
        (primaryContact?.emails?.[0]?.toLowerCase().includes(q) || false) ||
        (primaryContact?.phones?.[0]?.includes(searchQuery) || false)

      const matchesStatus = statusFilter ? (statusFilter === 'active' ? b.is_active : !b.is_active) : true
      const matchesType = typeFilter ? b.type === typeFilter : true

      return matchesSearch && matchesStatus && matchesType
    })
  }, [brokers, searchQuery, statusFilter, typeFilter])

  return (
    <div className="container mx-auto py-6 sm:py-10 space-y-6 sm:space-y-8 px-4 sm:px-6">
      <header className="hero-bg rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -left-6 -top-6 h-24 w-24 floating-orb" />
        <div className="absolute -right-6 -bottom-6 h-20 w-20 floating-orb" />
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            <span className="text-gradient">Brokers Directory</span>
          </h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">Your trading partners, beautifully organized</p>
        </div>
      </header>

      {/* Responsive Filters and Action Button */}
      <div className="space-y-3">
        <div className="w-full">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by name, contact, email, or phone..." />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex gap-2 flex-1">
            <FilterDropdown
              label="Status"
              options={[
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
            />
            <FilterDropdown
              label="Type"
              options={[
                { label: 'Purchase', value: 'purchase' },
                { label: 'Sale', value: 'sale' },
                { label: 'Both', value: 'both' },
              ]}
              value={typeFilter}
              onChange={setTypeFilter}
            />
          </div>
          <button className="btn-primary rounded-xl inline-flex items-center justify-center gap-2 w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Add Broker
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={UserCircle} title="No brokers found" description="Create your first broker or adjust filters." />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => (
            <article
              key={b.id}
              className="group rounded-2xl p-4 bg-gradient-to-br from-background to-muted/40 border border-border/60 hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                    <UserCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{String(b.type).trim()}</div>
                    <h3 className="text-sm font-semibold leading-tight">{b.business_name?.trim() || 'N/A'}</h3>
                    <div className="text-xs text-muted-foreground inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {b.address.city.trim()}</div>
                  </div>
                </div>
                <span className={`whitespace-nowrap px-2 py-1 rounded-md text-[10px] ${b.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>{b.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="mt-3 grid gap-1.5 text-xs">
                {b.contact_persons?.[0] && (
                  <>
                    <div className="inline-flex items-center gap-2 text-foreground/90">
                      <span className="text-muted-foreground w-16">Contact</span>
                      <span className="font-medium">{b.contact_persons[0].name?.trim() || 'N/A'}</span>
                    </div>
                    {b.contact_persons[0].emails?.[0] && (
                      <div className="inline-flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{b.contact_persons[0].emails[0].trim()}</span>
                      </div>
                    )}
                    {b.contact_persons[0].phones?.[0] && (
                      <div className="inline-flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{b.contact_persons[0].phones[0].trim()}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between">
                {isBrokerInUse(b.id) && (
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    Used in {getSaudaCountForBroker(b.id)} sauda(s)
                  </span>
                )}
                <div className="ml-auto">
                  <ActionButtons
                    isActive={b.is_active}
                    onDelete={async () => {
                      if (isBrokerInUse(b.id)) {
                        const saudaNames = await getSaudaNamesForBroker(b.id);
                        const saudaCount = saudaNames.length;
                        const saudaText = saudaCount === 1 ? 'sauda' : 'saudas';
                        const saudaList = saudaNames.map((name, index) => `${index + 1}. ${name}`).join('\n');
                        
                        setAlertType('warning');
                        setAlertTitle('Cannot Delete Broker');
                        setAlertMessage(`This broker is currently used in ${saudaCount} ${saudaText}:\n\n${saudaList}\n\nPlease remove it from all saudas before deleting.`);
                        setAlertOpen(true);
                        return;
                      }
                      setSelectedId(b.id);
                      setDeleteDialogOpen(true);
                    }}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={async () => {
          if (selectedId) {
            try {
              await deleteBroker(selectedId);
              setSelectedId(null);
              setDeleteDialogOpen(false);
            } catch (error: any) {
              // Parse foreign key constraint errors and fetch related saudas
              const friendlyMessage = await parseBrokerForeignKeyError(error, selectedId);
              
              if (friendlyMessage) {
                setAlertType('error');
                setAlertTitle('Cannot Delete Broker');
                setAlertMessage(friendlyMessage);
                setAlertOpen(true);
              } else {
                // Generic error handling
                setAlertType('error');
                setAlertTitle('Failed to Delete Broker');
                setAlertMessage(
                  error?.message || 
                  error?.data?.message || 
                  error?.error || 
                  'An error occurred while deleting the broker. Please try again.'
                );
                setAlertOpen(true);
              }
              setDeleteDialogOpen(false);
            }
          }
        }}
        title="Delete Broker"
        description="Are you sure you want to delete this broker? This action cannot be undone."
        confirmText="Delete"
      />

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
      />

      <BrokerFormModal 
        open={createOpen} 
        onOpenChange={(open) => {
          setCreateOpen(open);
          // Refetch brokers when modal closes to ensure we have the latest data
          if (!open) {
            refetch();
          }
        }} 
      />
    </div>
  )
}



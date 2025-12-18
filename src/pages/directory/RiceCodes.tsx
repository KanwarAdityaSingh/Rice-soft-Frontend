import { useMemo, useState, useEffect } from 'react'
import { Sprout, Plus, List } from 'lucide-react'
import { SearchBar } from '../../components/admin/shared/SearchBar'
import { LoadingSpinner } from '../../components/admin/shared/LoadingSpinner'
import { EmptyState } from '../../components/admin/shared/EmptyState'
import { ActionButtons } from '../../components/admin/shared/ActionButtons'
import { ConfirmDialog } from '../../components/admin/shared/ConfirmDialog'
import { AlertDialog } from '../../components/shared/AlertDialog'
import { useRiceCodes } from '../../hooks/useRiceCodes'
import { RiceCodeFormModal } from '../../components/admin/rice-codes/RiceCodeFormModal'
import { RiceTypesModal } from '../../components/admin/rice-codes/RiceTypesModal'
import { leadsAPI } from '../../services/leads.api'
import { saudasAPI } from '../../services/saudas.api'
import { vendorsAPI } from '../../services/vendors.api'
import { riceCodesAPI } from '../../services/riceCodes.api'
import { getRiceTypeLabel } from '../../utils/riceType'
import { isAdmin } from '../../utils/permissions'
import type { RiceCode, Sauda } from '../../types/entities'

export default function RiceCodesPage() {
  const { riceCodes, loading, deleteRiceCode, createRiceCode, updateRiceCode, refetch } = useRiceCodes()
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editRiceCode, setEditRiceCode] = useState<RiceCode | null>(null)
  const [riceTypesOpen, setRiceTypesOpen] = useState(false)
  const [saudas, setSaudas] = useState<Sauda[]>([])
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('error')
  const [alertTitle, setAlertTitle] = useState('')
  const [alertMessage, setAlertMessage] = useState('')

  // Fetch saudas to check rice code usage
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

  // Check if a rice code is used in any sauda
  const isRiceCodeInUse = (riceCodeId: string): boolean => {
    return saudas.some(sauda => sauda.rice_code_id === riceCodeId);
  };

  // Get count of saudas using a rice code
  const getSaudaCountForRiceCode = (riceCodeId: string): number => {
    return saudas.filter(sauda => sauda.rice_code_id === riceCodeId).length;
  };

  // Get sauda names for a rice code (for display in warning messages)
  const getSaudaNamesForRiceCode = async (riceCodeId: string): Promise<string[]> => {
    const saudasUsingRiceCode = saudas.filter(sauda => sauda.rice_code_id === riceCodeId);
    
    if (saudasUsingRiceCode.length === 0) return [];
    
    try {
      // Fetch vendors, rice codes, and rice types to build display names
      const [allVendors, allRiceCodes, allRiceTypes] = await Promise.all([
        vendorsAPI.getAllVendors(false),
        riceCodesAPI.getAllRiceCodes(),
        riceCodesAPI.getRiceTypes()
      ]);
      
      // Get the rice code being checked (might not be in allRiceCodes if it's being deleted)
      const currentRiceCode = riceCodes.find(rc => rc.rice_code_id === riceCodeId);
      
      // Build sauda display names (Purchaser - Rice Code - Rice Type)
      const saudaNames = saudasUsingRiceCode.map(sauda => {
        const parts: string[] = [];
        
        // Get purchaser name
        const purchaser = allVendors.find(v => v.id === sauda.purchaser_id);
        if (purchaser?.business_name) parts.push(purchaser.business_name);
        
        // Get rice code name - use current rice code if not found in allRiceCodes
        let riceCodeName = '';
        const riceCode = allRiceCodes.find(rc => rc.rice_code_id === sauda.rice_code_id);
        if (riceCode?.rice_code_name) {
          riceCodeName = riceCode.rice_code_name;
        } else if (sauda.rice_code_id === riceCodeId && currentRiceCode?.rice_code_name) {
          // If this is the rice code being checked, use it from the current state
          riceCodeName = currentRiceCode.rice_code_name;
        }
        if (riceCodeName) parts.push(riceCodeName);
        
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

  const filtered = useMemo(() => {
    return riceCodes.filter((rc) => {
      const q = searchQuery.toLowerCase()
      return rc.rice_code_name.toLowerCase().includes(q)
    })
  }, [riceCodes, searchQuery])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Parse error message to detect foreign key constraint errors and fetch related entities
  const parseForeignKeyError = async (error: any, riceCodeId: string): Promise<string | null> => {
    // Check error.data.error first (where the actual constraint error is), then fall back to other fields
    const errorMessage = error?.data?.error || error?.error || error?.message || ''
    
    if (!errorMessage) return null
    
    // Check for foreign key constraint violation
    if (errorMessage.includes('violates foreign key constraint')) {
      const errorParts: string[] = []
      
      // Always check for leads usage
      try {
        const allLeads = await leadsAPI.getAllLeads()
        const leadsUsingRiceCode = allLeads.filter(lead => lead.rice_code_id === riceCodeId)
        
        if (leadsUsingRiceCode.length > 0) {
          const leadCount = leadsUsingRiceCode.length
          const leadText = leadCount === 1 ? 'lead' : 'leads'
          const leadList = leadsUsingRiceCode.map((lead, index) => `${index + 1}. ${lead.company_name}`).join('\n')
          errorParts.push(`${leadCount} ${leadText}:\n${leadList}`)
        }
      } catch (fetchError) {
        // If fetching leads fails, continue
      }
      
      // Always check for saudas usage
      try {
        const allSaudas = await saudasAPI.getAllSaudas()
        const saudasUsingRiceCode = allSaudas.filter(sauda => sauda.rice_code_id === riceCodeId)
        
        if (saudasUsingRiceCode.length > 0) {
          // Fetch vendors, rice codes, and rice types to build display names
          const [allVendors, allRiceCodes, allRiceTypes] = await Promise.all([
            vendorsAPI.getAllVendors(false),
            riceCodesAPI.getAllRiceCodes(),
            riceCodesAPI.getRiceTypes()
          ])
          
          // Get the rice code being deleted (might not be in allRiceCodes if it's being deleted)
          const deletedRiceCode = riceCodes.find(rc => rc.rice_code_id === riceCodeId)
          
          // Build sauda display names (Purchaser - Rice Code - Rice Type)
          const saudaNames = saudasUsingRiceCode.map(sauda => {
            const parts: string[] = []
            
            // Get purchaser name
            const purchaser = allVendors.find(v => v.id === sauda.purchaser_id)
            if (purchaser?.business_name) parts.push(purchaser.business_name)
            
            // Get rice code name - use deleted rice code if not found in allRiceCodes
            let riceCodeName = ''
            const riceCode = allRiceCodes.find(rc => rc.rice_code_id === sauda.rice_code_id)
            if (riceCode?.rice_code_name) {
              riceCodeName = riceCode.rice_code_name
            } else if (sauda.rice_code_id === riceCodeId && deletedRiceCode?.rice_code_name) {
              // If this is the rice code being deleted, use it from the current state
              riceCodeName = deletedRiceCode.rice_code_name
            }
            if (riceCodeName) parts.push(riceCodeName)
            
            // Get rice type label
            const riceTypeLabel = getRiceTypeLabel(sauda.rice_type, allRiceTypes)
            if (riceTypeLabel) parts.push(riceTypeLabel)
            
            return parts.join(' - ') || 'Sauda'
          })
          
          const saudaCount = saudasUsingRiceCode.length
          const saudaText = saudaCount === 1 ? 'sauda' : 'saudas'
          // Format saudas as a list
          const saudaList = saudaNames.map((name, index) => `${index + 1}. ${name}`).join('\n')
          errorParts.push(`${saudaCount} ${saudaText}:\n${saudaList}`)
        }
      } catch (fetchError) {
        // If fetching saudas fails, continue
      }
      
      // Check for lots constraint (if exists)
      if (errorMessage.includes('lots_rice_code_id_fkey')) {
        errorParts.push('one or more lots')
      }
      
      if (errorParts.length > 0) {
        return `This rice code cannot be deleted because it is being used in:\n\n${errorParts.join('\n\n')}\n\nPlease remove the rice code from all references before deleting it.`
      }
      
      // Generic foreign key error
      return 'This rice code cannot be deleted because it is being used by other records. Please remove all references to this rice code before deleting it.'
    }
    
    return null
  }

  return (
    <div className="container mx-auto py-6 sm:py-10 space-y-6 sm:space-y-8 px-4 sm:px-6">
      <header className="hero-bg rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -left-6 -top-6 h-24 w-24 floating-orb" />
        <div className="absolute -right-6 -bottom-6 h-20 w-20 floating-orb" />
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            <span className="text-gradient">Rice Codes</span>
          </h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">Manage rice code catalog</p>
        </div>
      </header>

      {/* Responsive Filters and Action Button */}
      <div className="space-y-3">
        <div className="w-full">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search rice codes..." />
        </div>
        <div className="flex justify-end gap-3">
          <button
            className="btn-secondary rounded-xl inline-flex items-center justify-center gap-2"
            onClick={() => setRiceTypesOpen(true)}
          >
            <List className="h-4 w-4" /> View Rice Types
          </button>
          {isAdmin() && (
            <button
              className="btn-primary rounded-xl inline-flex items-center justify-center gap-2"
              onClick={() => {
                setEditRiceCode(null)
                setCreateOpen(true)
              }}
            >
              <Plus className="h-4 w-4" /> Add Rice Code
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Sprout} title="No rice codes found" description="Create your first rice code or adjust filters." />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((rc) => (
            <article
              key={rc.rice_code_id}
              className="group rounded-2xl p-4 bg-gradient-to-br from-background to-muted/40 border border-border/60 hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                    <Sprout className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold leading-tight">{rc.rice_code_name.trim()}</h3>
                    <div className="text-xs text-muted-foreground mt-1">Created {formatDate(rc.created_at)}</div>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                {isRiceCodeInUse(rc.rice_code_id) && (
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    Used in {getSaudaCountForRiceCode(rc.rice_code_id)} sauda(s)
                  </span>
                )}
                <div className="ml-auto">
                  <ActionButtons
                    permissionEntity="riceCode"
                    onEdit={isAdmin() ? async () => {
                      if (isRiceCodeInUse(rc.rice_code_id)) {
                        const saudaNames = await getSaudaNamesForRiceCode(rc.rice_code_id);
                        const saudaCount = saudaNames.length;
                        const saudaText = saudaCount === 1 ? 'sauda' : 'saudas';
                        const saudaList = saudaNames.map((name, index) => `${index + 1}. ${name}`).join('\n');
                        
                        setAlertType('warning')
                        setAlertTitle('Cannot Modify Rice Code')
                        setAlertMessage(`This rice code is currently used in ${saudaCount} ${saudaText}:\n\n${saudaList}\n\nPlease remove it from all saudas before editing.`);
                        setAlertOpen(true);
                        return;
                      }
                      setEditRiceCode(rc)
                      setCreateOpen(true)
                    } : undefined}
                    onDelete={isAdmin() ? async () => {
                      if (isRiceCodeInUse(rc.rice_code_id)) {
                        const saudaNames = await getSaudaNamesForRiceCode(rc.rice_code_id);
                        const saudaCount = saudaNames.length;
                        const saudaText = saudaCount === 1 ? 'sauda' : 'saudas';
                        const saudaList = saudaNames.map((name, index) => `${index + 1}. ${name}`).join('\n');
                        
                        setAlertType('warning')
                        setAlertTitle('Cannot Modify Rice Code')
                        setAlertMessage(`This rice code is currently used in ${saudaCount} ${saudaText}:\n\n${saudaList}\n\nPlease remove it from all saudas before deleting.`);
                        setAlertOpen(true);
                        return;
                      }
                      setSelectedId(rc.rice_code_id)
                      setDeleteDialogOpen(true)
                    } : undefined}
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
              await deleteRiceCode(selectedId)
              setSelectedId(null)
              setDeleteDialogOpen(false)
            } catch (error: any) {
              // Parse foreign key constraint errors and fetch related leads
              const friendlyMessage = await parseForeignKeyError(error, selectedId)
              
              if (friendlyMessage) {
                setAlertType('error')
                setAlertTitle('Cannot Delete Rice Code')
                setAlertMessage(friendlyMessage)
                setAlertOpen(true)
              } else {
                // Generic error handling
                setAlertType('error')
                setAlertTitle('Failed to Delete Rice Code')
                setAlertMessage(
                  error?.message || 
                  error?.data?.message || 
                  error?.error || 
                  'An error occurred while deleting the rice code. Please try again.'
                )
                setAlertOpen(true)
              }
              setDeleteDialogOpen(false)
            }
          }
        }}
        title="Delete Rice Code"
        description="Are you sure you want to delete this rice code? This action cannot be undone."
        confirmText="Delete"
      />

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
      />

      <RiceCodeFormModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) {
            setEditRiceCode(null)
            // Refetch rice codes when modal closes to ensure we have the latest data
            refetch()
          }
        }}
        riceCode={editRiceCode}
        onCreate={createRiceCode}
        onUpdate={updateRiceCode}
      />

      <RiceTypesModal
        open={riceTypesOpen}
        onOpenChange={setRiceTypesOpen}
      />
    </div>
  )
}

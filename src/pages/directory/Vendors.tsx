import { useMemo, useState, useEffect } from 'react'
import { Store, Plus, Mail, Phone, MapPin, CreditCard, FileText, Calendar, UserCircle, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SearchBar } from '../../components/admin/shared/SearchBar'
import { FilterDropdown } from '../../components/admin/shared/FilterDropdown'
import { LoadingSpinner } from '../../components/admin/shared/LoadingSpinner'
import { EmptyState } from '../../components/admin/shared/EmptyState'
import { ActionButtons } from '../../components/admin/shared/ActionButtons'
import { ConfirmDialog } from '../../components/admin/shared/ConfirmDialog'
import { AlertDialog } from '../../components/shared/AlertDialog'
import { useVendors } from '../../hooks/useVendors'
import { VendorFormModal } from '../../components/admin/vendors/VendorFormModal'
import { leadsAPI } from '../../services/leads.api'
import { saudasAPI } from '../../services/saudas.api'
import { vendorsAPI } from '../../services/vendors.api'
import { riceCodesAPI } from '../../services/riceCodes.api'
import { getRiceTypeLabel } from '../../utils/riceType'
import { isAdmin } from '../../utils/permissions'
import type { Lead } from '../../types/entities'

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'purchaser': return 'Debtor';
    case 'seller': return 'Creditor';
    case 'both': return 'Both';
    default: return type;
  }
};

export default function VendorsPage() {
  const { vendors, loading, deleteVendor, refetch } = useVendors()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [typeFilter, setTypeFilter] = useState<string | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null)
  const [leadDetails, setLeadDetails] = useState<Record<string, Lead>>({})
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('error')
  const [alertTitle, setAlertTitle] = useState('')
  const [alertMessage, setAlertMessage] = useState('')

  const filtered = useMemo(() => {
    return vendors.filter((v) => {
      const q = searchQuery.toLowerCase()
      const primaryContact = v.contact_persons?.[0]
      const matchesSearch =
        v.business_name.toLowerCase().includes(q) ||
        (primaryContact?.name || '').toLowerCase().includes(q) ||
        (primaryContact?.emails?.[0] || '').toLowerCase().includes(q) ||
        (primaryContact?.phones?.[0] || '').includes(searchQuery)

      const matchesStatus = statusFilter ? (statusFilter === 'active' ? v.is_active : !v.is_active) : true
      const matchesType = typeFilter ? v.type === typeFilter : true

      return matchesSearch && matchesStatus && matchesType
    })
  }, [vendors, searchQuery, statusFilter, typeFilter])

  // Fetch lead details for vendors with lead_id
  useEffect(() => {
    const fetchLeadDetails = async () => {
      const vendorsWithLeads = filtered.filter(v => v.lead_id)
      const leadIds = vendorsWithLeads.map(v => v.lead_id!).filter((id, index, self) => self.indexOf(id) === index)
      
      const newLeadDetails: Record<string, Lead> = {}
      
      await Promise.all(
        leadIds.map(async (leadId) => {
          if (!leadDetails[leadId]) {
            try {
              const lead = await leadsAPI.getLeadById(leadId)
              newLeadDetails[leadId] = lead
            } catch (error) {
              console.error(`Failed to fetch lead ${leadId}:`, error)
            }
          }
        })
      )
      
      if (Object.keys(newLeadDetails).length > 0) {
        setLeadDetails(prev => ({ ...prev, ...newLeadDetails }))
      }
    }

    if (filtered.length > 0) {
      fetchLeadDetails()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered])

  // Parse error message to detect foreign key constraint errors and fetch related entities
  const parseVendorForeignKeyError = async (error: any, vendorId: string): Promise<string | null> => {
    // Check error.data.error first (where the actual constraint error is), then fall back to other fields
    const errorMessage = error?.data?.error || error?.error || error?.message || ''
    
    if (!errorMessage) return null
    
    // Check for foreign key constraint violation
    if (errorMessage.includes('violates foreign key constraint')) {
      const errorParts: string[] = []
      
      // Check for leads constraint - vendors have lead_id, so check if vendor was converted from a lead
      if (errorMessage.includes('leads') || errorMessage.includes('vendor_id')) {
        try {
          const vendor = vendors.find(v => v.id === vendorId)
          if (vendor?.lead_id) {
            try {
              const lead = await leadsAPI.getLeadById(vendor.lead_id)
              errorParts.push(`1 lead: ${lead.company_name}`)
            } catch {
              // Lead not found, skip
            }
          }
        } catch (fetchError) {
          // If fetching leads fails, continue
        }
      }
      
      // Check for saudas constraint (purchaser_id in saudas)
      if (errorMessage.includes('saudas') && (errorMessage.includes('purchaser_id') || errorMessage.includes('vendor_id'))) {
        try {
          const allSaudas = await saudasAPI.getAllSaudas()
          const saudasUsingVendor = allSaudas.filter(sauda => sauda.purchaser_id === vendorId)
          
          if (saudasUsingVendor.length > 0) {
            // Fetch vendors, rice codes, and rice types to build display names
            const [allVendors, allRiceCodes, allRiceTypes] = await Promise.all([
              vendorsAPI.getAllVendors(false),
              riceCodesAPI.getAllRiceCodes(),
              riceCodesAPI.getRiceTypes()
            ])
            
            // Build sauda display names (Purchaser - Rice Code - Rice Type)
            const saudaNames = saudasUsingVendor.map(sauda => {
              const parts: string[] = []
              
              // Get purchaser name (should be the vendor we're deleting)
              const purchaser = allVendors.find(v => v.id === sauda.purchaser_id)
              if (purchaser?.business_name) parts.push(purchaser.business_name)
              
              // Get rice code name
              const riceCode = allRiceCodes.find(rc => rc.rice_code_id === sauda.rice_code_id)
              if (riceCode?.rice_code_name) parts.push(riceCode.rice_code_name)
              
              // Get rice type label
              const riceTypeLabel = getRiceTypeLabel(sauda.rice_type, allRiceTypes)
              if (riceTypeLabel) parts.push(riceTypeLabel)
              
              return parts.join(' - ') || 'Sauda'
            })
            
            const saudaCount = saudasUsingVendor.length
            const saudaText = saudaCount === 1 ? 'sauda' : 'saudas'
            // Format saudas as a list
            const saudaList = saudaNames.map((name, index) => `${index + 1}. ${name}`).join('\n')
            errorParts.push(`${saudaCount} ${saudaText}:\n${saudaList}`)
          }
        } catch (fetchError) {
          // If fetching saudas fails, continue
        }
      }
      
      // Check for purchases constraint (vendor_id in purchases)
      if (errorMessage.includes('purchases') && errorMessage.includes('vendor_id')) {
        errorParts.push('one or more purchases')
      }
      
      if (errorParts.length > 0) {
        const mainMessage = `This vendor cannot be deleted because it is being used in:\n\n${errorParts.join('\n\n')}\n\nPlease remove the vendor from all references before deleting it.`
        return mainMessage
      }
      
      // Generic foreign key error
      return 'This vendor cannot be deleted because it is being used by other records. Please remove all references to this vendor before deleting it.'
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
            <span className="text-gradient">Vendors Directory</span>
          </h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">Find and manage suppliers seamlessly</p>
        </div>
      </header>

      {/* Responsive Filters and Action Button */}
      <div className="space-y-3">
        <div className="w-full">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by business, contact, email, or phone..." />
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
                { label: 'Debtor', value: 'purchaser' },
                { label: 'Creditor', value: 'seller' },
                { label: 'Both', value: 'both' },
              ]}
              value={typeFilter}
              onChange={setTypeFilter}
            />
          </div>
          {isAdmin() && (
            <button className="btn-primary rounded-xl inline-flex items-center justify-center gap-2 w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Add Vendor
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Store} title="No vendors found" description="Create your first vendor or adjust filters." />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => (
            <article
              key={v.id}
              className="group rounded-2xl p-4 bg-gradient-to-br from-background to-muted/40 border border-border/60 hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                    <Store className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{getTypeLabel(v.type)}</div>
                    <h3 className="text-sm font-semibold leading-tight">{v.business_name.trim()}</h3>
                    <div className="text-xs text-muted-foreground inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {v.address.city.trim()}</div>
                  </div>
                </div>
                <span className={`whitespace-nowrap px-2 py-1 rounded-md text-[10px] ${v.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>{v.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="mt-3 grid gap-1.5 text-xs">
                {v.contact_persons?.[0] && (
                  <>
                    <div className="inline-flex items-center gap-2 text-foreground/90">
                      <span className="text-muted-foreground w-16">Contact</span>
                      <span className="font-medium">{v.contact_persons[0].name?.trim() || 'N/A'}</span>
                    </div>
                    {v.contact_persons[0].emails?.[0] && (
                      <div className="inline-flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{v.contact_persons[0].emails[0].trim()}</span>
                      </div>
                    )}
                    {v.contact_persons[0].phones?.[0] && (
                      <div className="inline-flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{v.contact_persons[0].phones[0].trim()}</span>
                      </div>
                    )}
                  </>
                )}
                
                {/* Address Details */}
                {v.address?.street && (
                  <div className="inline-flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate">{v.address.street.trim()}</span>
                  </div>
                )}
                {(v.address?.city || v.address?.state || v.address?.pincode) && (
                  <div className="inline-flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground opacity-0" />
                    <span className="truncate">
                      {[v.address.city, v.address.state, v.address.pincode].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
                {v.address?.country && v.address.country !== 'India' && (
                  <div className="inline-flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground opacity-0" />
                    <span>{v.address.country}</span>
                  </div>
                )}
                
                {/* Business Details */}
                {v.business_details?.gst_number && (
                  <div className="inline-flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate">GST: {v.business_details.gst_number}</span>
                  </div>
                )}
                {v.business_details?.pan_number && (
                  <div className="inline-flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate">PAN: {v.business_details.pan_number}</span>
                  </div>
                )}
                
                {/* Bank Details */}
                {v.bank_details && (
                  <>
                    {v.bank_details.account_holder_name && (
                      <div className="inline-flex items-center gap-2">
                        <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">A/C: {v.bank_details.account_holder_name}</span>
                      </div>
                    )}
                    {v.bank_details.bank_name && (
                      <div className="inline-flex items-center gap-2">
                        <CreditCard className="h-3.5 w-3.5 text-muted-foreground opacity-0" />
                        <span className="truncate">{v.bank_details.bank_name}</span>
                      </div>
                    )}
                    {v.bank_details.ifsc_code && (
                      <div className="inline-flex items-center gap-2">
                        <CreditCard className="h-3.5 w-3.5 text-muted-foreground opacity-0" />
                        <span className="truncate">IFSC: {v.bank_details.ifsc_code}</span>
                      </div>
                    )}
                  </>
                )}
                
                {/* Last Enquiry Date */}
                {v.last_enquiry_date && (
                  <div className="inline-flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Last Enquiry: {new Date(v.last_enquiry_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Lead Info Section */}
              {v.lead_id && leadDetails[v.lead_id] && (
                <div className="mt-3 pt-3 border-t border-border/40">
                  <div className="flex items-center justify-between mb-2">
                    <div className="inline-flex items-center gap-2 text-primary">
                      <UserCircle className="h-3.5 w-3.5" />
                      <span className="text-xs font-semibold">Lead Info</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/crm/leads/${v.lead_id}`)
                      }}
                      className="text-xs text-primary hover:text-primary/80 inline-flex items-center gap-1 transition-colors"
                    >
                      View Lead <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="grid gap-1.5 text-xs">
                    {leadDetails[v.lead_id].company_name && (
                      <div className="inline-flex items-center gap-2">
                        <span className="text-muted-foreground w-16">Company</span>
                        <span className="font-medium">{leadDetails[v.lead_id].company_name}</span>
                      </div>
                    )}
                    {leadDetails[v.lead_id].business_details?.gst_number && (
                      <div className="inline-flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">GST: {leadDetails[v.lead_id].business_details.gst_number}</span>
                      </div>
                    )}
                    {leadDetails[v.lead_id].business_details?.pan_number && (
                      <div className="inline-flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">PAN: {leadDetails[v.lead_id].business_details.pan_number}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isAdmin() && (
                <div className="mt-3 flex items-center justify-end">
                  <ActionButtons
                    isActive={v.is_active}
                    onEdit={() => {
                      setSelectedVendorId(v.id)
                      setEditModalOpen(true)
                    }}
                    onDelete={() => {
                      setSelectedId(v.id)
                      setDeleteDialogOpen(true)
                    }}
                    permissionEntity="vendor"
                  />
                </div>
              )}
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
              await deleteVendor(selectedId)
              setSelectedId(null)
              setDeleteDialogOpen(false)
            } catch (error: any) {
              // Parse foreign key constraint errors and fetch related leads/saudas
              const friendlyMessage = await parseVendorForeignKeyError(error, selectedId)
              
              if (friendlyMessage) {
                setAlertType('error')
                setAlertTitle('Cannot Delete Vendor')
                setAlertMessage(friendlyMessage)
                setAlertOpen(true)
              } else {
                // Generic error handling
                setAlertType('error')
                setAlertTitle('Failed to Delete Vendor')
                setAlertMessage(
                  error?.message || 
                  error?.data?.message || 
                  error?.error || 
                  'An error occurred while deleting the vendor. Please try again.'
                )
                setAlertOpen(true)
              }
              setDeleteDialogOpen(false)
            }
          }
        }}
        title="Delete Vendor"
        description="Are you sure you want to delete this vendor? This action cannot be undone."
        confirmText="Delete"
      />

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
      />

      <VendorFormModal 
        open={createOpen} 
        onOpenChange={(open) => {
          setCreateOpen(open);
          // Refetch vendors when modal closes to ensure we have the latest data
          if (!open) {
            refetch();
          }
        }} 
      />

      <VendorFormModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            setSelectedVendorId(null);
            refetch();
          }
        }}
        vendorId={selectedVendorId}
      />
    </div>
  )
}



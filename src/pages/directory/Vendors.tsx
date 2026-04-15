import { useMemo, useState, useEffect } from 'react'
import { Store, Plus, Mail, Phone, MapPin, CreditCard, FileText, Calendar, UserCircle, ExternalLink, AlertTriangle } from 'lucide-react'
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
import { PartySiteFormModal } from '../../components/admin/shared/PartySiteFormModal'
import { PartySitesDialog } from '../../components/admin/shared/PartySitesDialog'
import { leadsAPI } from '../../services/leads.api'
import { saudasAPI } from '../../services/saudas.api'
import { vendorsAPI } from '../../services/vendors.api'
import { riceCodesAPI } from '../../services/riceCodes.api'
import { getRiceTypeLabel } from '../../utils/riceType'
import { isAdmin } from '../../utils/permissions'
import type { Lead } from '../../types/entities'

export default function VendorsPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>('active')
  const includeInactive = statusFilter !== 'active'
  const { vendors, loading, deleteVendor, refetch } = useVendors({ includeInactive })
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [bankVerifyFilter, setBankVerifyFilter] = useState<string | undefined>()
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
  const [addSiteCtx, setAddSiteCtx] = useState<{ id: string; name: string } | null>(null)
  const [viewSitesCtx, setViewSitesCtx] = useState<{ id: string; name: string } | null>(null)

  const filtered = useMemo(() => {
    return vendors.filter((v) => {
      const q = searchQuery.toLowerCase()
      const primaryContact = v.contact_persons?.[0]
      const matchesSearch =
        v.business_name.toLowerCase().includes(q) ||
        (primaryContact?.name || '').toLowerCase().includes(q) ||
        (primaryContact?.emails?.[0] || '').toLowerCase().includes(q) ||
        (primaryContact?.phones?.[0] || '').includes(searchQuery)

      const matchesStatus =
        statusFilter === 'inactive' ? !v.is_active : statusFilter === 'active' ? v.is_active : true

      const verified = Boolean(v.bank_details_verified_at)
      const matchesBankFilter =
        bankVerifyFilter === 'verified' ? verified : bankVerifyFilter === 'unverified' ? !verified : true

      return matchesSearch && matchesStatus && matchesBankFilter
    })
  }, [vendors, searchQuery, bankVerifyFilter, statusFilter])

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
            <span className="text-gradient">Purchase Party Directory</span>
          </h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">Find and manage suppliers seamlessly</p>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="w-full min-w-0 flex-1 flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="min-w-0 flex-1">
            <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by business, contact, email, or phone..." />
          </div>
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
            label="Bank"
            options={[
              { label: 'Verified', value: 'verified' },
              { label: 'Not verified', value: 'unverified' },
            ]}
            value={bankVerifyFilter}
            onChange={setBankVerifyFilter}
          />
        </div>
        {isAdmin() && (
          <button
            className="btn-primary rounded-xl inline-flex items-center justify-center gap-2 w-full sm:w-auto shrink-0"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" /> Add Purchase Party
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Store} title="No purchase parties found" description="Create your first purchase party or try a different search." />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => (
            <article
              key={v.id}
              className="group min-w-0 rounded-2xl p-4 bg-gradient-to-br from-background to-muted/40 border border-border/60 hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden"
            >
              <div className="flex items-start justify-between gap-3 min-w-0">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                    <Store className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold leading-tight break-words">{v.business_name.trim()}</h3>
                    <div className="text-xs text-muted-foreground flex items-start gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                      <span className="break-words">{v.address.city.trim()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 justify-end shrink-0">
                  {v.bank_details_verified_at && (
                    <span
                      className="whitespace-nowrap px-2 py-1 rounded-md text-[10px] bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/25"
                      title={`Bank verified${v.bank_details_verified_at ? ` · ${new Date(v.bank_details_verified_at).toLocaleString()}` : ''}`}
                    >
                      Bank verified
                    </span>
                  )}
                  {!v.bank_details_verified_at && v.bank_verification_error?.trim() && (
                    <span
                      className="whitespace-nowrap px-2 py-1 rounded-md text-[10px] bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30"
                      title={v.bank_verification_error.trim()}
                    >
                      Bank check failed
                    </span>
                  )}
                  <span className={`whitespace-nowrap px-2 py-1 rounded-md text-[10px] ${v.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>{v.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
              {!v.bank_details_verified_at && v.bank_verification_error?.trim() && (
                <div
                  className="mt-3 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100 flex gap-2 min-w-0"
                  role="status"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden />
                  <p className="min-w-0 break-words leading-snug">{v.bank_verification_error.trim()}</p>
                </div>
              )}
              <div className="mt-3 grid gap-1.5 text-xs min-w-0">
                {v.contact_persons?.[0] && (
                  <>
                    <div className="flex items-start gap-2 text-foreground/90 min-w-0">
                      <span className="text-muted-foreground w-16 shrink-0">Contact</span>
                      <span className="font-medium min-w-0 break-words">{v.contact_persons[0].name?.trim() || 'N/A'}</span>
                    </div>
                    {v.contact_persons[0].emails?.[0] && (
                      <div className="flex items-start gap-2 min-w-0">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="min-w-0 break-words">{v.contact_persons[0].emails[0].trim()}</span>
                      </div>
                    )}
                    {v.contact_persons[0].phones?.[0] && (
                      <div className="flex items-start gap-2 min-w-0">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="min-w-0 break-words">{v.contact_persons[0].phones[0].trim()}</span>
                      </div>
                    )}
                  </>
                )}
                
                {/* Address Details */}
                {v.address?.street && (
                  <div className="flex items-start gap-2 min-w-0">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="min-w-0 break-words">{v.address.street.trim()}</span>
                  </div>
                )}
                {(v.address?.city || v.address?.state || v.address?.pincode) && (
                  <div className="flex items-start gap-2 min-w-0">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground opacity-0 shrink-0 mt-0.5" />
                    <span className="min-w-0 break-words">
                      {[v.address.city, v.address.state, v.address.pincode].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
                {v.address?.country && v.address.country !== 'India' && (
                  <div className="flex items-start gap-2 min-w-0">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground opacity-0 shrink-0 mt-0.5" />
                    <span className="min-w-0 break-words">{v.address.country}</span>
                  </div>
                )}
                
                {/* Business Details */}
                {v.business_details?.gst_number && (
                  <div className="flex items-start gap-2 min-w-0">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="min-w-0 break-words">GST: {v.business_details.gst_number}</span>
                  </div>
                )}
                {v.business_details?.pan_number && (
                  <div className="flex items-start gap-2 min-w-0">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="min-w-0 break-words">PAN: {v.business_details.pan_number}</span>
                  </div>
                )}
                
                {/* Bank Details */}
                {v.bank_details && (
                  <>
                    {v.bank_details.account_holder_name && (
                      <div className="flex items-start gap-2 min-w-0">
                        <CreditCard className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="min-w-0 break-words">A/C: {v.bank_details.account_holder_name}</span>
                      </div>
                    )}
                    {v.bank_details.bank_name && (
                      <div className="flex items-start gap-2 min-w-0">
                        <CreditCard className="h-3.5 w-3.5 text-muted-foreground opacity-0 shrink-0 mt-0.5" />
                        <span className="min-w-0 break-words">{v.bank_details.bank_name}</span>
                      </div>
                    )}
                    {v.bank_details.ifsc_code && (
                      <div className="flex items-start gap-2 min-w-0">
                        <CreditCard className="h-3.5 w-3.5 text-muted-foreground opacity-0 shrink-0 mt-0.5" />
                        <span className="min-w-0 break-words">IFSC: {v.bank_details.ifsc_code}</span>
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
                  <div className="grid gap-1.5 text-xs min-w-0">
                    {leadDetails[v.lead_id].company_name && (
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="text-muted-foreground w-16 shrink-0">Company</span>
                        <span className="font-medium min-w-0 break-words">{leadDetails[v.lead_id].company_name}</span>
                      </div>
                    )}
                    {leadDetails[v.lead_id].business_details?.gst_number && (
                      <div className="flex items-start gap-2 min-w-0">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="min-w-0 break-words">GST: {leadDetails[v.lead_id].business_details.gst_number}</span>
                      </div>
                    )}
                    {leadDetails[v.lead_id].business_details?.pan_number && (
                      <div className="flex items-start gap-2 min-w-0">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="min-w-0 break-words">PAN: {leadDetails[v.lead_id].business_details.pan_number}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isAdmin() && (
                <div className="mt-3 flex items-center justify-end">
                  <ActionButtons
                    isActive={v.is_active}
                    onAddSite={() => setAddSiteCtx({ id: v.id, name: v.business_name })}
                    onViewSites={() => setViewSitesCtx({ id: v.id, name: v.business_name })}
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
                setAlertTitle('Cannot Delete Purchase Party')
                setAlertMessage(friendlyMessage)
                setAlertOpen(true)
              } else {
                // Generic error handling
                setAlertType('error')
                setAlertTitle('Failed to Delete Purchase Party')
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
        title="Delete Purchase Party"
        description="Are you sure you want to delete this purchase party? This action cannot be undone."
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
        defaultType="seller"
        lockType={true}
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

      <PartySiteFormModal
        open={addSiteCtx !== null}
        onOpenChange={(open) => {
          if (!open) setAddSiteCtx(null)
        }}
        kind="vendor"
        partyId={addSiteCtx?.id ?? ''}
        partyName={addSiteCtx?.name}
        onSaved={() => refetch()}
      />

      <PartySitesDialog
        open={viewSitesCtx !== null}
        onOpenChange={(open) => {
          if (!open) setViewSitesCtx(null)
        }}
        kind="vendor"
        partyId={viewSitesCtx?.id ?? ''}
        partyName={viewSitesCtx?.name ?? ''}
      />
    </div>
  )
}



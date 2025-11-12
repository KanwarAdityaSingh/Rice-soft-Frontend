import { useMemo, useState, useEffect } from 'react'
import { Store, Plus, Mail, Phone, MapPin, Building2, CreditCard, FileText, Calendar, UserCircle, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SearchBar } from '../../components/admin/shared/SearchBar'
import { FilterDropdown } from '../../components/admin/shared/FilterDropdown'
import { LoadingSpinner } from '../../components/admin/shared/LoadingSpinner'
import { EmptyState } from '../../components/admin/shared/EmptyState'
import { ActionButtons } from '../../components/admin/shared/ActionButtons'
import { ConfirmDialog } from '../../components/admin/shared/ConfirmDialog'
import { useVendors } from '../../hooks/useVendors'
import { VendorFormModal } from '../../components/admin/vendors/VendorFormModal'
import { leadsAPI } from '../../services/leads.api'
import type { Lead } from '../../types/entities'

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

  const filtered = useMemo(() => {
    return vendors.filter((v) => {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        v.business_name.toLowerCase().includes(q) ||
        v.contact_person.toLowerCase().includes(q) ||
        v.email.toLowerCase().includes(q) ||
        v.phone.includes(searchQuery)

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
                { label: 'Purchaser', value: 'purchaser' },
                { label: 'Seller', value: 'seller' },
                { label: 'Both', value: 'both' },
              ]}
              value={typeFilter}
              onChange={setTypeFilter}
            />
          </div>
          <button className="btn-primary rounded-xl inline-flex items-center justify-center gap-2 w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Add Vendor
          </button>
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
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{String(v.type).trim()}</div>
                    <h3 className="text-sm font-semibold leading-tight">{v.business_name.trim()}</h3>
                    <div className="text-xs text-muted-foreground inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {v.address.city.trim()}</div>
                  </div>
                </div>
                <span className={`whitespace-nowrap px-2 py-1 rounded-md text-[10px] ${v.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>{v.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="mt-3 grid gap-1.5 text-xs">
                <div className="inline-flex items-center gap-2 text-foreground/90">
                  <span className="text-muted-foreground w-16">Contact</span>
                  <span className="font-medium">{v.contact_person.trim()}</span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{v.email.trim()}</span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{v.phone.trim()}</span>
                </div>
                
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
                {v.business_details?.registration_number && (
                  <div className="inline-flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate">Reg: {v.business_details.registration_number}</span>
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
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={async () => {
          if (selectedId) {
            await deleteVendor(selectedId)
            setSelectedId(null)
            setDeleteDialogOpen(false)
          }
        }}
        title="Delete Vendor"
        description="Are you sure you want to delete this vendor? This action cannot be undone."
        confirmText="Delete"
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



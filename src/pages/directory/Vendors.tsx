import { useMemo, useState } from 'react'
import { Store, Plus, Mail, Phone, MapPin } from 'lucide-react'
import { SearchBar } from '../../components/admin/shared/SearchBar'
import { FilterDropdown } from '../../components/admin/shared/FilterDropdown'
import { LoadingSpinner } from '../../components/admin/shared/LoadingSpinner'
import { EmptyState } from '../../components/admin/shared/EmptyState'
import { ActionButtons } from '../../components/admin/shared/ActionButtons'
import { ConfirmDialog } from '../../components/admin/shared/ConfirmDialog'
import { useVendors } from '../../hooks/useVendors'
import { VendorFormModal } from '../../components/admin/vendors/VendorFormModal'

export default function VendorsPage() {
  const { vendors, loading, deleteVendor } = useVendors()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [typeFilter, setTypeFilter] = useState<string | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

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

  return (
    <div className="container mx-auto py-10 space-y-8">
      <header className="hero-bg rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -left-6 -top-6 h-24 w-24 floating-orb" />
        <div className="absolute -right-6 -bottom-6 h-20 w-20 floating-orb" />
        <div className="relative">
          <h1 className="text-3xl sm:text-4xl font-bold">
            <span className="text-gradient">Vendors Directory</span>
          </h1>
          <p className="mt-2 text-muted-foreground">Find and manage suppliers seamlessly</p>
        </div>
      </header>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-[16rem]">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by business, contact, email, or phone..." />
        </div>
        <div className="flex gap-2">
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
          <button className="btn-primary rounded-xl inline-flex items-center gap-2" onClick={() => setCreateOpen(true)}>
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
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{v.type}</div>
                    <h3 className="text-sm font-semibold leading-tight">{v.business_name}</h3>
                    <div className="text-xs text-muted-foreground inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {v.address.city}</div>
                  </div>
                </div>
                <span className={`whitespace-nowrap px-2 py-1 rounded-md text-[10px] ${v.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>{v.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="mt-3 grid gap-1.5 text-xs">
                <div className="inline-flex items-center gap-2 text-foreground/90"><span className="text-muted-foreground w-16">Contact</span><span className="font-medium">{v.contact_person}</span></div>
                <div className="inline-flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /><span className="truncate">{v.email}</span></div>
                <div className="inline-flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /><span>{v.phone}</span></div>
              </div>
              <div className="mt-3 flex items-center justify-end">
                <ActionButtons
                  isActive={v.is_active}
                  onDelete={() => {
                    setSelectedId(v.id)
                    setDeleteDialogOpen(true)
                  }}
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

      <VendorFormModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}



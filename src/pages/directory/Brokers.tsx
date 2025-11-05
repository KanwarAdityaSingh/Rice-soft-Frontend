import { useMemo, useState } from 'react'
import { UserCircle, Plus, Mail, Phone, MapPin } from 'lucide-react'
import { SearchBar } from '../../components/admin/shared/SearchBar'
import { FilterDropdown } from '../../components/admin/shared/FilterDropdown'
import { LoadingSpinner } from '../../components/admin/shared/LoadingSpinner'
import { EmptyState } from '../../components/admin/shared/EmptyState'
import { ActionButtons } from '../../components/admin/shared/ActionButtons'
import { ConfirmDialog } from '../../components/admin/shared/ConfirmDialog'
import { useBrokers } from '../../hooks/useBrokers'
import { BrokerFormModal } from '../../components/admin/brokers/BrokerFormModal'

export default function BrokersPage() {
  const { brokers, loading, deleteBroker, refetch } = useBrokers()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [typeFilter, setTypeFilter] = useState<string | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const filtered = useMemo(() => {
    return brokers.filter((b) => {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        b.business_name.toLowerCase().includes(q) ||
        b.contact_person.toLowerCase().includes(q) ||
        b.email.toLowerCase().includes(q) ||
        b.phone.includes(searchQuery)

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
                    <h3 className="text-sm font-semibold leading-tight">{b.business_name.trim()}</h3>
                    <div className="text-xs text-muted-foreground inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {b.address.city.trim()}</div>
                  </div>
                </div>
                <span className={`whitespace-nowrap px-2 py-1 rounded-md text-[10px] ${b.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>{b.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="mt-3 grid gap-1.5 text-xs">
                <div className="inline-flex items-center gap-2 text-foreground/90"><span className="text-muted-foreground w-16">Contact</span><span className="font-medium">{b.contact_person.trim()}</span></div>
                <div className="inline-flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /><span className="truncate">{b.email.trim()}</span></div>
                <div className="inline-flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /><span>{b.phone.trim()}</span></div>
              </div>
              <div className="mt-3 flex items-center justify-end">
                <ActionButtons
                  isActive={b.is_active}
                  onDelete={() => {
                    setSelectedId(b.id)
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
            await deleteBroker(selectedId)
            setSelectedId(null)
            setDeleteDialogOpen(false)
          }
        }}
        title="Delete Broker"
        description="Are you sure you want to delete this broker? This action cannot be undone."
        confirmText="Delete"
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



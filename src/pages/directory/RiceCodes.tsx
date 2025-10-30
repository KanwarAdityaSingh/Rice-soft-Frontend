import { useMemo, useState } from 'react'
import { Sprout, Plus, List } from 'lucide-react'
import { SearchBar } from '../../components/admin/shared/SearchBar'
import { LoadingSpinner } from '../../components/admin/shared/LoadingSpinner'
import { EmptyState } from '../../components/admin/shared/EmptyState'
import { ActionButtons } from '../../components/admin/shared/ActionButtons'
import { ConfirmDialog } from '../../components/admin/shared/ConfirmDialog'
import { useRiceCodes } from '../../hooks/useRiceCodes'
import { RiceCodeFormModal } from '../../components/admin/rice-codes/RiceCodeFormModal'
import { RiceTypesModal } from '../../components/admin/rice-codes/RiceTypesModal'
import type { RiceCode } from '../../types/entities'

export default function RiceCodesPage() {
  const { riceCodes, loading, deleteRiceCode, createRiceCode, updateRiceCode } = useRiceCodes()
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editRiceCode, setEditRiceCode] = useState<RiceCode | null>(null)
  const [riceTypesOpen, setRiceTypesOpen] = useState(false)

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
          <button
            className="btn-primary rounded-xl inline-flex items-center justify-center gap-2"
            onClick={() => {
              setEditRiceCode(null)
              setCreateOpen(true)
            }}
          >
            <Plus className="h-4 w-4" /> Add Rice Code
          </button>
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
                    <h3 className="text-sm font-semibold leading-tight">{rc.rice_code_name}</h3>
                    <div className="text-xs text-muted-foreground mt-1">Created {formatDate(rc.created_at)}</div>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end">
                <ActionButtons
                  onEdit={() => {
                    setEditRiceCode(rc)
                    setCreateOpen(true)
                  }}
                  onDelete={() => {
                    setSelectedId(rc.rice_code_id)
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
            await deleteRiceCode(selectedId)
            setSelectedId(null)
            setDeleteDialogOpen(false)
          }
        }}
        title="Delete Rice Code"
        description="Are you sure you want to delete this rice code? This action cannot be undone."
        confirmText="Delete"
      />

      <RiceCodeFormModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) {
            setEditRiceCode(null)
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


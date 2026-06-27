import { useMemo, useState } from 'react';
import { Warehouse, Plus, MapPin, ExternalLink } from 'lucide-react';
import { SearchBar } from '../shared/SearchBar';
import { FilterDropdown } from '../shared/FilterDropdown';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { EmptyState } from '../shared/EmptyState';
import { ActionButtons } from '../shared/ActionButtons';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { AlertDialog } from '../../shared/AlertDialog';
import { useGodowns } from '../../../hooks/useGodowns';
import { isAdmin } from '../../../utils/permissions';
import { GodownFormModal } from './GodownFormModal';
import type { Godown } from '../../../types/entities';

export function GodownsTable() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>('active');
  const includeInactive = statusFilter !== 'active';
  const { godowns, loading, deleteGodown, refetch } = useGodowns(includeInactive);
  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Godown | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('error');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return godowns.filter((g) => {
      const primary = (g.contact_persons?.[0]?.name ?? '').toLowerCase();
      const matchesSearch =
        g.name.toLowerCase().includes(q) ||
        primary.includes(q) ||
        (g.gst_number ?? '').toLowerCase().includes(q) ||
        (g.address?.city ?? '').toLowerCase().includes(q);
      const matchesStatus = statusFilter
        ? statusFilter === 'active'
          ? g.is_active
          : !g.is_active
        : true;
      return matchesSearch && matchesStatus;
    });
  }, [godowns, searchQuery, statusFilter]);

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await deleteGodown(selected.id);
      setDeleteOpen(false);
      setSelected(null);
      setAlertType('success');
      setAlertTitle('Deleted');
      setAlertMessage('Godown removed');
      setAlertOpen(true);
    } catch (e: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(e?.message || 'Delete failed');
      setAlertOpen(true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search godowns…" />
        </div>
        <FilterDropdown
          label="Status"
          options={[
            { label: 'All', value: '' },
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        {isAdmin() && (
          <button
            type="button"
            className="btn-primary rounded-xl inline-flex items-center gap-2 px-4 py-2"
            onClick={() => {
              setEditId(null);
              setCreateOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add Godown
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Warehouse} title="No godowns" description="Create a warehouse to receive stock and run production." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((g) => (
            <article
              key={g.id}
              className="rounded-2xl p-4 bg-gradient-to-br from-background to-muted/40 border border-border/60 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Warehouse className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{g.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {g.contact_persons?.[0]?.name ? (
                        <>
                          {g.contact_persons[0].name}
                          {g.gst_number ? ` · ${g.gst_number}` : ''}
                        </>
                      ) : (
                        g.gst_number || '—'
                      )}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${
                    g.is_active ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {g.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {g.address && (g.address.city || g.address.state) && (
                <p className="mt-3 text-xs text-muted-foreground flex items-start gap-1">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    {[g.address.city, g.address.state, g.address.pincode].filter(Boolean).join(', ')}
                  </span>
                </p>
              )}
              {g.google_maps_link?.trim() && (
                <a
                  href={g.google_maps_link.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  Open in Google Maps
                </a>
              )}
              {isAdmin() && (
                <div className="mt-4 flex justify-end">
                  <ActionButtons
                    isActive={g.is_active}
                    onEdit={() => {
                      setEditId(g.id);
                      setCreateOpen(true);
                    }}
                    onDelete={() => {
                      setSelected(g);
                      setDeleteOpen(true);
                    }}
                  />
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <GodownFormModal
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) setEditId(null);
          if (!o) refetch();
        }}
        godownId={editId}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete godown?"
        description={selected ? `This will delete “${selected.name}”. This may fail if stock or documents reference it.` : ''}
        confirmText="Delete"
        onConfirm={handleDelete}
      />

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen} type={alertType} title={alertTitle} message={alertMessage} />
    </div>
  );
}

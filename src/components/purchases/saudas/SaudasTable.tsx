import { useState, useMemo } from 'react';
import { SearchBar } from '../../admin/shared/SearchBar';
import { FilterDropdown } from '../../admin/shared/FilterDropdown';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { ActionButtons } from '../../admin/shared/ActionButtons';
import { ConfirmDialog } from '../../admin/shared/ConfirmDialog';
import { Package } from 'lucide-react';
import { useSaudas } from '../../../hooks/useSaudas';
import { SaudaFormModal } from './SaudaFormModal';
import { SaudaPreviewDialog } from './SaudaPreviewDialog';
import type { Sauda } from '../../../types/entities';

export function SaudasTable() {
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const { saudas, loading, deleteSauda, refetch } = useSaudas({
    sauda_type: typeFilter as any,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSauda, setSelectedSauda] = useState<Sauda | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedSaudaId, setSelectedSaudaId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSauda, setPreviewSauda] = useState<Sauda | null>(null);

  const filtered = useMemo(() => {
    return saudas.filter((s) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        s.rice_quality.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q);

      return matchesSearch;
    });
  }, [saudas, searchQuery]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by rice quality or ID..." />
        </div>
        <div className="flex gap-2">
          <FilterDropdown
            label="Type"
            options={[
              { label: 'X Godown', value: 'xgodown' },
              { label: 'FOR', value: 'for' },
            ]}
            value={typeFilter}
            onChange={setTypeFilter}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Package} title="No saudas found" description="Create your first sauda or adjust filters." />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <article
              key={s.id}
              className="group rounded-2xl p-4 bg-gradient-to-br from-background to-muted/40 border border-border/60 hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.sauda_type}</div>
                    <h3 className="text-sm font-semibold leading-tight">{s.rice_quality}</h3>
                    <div className="text-xs text-muted-foreground">Rate: ₹{(s.rate ?? 0).toFixed(2)}</div>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid gap-1.5 text-xs">
                {s.quantity && (
                  <div className="inline-flex items-center gap-2">
                    <span className="text-muted-foreground w-20">Quantity:</span>
                    <span className="font-medium">{s.quantity}</span>
                  </div>
                )}
                {s.broker_commission && (
                  <div className="inline-flex items-center gap-2">
                    <span className="text-muted-foreground w-20">Broker Comm:</span>
                    <span className="font-medium">{s.broker_commission}%</span>
                  </div>
                )}
                {s.cash_discount != null && (
                  <div className="inline-flex items-center gap-2">
                    <span className="text-muted-foreground w-20">Cash Discount:</span>
                    <span className="font-medium">₹{s.cash_discount.toFixed(2)}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setPreviewSauda(s);
                    setPreviewOpen(true);
                  }}
                  className="text-xs text-primary hover:text-primary/80 px-2 py-1 rounded"
                >
                  View
                </button>
                <ActionButtons
                  isActive={true}
                  onEdit={() => {
                    setSelectedSaudaId(s.id);
                    setEditModalOpen(true);
                  }}
                  onDelete={() => {
                    setSelectedSauda(s);
                    setDeleteDialogOpen(true);
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
          if (selectedSauda) {
            await deleteSauda(selectedSauda.id);
            setDeleteDialogOpen(false);
            setSelectedSauda(null);
          }
        }}
        title="Delete Sauda"
        description={`Are you sure you want to delete this sauda? This action cannot be undone.`}
        confirmText="Delete"
      />

      <SaudaFormModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            refetch();
          }
        }}
      />

      <SaudaFormModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            setSelectedSaudaId(null);
            refetch();
          }
        }}
        saudaId={selectedSaudaId}
      />

      <SaudaPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        sauda={previewSauda}
      />
    </div>
  );
}


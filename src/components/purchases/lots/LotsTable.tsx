import { useState, useMemo } from 'react';
import { SearchBar } from '../../admin/shared/SearchBar';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { ActionButtons } from '../../admin/shared/ActionButtons';
import { ConfirmDialog } from '../../admin/shared/ConfirmDialog';
import { Package } from 'lucide-react';
import { useLots } from '../../../hooks/useLots';
import { LotFormModal } from './LotFormModal';
import { LotPreviewDialog } from './LotPreviewDialog';
import type { Lot } from '../../../types/entities';

export function LotsTable() {
  const [saudaFilter, setSaudaFilter] = useState<string | undefined>();
  const { lots, loading, deleteLot, refetch } = useLots(saudaFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLot, setPreviewLot] = useState<Lot | null>(null);

  const filtered = useMemo(() => {
    return lots.filter((lot) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        lot.lot_number.toLowerCase().includes(q) ||
        lot.item_name.toLowerCase().includes(q);

      return matchesSearch;
    });
  }, [lots, searchQuery]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by lot number or item name..." />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCreateOpen(true)}
            className="btn-primary rounded-xl inline-flex items-center justify-center gap-2 px-4 py-2"
          >
            Add Lot
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Package} title="No lots found" description="Create your first lot or adjust filters." />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lot) => (
            <article
              key={lot.id}
              className="group rounded-2xl p-4 bg-gradient-to-br from-background to-muted/40 border border-border/60 hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Lot</div>
                    <h3 className="text-sm font-semibold leading-tight">{lot.lot_number}</h3>
                    <div className="text-xs text-muted-foreground">{lot.item_name}</div>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid gap-1.5 text-xs">
                <div className="inline-flex items-center gap-2">
                  <span className="text-muted-foreground w-24">Bags:</span>
                  <span className="font-medium">{lot.no_of_bags}</span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <span className="text-muted-foreground w-24">Bill Weight:</span>
                  <span className="font-medium">{lot.bill_weight} kg</span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <span className="text-muted-foreground w-24">Received Weight:</span>
                  <span className="font-medium">{lot.received_weight} kg</span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <span className="text-muted-foreground w-24">Rate:</span>
                  <span className="font-medium">₹{(lot.rate ?? 0).toFixed(2)}</span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <span className="text-muted-foreground w-24">Amount:</span>
                  <span className="font-medium">₹{(lot.amount ?? 0).toFixed(2)}</span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setPreviewLot(lot);
                    setPreviewOpen(true);
                  }}
                  className="text-xs text-primary hover:text-primary/80 px-2 py-1 rounded"
                >
                  View
                </button>
                <ActionButtons
                  isActive={true}
                  onEdit={() => {
                    setSelectedLotId(lot.id);
                    setEditModalOpen(true);
                  }}
                  onDelete={() => {
                    setSelectedLot(lot);
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
          if (selectedLot) {
            await deleteLot(selectedLot.id);
            setDeleteDialogOpen(false);
            setSelectedLot(null);
          }
        }}
        title="Delete Lot"
        description={`Are you sure you want to delete ${selectedLot?.lot_number}? This action cannot be undone.`}
        confirmText="Delete"
      />

      <LotFormModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            refetch();
          }
        }}
      />

      <LotFormModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            setSelectedLotId(null);
            refetch();
          }
        }}
        lotId={selectedLotId}
      />

      <LotPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        lot={previewLot}
      />
    </div>
  );
}


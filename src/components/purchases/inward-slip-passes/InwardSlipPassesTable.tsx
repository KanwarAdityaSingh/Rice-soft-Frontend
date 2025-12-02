import { useState, useMemo } from 'react';
import { SearchBar } from '../../admin/shared/SearchBar';
import { FilterDropdown } from '../../admin/shared/FilterDropdown';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { ActionButtons } from '../../admin/shared/ActionButtons';
import { ConfirmDialog } from '../../admin/shared/ConfirmDialog';
import { FileText } from 'lucide-react';
import { useInwardSlipPasses } from '../../../hooks/useInwardSlipPasses';
import { InwardSlipPassFormModal } from './InwardSlipPassFormModal';
import { InwardSlipPassPreviewDialog } from './InwardSlipPassPreviewDialog';
import type { InwardSlipPass } from '../../../types/entities';

export function InwardSlipPassesTable() {
  const [saudaFilter, setSaudaFilter] = useState<string | undefined>();
  const { inwardSlipPasses, loading, deleteInwardSlipPass, refetch } = useInwardSlipPasses(saudaFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedISP, setSelectedISP] = useState<InwardSlipPass | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedISPId, setSelectedISPId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewISP, setPreviewISP] = useState<InwardSlipPass | null>(null);

  const filtered = useMemo(() => {
    return inwardSlipPasses.filter((isp) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        isp.slip_number.toLowerCase().includes(q) ||
        isp.vehicle_number.toLowerCase().includes(q) ||
        isp.party_name.toLowerCase().includes(q);

      return matchesSearch;
    });
  }, [inwardSlipPasses, searchQuery]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by slip number, vehicle, or party..." />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCreateOpen(true)}
            className="btn-primary rounded-xl inline-flex items-center justify-center gap-2 px-4 py-2"
          >
            Add ISP
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No inward slip passes found" description="Create your first ISP or adjust filters." />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((isp) => (
            <article
              key={isp.id}
              className="group rounded-2xl p-4 bg-gradient-to-br from-background to-muted/40 border border-border/60 hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">ISP</div>
                    <h3 className="text-sm font-semibold leading-tight">{isp.slip_number}</h3>
                    <div className="text-xs text-muted-foreground">{isp.party_name}</div>
                  </div>
                </div>
                <span className={`whitespace-nowrap px-2 py-1 rounded-md text-[10px] ${
                  isp.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-yellow-500/10 text-yellow-600'
                }`}>
                  {isp.status}
                </span>
              </div>
              <div className="mt-3 grid gap-1.5 text-xs">
                <div className="inline-flex items-center gap-2">
                  <span className="text-muted-foreground w-20">Vehicle:</span>
                  <span className="font-medium">{isp.vehicle_number}</span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <span className="text-muted-foreground w-20">Date:</span>
                  <span className="font-medium">{new Date(isp.date).toLocaleDateString()}</span>
                </div>
                {isp.transportation_cost != null && (
                  <div className="inline-flex items-center gap-2">
                    <span className="text-muted-foreground w-20">Transport:</span>
                    <span className="font-medium">₹{isp.transportation_cost.toFixed(2)}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setPreviewISP(isp);
                    setPreviewOpen(true);
                  }}
                  className="text-xs text-primary hover:text-primary/80 px-2 py-1 rounded"
                >
                  View
                </button>
                <ActionButtons
                  isActive={isp.status === 'completed'}
                  onEdit={() => {
                    setSelectedISPId(isp.id);
                    setEditModalOpen(true);
                  }}
                  onDelete={() => {
                    setSelectedISP(isp);
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
          if (selectedISP) {
            await deleteInwardSlipPass(selectedISP.id);
            setDeleteDialogOpen(false);
            setSelectedISP(null);
          }
        }}
        title="Delete Inward Slip Pass"
        description={`Are you sure you want to delete ${selectedISP?.slip_number}? This action cannot be undone.`}
        confirmText="Delete"
      />

      <InwardSlipPassFormModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            refetch();
          }
        }}
      />

      <InwardSlipPassFormModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            setSelectedISPId(null);
            refetch();
          }
        }}
        ispId={selectedISPId}
      />

      <InwardSlipPassPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        isp={previewISP}
      />
    </div>
  );
}


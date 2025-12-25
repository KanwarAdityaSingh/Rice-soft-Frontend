import { useMemo, useState } from 'react';
import { FlaskConical, Plus, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SearchBar } from '../../admin/shared/SearchBar';
import { FilterDropdown } from '../../admin/shared/FilterDropdown';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { ActionButtons } from '../../admin/shared/ActionButtons';
import { AlertDialog } from '../../shared/AlertDialog';
import { useBatches } from '../../../hooks/useBatches';
import { useProducts } from '../../../hooks/useProducts';
import { isAdmin } from '../../../utils/permissions';
import { BatchFormModal } from './BatchFormModal';

export function BatchesTable() {
  const navigate = useNavigate();
  const { batches, loading, refetch } = useBatches();
  const { products } = useProducts();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('error');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const filtered = useMemo(() => {
    return batches.filter((b) => {
      const q = searchQuery.toLowerCase();
      const product = products.find((p) => p.id === b.product_id);
      const matchesSearch = b.batch_number.toLowerCase().includes(q) || product?.name.toLowerCase().includes(q) || false;
      const matchesStatus = statusFilter ? b.status === statusFilter : true;
      return matchesSearch && matchesStatus;
    });
  }, [batches, searchQuery, statusFilter, products]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-600';
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-600';
      case 'cancelled':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search batches..."
          />
        </div>
        <div className="flex gap-2">
          <FilterDropdown
            label="Status"
            options={[
              { label: 'All', value: undefined },
              { label: 'Planned', value: 'planned' },
              { label: 'In Progress', value: 'in_progress' },
              { label: 'Completed', value: 'completed' },
              { label: 'Cancelled', value: 'cancelled' },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
          <button
            className="btn-primary rounded-xl inline-flex items-center justify-center gap-2 w-full sm:w-auto"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" /> Create Batch
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="No batches found"
          description="Create your first batch to get started."
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((batch) => {
            const product = products.find((p) => p.id === batch.product_id);
            return (
              <article
                key={batch.id}
                className="group rounded-2xl p-4 bg-gradient-to-br from-background to-muted/40 border border-border/60 hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                      <FlaskConical className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold leading-tight">{batch.batch_number}</h3>
                      <div className="text-xs text-muted-foreground mt-1">
                        {product?.name || 'Unknown Product'}
                      </div>
                    </div>
                  </div>
                  <span className={`whitespace-nowrap px-2 py-1 rounded-md text-[10px] ${getStatusColor(batch.status)}`}>
                    {batch.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <div>Quantity: {batch.quantity.toFixed(2)} kg</div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => navigate(`/production/batches/${batch.id}`)}
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <Eye className="h-3 w-3" />
                    View Details
                  </button>
                  <ActionButtons
                    isActive={true}
                    onEdit={isAdmin() ? () => {
                      setEditId(batch.id);
                      setCreateOpen(true);
                    } : undefined}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
      />

      <BatchFormModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setEditId(null);
            refetch();
          }
        }}
        batchId={editId}
      />
    </div>
  );
}


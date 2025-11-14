import { useMemo, useState, useEffect } from 'react';
import { FileText, Package, Calendar, ArrowLeft, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SearchBar } from '../../components/admin/shared/SearchBar';
import { FilterDropdown } from '../../components/admin/shared/FilterDropdown';
import { LoadingSpinner } from '../../components/admin/shared/LoadingSpinner';
import { EmptyState } from '../../components/admin/shared/EmptyState';
import { ActionButtons } from '../../components/admin/shared/ActionButtons';
import { ConfirmDialog } from '../../components/admin/shared/ConfirmDialog';
import { SaudaFormModal } from '../../components/purchases/SaudaFormModal';
import { PurchaseWizard } from '../../components/purchases/PurchaseWizard';
import { useSaudas } from '../../hooks/useSaudas';
import { getNextStepForSauda } from '../../utils/purchaseFlow';
import type { SaudaStatus, SaudaType } from '../../types/entities';

const statusColors: Record<SaudaStatus, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  completed: 'bg-primary/20 text-primary',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function SaudasPage() {
  const { saudas, loading, deleteSauda, refetch } = useSaudas();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SaudaStatus | undefined>();
  const [typeFilter, setTypeFilter] = useState<SaudaType | undefined>();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedSaudaId, setSelectedSaudaId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardSaudaId, setWizardSaudaId] = useState<string | null>(null);
  const [flowStates, setFlowStates] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    return saudas.filter((s) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = s.rice_quality.toLowerCase().includes(q);

      const matchesStatus = statusFilter ? s.status === statusFilter : true;
      const matchesType = typeFilter ? s.sauda_type === typeFilter : true;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [saudas, searchQuery, statusFilter, typeFilter]);

  const handleEdit = (id: string) => {
    setSelectedSaudaId(id);
    setEditModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setSelectedId(id);
    setDeleteDialogOpen(true);
  };

  const handleView = (id: string) => {
    navigate(`/purchases/saudas/${id}`);
  };

  const handleContinueFlow = (e: React.MouseEvent, saudaId: string) => {
    e.stopPropagation();
    setWizardSaudaId(saudaId);
    setWizardOpen(true);
  };

  // Check flow states for all saudas
  useEffect(() => {
    const checkFlowStates = async () => {
      const states: Record<string, boolean> = {};
      await Promise.all(
        filtered.map(async (sauda) => {
          try {
            const nextStep = await getNextStepForSauda(sauda.id);
            states[sauda.id] = nextStep !== null; // true if flow is incomplete
          } catch (error) {
            console.error(`Error checking flow state for sauda ${sauda.id}:`, error);
            states[sauda.id] = false;
          }
        })
      );
      setFlowStates(states);
    };

    if (filtered.length > 0) {
      checkFlowStates();
    }
  }, [filtered]);

  if (loading) {
    return (
      <div className="container mx-auto py-6 sm:py-10 px-4 sm:px-6">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 sm:py-10 space-y-6 sm:space-y-8 px-4 sm:px-6">
      <header className="hero-bg rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -left-6 -top-6 h-24 w-24 floating-orb" />
        <div className="absolute -right-6 -bottom-6 h-20 w-20 floating-orb" />
        <div className="relative">
          <button 
            onClick={() => navigate('/purchases')} 
            className="mb-4 btn-secondary flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Purchases
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
              <span className="text-gradient">Saudas</span>
            </h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">
              Manage purchase agreements
            </p>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="space-y-3">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by rice quality..."
        />
        <div className="flex gap-2">
          <FilterDropdown
            label="Status"
            options={[
              { label: 'All', value: '' },
              { label: 'Draft', value: 'draft' },
              { label: 'Active', value: 'active' },
              { label: 'Completed', value: 'completed' },
              { label: 'Cancelled', value: 'cancelled' },
            ]}
            value={statusFilter || ''}
            onChange={(value) => setStatusFilter((value || undefined) as SaudaStatus | undefined)}
          />
          <FilterDropdown
            label="Type"
            options={[
              { label: 'All', value: '' },
              { label: 'Ex-Godown', value: 'xgodown' },
              { label: 'Free on Rail/Road', value: 'for' },
            ]}
            value={typeFilter || ''}
            onChange={(value) => setTypeFilter((value || undefined) as SaudaType | undefined)}
          />
        </div>
      </div>

      {/* Saudas List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No saudas found"
          description={searchQuery || statusFilter || typeFilter ? 'Try adjusting your filters' : 'No saudas found'}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((sauda) => (
            <div
              key={sauda.id}
              className="glass rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleView(sauda.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1 truncate">{sauda.rice_quality}</h3>
                  <div className="flex gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[sauda.status]}`}
                    >
                      {sauda.status.toUpperCase()}
                    </span>
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/20 text-primary">
                      {sauda.sauda_type === 'xgodown' ? 'Ex-Godown' : 'FOR'}
                    </span>
                  </div>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <ActionButtons
                    onEdit={() => handleEdit(sauda.id)}
                    onDelete={() => handleDelete(sauda.id)}
                  />
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">₹{sauda.rate}/kg</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>Quantity: {sauda.quantity ? sauda.quantity.toLocaleString('en-IN') : '0'} kg</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(sauda.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {flowStates[sauda.id] && (
                <div className="mt-4 pt-4 border-t border-border/40" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleContinueFlow(e, sauda.id)}
                    className="w-full btn-primary flex items-center justify-center gap-2 text-sm py-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Continue Purchase Flow
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={async () => {
          if (selectedId) {
            await deleteSauda(selectedId);
            setDeleteDialogOpen(false);
            setSelectedId(null);
          }
        }}
        title="Delete Sauda"
        description="Are you sure you want to delete this sauda? This action cannot be undone."
        confirmText="Delete"
      />

      {wizardSaudaId && (
        <PurchaseWizard
          open={wizardOpen}
          onOpenChange={(open) => {
            setWizardOpen(open);
            if (!open) {
              setWizardSaudaId(null);
              // Refresh flow states after wizard closes
              const checkFlowStates = async () => {
                const states: Record<string, boolean> = {};
                await Promise.all(
                  filtered.map(async (sauda) => {
                    try {
                      const nextStep = await getNextStepForSauda(sauda.id);
                      states[sauda.id] = nextStep !== null;
                    } catch (error) {
                      states[sauda.id] = false;
                    }
                  })
                );
                setFlowStates(states);
              };
              checkFlowStates();
            }
          }}
          initialSaudaId={wizardSaudaId}
        />
      )}
    </div>
  );
}


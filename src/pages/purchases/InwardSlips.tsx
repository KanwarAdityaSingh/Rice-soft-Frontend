import { useMemo, useState, useEffect } from 'react';
import { ClipboardList, Package, Truck, Calendar, ArrowLeft, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SearchBar } from '../../components/admin/shared/SearchBar';
import { FilterDropdown } from '../../components/admin/shared/FilterDropdown';
import { LoadingSpinner } from '../../components/admin/shared/LoadingSpinner';
import { EmptyState } from '../../components/admin/shared/EmptyState';
import { ActionButtons } from '../../components/admin/shared/ActionButtons';
import { ConfirmDialog } from '../../components/admin/shared/ConfirmDialog';
import { InwardSlipFormModal } from '../../components/purchases/InwardSlipFormModal';
import { PurchaseWizard } from '../../components/purchases/PurchaseWizard';
import { useInwardSlipPasses } from '../../hooks/useInwardSlipPasses';
import { getNextStepForInwardSlip } from '../../utils/purchaseFlow';
import type { InwardSlipPassStatus } from '../../types/entities';

const statusColors: Record<InwardSlipPassStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

export default function InwardSlipsPage() {
  const { inwardSlipPasses, loading, deleteInwardSlipPass, refetch } = useInwardSlipPasses();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InwardSlipPassStatus | undefined>();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedSaudaId, setSelectedSaudaId] = useState<string | null>(null);
  const [selectedInwardSlipId, setSelectedInwardSlipId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardInwardSlipId, setWizardInwardSlipId] = useState<string | null>(null);
  const [flowStates, setFlowStates] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    return inwardSlipPasses.filter((isp) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        isp.slip_number.toLowerCase().includes(q) ||
        isp.party_name.toLowerCase().includes(q) ||
        isp.vehicle_number.toLowerCase().includes(q);

      const matchesStatus = statusFilter ? isp.status === statusFilter : true;

      return matchesSearch && matchesStatus;
    });
  }, [inwardSlipPasses, searchQuery, statusFilter]);

  const handleEdit = (id: string, saudaId: string) => {
    setSelectedInwardSlipId(id);
    setSelectedSaudaId(saudaId);
    setEditModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setSelectedId(id);
    setDeleteDialogOpen(true);
  };

  const handleView = (id: string) => {
    navigate(`/purchases/inward-slips/${id}`);
  };

  const handleContinueFlow = (e: React.MouseEvent, inwardSlipId: string) => {
    e.stopPropagation();
    setWizardInwardSlipId(inwardSlipId);
    setWizardOpen(true);
  };

  // Check flow states for all inward slips
  useEffect(() => {
    const checkFlowStates = async () => {
      const states: Record<string, boolean> = {};
      await Promise.all(
        filtered.map(async (isp) => {
          try {
            const nextStep = await getNextStepForInwardSlip(isp.id);
            states[isp.id] = nextStep !== null; // true if flow is incomplete
          } catch (error) {
            console.error(`Error checking flow state for inward slip ${isp.id}:`, error);
            states[isp.id] = false;
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                <span className="text-gradient">Inward Slip Passes</span>
              </h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">
                Manage goods receipt documents and lots
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="space-y-3">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by slip number, party name, vehicle..."
        />
        <div className="flex gap-2">
          <FilterDropdown
            label="Status"
            options={[
              { label: 'All', value: '' },
              { label: 'Pending', value: 'pending' },
              { label: 'Completed', value: 'completed' },
            ]}
            value={statusFilter || ''}
            onChange={(value) => setStatusFilter((value || undefined) as InwardSlipPassStatus | undefined)}
          />
        </div>
      </div>

      {/* Inward Slip Passes List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No inward slip passes found"
          description={searchQuery || statusFilter ? 'Try adjusting your filters' : 'Create your first inward slip pass'}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((isp) => (
            <div
              key={isp.id}
              className="glass rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleView(isp.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{isp.slip_number}</h3>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[isp.status]}`}
                  >
                    {isp.status.toUpperCase()}
                  </span>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <ActionButtons
                    onEdit={() => handleEdit(isp.id, isp.sauda_id)}
                    onDelete={() => handleDelete(isp.id)}
                  />
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Package className="h-4 w-4" />
                  <span className="truncate">{isp.party_name}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Truck className="h-4 w-4" />
                  <span>{isp.vehicle_number}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(isp.date).toLocaleDateString()}</span>
                </div>
                <div className="pt-2 border-t border-border/40">
                  <p className="text-xs text-muted-foreground">
                    {isp.lots.length} lots • Total: ₹
                    {isp.lots.reduce((sum, lot) => sum + lot.amount, 0).toLocaleString('en-IN', {
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>

              {flowStates[isp.id] && (
                <div className="mt-4 pt-4 border-t border-border/40" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleContinueFlow(e, isp.id)}
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

      <InwardSlipFormModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            setSelectedInwardSlipId(null);
            setSelectedSaudaId(null);
            refetch();
          }
        }}
        saudaId={selectedSaudaId || ''}
        inwardSlipId={selectedInwardSlipId || undefined}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={async () => {
          if (selectedId) {
            await deleteInwardSlipPass(selectedId);
            setDeleteDialogOpen(false);
            setSelectedId(null);
          }
        }}
        title="Delete Inward Slip Pass"
        description="Are you sure you want to delete this inward slip pass? This action cannot be undone."
        confirmText="Delete"
      />

      {wizardInwardSlipId && (
        <PurchaseWizard
          open={wizardOpen}
          onOpenChange={(open) => {
            setWizardOpen(open);
            if (!open) {
              setWizardInwardSlipId(null);
              // Refresh flow states after wizard closes
              const checkFlowStates = async () => {
                const states: Record<string, boolean> = {};
                await Promise.all(
                  filtered.map(async (isp) => {
                    try {
                      const nextStep = await getNextStepForInwardSlip(isp.id);
                      states[isp.id] = nextStep !== null;
                    } catch (error) {
                      states[isp.id] = false;
                    }
                  })
                );
                setFlowStates(states);
              };
              checkFlowStates();
            }
          }}
          initialInwardSlipId={wizardInwardSlipId}
        />
      )}
    </div>
  );
}


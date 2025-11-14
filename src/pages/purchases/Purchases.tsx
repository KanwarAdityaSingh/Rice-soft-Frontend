import { useMemo, useState } from 'react';
import { ShoppingCart, Plus, Package, Truck, FileText, Calendar, FileText as FileTextIcon, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SearchBar } from '../../components/admin/shared/SearchBar';
import { LoadingSpinner } from '../../components/admin/shared/LoadingSpinner';
import { EmptyState } from '../../components/admin/shared/EmptyState';
import { ActionButtons } from '../../components/admin/shared/ActionButtons';
import { ConfirmDialog } from '../../components/admin/shared/ConfirmDialog';
import { PurchaseWizard } from '../../components/purchases/PurchaseWizard';
import { PurchaseFormModal } from '../../components/purchases/PurchaseFormModal';
import { usePurchases } from '../../hooks/usePurchases';

export default function PurchasesPage() {
  const { purchases, loading, deletePurchase, refetch } = usePurchases();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return purchases.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q || // If no search query, show all
        p.invoice_number?.toLowerCase().includes(q) ||
        p.truck_number?.toLowerCase().includes(q) ||
        p.transport_name?.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.vendor_id?.toLowerCase().includes(q) ||
        p.sauda_id?.toLowerCase().includes(q) ||
        (p.total_amount && p.total_amount.toString().includes(q));

      return matchesSearch;
    });
  }, [purchases, searchQuery]);

  const handleEdit = (id: string) => {
    setSelectedPurchaseId(id);
    setEditModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setSelectedId(id);
    setDeleteDialogOpen(true);
  };

  const handleView = (id: string) => {
    navigate(`/purchases/${id}`);
  };

  const stats = useMemo(() => {
    return {
      total: purchases.length,
    };
  }, [purchases]);

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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                <span className="text-gradient">Purchases</span>
              </h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">
                Manage purchase transactions and track status
              </p>
            </div>
            <button onClick={() => setWizardOpen(true)} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Purchase
            </button>
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => navigate('/purchases/saudas')}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <FileTextIcon className="h-4 w-4" />
              View Saudas
            </button>
            <button
              onClick={() => navigate('/purchases/inward-slips')}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <ClipboardList className="h-4 w-4" />
              View Inward Slips
            </button>
            <button
              onClick={() => navigate('/purchases/payments')}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <FileText className="h-4 w-4" />
              View Payments
            </button>
            <button
              onClick={() => navigate('/purchases/transporters')}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Truck className="h-4 w-4" />
              View Transporters
            </button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <div className="glass rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Purchases</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by invoice number, truck number, transport..."
        />
      </div>

      {/* Purchases List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No purchases found"
          description={searchQuery ? 'Try adjusting your filters' : 'Create your first purchase'}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((purchase) => (
            <div
              key={purchase.id}
              className="glass rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleView(purchase.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">
                    {purchase.invoice_number || `Purchase #${purchase.id.slice(0, 8)}`}
                  </h3>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <ActionButtons
                    onEdit={() => handleEdit(purchase.id)}
                    onDelete={() => handleDelete(purchase.id)}
                  />
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {purchase.truck_number && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Truck className="h-4 w-4" />
                    <span>{purchase.truck_number}</span>
                  </div>
                )}
                {purchase.transport_name && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span className="truncate">{purchase.transport_name}</span>
                  </div>
                )}
                {purchase.total_amount && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">₹{purchase.total_amount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(purchase.purchase_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <PurchaseWizard open={wizardOpen} onOpenChange={setWizardOpen} />

      <PurchaseFormModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            setSelectedPurchaseId(null);
            refetch();
          }
        }}
        purchaseId={selectedPurchaseId}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={async () => {
          if (selectedId) {
            await deletePurchase(selectedId);
            setDeleteDialogOpen(false);
            setSelectedId(null);
          }
        }}
        title="Delete Purchase"
        description="Are you sure you want to delete this purchase? This action cannot be undone."
        confirmText="Delete"
      />
    </div>
  );
}


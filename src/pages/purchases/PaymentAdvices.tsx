import { useMemo, useState } from 'react';
import { CreditCard, Calendar, FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SearchBar } from '../../components/admin/shared/SearchBar';
import { FilterDropdown } from '../../components/admin/shared/FilterDropdown';
import { LoadingSpinner } from '../../components/admin/shared/LoadingSpinner';
import { EmptyState } from '../../components/admin/shared/EmptyState';
import { ActionButtons } from '../../components/admin/shared/ActionButtons';
import { ConfirmDialog } from '../../components/admin/shared/ConfirmDialog';
import { PaymentAdviceFormModal } from '../../components/purchases/PaymentAdviceFormModal';
import { usePaymentAdvices } from '../../hooks/usePaymentAdvices';
import type { PaymentAdviceStatus } from '../../types/entities';

const statusColors: Record<PaymentAdviceStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function PaymentAdvicesPage() {
  const { paymentAdvices, loading, deletePaymentAdvice, refetch } = usePaymentAdvices();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentAdviceStatus | undefined>();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPaymentAdviceId, setSelectedPaymentAdviceId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return paymentAdvices.filter((pa) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        pa.invoice_number?.toLowerCase().includes(q) ||
        pa.sr_number?.toLowerCase().includes(q) ||
        pa.party_name?.toLowerCase().includes(q);

      const matchesStatus = statusFilter ? pa.status === statusFilter : true;

      return matchesSearch && matchesStatus;
    });
  }, [paymentAdvices, searchQuery, statusFilter]);

  const handleEdit = (id: string) => {
    setSelectedPaymentAdviceId(id);
    setEditModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setSelectedId(id);
    setDeleteDialogOpen(true);
  };

  const handleView = (id: string) => {
    navigate(`/purchases/payments/${id}`);
  };

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
              <span className="text-gradient">Payment Advices</span>
            </h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">
              Manage payment instructions and track payments
            </p>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="space-y-3">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by invoice number, SR number, party name..."
        />
        <div className="flex gap-2">
          <FilterDropdown
            label="Status"
            options={[
              { label: 'All', value: '' },
              { label: 'Pending', value: 'pending' },
              { label: 'Completed', value: 'completed' },
              { label: 'Failed', value: 'failed' },
            ]}
            value={statusFilter || ''}
            onChange={(value) => setStatusFilter((value || undefined) as PaymentAdviceStatus | undefined)}
          />
        </div>
      </div>

      {/* Payment Advices List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payment advices found"
          description={searchQuery || statusFilter ? 'Try adjusting your filters' : 'No payment advices found'}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((pa) => (
            <div
              key={pa.id}
              className="glass rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleView(pa.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">
                    {pa.sr_number || pa.invoice_number || `Payment #${pa.id.slice(0, 8)}`}
                  </h3>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[pa.status]}`}
                  >
                    {pa.status.toUpperCase()}
                  </span>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <ActionButtons
                    onEdit={() => handleEdit(pa.id)}
                    onDelete={() => handleDelete(pa.id)}
                  />
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">₹{pa.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>Net Payable: ₹{pa.net_payable.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
                {pa.charges && pa.charges.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {pa.charges.length} charge{pa.charges.length !== 1 ? 's' : ''}
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(pa.date_of_payment).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <PaymentAdviceFormModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            setSelectedPaymentAdviceId(null);
            refetch();
          }
        }}
        paymentAdviceId={selectedPaymentAdviceId}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={async () => {
          if (selectedId) {
            await deletePaymentAdvice(selectedId);
            setDeleteDialogOpen(false);
            setSelectedId(null);
          }
        }}
        title="Delete Payment Advice"
        description="Are you sure you want to delete this payment advice? This action cannot be undone."
        confirmText="Delete"
      />
    </div>
  );
}


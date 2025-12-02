import { useState, useMemo } from 'react';
import { SearchBar } from '../../admin/shared/SearchBar';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { ConfirmDialog } from '../../admin/shared/ConfirmDialog';
import { CreditCard } from 'lucide-react';
import { usePaymentAdvices } from '../../../hooks/usePaymentAdvices';
import { PaymentAdviceFormModal } from './PaymentAdviceFormModal';
import type { PaymentAdvice } from '../../../types/entities';

export function PaymentAdvicesTable() {
  const [purchaseFilter, setPurchaseFilter] = useState<string | undefined>();
  const { paymentAdvices, loading, deletePaymentAdvice, refetch } = usePaymentAdvices(purchaseFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPA, setSelectedPA] = useState<PaymentAdvice | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPAId, setSelectedPAId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return paymentAdvices.filter((pa) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        pa.transaction_id?.toLowerCase().includes(q) ||
        pa.id.toLowerCase().includes(q);

      return matchesSearch;
    });
  }, [paymentAdvices, searchQuery]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by transaction ID or ID..." />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCreateOpen(true)}
            className="btn-primary rounded-xl inline-flex items-center justify-center gap-2 px-4 py-2"
          >
            Add Payment Advice
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={CreditCard} title="No payment advices found" description="Create your first payment advice or adjust filters." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-semibold">Transaction ID</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Net Payable</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Status</th>
                <th className="text-right py-3 px-4 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((pa) => (
                <tr key={pa.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 text-sm">{pa.transaction_id || 'N/A'}</td>
                  <td className="py-3 px-4 text-sm">{new Date(pa.date_of_payment).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-sm">₹{(pa.amount ?? 0).toFixed(2)}</td>
                  <td className="py-3 px-4 text-sm font-medium">₹{(pa.net_payable ?? 0).toFixed(2)}</td>
                  <td className="py-3 px-4 text-sm">
                    <span className={`px-2 py-1 rounded-md text-xs ${
                      pa.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' :
                      pa.status === 'failed' ? 'bg-red-500/10 text-red-600' :
                      'bg-yellow-500/10 text-yellow-600'
                    }`}>
                      {pa.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedPAId(pa.id);
                          setEditModalOpen(true);
                        }}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title="Edit"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPA(pa);
                          setDeleteDialogOpen(true);
                        }}
                        className="p-2 hover:bg-muted rounded-lg transition-colors text-red-500"
                        title="Delete"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={async () => {
          if (selectedPA) {
            await deletePaymentAdvice(selectedPA.id);
            setDeleteDialogOpen(false);
            setSelectedPA(null);
          }
        }}
        title="Delete Payment Advice"
        description={`Are you sure you want to delete this payment advice? This action cannot be undone.`}
        confirmText="Delete"
      />

      <PaymentAdviceFormModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            refetch();
          }
        }}
      />

      <PaymentAdviceFormModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            setSelectedPAId(null);
            refetch();
          }
        }}
        paymentAdviceId={selectedPAId}
      />
    </div>
  );
}


import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchBar } from '../../admin/shared/SearchBar';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { ConfirmDialog } from '../../admin/shared/ConfirmDialog';
import { ShoppingCart, Edit, Trash2, Eye } from 'lucide-react';
import { usePurchases } from '../../../hooks/usePurchases';
import { PurchaseFormModal } from './PurchaseFormModal';
import type { Purchase } from '../../../types/entities';

export function PurchasesTable() {
  const navigate = useNavigate();
  const [vendorFilter, setVendorFilter] = useState<string | undefined>();
  const { purchases, loading, deletePurchase, refetch } = usePurchases(vendorFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return purchases.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        p.invoice_number?.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q);

      return matchesSearch;
    });
  }, [purchases, searchQuery]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by invoice number or ID..." />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCreateOpen(true)}
            className="btn-primary rounded-xl inline-flex items-center justify-center gap-2 px-4 py-2"
          >
            Add Purchase
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="No purchases found" description="Create your first purchase or adjust filters." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-semibold">Invoice Number</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Purchase Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Total Weight</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Total Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">IGST</th>
                <th className="text-right py-3 px-4 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 text-sm">{p.invoice_number || 'N/A'}</td>
                  <td className="py-3 px-4 text-sm">{new Date(p.purchase_date).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-sm">{(p.total_weight ?? 0).toFixed(2)} kg</td>
                  <td className="py-3 px-4 text-sm font-medium">₹{(p.total_amount ?? 0).toFixed(2)}</td>
                  <td className="py-3 px-4 text-sm">₹{(p.igst_amount ?? 0).toFixed(2)} ({p.igst_percentage ?? 0}%)</td>
                  <td className="py-3 px-4 text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/purchases/${p.id}`)}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPurchaseId(p.id);
                          setEditModalOpen(true);
                        }}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPurchase(p);
                          setDeleteDialogOpen(true);
                        }}
                        className="p-2 hover:bg-muted rounded-lg transition-colors text-red-500"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
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
          if (selectedPurchase) {
            await deletePurchase(selectedPurchase.id);
            setDeleteDialogOpen(false);
            setSelectedPurchase(null);
          }
        }}
        title="Delete Purchase"
        description={`Are you sure you want to delete this purchase? This action cannot be undone.`}
        confirmText="Delete"
      />

      <PurchaseFormModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            refetch();
          }
        }}
      />

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
    </div>
  );
}


import { useState, useMemo, useRef, useEffect } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { SearchBar } from '../../admin/shared/SearchBar';
import { FilterDropdown } from '../../admin/shared/FilterDropdown';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { ConfirmDialog } from '../../admin/shared/ConfirmDialog';
import { FileText, Eye, MoreVertical, Edit2, Trash2, CheckCircle } from 'lucide-react';
import { useSalesSaudas } from '../../../hooks/useSalesSaudas';
import { useVendors } from '../../../hooks/useVendors';
import { useProducts } from '../../../hooks/useProducts';
import { SalesSaudaFormModal } from './SalesSaudaFormModal';
import { SalesSaudaDetailModal } from './SalesSaudaDetailModal';
import { toast } from '../../../utils/toast';
import type { SalesSauda, SalesSaudaStatus } from '../../../types/sales';

interface SalesSaudasTableProps {
  onRefreshRef?: React.MutableRefObject<(() => void) | null>;
}

const statusOptions: { value: string; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'order', label: 'Order' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function SalesSaudasTable({ onRefreshRef }: SalesSaudasTableProps = {}) {
  const [statusFilter, setStatusFilter] = useState<SalesSaudaStatus | ''>('');
  const { salesSaudas, loading, deleteSauda, finalize, refetch, getById } = useSalesSaudas({
    status: statusFilter || undefined,
  });
  const { vendors } = useVendors();
  const { products } = useProducts();

  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSauda, setSelectedSauda] = useState<SalesSauda | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    if (onRefreshRef) onRefreshRef.current = refetch;
  }, [refetch, onRefreshRef]);

  const getCustomerName = (customerId: string) => {
    const v = vendors.find((x) => x.id === customerId);
    return v?.business_name ?? customerId;
  };

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return salesSaudas.filter((s) => {
      const customer = getCustomerName(s.customer_id);
      const orderNum = (s.order_number ?? '').toLowerCase();
      const notes = (s.notes ?? '').toLowerCase();
      return (
        customer.toLowerCase().includes(q) ||
        orderNum.includes(q) ||
        notes.includes(q) ||
        s.sauda_date.includes(q)
      );
    });
  }, [salesSaudas, searchQuery, vendors]);

  const handleDelete = async () => {
    if (!selectedSauda) return;
    try {
      await deleteSauda(selectedSauda.id);
      setDeleteDialogOpen(false);
      setSelectedSauda(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFinalize = async (sauda: SalesSauda) => {
    try {
      await finalize(sauda.id);
      toast.success(
        'Sales Sauda finalized',
        'You can now create an invoice dispatch against it.'
      );
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by customer, order number, notes..."
        />
        <FilterDropdown
          label="Status"
          value={statusFilter || undefined}
          options={statusOptions}
          onChange={(v) => setStatusFilter((v ?? '') as SalesSaudaStatus | '')}
        />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No sales saudas"
            description="Create a sales sauda or adjust filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Customer</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Order #</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Notes</th>
                  <th className="w-10 p-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b hover:bg-muted/30">
                    <td className="p-3">{getCustomerName(s.customer_id)}</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.status === 'draft'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                            : s.status === 'order'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="p-3">{s.order_number ?? '–'}</td>
                    <td className="p-3">{s.sauda_date}</td>
                    <td className="p-3 max-w-[200px] truncate" title={s.notes ?? ''}>
                      {s.notes ?? '–'}
                    </td>
                    <td className="p-3">
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button className="rounded-lg p-2 hover:bg-muted">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            className="glass min-w-[10rem] rounded-xl p-1 shadow-lg z-50"
                            sideOffset={8}
                            align="end"
                          >
                            <DropdownMenu.Item
                              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent"
                              onSelect={() => setDetailId(s.id)}
                            >
                              <Eye className="h-4 w-4" /> View
                            </DropdownMenu.Item>
                            {s.status === 'draft' && (
                              <>
                                <DropdownMenu.Item
                                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent"
                                  onSelect={() => setEditId(s.id)}
                                >
                                  <Edit2 className="h-4 w-4" /> Edit
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent"
                                  onSelect={() => handleFinalize(s)}
                                >
                                  <CheckCircle className="h-4 w-4" /> Finalize
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  onSelect={() => {
                                    setSelectedSauda(s);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" /> Delete
                                </DropdownMenu.Item>
                              </>
                            )}
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SalesSaudaFormModal
        open={!!editId}
        onOpenChange={(open) => !open && setEditId(null)}
        saudaId={editId}
        onSuccess={refetch}
      />
      <SalesSaudaDetailModal
        saudaId={detailId}
        open={!!detailId}
        onOpenChange={(open) => !open && setDetailId(null)}
        getCustomerName={getCustomerName}
        getProductName={(id) => products.find((p) => p.id === id)?.name ?? id}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Sales Sauda"
        description="This draft sales sauda will be permanently deleted. This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}

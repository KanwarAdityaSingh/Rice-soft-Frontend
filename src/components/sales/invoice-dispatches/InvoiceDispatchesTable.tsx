import { useState, useMemo, useRef, useEffect } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { SearchBar } from '../../admin/shared/SearchBar';
import { FilterDropdown } from '../../admin/shared/FilterDropdown';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { FileText, Eye } from 'lucide-react';
import { useInvoiceDispatches } from '../../../hooks/useInvoiceDispatches';
import { InvoiceDispatchDetailModal } from './InvoiceDispatchDetailModal';
import { useProducts } from '../../../hooks/useProducts';
import { GodownFilterSelect } from '../../shared/GodownFilterSelect';
import { useGodowns } from '../../../hooks/useGodowns';
import type { InvoiceDispatchStatus } from '../../../types/sales';

interface InvoiceDispatchesTableProps {
  onRefreshRef?: React.MutableRefObject<(() => void) | null>;
}

const statusOptions: { value: string; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'confirmed', label: 'Confirmed' },
];

export function InvoiceDispatchesTable({ onRefreshRef }: InvoiceDispatchesTableProps = {}) {
  const [statusFilter, setStatusFilter] = useState<InvoiceDispatchStatus | ''>('');
  const [godownFilter, setGodownFilter] = useState<string | undefined>();
  const { godowns } = useGodowns(true);
  const { invoiceDispatches, loading, refetch } = useInvoiceDispatches({
    status: statusFilter || undefined,
    godown_id: godownFilter,
  });
  const { products } = useProducts();

  const godownName = (id: string | undefined) =>
    id ? godowns.find((g) => g.id === id)?.name ?? '—' : '—';

  const [searchQuery, setSearchQuery] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    if (onRefreshRef) onRefreshRef.current = refetch;
  }, [refetch, onRefreshRef]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return invoiceDispatches.filter((d) => {
      return (
        d.internal_invoice_number.toLowerCase().includes(q) ||
        (d.party_name ?? '').toLowerCase().includes(q) ||
        d.dispatch_date.includes(q)
      );
    });
  }, [invoiceDispatches, searchQuery]);

  const getProductName = (id: string) => products.find((p) => p.id === id)?.name ?? id;

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
          placeholder="Search by invoice #, party, date..."
        />
        <FilterDropdown
          label="Status"
          value={statusFilter || undefined}
          options={statusOptions}
          onChange={(v) => setStatusFilter((v ?? '') as InvoiceDispatchStatus | '')}
        />
        <GodownFilterSelect value={godownFilter} onChange={setGodownFilter} label="Godown" />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoice dispatches"
            description="Create an invoice dispatch from a finalized sales order."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Invoice #</th>
                  <th className="text-left p-3 font-medium">Godown</th>
                  <th className="text-left p-3 font-medium">Party</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="w-10 p-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b hover:bg-muted/30">
                    <td className="p-3">{d.internal_invoice_number}</td>
                    <td className="p-3 text-muted-foreground">{godownName(d.godown_id)}</td>
                    <td className="p-3">{d.party_name}</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          d.status === 'draft'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="p-3">{d.dispatch_date}</td>
                    <td className="p-3">
                      <button
                        onClick={() => setDetailId(d.id)}
                        className="rounded-lg p-2 hover:bg-muted inline-flex items-center gap-1 text-sm"
                      >
                        <Eye className="h-4 w-4" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InvoiceDispatchDetailModal
        dispatchId={detailId}
        open={!!detailId}
        onOpenChange={(open) => !open && setDetailId(null)}
        onSuccess={refetch}
        getProductName={getProductName}
      />
    </div>
  );
}

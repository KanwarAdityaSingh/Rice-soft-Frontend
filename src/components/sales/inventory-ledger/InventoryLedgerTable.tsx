import { useState, useMemo, useRef, useEffect } from 'react';
import { SearchBar } from '../../admin/shared/SearchBar';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { BookOpen } from 'lucide-react';
import { useInventoryLedger } from '../../../hooks/useInventoryLedger';
import { useProducts } from '../../../hooks/useProducts';
import { usePackaging } from '../../../hooks/usePackaging';
import { useBatches } from '../../../hooks/useBatches';
import { GodownFilterSelect } from '../../shared/GodownFilterSelect';
import { useGodowns } from '../../../hooks/useGodowns';
import type { InventoryLedgerSourceType } from '../../../types/sales';
import { formatPacketTypeLabel } from '../../../constants/bagAndPacketTypes';
import { DateInputWithSteppers } from '../../shared/DateInputWithSteppers';

const sourceTypeLabels: Record<InventoryLedgerSourceType, string> = {
  purchase_inward: 'Purchase Inward',
  sales_dispatch: 'Sales Dispatch',
  sale_return: 'Sale Return',
  adjustment: 'Adjustment',
};

export function InventoryLedgerTable() {
  const [godownFilter, setGodownFilter] = useState<string | undefined>();
  const [productFilter, setProductFilter] = useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<InventoryLedgerSourceType | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const { entries, loading, refetch } = useInventoryLedger({
    godown_id: godownFilter,
    product_id: productFilter || undefined,
    source_type: sourceTypeFilter || undefined,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
    limit: 200,
    offset: 0,
  });
  const { products } = useProducts();
  const { packaging } = usePackaging();
  const { batches } = useBatches();
  const { godowns } = useGodowns(true);
  const [searchQuery, setSearchQuery] = useState('');

  const godownLabel = (id: string | undefined) =>
    id ? godowns.find((g) => g.id === id)?.name ?? id.slice(0, 8) : '—';

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      const productName = products.find((p) => p.id === e.product_id)?.name ?? '';
      return productName.toLowerCase().includes(q) || e.source_type.toLowerCase().includes(q);
    });
  }, [entries, searchQuery, products]);

  const getProductName = (id: string) => products.find((p) => p.id === id)?.name ?? id;

  const getPackagingLabel = (id: string | null) => {
    if (!id) return '–';
    const p = packaging.find((x) => x.id === id);
    return p ? `${p.holding_capacity} kg (${formatPacketTypeLabel(p.packet_type)})` : id;
  };

  const getBatchNumber = (id: string | null) => {
    if (!id) return '–';
    return batches.find((b) => b.id === id)?.batch_number ?? id;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <GodownFilterSelect value={godownFilter} onChange={setGodownFilter} label="Godown" />
          <div className="min-w-[200px]">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Product</label>
            <select
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
            >
              <option value="">All products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Source type</label>
            <select
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              value={sourceTypeFilter}
              onChange={(e) => setSourceTypeFilter((e.target.value || '') as InventoryLedgerSourceType | '')}
            >
              <option value="">All</option>
              {(Object.keys(sourceTypeLabels) as InventoryLedgerSourceType[]).map((k) => (
                <option key={k} value={k}>
                  {sourceTypeLabels[k]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">From date</label>
            <DateInputWithSteppers
              className="min-w-[9rem]"
              inputClassName="py-2 text-sm"
              value={fromDate}
              onChange={setFromDate}
              max={toDate || undefined}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">To date</label>
            <DateInputWithSteppers
              className="min-w-[9rem]"
              inputClassName="py-2 text-sm"
              value={toDate}
              onChange={setToDate}
              min={fromDate || undefined}
            />
          </div>
        </div>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by product or source type..."
        />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No ledger entries"
            description="Adjust filters or date range to see inventory movements."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Godown</th>
                  <th className="text-left p-3 font-medium">Product</th>
                  <th className="text-left p-3 font-medium">Bag</th>
                  <th className="text-left p-3 font-medium">Batch</th>
                  <th className="text-left p-3 font-medium">Source</th>
                  <th className="text-right p-3 font-medium">Change</th>
                  <th className="text-right p-3 font-medium">Before</th>
                  <th className="text-right p-3 font-medium">After</th>
                  <th className="text-left p-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 text-muted-foreground">{godownLabel(e.godown_id)}</td>
                    <td className="p-3">{getProductName(e.product_id)}</td>
                    <td className="p-3">{getPackagingLabel(e.packaging_id)}</td>
                    <td className="p-3">{getBatchNumber(e.batch_id)}</td>
                    <td className="p-3">{sourceTypeLabels[e.source_type] ?? e.source_type}</td>
                    <td
                      className={`p-3 text-right font-medium ${
                        e.quantity_change >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {e.quantity_change >= 0 ? '+' : ''}
                      {e.quantity_change}
                    </td>
                    <td className="p-3 text-right">{e.stock_before}</td>
                    <td className="p-3 text-right">{e.stock_after}</td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

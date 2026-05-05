import { useCallback, useEffect, useState } from 'react';
import { History, Download } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { useProducts } from '../../../hooks/useProducts';
import { productsAPI } from '../../../services/products.api';
import { HOLDING_CAPACITIES } from '../../../constants/packaging';
import type { ProductRateHistoryResponse } from '../../../types/entities';
import { downloadProductRateHistoryPdf } from '../../../utils/productRateHistoryPdf';

export function ProductRateHistoryTable() {
  const { products, loading: productsLoading } = useProducts();
  const [productId, setProductId] = useState('');
  const [holdingFilter, setHoldingFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [data, setData] = useState<ProductRateHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!productId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await productsAPI.getProductRateHistory(productId, {
        holding_capacity: holdingFilter ? Number(holdingFilter) : undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        limit: 2000,
        offset: 0,
      });
      setData(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load history';
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [productId, holdingFilter, fromDate, toDate]);

  useEffect(() => {
    if (!productId) {
      setData(null);
      return;
    }
    void load();
  }, [productId, holdingFilter, fromDate, toDate, load]);

  const points = data?.points ?? [];

  const handleDownloadPdf = () => {
    if (!data || points.length === 0) return;
    const filtersSummary: string[] = [`Rows exported: ${points.length}`];
    filtersSummary.push(holdingFilter ? `Bag size: ${holdingFilter} kg only` : 'Bag size: all');
    filtersSummary.push(
      fromDate || toDate
        ? `Date filter: ${fromDate || '-'} to ${toDate || '-'}`
        : 'Date filter: none (all loaded history)'
    );
    downloadProductRateHistoryPdf(points, {
      productName: data.product.name,
      filtersSummary,
      generatedAtLabel: `Generated: ${new Date().toLocaleString()}`,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[220px] flex-1">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Product</label>
            <select
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              disabled={productsLoading}
            >
              <option value="">Select a product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Bag size (kg)</label>
            <select
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              value={holdingFilter}
              onChange={(e) => setHoldingFilter(e.target.value)}
              disabled={!productId}
            >
              <option value="">All sizes</option>
              {HOLDING_CAPACITIES.map((kg) => (
                <option key={kg} value={String(kg)}>
                  {kg} kg
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">From</label>
            <input
              type="date"
              className="rounded-lg border bg-background px-3 py-2 text-sm"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              max={toDate || undefined}
              disabled={!productId}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">To</label>
            <input
              type="date"
              className="rounded-lg border bg-background px-3 py-2 text-sm"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              min={fromDate || undefined}
              disabled={!productId}
            />
          </div>
          <button
            type="button"
            className="rounded-lg border border-border/60 bg-muted/40 px-4 py-2 text-sm font-medium hover:bg-muted/70 disabled:opacity-50"
            onClick={() => void load()}
            disabled={!productId || loading}
          >
            Refresh
          </button>
          <button
            type="button"
            className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-50 inline-flex items-center gap-2"
            onClick={handleDownloadPdf}
            disabled={!productId || loading || points.length === 0}
            title={points.length === 0 ? 'Load history first' : 'Download as PDF'}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-xl border bg-card overflow-hidden">
        {!productId ? (
          <div className="py-8">
            <EmptyState
              icon={History}
              title="Choose a product"
              description="Select a product above to load rate change history for all bag sizes or a specific holding capacity."
            />
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : points.length === 0 ? (
          <div className="py-8">
            <EmptyState
              icon={History}
              title="No history rows"
              description="No rate changes match the current filters. Try widening the date range or clearing the bag size filter."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">When</th>
                  <th className="text-right p-3 font-medium">Bag (kg)</th>
                  <th className="text-right p-3 font-medium">Rate (₹)</th>
                </tr>
              </thead>
              <tbody>
                {points.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 text-right tabular-nums font-medium">{row.holding_capacity}</td>
                    <td className="p-3 text-right tabular-nums">
                      ₹{Number(row.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && productId && !loading && points.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {points.length} row{points.length === 1 ? '' : 's'} for <span className="font-medium text-foreground">{data.product.name}</span>
          {holdingFilter ? ` · ${holdingFilter} kg only` : ''}
          {fromDate || toDate
            ? ` · ${fromDate || '…'} → ${toDate || '…'}`
            : ''}
        </p>
      )}
    </div>
  );
}

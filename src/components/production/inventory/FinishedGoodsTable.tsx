import { useMemo, useState } from 'react';
import { Package } from 'lucide-react';
import { SearchBar } from '../../admin/shared/SearchBar';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { useInventory } from '../../../hooks/useInventory';
import { useProducts } from '../../../hooks/useProducts';

export function FinishedGoodsTable() {
  const { finishedGoods, loading, fetchFinishedGoods } = useInventory();
  const { products } = useProducts();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    return finishedGoods.filter((fg) => {
      const q = searchQuery.toLowerCase();
      const product = products.find((p) => p.id === fg.product_id);
      return (
        fg.batch?.batch_number.toLowerCase().includes(q) ||
        product?.name.toLowerCase().includes(q) ||
        false
      );
    });
  }, [finishedGoods, searchQuery, products]);

  return (
    <div className="space-y-4">
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search finished goods..."
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Package} title="No finished goods found" description="Finished goods will appear here after batches are created." />
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 text-sm font-semibold">Product</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Batch</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Packaging</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Packets</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Total Weight (kg)</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((fg) => {
                  const product = products.find((p) => p.id === fg.product_id);
                  return (
                    <tr key={fg.id} className="border-b border-border/60 hover:bg-muted/30">
                      <td className="py-3 px-4 text-sm">{product?.name || 'Unknown'}</td>
                      <td className="py-3 px-4 text-sm">{fg.batch?.batch_number || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm">
                        {fg.packaging
                          ? `${fg.packaging.packet_type} (${fg.packaging.holding_capacity} kg)`
                          : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-right">{fg.no_of_packets}</td>
                      <td className="py-3 px-4 text-sm text-right">
                        {(() => {
                          const weight = fg.total_weight;
                          const numWeight = typeof weight === 'string' ? parseFloat(weight) : (weight || 0);
                          return isNaN(numWeight) ? '0.00' : numWeight.toFixed(2);
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { useInventory } from '../../../hooks/useInventory';

export function BagsTable() {
  const { bags, loading } = useInventory();

  return (
    <div>
      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : bags.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="No bags inventory found" description="Bags inventory will appear here after batches are created." />
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 text-sm font-semibold">Bag Type</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Capacity (kg)</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Filled Bags</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Empty Bags</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {bags.map((bag, idx) => (
                  <tr key={idx} className="border-b border-border/60 hover:bg-muted/30">
                    <td className="py-3 px-4 text-sm capitalize">{bag.bag_type}</td>
                    <td className="py-3 px-4 text-sm">{bag.bag_capacity}</td>
                    <td className="py-3 px-4 text-sm text-right">{bag.filled_bags}</td>
                    <td className="py-3 px-4 text-sm text-right">{bag.empty_bags}</td>
                    <td className="py-3 px-4 text-sm text-right font-semibold">
                      {bag.filled_bags + bag.empty_bags}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


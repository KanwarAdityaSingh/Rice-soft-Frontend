import { useState } from 'react';
import { Database } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { useInventory } from '../../../hooks/useInventory';
import { lotsAPI } from '../../../services/lots.api';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { useEffect } from 'react';

export function LotsTable() {
  const { lots: lotsInventory, loading } = useInventory();
  const [lots, setLots] = useState<any[]>([]);
  const [riceCodes, setRiceCodes] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lotsData, riceCodesData] = await Promise.all([
          lotsAPI.getAllLots(),
          riceCodesAPI.getAllRiceCodes(),
        ]);
        setLots(lotsData);
        setRiceCodes(riceCodesData);
      } catch (error) {
        console.error('Failed to fetch lots:', error);
      }
    };
    fetchData();
  }, []);

  const getLotDisplayName = (lotId: string): string => {
    const lot = lots.find((l) => l.id === lotId);
    if (!lot) return lotId;
    const riceCode = riceCodes.find((rc) => rc.rice_code_id === lot.rice_code_id);
    const parts: string[] = [];
    if (lot.lot_number) parts.push(`Lot ${lot.lot_number}`);
    if (riceCode?.rice_code_name) parts.push(riceCode.rice_code_name);
    return parts.join(' - ') || lotId;
  };

  return (
    <div>
      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : lotsInventory.length === 0 ? (
        <EmptyState icon={Database} title="No lots inventory found" description="Lots inventory will appear here after lots are created." />
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 text-sm font-semibold">Lot</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Available Quantity (kg)</th>
                </tr>
              </thead>
              <tbody>
                {lotsInventory.map((li) => {
                  // Parse string to number (API returns as string)
                  const quantity = typeof li.available_quantity === 'string' 
                    ? parseFloat(li.available_quantity) 
                    : li.available_quantity;
                  const availableQty = isNaN(quantity) ? 0 : quantity;
                  return (
                    <tr key={li.lot_id} className="border-b border-border/60 hover:bg-muted/30">
                      <td className="py-3 px-4 text-sm">{getLotDisplayName(li.lot_id)}</td>
                      <td className="py-3 px-4 text-sm text-right">{availableQty.toFixed(2)}</td>
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


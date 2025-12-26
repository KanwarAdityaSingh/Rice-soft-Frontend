import { useState, useEffect } from 'react';
import { Database, Eye } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { useInventory } from '../../../hooks/useInventory';
import { lotsAPI } from '../../../services/lots.api';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { InventoryAuditModal } from './InventoryAuditModal';
import { inventoryAuditAPI, type LotInventoryAuditResponse } from '../../../services/inventoryAudit.api';

interface LotsTableProps {
  onViewAudit?: (lotId: string) => void;
}

export function LotsTable({ onViewAudit }: LotsTableProps) {
  const { lots: lotsInventory, loading } = useInventory();
  const [lots, setLots] = useState<any[]>([]);
  const [riceCodes, setRiceCodes] = useState<any[]>([]);
  
  // Per-lot audit modal state
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditData, setAuditData] = useState<LotInventoryAuditResponse[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [selectedLot, setSelectedLot] = useState<{ id: string; name: string } | null>(null);

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

  const getRiceType = (lotId: string): string => {
    const lot = lots.find((l) => l.id === lotId);
    return lot?.rice_type || 'N/A';
  };

  const openLotAudit = async (lotId: string) => {
    const lotName = getLotDisplayName(lotId);
    setSelectedLot({ id: lotId, name: lotName });
    setAuditModalOpen(true);
    setAuditLoading(true);

    try {
      const data = await inventoryAuditAPI.getLotAuditByLotId(lotId, 100);
      setAuditData(data);
    } catch (error) {
      console.error('Failed to fetch lot audit:', error);
      setAuditData([]);
    } finally {
      setAuditLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (lotsInventory.length === 0) {
    return (
      <div className="p-6">
        <EmptyState 
          icon={Database} 
          title="No lots inventory found" 
          description="Lots inventory will appear here after lots are created from inward slips." 
        />
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Lot Details
              </th>
              <th className="text-left py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Rice Type
              </th>
              <th className="text-right py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Available Qty
              </th>
              <th className="text-center py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {lotsInventory.map((li) => {
              const quantity = typeof li.available_quantity === 'string' 
                ? parseFloat(li.available_quantity) 
                : li.available_quantity;
              const availableQty = isNaN(quantity) ? 0 : quantity;

              return (
                <tr 
                  key={li.lot_id} 
                  className="group hover:bg-muted/30 transition-colors"
                >
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <Database className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {getLotDisplayName(li.lot_id)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          ID: {li.lot_id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <span className="text-sm text-foreground">{getRiceType(li.lot_id)}</span>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <div className="inline-flex items-center gap-2">
                      <span className="text-lg font-bold font-mono text-foreground">
                        {formatNumber(availableQty)}
                      </span>
                      <span className="text-sm text-muted-foreground">kg</span>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-center">
                    <button
                      onClick={() => openLotAudit(li.lot_id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors"
                      title="View Audit Log"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>History</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Per-Lot Audit Modal */}
      <InventoryAuditModal
        open={auditModalOpen}
        onOpenChange={setAuditModalOpen}
        title={selectedLot ? `${selectedLot.name} - History` : 'Lot History'}
        subtitle="Complete transaction history for this lot"
        auditType="lot"
        data={auditData}
        loading={auditLoading}
      />
    </>
  );
}

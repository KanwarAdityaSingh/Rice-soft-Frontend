import { useState } from 'react';
import { ShoppingBag, Eye, TrendingUp, Package } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { useInventory } from '../../../hooks/useInventory';
import { InventoryAuditModal } from './InventoryAuditModal';
import { inventoryAuditAPI, type BagsInventoryAuditResponse } from '../../../services/inventoryAudit.api';

interface BagsTableProps {
  onViewAudit?: (bagType: 'jute' | 'pp', capacity: number) => void;
}

export function BagsTable({ onViewAudit }: BagsTableProps) {
  const { bags, loading } = useInventory();
  
  // Per-bag type audit modal state
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditData, setAuditData] = useState<BagsInventoryAuditResponse[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [selectedBag, setSelectedBag] = useState<{ type: string; capacity: number } | null>(null);

  const openBagAudit = async (bagType: 'jute' | 'pp', bagCapacity: number) => {
    setSelectedBag({ type: bagType, capacity: bagCapacity });
    setAuditModalOpen(true);
    setAuditLoading(true);

    try {
      const data = await inventoryAuditAPI.getBagsAuditByTypeAndCapacity(bagType, bagCapacity, 100);
      setAuditData(data);
    } catch (error) {
      console.error('Failed to fetch bags audit:', error);
      setAuditData([]);
    } finally {
      setAuditLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-IN');
  };

  const getBagTypeStyle = (type: string): { bg: string; text: string; border: string } => {
    if (type.toLowerCase() === 'jute') {
      return { bg: 'bg-amber-500/10', text: 'text-amber-700', border: 'border-amber-500/30' };
    }
    return { bg: 'bg-sky-500/10', text: 'text-sky-700', border: 'border-sky-500/30' };
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (bags.length === 0) {
    return (
      <div className="p-6">
        <EmptyState 
          icon={ShoppingBag} 
          title="No bags inventory found" 
          description="Bags inventory will appear here after kaanta entries are created." 
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
                Bag Type
              </th>
              <th className="text-center py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Capacity
              </th>
              <th className="text-right py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span className="inline-flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  Filled
                </span>
              </th>
              <th className="text-right py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span className="inline-flex items-center gap-1">
                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                  Empty
                </span>
              </th>
              <th className="text-right py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total
              </th>
              <th className="text-center py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {bags.map((bag, idx) => {
              const typeStyle = getBagTypeStyle(bag.bag_type);
              const total = bag.filled_bags + bag.empty_bags;
              const filledPercent = total > 0 ? (bag.filled_bags / total) * 100 : 0;

              return (
                <tr 
                  key={idx} 
                  className="group hover:bg-muted/30 transition-colors"
                >
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${typeStyle.bg}`}>
                        <ShoppingBag className={`h-4 w-4 ${typeStyle.text}`} />
                      </div>
                      <div>
                        <span className={`inline-flex items-center px-2.5 py-1 text-sm font-semibold rounded-lg ${typeStyle.bg} ${typeStyle.text} border ${typeStyle.border} uppercase`}>
                          {bag.bag_type}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-center">
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                      {bag.bag_capacity}
                      <span className="text-muted-foreground">kg</span>
                    </span>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <div className="inline-flex items-center gap-2">
                      <span className="text-lg font-bold font-mono text-emerald-600">
                        {formatNumber(bag.filled_bags)}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <div className="inline-flex items-center gap-2">
                      <span className="text-lg font-bold font-mono text-muted-foreground">
                        {formatNumber(bag.empty_bags)}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <div className="space-y-1">
                      <span className="text-lg font-bold font-mono text-foreground">
                        {formatNumber(total)}
                      </span>
                      {/* Mini progress bar */}
                      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden ml-auto">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                          style={{ width: `${filledPercent}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-center">
                    <button
                      onClick={() => openBagAudit(bag.bag_type as 'jute' | 'pp', bag.bag_capacity)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors"
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

      {/* Per-Bag Type Audit Modal */}
      <InventoryAuditModal
        open={auditModalOpen}
        onOpenChange={setAuditModalOpen}
        title={selectedBag ? `${selectedBag.type.toUpperCase()} Bags (${selectedBag.capacity}kg) - History` : 'Bags History'}
        subtitle="Complete transaction history for this bag type"
        auditType="bags"
        data={auditData}
        loading={auditLoading}
      />
    </>
  );
}

import React, { useMemo, useState } from 'react';
import { Package, Eye, Search, Box } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { useInventory } from '../../../hooks/useInventory';
import { useProducts } from '../../../hooks/useProducts';
import { InventoryAuditModal } from './InventoryAuditModal';
import { inventoryAuditAPI, type FinishedGoodsInventoryAuditResponse } from '../../../services/inventoryAudit.api';
import { formatPacketTypeLabel } from '../../../constants/bagAndPacketTypes';

interface FinishedGoodsTableProps {
  onViewAudit?: (fgId: string) => void;
}

export function FinishedGoodsTable({ onViewAudit }: FinishedGoodsTableProps) {
  const { finishedGoods, loading } = useInventory();
  const { products } = useProducts();
  const [searchQuery, setSearchQuery] = useState('');

  // Per-item audit modal state
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditData, setAuditData] = useState<FinishedGoodsInventoryAuditResponse[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: string; name: string } | null>(null);

  // Group finished goods by batch for better visualization
  const groupedByBatch = useMemo(() => {
    const grouped: Record<string, typeof finishedGoods> = {};
    finishedGoods.forEach(fg => {
      if (!grouped[fg.batch_id]) {
        grouped[fg.batch_id] = [];
      }
      grouped[fg.batch_id].push(fg);
    });
    return grouped;
  }, [finishedGoods]);

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

  // Group filtered results by batch
  const filteredGroupedByBatch = useMemo(() => {
    const grouped: Record<string, typeof filtered> = {};
    filtered.forEach(fg => {
      if (!grouped[fg.batch_id]) {
        grouped[fg.batch_id] = [];
      }
      grouped[fg.batch_id].push(fg);
    });
    return grouped;
  }, [filtered]);

  const openItemAudit = async (fgId: string, productName: string, batchNumber: string) => {
    setSelectedItem({ id: fgId, name: `${productName} - ${batchNumber}` });
    setAuditModalOpen(true);
    setAuditLoading(true);

    try {
      const data = await inventoryAuditAPI.getFinishedGoodsAuditByInventoryId(fgId, 100);
      setAuditData(data);
    } catch (error) {
      console.error('Failed to fetch finished goods audit:', error);
      setAuditData([]);
    } finally {
      setAuditLoading(false);
    }
  };

  const formatNumber = (num: number, decimals = 0): string => {
    return num.toLocaleString('en-IN', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      {/* Search Bar */}
      <div className="p-4 border-b border-border bg-muted/20">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product or batch..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-6">
          <EmptyState 
            icon={Package} 
            title="No finished goods found" 
            description={searchQuery ? "Try adjusting your search" : "Finished goods will appear here after batches are created."} 
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Product
                </th>
                <th className="text-left py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Batch
                </th>
                <th className="text-center py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Packaging
                </th>
                <th className="text-right py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Packets
                </th>
                <th className="text-right py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Weight
                </th>
                <th className="text-center py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {Object.entries(filteredGroupedByBatch).map(([batchId, entries]) => {
                const firstEntry = entries[0];
                const product = products.find((p) => p.id === firstEntry.product_id);
                const hasMultipleSizes = entries.length > 1;
                
                // Calculate totals for this batch
                const totalPackets = entries.reduce((sum, fg) => {
                  const packets = typeof fg.no_of_packets === 'string' 
                    ? parseInt(fg.no_of_packets) 
                    : fg.no_of_packets;
                  return sum + packets;
                }, 0);
                const totalWeight = entries.reduce((sum, fg) => {
                  const weight = typeof fg.total_weight === 'string' 
                    ? parseFloat(fg.total_weight) 
                    : (fg.total_weight || 0);
                  return sum + weight;
                }, 0);

                return (
                  <React.Fragment key={batchId}>
                    {entries.map((fg, idx) => {
                      const packets = typeof fg.no_of_packets === 'string' 
                        ? parseInt(fg.no_of_packets) 
                        : fg.no_of_packets;
                      const weight = typeof fg.total_weight === 'string' 
                        ? parseFloat(fg.total_weight) 
                        : (fg.total_weight || 0);
                      const isFirstRow = idx === 0;
                      const rowSpan = entries.length;

                      return (
                        <tr 
                          key={fg.id} 
                          className={`group hover:bg-muted/30 transition-colors ${hasMultipleSizes && idx > 0 ? 'border-t border-border/40' : ''}`}
                        >
                          {/* Product - Only show on first row with rowspan if multiple sizes */}
                          {isFirstRow ? (
                            <td 
                              rowSpan={hasMultipleSizes ? rowSpan : 1}
                              className="py-4 px-5 border-r border-border/40"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-violet-500/10">
                                  <Package className="h-4 w-4 text-violet-600" />
                                </div>
                                <div>
                                  <div className="font-medium text-foreground">
                                    {product?.name || 'Unknown Product'}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {product?.brand || 'No brand'}
                                  </div>
                                </div>
                              </div>
                            </td>
                          ) : null}
                          {/* Batch - Only show on first row with rowspan if multiple sizes */}
                          {isFirstRow ? (
                            <td 
                              rowSpan={hasMultipleSizes ? rowSpan : 1}
                              className="py-4 px-5 border-r border-border/40"
                            >
                              <span className="inline-flex items-center px-2.5 py-1 text-sm font-mono font-medium rounded-lg bg-muted">
                                {fg.batch?.batch_number || 'N/A'}
                              </span>
                              {hasMultipleSizes && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {entries.length} sizes
                                </div>
                              )}
                            </td>
                          ) : null}
                          {/* Packaging */}
                          <td className="py-4 px-5 text-center">
                            {fg.packaging ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm rounded-lg bg-sky-500/10 text-sky-700">
                                <Box className="h-3.5 w-3.5" />
                                {formatPacketTypeLabel(fg.packaging.packet_type)} ({fg.packaging.holding_capacity}kg)
                              </span>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </td>
                          {/* Packets */}
                          <td className="py-4 px-5 text-right">
                            <div className="inline-flex items-center gap-2">
                              <span className="text-lg font-bold font-mono text-foreground">
                                {formatNumber(packets)}
                              </span>
                              <span className="text-sm text-muted-foreground">pcs</span>
                            </div>
                          </td>
                          {/* Weight */}
                          <td className="py-4 px-5 text-right">
                            <div className="inline-flex items-center gap-2">
                              <span className="text-lg font-bold font-mono text-foreground">
                                {formatNumber(weight, 2)}
                              </span>
                              <span className="text-sm text-muted-foreground">kg</span>
                            </div>
                          </td>
                          {/* Actions */}
                          <td className="py-4 px-5 text-center">
                            <button
                              onClick={() => openItemAudit(
                                fg.id, 
                                product?.name || 'Product',
                                fg.batch?.batch_number || 'N/A'
                              )}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 bg-violet-500/10 hover:bg-violet-500/20 rounded-lg transition-colors"
                              title="View Audit Log"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>History</span>
                            </button>
                            {hasMultipleSizes && idx === entries.length - 1 && (
                              <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/40">
                                <div className="font-semibold">Batch Total:</div>
                                <div>{formatNumber(totalPackets)} pcs</div>
                                <div>{formatNumber(totalWeight, 2)} kg</div>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Per-Item Audit Modal */}
      <InventoryAuditModal
        open={auditModalOpen}
        onOpenChange={setAuditModalOpen}
        title={selectedItem ? `${selectedItem.name} - History` : 'Finished Goods History'}
        subtitle="Complete transaction history for this item"
        auditType="finished_goods"
        data={auditData}
        loading={auditLoading}
      />
    </>
  );
}

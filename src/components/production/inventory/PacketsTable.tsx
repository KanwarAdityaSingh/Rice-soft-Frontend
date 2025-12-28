import React, { useState, useMemo } from 'react';
import { Box, Eye, Scale, Package } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { useInventory } from '../../../hooks/useInventory';
import { usePackaging } from '../../../hooks/usePackaging';
import { useProducts } from '../../../hooks/useProducts';
import { InventoryAuditModal } from './InventoryAuditModal';
import { inventoryAuditAPI, type PacketsInventoryAuditResponse } from '../../../services/inventoryAudit.api';

interface PacketsTableProps {
  onViewAudit?: (packagingId: string) => void;
}

export function PacketsTable({ onViewAudit }: PacketsTableProps) {
  const { packets, loading } = useInventory();
  const { packaging, loading: packagingLoading } = usePackaging();
  const { products } = useProducts();
  
  // Per-packet type audit modal state
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditData, setAuditData] = useState<PacketsInventoryAuditResponse[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [selectedPacket, setSelectedPacket] = useState<{ id: string; name: string } | null>(null);

  // Group packets by product
  const packetsByProduct = useMemo(() => {
    const grouped: Record<string, {
      product: { id: string; name: string; brand?: string };
      packets: Array<{
        packaging_id: string;
        packaging_number: string | null;
        weight: number;
        packet_type: string;
        source: string | null;
        available_quantity: number;
      }>;
    }> = {};

    // Create a map of packaging_id to packaging info
    const packagingMap = new Map(packaging.map(pkg => [pkg.id, pkg]));

    packets.forEach(pkt => {
      const pkg = packagingMap.get(pkt.packaging_id);
      if (!pkg) return;

      const productId = pkg.product_id;
      if (!grouped[productId]) {
        const product = products.find(p => p.id === productId);
        grouped[productId] = {
          product: {
            id: productId,
            name: product?.name || 'Unknown Product',
            brand: product?.brand
          },
          packets: []
        };
      }

      const qty = typeof pkt.available_quantity === 'string' 
        ? parseInt(pkt.available_quantity) 
        : pkt.available_quantity;

      grouped[productId].packets.push({
        packaging_id: pkt.packaging_id,
        packaging_number: pkg.packaging_number || null,
        weight: pkg.holding_capacity,
        packet_type: pkg.packet_type,
        source: pkg.source,
        available_quantity: qty
      });
    });

    // Sort packets within each product by weight (10, 25, 50)
    Object.values(grouped).forEach(group => {
      group.packets.sort((a, b) => a.weight - b.weight);
    });

    return grouped;
  }, [packets, packaging, products]);

  const openPacketAudit = async (packagingId: string, packetType: string, capacity: number) => {
    setSelectedPacket({ id: packagingId, name: `${capacity}kg ${packetType}` });
    setAuditModalOpen(true);
    setAuditLoading(true);

    try {
      const data = await inventoryAuditAPI.getPacketsAuditByPackagingId(packagingId, 100);
      setAuditData(data);
    } catch (error) {
      console.error('Failed to fetch packets audit:', error);
      setAuditData([]);
    } finally {
      setAuditLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-IN');
  };

  const getPacketTypeStyle = (type: string): { bg: string; text: string } => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('pp')) {
      return { bg: 'bg-sky-500/10', text: 'text-sky-600' };
    }
    if (lowerType.includes('jute')) {
      return { bg: 'bg-amber-500/10', text: 'text-amber-600' };
    }
    if (lowerType.includes('hdpe')) {
      return { bg: 'bg-violet-500/10', text: 'text-violet-600' };
    }
    return { bg: 'bg-slate-500/10', text: 'text-slate-600' };
  };

  if (loading || packagingLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  const productEntries = Object.values(packetsByProduct);
  if (productEntries.length === 0) {
    return (
      <div className="p-6">
        <EmptyState 
          icon={Box} 
          title="No packets found" 
          description="Add empty packets to inventory through packaging management." 
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
                Product
              </th>
              <th className="text-left py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span className="inline-flex items-center gap-1.5">
                  <Scale className="h-3.5 w-3.5" />
                  Weight
                </span>
              </th>
              <th className="text-left py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Packet Type
              </th>
              <th className="text-left py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Source
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
            {productEntries.map((productGroup, productIdx) => (
              <React.Fragment key={productGroup.product.id}>
                {productGroup.packets.map((pkt, packetIdx) => {
                  const typeStyle = getPacketTypeStyle(pkt.packet_type);
                  const isFirstRow = packetIdx === 0;
                  const rowSpan = productGroup.packets.length;

                  return (
                    <tr 
                      key={pkt.packaging_id} 
                      className="group hover:bg-muted/30 transition-colors"
                    >
                      {/* Product Name - Only show on first row, with rowspan */}
                      {isFirstRow && (
                        <td 
                          rowSpan={rowSpan}
                          className="py-4 px-5 border-r border-border/40"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-violet-500/10">
                              <Package className="h-4 w-4 text-violet-600" />
                            </div>
                            <div>
                              <div className="font-medium text-foreground">
                                {productGroup.product.name}
                              </div>
                              {productGroup.product.brand && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {productGroup.product.brand}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      )}
                      {/* Weight */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${typeStyle.bg}`}>
                            <Scale className={`h-5 w-5 ${typeStyle.text}`} />
                          </div>
                          <div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-bold text-foreground">
                                {pkt.weight}
                              </span>
                              <span className="text-base text-muted-foreground font-medium">kg</span>
                            </div>
                            {pkt.packaging_number && (
                              <div className="text-xs font-mono text-primary mt-0.5">
                                {pkt.packaging_number}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Packet Type */}
                      <td className="py-4 px-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-lg ${typeStyle.bg} ${typeStyle.text}`}>
                          <Box className="h-3.5 w-3.5" />
                          {pkt.packet_type}
                        </span>
                      </td>
                      {/* Source */}
                      <td className="py-4 px-5">
                        <span className="text-sm text-foreground">
                          {pkt.source || 'N/A'}
                        </span>
                      </td>
                      {/* Available Quantity */}
                      <td className="py-4 px-5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <span className="text-lg font-bold font-mono text-foreground">
                            {formatNumber(pkt.available_quantity)}
                          </span>
                          <span className="text-sm text-muted-foreground">pcs</span>
                        </div>
                      </td>
                      {/* Actions */}
                      <td className="py-4 px-5 text-center">
                        <button
                          onClick={() => openPacketAudit(
                            pkt.packaging_id, 
                            pkt.packet_type,
                            pkt.weight
                          )}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${typeStyle.bg} ${typeStyle.text} hover:opacity-80`}
                          title="View Audit Log"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>History</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Per-Packet Type Audit Modal */}
      <InventoryAuditModal
        open={auditModalOpen}
        onOpenChange={setAuditModalOpen}
        title={selectedPacket ? `${selectedPacket.name} - History` : 'Packets History'}
        subtitle="Complete transaction history for this packet type"
        auditType="packets"
        data={auditData}
        loading={auditLoading}
      />
    </>
  );
}

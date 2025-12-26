import { useState } from 'react';
import { Box, Eye, Scale } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { useInventory } from '../../../hooks/useInventory';
import { InventoryAuditModal } from './InventoryAuditModal';
import { inventoryAuditAPI, type PacketsInventoryAuditResponse } from '../../../services/inventoryAudit.api';

interface PacketsTableProps {
  onViewAudit?: (packagingId: string) => void;
}

export function PacketsTable({ onViewAudit }: PacketsTableProps) {
  const { packets, loading } = useInventory();
  
  // Per-packet type audit modal state
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditData, setAuditData] = useState<PacketsInventoryAuditResponse[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [selectedPacket, setSelectedPacket] = useState<{ id: string; name: string } | null>(null);

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

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (packets.length === 0) {
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
                <span className="inline-flex items-center gap-1.5">
                  <Scale className="h-3.5 w-3.5" />
                  Holding Capacity
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
            {packets.map((pkt) => {
              const typeStyle = getPacketTypeStyle(pkt.packaging?.packet_type || '');
              const qty = typeof pkt.available_quantity === 'string' 
                ? parseInt(pkt.available_quantity) 
                : pkt.available_quantity;
              const capacity = pkt.packaging?.holding_capacity || 0;

              return (
                <tr 
                  key={pkt.packaging_id} 
                  className="group hover:bg-muted/30 transition-colors"
                >
                  {/* Holding Capacity - PRIMARY */}
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${typeStyle.bg}`}>
                        <Scale className={`h-5 w-5 ${typeStyle.text}`} />
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-foreground">
                            {capacity}
                          </span>
                          <span className="text-base text-muted-foreground font-medium">kg</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  {/* Packet Type - SECONDARY */}
                  <td className="py-4 px-5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-lg ${typeStyle.bg} ${typeStyle.text}`}>
                      <Box className="h-3.5 w-3.5" />
                      {pkt.packaging?.packet_type || 'N/A'}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <span className="text-sm text-foreground">
                      {pkt.packaging?.source || 'N/A'}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <div className="inline-flex items-center gap-2">
                      <span className="text-lg font-bold font-mono text-foreground">
                        {formatNumber(qty)}
                      </span>
                      <span className="text-sm text-muted-foreground">pcs</span>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-center">
                    <button
                      onClick={() => openPacketAudit(
                        pkt.packaging_id, 
                        pkt.packaging?.packet_type || 'Packet',
                        capacity
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

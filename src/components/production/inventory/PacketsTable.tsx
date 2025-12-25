import { useState } from 'react';
import { Box } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { useInventory } from '../../../hooks/useInventory';

export function PacketsTable() {
  const { packets, loading } = useInventory();

  return (
    <div>
      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : packets.length === 0 ? (
        <EmptyState icon={Box} title="No packets found" description="Add empty packets to inventory through packaging management." />
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 text-sm font-semibold">Packet Type</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Holding Capacity (kg)</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Source</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Available Quantity</th>
                </tr>
              </thead>
              <tbody>
                {packets.map((pkt) => (
                  <tr key={pkt.packaging_id} className="border-b border-border/60 hover:bg-muted/30">
                    <td className="py-3 px-4 text-sm">{pkt.packaging?.packet_type || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm">{pkt.packaging?.holding_capacity || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm">{pkt.packaging?.source || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm text-right">{pkt.available_quantity}</td>
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


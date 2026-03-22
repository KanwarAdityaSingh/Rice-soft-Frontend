import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Box, Building2, ChevronDown, ChevronRight } from 'lucide-react';
import type { PackagingNodeData } from '../../../../types/inventoryFlow';
import { formatPacketTypeLabel } from '../../../../constants/bagAndPacketTypes';

interface PackagingNodeProps {
  data: PackagingNodeData;
  selected?: boolean;
}

export const PackagingNode = memo(({ data, selected }: PackagingNodeProps) => {
  const expanded = (data as any).expanded || false;
  const totalFinishedGoods = data.hierarchicalData.finished_goods.length;
  const totalPackets = data.hierarchicalData.finished_goods.reduce((sum, fg) => sum + fg.packets, 0);
  const totalWeight = data.hierarchicalData.finished_goods.reduce((sum, fg) => sum + fg.weight, 0);

  return (
    <div
      className={`relative rounded-lg shadow-sm transition-all duration-300 ${
        selected
          ? 'ring-3 ring-primary ring-offset-1 scale-105'
          : 'hover:scale-[1.02] hover:shadow-md'
      }`}
      style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%), hsl(var(--card))',
        border: '1.5px solid rgba(59, 130, 246, 0.2)',
        minWidth: '160px',
        minHeight: '90px',
        padding: '16px',
        backgroundColor: 'hsl(var(--card))',
      }}
    >
      <div className="flex items-start gap-2">
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
          <Box className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-sm font-semibold text-foreground">
              {data.holdingCapacity} {formatPacketTypeLabel(data.packetType)}
            </span>
            {data.hierarchicalData.packaging_number && (
              <span className="text-xs font-mono font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                {data.hierarchicalData.packaging_number}
              </span>
            )}
            {totalFinishedGoods > 0 && (
              <div className={`transition-transform duration-300 ${expanded ? 'rotate-0' : 'rotate-0'}`}>
                {expanded ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            )}
          </div>
          {data.vendor && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              <span className="truncate">{data.vendor.name}</span>
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-border/50 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Batches:</span>
          <span className="font-medium text-foreground">{totalFinishedGoods}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-muted-foreground">Packets:</span>
          <span className="font-medium text-foreground">{totalPackets.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-muted-foreground">Weight:</span>
          <span className="font-medium text-foreground">{totalWeight.toFixed(2)} kg</span>
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-blue-500" />
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-blue-500" />
    </div>
  );
});

PackagingNode.displayName = 'PackagingNode';


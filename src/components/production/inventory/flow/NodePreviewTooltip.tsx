import { memo } from 'react';
import type { FlowNodeData } from '../../../../types/inventoryFlow';
import { Store, Package, Box, PackageCheck } from 'lucide-react';

interface NodePreviewTooltipProps {
  data: FlowNodeData;
  x: number;
  y: number;
}

export const NodePreviewTooltip = memo(({ data, x, y }: NodePreviewTooltipProps) => {
  const getPreviewContent = () => {
    switch (data.type) {
      case 'brand': {
        const totalProducts = data.hierarchicalData.products.length;
        const totalPackaging = data.hierarchicalData.products.reduce(
          (sum, p) => sum + p.packaging.length,
          0
        );
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-violet-500" />
              <span className="font-semibold">{data.brand || 'Unbranded'}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {totalProducts} Products • {totalPackaging} Packaging Types
            </div>
          </div>
        );
      }
      case 'product': {
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-indigo-500" />
              <span className="font-semibold">{data.productName}</span>
            </div>
            {data.riceType && (
              <div className="text-xs text-muted-foreground">
                {data.riceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              {data.hierarchicalData.packaging.length} Packaging Types
            </div>
          </div>
        );
      }
      case 'packaging': {
        const totalPackets = data.hierarchicalData.finished_goods.reduce(
          (sum, fg) => sum + fg.packets,
          0
        );
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Box className="h-4 w-4 text-blue-500" />
              <span className="font-semibold">
                {data.holdingCapacity} {data.packetType}
              </span>
            </div>
            {data.vendor && (
              <div className="text-xs text-muted-foreground">Vendor: {data.vendor.name}</div>
            )}
            <div className="text-xs text-muted-foreground">
              {totalPackets.toLocaleString()} Packets • {data.hierarchicalData.finished_goods.length} Batches
            </div>
          </div>
        );
      }
      case 'finishedGoods': {
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-emerald-500" />
              <span className="font-semibold">Batch {data.batchNumber}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {data.packets} Packets • {data.weight.toFixed(2)} kg
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div
      className="fixed z-50 pointer-events-none bg-popover border border-border rounded-lg shadow-lg p-3 max-w-xs"
      style={{
        left: `${x + 10}px`,
        top: `${y + 10}px`,
        transform: 'translateZ(0)',
      }}
    >
      {getPreviewContent()}
    </div>
  );
});

NodePreviewTooltip.displayName = 'NodePreviewTooltip';


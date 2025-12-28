import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Weight, Package } from 'lucide-react';
import type { CapacityNodeData } from '../../../../types/inventoryFlow';

interface CapacityNodeProps {
  data: CapacityNodeData;
  selected?: boolean;
}

export const CapacityNode = memo(({ data, selected }: CapacityNodeProps) => {
  // Calculate totals from hierarchical data
  let totalProducts = 0;
  let totalPackaging = 0;
  let totalBatches = 0;

  if (data.hierarchicalData?.brands) {
    data.hierarchicalData.brands.forEach((brand: any) => {
      brand.products?.forEach((product: any) => {
        totalProducts++;
        totalPackaging += product.packaging?.length || 0;
        product.packaging?.forEach((pkg: any) => {
          totalBatches += pkg.finished_goods?.length || 0;
        });
      });
    });
  }

  return (
    <div
      className={`relative rounded-xl shadow-md transition-all duration-300 ${
        selected
          ? 'ring-4 ring-primary ring-offset-2 scale-105'
          : 'hover:scale-[1.02] hover:shadow-lg'
      }`}
      style={{
        background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.12) 0%, rgba(234, 88, 12, 0.12) 100%), hsl(var(--card))',
        border: '2px solid rgba(251, 146, 60, 0.25)',
        minWidth: '180px',
        minHeight: '100px',
        padding: '18px',
        backgroundColor: 'hsl(var(--card))',
      }}
    >
      <div className="flex items-start gap-2">
        <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 text-white">
          <Weight className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-semibold text-foreground mb-1">
            {data.capacity} kg
          </h4>
          <div className="text-xs text-muted-foreground">Holding Capacity</div>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-border/50 grid grid-cols-3 gap-2 text-xs">
        <div className="text-center">
          <div className="font-semibold text-foreground">{totalProducts}</div>
          <div className="text-muted-foreground">Products</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-foreground">{totalPackaging}</div>
          <div className="text-muted-foreground">Packaging</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-foreground">{totalBatches}</div>
          <div className="text-muted-foreground">Batches</div>
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-orange-500" />
      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-orange-500" />
    </div>
  );
});

CapacityNode.displayName = 'CapacityNode';


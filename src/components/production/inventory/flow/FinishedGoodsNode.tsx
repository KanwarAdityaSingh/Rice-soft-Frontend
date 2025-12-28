import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { PackageCheck, Hash } from 'lucide-react';
import type { FinishedGoodsNodeData } from '../../../../types/inventoryFlow';

interface FinishedGoodsNodeProps {
  data: FinishedGoodsNodeData;
  selected?: boolean;
}

export const FinishedGoodsNode = memo(({ data, selected }: FinishedGoodsNodeProps) => {
  return (
    <div
      className={`relative rounded-md shadow-sm transition-all duration-300 ${
        selected
          ? 'ring-2 ring-primary ring-offset-1 scale-105'
          : 'hover:scale-[1.02] hover:shadow'
      }`}
      style={{
        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(22, 163, 74, 0.08) 100%), hsl(var(--card))',
        border: '1px solid rgba(34, 197, 94, 0.15)',
        minWidth: '140px',
        minHeight: '80px',
        padding: '14px',
        backgroundColor: 'hsl(var(--card))',
      }}
    >
      <div className="flex items-start gap-1.5">
        <div className="p-1 rounded bg-gradient-to-br from-emerald-500 to-green-600 text-white">
          <PackageCheck className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <Hash className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground truncate">
              {data.batchNumber}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {data.packets} {data.packets === 1 ? 'packet' : 'packets'}
          </div>
        </div>
      </div>
      <div className="mt-1.5 pt-1.5 border-t border-border/50 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Qty:</span>
          <span className="font-medium text-foreground">{data.quantity.toFixed(2)} kg</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-muted-foreground">Weight:</span>
          <span className="font-medium text-foreground">{data.weight.toFixed(2)} kg</span>
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="w-1.5 h-1.5 bg-emerald-500" />
    </div>
  );
});

FinishedGoodsNode.displayName = 'FinishedGoodsNode';


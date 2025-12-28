import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Package, Circle } from 'lucide-react';
import type { ProductNodeData } from '../../../../types/inventoryFlow';

interface ProductNodeProps {
  data: ProductNodeData;
  selected?: boolean;
}

export const ProductNode = memo(({ data, selected }: ProductNodeProps) => {
  const totalPackaging = data.hierarchicalData.packaging.length;
  const totalFinishedGoods = data.hierarchicalData.packaging.reduce(
    (sum, pack) => sum + pack.finished_goods.length,
    0
  );

  const riceTypeColors: Record<string, string> = {
    basmati: 'bg-amber-500/20 text-amber-700 border-amber-500/30',
    non_basmati: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
    parboiled: 'bg-orange-500/20 text-orange-700 border-orange-500/30',
    raw: 'bg-gray-500/20 text-gray-700 border-gray-500/30',
    raw_basmati: 'bg-amber-600/20 text-amber-800 border-amber-600/30',
    steam_basmati: 'bg-amber-400/20 text-amber-600 border-amber-400/30',
    white_sella: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
    golden_sella: 'bg-yellow-600/20 text-yellow-800 border-yellow-600/30',
  };

  const riceTypeColor = data.riceType ? riceTypeColors[data.riceType] || riceTypeColors.raw : riceTypeColors.raw;

  return (
    <div
      className={`relative rounded-xl shadow-md transition-all duration-300 ${
        selected
          ? 'ring-4 ring-primary ring-offset-2 scale-105'
          : 'hover:scale-[1.02] hover:shadow-lg'
      }`}
      style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(79, 70, 229, 0.12) 100%), hsl(var(--card))',
        border: '2px solid rgba(99, 102, 241, 0.25)',
        minWidth: '180px',
        minHeight: '100px',
        padding: '18px',
        backgroundColor: 'hsl(var(--card))',
      }}
    >
      <div className="flex items-start gap-2">
        <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
          <Package className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-semibold text-foreground mb-1 truncate">{data.productName}</h4>
          {data.riceType && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${riceTypeColor}`}>
              <Circle className="h-2 w-2 fill-current" />
              {data.riceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          )}
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{totalPackaging} Packaging Types</span>
        <span className="text-muted-foreground">{totalFinishedGoods} Batches</span>
      </div>
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-indigo-500" />
      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-indigo-500" />
    </div>
  );
});

ProductNode.displayName = 'ProductNode';


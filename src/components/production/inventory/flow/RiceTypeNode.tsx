import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Sprout, Circle } from 'lucide-react';
import type { RiceTypeNodeData } from '../../../../types/inventoryFlow';

interface RiceTypeNodeProps {
  data: RiceTypeNodeData;
  selected?: boolean;
}

export const RiceTypeNode = memo(({ data, selected }: RiceTypeNodeProps) => {
  // Calculate totals from hierarchical data
  let totalProducts = 0;
  let totalPackaging = 0;
  let totalBatches = 0;

  if (data.hierarchicalData?.products) {
    totalProducts = data.hierarchicalData.products.length;
    data.hierarchicalData.products.forEach((product: any) => {
      totalPackaging += product.packaging?.length || 0;
      product.packaging?.forEach((pkg: any) => {
        totalBatches += pkg.finished_goods?.length || 0;
      });
    });
  }

  const riceTypeColors: Record<string, string> = {
    basmati: 'bg-amber-500/20 text-amber-700 border-amber-500/30',
    non_basmati: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
    parboiled: 'bg-orange-500/20 text-orange-700 border-orange-500/30',
    raw: 'bg-gray-500/20 text-gray-700 border-gray-500/30',
    raw_basmati: 'bg-amber-600/20 text-amber-800 border-amber-600/30',
    steam_basmati: 'bg-amber-400/20 text-amber-600 border-amber-400/30',
    white_sella: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
    golden_sella: 'bg-yellow-600/20 text-yellow-800 border-yellow-600/30',
    unclassified: 'bg-gray-400/20 text-gray-600 border-gray-400/30',
  };

  const riceTypeColor = riceTypeColors[data.riceType] || riceTypeColors.raw;
  const displayName = data.riceType === 'unclassified' 
    ? 'Unclassified' 
    : data.riceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div
      className={`relative rounded-xl shadow-md transition-all duration-300 ${
        selected
          ? 'ring-4 ring-primary ring-offset-2 scale-105'
          : 'hover:scale-[1.02] hover:shadow-lg'
      }`}
      style={{
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(147, 51, 234, 0.12) 100%), hsl(var(--card))',
        border: '2px solid rgba(168, 85, 247, 0.25)',
        minWidth: '180px',
        minHeight: '100px',
        padding: '18px',
        backgroundColor: 'hsl(var(--card))',
      }}
    >
      <div className="flex items-start gap-2">
        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 text-white">
          <Sprout className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-semibold text-foreground mb-1">
            {displayName}
          </h4>
          <div className="text-xs text-muted-foreground">Rice Type</div>
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
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-purple-500" />
      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-purple-500" />
    </div>
  );
});

RiceTypeNode.displayName = 'RiceTypeNode';


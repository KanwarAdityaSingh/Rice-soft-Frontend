import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Store, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import type { BrandNodeData } from '../../../../types/inventoryFlow';

interface BrandNodeProps {
  data: BrandNodeData;
  selected?: boolean;
}

export const BrandNode = memo(({ data, selected }: BrandNodeProps) => {
  const expanded = (data as any).expanded || false;
  const totalProducts = data.hierarchicalData.products.length;
  const totalPackaging = data.hierarchicalData.products.reduce(
    (sum, p) => sum + p.packaging.length,
    0
  );
  const totalFinishedGoods = data.hierarchicalData.products.reduce(
    (sum, p) => sum + p.packaging.reduce((s, pack) => s + pack.finished_goods.length, 0),
    0
  );

  return (
    <div
      className={`relative rounded-2xl shadow-lg transition-all duration-300 ${
        selected
          ? 'ring-4 ring-primary ring-offset-2 scale-105'
          : 'hover:scale-[1.02] hover:shadow-xl'
      }`}
      style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(124, 58, 237, 0.15) 100%), rgb(var(--background))',
        border: '2px solid rgba(139, 92, 246, 0.3)',
        minWidth: '200px',
        minHeight: '120px',
        padding: '24px',
        backgroundColor: 'hsl(var(--card))',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
          <Store className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-foreground">{data.brand || 'Unbranded'}</h3>
            {totalProducts > 0 && (
              <div className={`transition-transform duration-300 ${expanded ? 'rotate-0' : 'rotate-0'}`}>
                {expanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {totalProducts} {totalProducts === 1 ? 'Product' : 'Products'}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-3 gap-2 text-xs">
        <div className="text-center">
          <div className="font-semibold text-foreground">{totalProducts}</div>
          <div className="text-muted-foreground">Products</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-foreground">{totalPackaging}</div>
          <div className="text-muted-foreground">Packaging</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-foreground">{totalFinishedGoods}</div>
          <div className="text-muted-foreground">Batches</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-violet-500" />
    </div>
  );
});

BrandNode.displayName = 'BrandNode';


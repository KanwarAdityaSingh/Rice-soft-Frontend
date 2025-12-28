import { useMemo } from 'react';
import { Package, Weight, Boxes, TrendingUp, Building2, Layers } from 'lucide-react';
import type { HierarchicalInventory } from '../../../types/entities';
import { calculateInventorySummary } from '../../../utils/inventoryTransform';
import type { ExtendedInventoryFilters } from '../../../utils/inventoryTransform';

interface InventorySummaryPanelProps {
  hierarchical: HierarchicalInventory[];
  filters?: ExtendedInventoryFilters;
}

export function InventorySummaryPanel({ hierarchical, filters }: InventorySummaryPanelProps) {
  const summary = useMemo(() => {
    if (!hierarchical || hierarchical.length === 0) {
      return null;
    }
    return calculateInventorySummary(hierarchical, filters?.date_range);
  }, [hierarchical, filters?.date_range]);

  if (!summary) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No inventory data available</p>
      </div>
    );
  }

  const metricCards = [
    {
      label: 'Total Packets',
      value: summary.total_packets.toLocaleString(),
      icon: Package,
      color: 'from-blue-500 to-cyan-600',
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-700',
    },
    {
      label: 'Total Weight',
      value: `${summary.total_weight.toFixed(2)} kg`,
      icon: Weight,
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'bg-emerald-500/10',
      textColor: 'text-emerald-700',
    },
    {
      label: 'Total Batches',
      value: summary.total_batches.toLocaleString(),
      icon: Boxes,
      color: 'from-violet-500 to-purple-600',
      bgColor: 'bg-violet-500/10',
      textColor: 'text-violet-700',
    },
    {
      label: 'Products',
      value: summary.total_products.toLocaleString(),
      icon: TrendingUp,
      color: 'from-orange-500 to-red-600',
      bgColor: 'bg-orange-500/10',
      textColor: 'text-orange-700',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Key Metrics */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Overall Summary
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {metricCards.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div
                key={index}
                className="relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">{metric.label}</p>
                    <p className={`text-2xl font-bold ${metric.textColor}`}>{metric.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${metric.color} text-white shadow-sm`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Breakdown by Brand */}
      {summary.by_brand.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Breakdown by Brand
          </h3>
          <div className="space-y-2">
            {summary.by_brand.slice(0, 10).map((brand, index) => (
              <div
                key={brand.brand}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{brand.brand || 'Unbranded'}</p>
                    <p className="text-xs text-muted-foreground">{brand.batches} batches</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{brand.packets.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">packets</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{brand.weight.toFixed(2)} kg</p>
                    <p className="text-xs text-muted-foreground">weight</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Breakdown by Product */}
      {summary.by_product.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Top Products
          </h3>
          <div className="space-y-2">
            {summary.by_product.slice(0, 10).map((product, index) => (
              <div
                key={product.product_id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{product.product_name}</p>
                    <p className="text-xs text-muted-foreground">{product.batches} batches</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{product.packets.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">packets</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{product.weight.toFixed(2)} kg</p>
                    <p className="text-xs text-muted-foreground">weight</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


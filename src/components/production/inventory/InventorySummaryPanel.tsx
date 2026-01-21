import { useMemo } from 'react';
import { Package, Weight, Boxes, TrendingUp, Building2, Layers, Store, Box, PackageCheck } from 'lucide-react';
import type { HierarchicalInventory } from '../../../types/entities';
import { calculateInventorySummary } from '../../../utils/inventoryTransform';
import type { ExtendedInventoryFilters } from '../../../utils/inventoryTransform';
import type { FlowNodeData } from '../../../types/inventoryFlow';

interface InventorySummaryPanelProps {
  hierarchical: HierarchicalInventory[];
  filters?: ExtendedInventoryFilters;
  selectedNode?: FlowNodeData | null;
}

export function InventorySummaryPanel({ hierarchical, filters, selectedNode }: InventorySummaryPanelProps) {
  // Calculate summary based on selected node or entire hierarchical data
  const summary = useMemo(() => {
    if (!hierarchical || hierarchical.length === 0) {
      return null;
    }
    
    // If a node is selected, calculate summary for that specific node
    if (selectedNode) {
      const nodeData = selectedNode.hierarchicalData;
      
      switch (selectedNode.type) {
        case 'brand': {
          // Summary for a specific brand
          const brandData = nodeData as HierarchicalInventory;
          let totalPackets = 0;
          let totalWeight = 0;
          let totalBatches = 0;
          const products = brandData.products || [];
          
          products.forEach(product => {
            product.packaging?.forEach(pack => {
              pack.finished_goods?.forEach(fg => {
                totalPackets += fg.packets || 0;
                totalWeight += fg.weight || 0;
                totalBatches += 1;
              });
            });
          });
          
          return {
            total_packets: totalPackets,
            total_weight: totalWeight,
            total_batches: totalBatches,
            total_products: products.length,
            by_brand: [{
              brand: selectedNode.brand || 'Unbranded',
              packets: totalPackets,
              weight: totalWeight,
              batches: totalBatches,
            }],
            by_product: products.map(p => {
              let packets = 0;
              let weight = 0;
              let batches = 0;
              p.packaging?.forEach(pack => {
                pack.finished_goods?.forEach(fg => {
                  packets += fg.packets || 0;
                  weight += fg.weight || 0;
                  batches += 1;
                });
              });
              return {
                product_id: p.product_id,
                product_name: p.product_name,
                packets,
                weight,
                batches,
              };
            }),
          };
        }
        
        case 'product': {
          // Summary for a specific product
          const productData = nodeData;
          let totalPackets = 0;
          let totalWeight = 0;
          let totalBatches = 0;
          const packaging = productData?.packaging || [];
          
          packaging.forEach((pack: any) => {
            pack.finished_goods?.forEach((fg: any) => {
              totalPackets += fg.packets || 0;
              totalWeight += fg.weight || 0;
              totalBatches += 1;
            });
          });
          
          return {
            total_packets: totalPackets,
            total_weight: totalWeight,
            total_batches: totalBatches,
            total_products: 1,
            by_brand: [{
              brand: selectedNode.brand || 'Unbranded',
              packets: totalPackets,
              weight: totalWeight,
              batches: totalBatches,
            }],
            by_product: [{
              product_id: selectedNode.productId,
              product_name: selectedNode.productName,
              packets: totalPackets,
              weight: totalWeight,
              batches: totalBatches,
            }],
          };
        }
        
        case 'packaging': {
          // Summary for a specific packaging
          const packData = nodeData;
          const finishedGoods = packData?.finished_goods || [];
          let totalPackets = 0;
          let totalWeight = 0;
          
          finishedGoods.forEach((fg: any) => {
            totalPackets += fg.packets || 0;
            totalWeight += fg.weight || 0;
          });
          
          return {
            total_packets: totalPackets,
            total_weight: totalWeight,
            total_batches: finishedGoods.length,
            total_products: 1,
            by_brand: [{
              brand: selectedNode.brand || 'Unbranded',
              packets: totalPackets,
              weight: totalWeight,
              batches: finishedGoods.length,
            }],
            by_product: [{
              product_id: selectedNode.productId,
              product_name: selectedNode.productName,
              packets: totalPackets,
              weight: totalWeight,
              batches: finishedGoods.length,
            }],
          };
        }
        
        case 'finishedGoods': {
          // Summary for a specific finished goods batch
          const fgData = nodeData;
          return {
            total_packets: fgData?.packets || 0,
            total_weight: fgData?.weight || 0,
            total_batches: 1,
            total_products: 1,
            by_brand: [{
              brand: selectedNode.brand || 'Unbranded',
              packets: fgData?.packets || 0,
              weight: fgData?.weight || 0,
              batches: 1,
            }],
            by_product: [{
              product_id: selectedNode.productId,
              product_name: selectedNode.productName,
              packets: fgData?.packets || 0,
              weight: fgData?.weight || 0,
              batches: 1,
            }],
          };
        }
        
        default:
          return calculateInventorySummary(hierarchical, filters?.date_range);
      }
    }
    
    return calculateInventorySummary(hierarchical, filters?.date_range);
  }, [hierarchical, filters?.date_range, selectedNode]);

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
          {selectedNode ? (
            <>
              {selectedNode.type === 'brand' && <Store className="h-5 w-5 text-violet-500" />}
              {selectedNode.type === 'product' && <Package className="h-5 w-5 text-indigo-500" />}
              {selectedNode.type === 'packaging' && <Box className="h-5 w-5 text-blue-500" />}
              {selectedNode.type === 'finishedGoods' && <PackageCheck className="h-5 w-5 text-emerald-500" />}
              {!['brand', 'product', 'packaging', 'finishedGoods'].includes(selectedNode.type) && <Layers className="h-5 w-5 text-primary" />}
              <span>
                {selectedNode.type === 'brand' && `Brand: ${selectedNode.brand || 'Unbranded'}`}
                {selectedNode.type === 'product' && `Product: ${selectedNode.productName}`}
                {selectedNode.type === 'packaging' && `Packaging: ${selectedNode.holdingCapacity}kg ${selectedNode.packetType}`}
                {selectedNode.type === 'finishedGoods' && `Batch: ${selectedNode.batchNumber}`}
                {!['brand', 'product', 'packaging', 'finishedGoods'].includes(selectedNode.type) && 'Summary'}
              </span>
            </>
          ) : (
            <>
              <Layers className="h-5 w-5 text-primary" />
              Overall Summary
            </>
          )}
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


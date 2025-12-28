import { memo } from 'react';
import { X, Store, Package, Box, PackageCheck, Building2, Hash, TrendingUp, Weight, Layers } from 'lucide-react';
import type { FlowNodeData } from '../../types/inventoryFlow';

interface InventoryDetailPanelProps {
  selectedNode: FlowNodeData | null;
  onClose: () => void;
}

export const InventoryDetailPanel = memo(({ selectedNode, onClose }: InventoryDetailPanelProps) => {
  if (!selectedNode) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/30 rounded-xl border border-dashed border-border">
        <div className="text-center space-y-2">
          <Layers className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
          <p className="text-sm text-muted-foreground">Select a node to view details</p>
        </div>
      </div>
    );
  }

  const renderBrandDetails = (data: Extract<FlowNodeData, { type: 'brand' }>) => {
    const totalProducts = data.hierarchicalData.products.length;
    const totalPackaging = data.hierarchicalData.products.reduce(
      (sum, p) => sum + p.packaging.length,
      0
    );
    const totalFinishedGoods = data.hierarchicalData.products.reduce(
      (sum, p) => sum + p.packaging.reduce((s, pack) => s + pack.finished_goods.length, 0),
      0
    );
    const totalPackets = data.hierarchicalData.products.reduce(
      (sum, p) =>
        sum +
        p.packaging.reduce(
          (s, pack) => s + pack.finished_goods.reduce((ss, fg) => ss + fg.packets, 0),
          0
        ),
      0
    );
    const totalWeight = data.hierarchicalData.products.reduce(
      (sum, p) =>
        sum +
        p.packaging.reduce(
          (s, pack) => s + pack.finished_goods.reduce((ss, fg) => ss + fg.weight, 0),
          0
        ),
      0
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{data.brand || 'Unbranded'}</h2>
            <p className="text-sm text-muted-foreground">Brand Overview</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Package className="h-4 w-4" />
              Products
            </div>
            <div className="text-2xl font-bold">{totalProducts}</div>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Box className="h-4 w-4" />
              Packaging Types
            </div>
            <div className="text-2xl font-bold">{totalPackaging}</div>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <PackageCheck className="h-4 w-4" />
              Batches
            </div>
            <div className="text-2xl font-bold">{totalFinishedGoods}</div>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              Total Packets
            </div>
            <div className="text-2xl font-bold">{totalPackets.toLocaleString()}</div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Products</h3>
          <div className="space-y-2">
            {data.hierarchicalData.products.map((product) => (
              <div
                key={product.product_id}
                className="p-4 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">{product.product_name}</h4>
                    {product.rice_type && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {product.rice_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div>{product.packaging.length} Packaging Types</div>
                    <div>
                      {product.packaging.reduce((sum, p) => sum + p.finished_goods.length, 0)} Batches
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderProductDetails = (data: Extract<FlowNodeData, { type: 'product' }>) => {
    const totalPackaging = data.hierarchicalData.packaging.length;
    const totalFinishedGoods = data.hierarchicalData.packaging.reduce(
      (sum, pack) => sum + pack.finished_goods.length,
      0
    );
    const totalPackets = data.hierarchicalData.packaging.reduce(
      (sum, pack) => sum + pack.finished_goods.reduce((s, fg) => s + fg.packets, 0),
      0
    );
    const totalWeight = data.hierarchicalData.packaging.reduce(
      (sum, pack) => sum + pack.finished_goods.reduce((s, fg) => s + fg.weight, 0),
      0
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{data.productName}</h2>
            <p className="text-sm text-muted-foreground">
              {data.riceType
                ? data.riceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                : 'Product Details'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Box className="h-4 w-4" />
              Packaging Types
            </div>
            <div className="text-2xl font-bold">{totalPackaging}</div>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <PackageCheck className="h-4 w-4" />
              Batches
            </div>
            <div className="text-2xl font-bold">{totalFinishedGoods}</div>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              Total Packets
            </div>
            <div className="text-2xl font-bold">{totalPackets.toLocaleString()}</div>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Weight className="h-4 w-4" />
              Total Weight
            </div>
            <div className="text-2xl font-bold">{totalWeight.toFixed(2)} kg</div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Packaging</h3>
          <div className="space-y-2">
            {data.hierarchicalData.packaging.map((pack) => (
              <div
                key={pack.packaging_id}
                className="p-4 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">
                        {pack.holding_capacity} {pack.packet_type}
                      </h4>
                      {pack.packaging_number && (
                        <span className="text-xs font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                          {pack.packaging_number}
                        </span>
                      )}
                    </div>
                    {pack.vendor && (
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {pack.vendor.name}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div>{pack.finished_goods.length} Batches</div>
                    <div>
                      {pack.finished_goods.reduce((sum, fg) => sum + fg.packets, 0).toLocaleString()}{' '}
                      Packets
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderPackagingDetails = (data: Extract<FlowNodeData, { type: 'packaging' }>) => {
    const totalPackets = data.hierarchicalData.finished_goods.reduce(
      (sum, fg) => sum + fg.packets,
      0
    );
    const totalWeight = data.hierarchicalData.finished_goods.reduce(
      (sum, fg) => sum + fg.weight,
      0
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
            <Box className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {data.holdingCapacity} {data.packetType}
            </h2>
            <p className="text-sm text-muted-foreground">Packaging Details</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <PackageCheck className="h-4 w-4" />
              Batches
            </div>
            <div className="text-2xl font-bold">{data.hierarchicalData.finished_goods.length}</div>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              Total Packets
            </div>
            <div className="text-2xl font-bold">{totalPackets.toLocaleString()}</div>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Weight className="h-4 w-4" />
              Total Weight
            </div>
            <div className="text-2xl font-bold">{totalWeight.toFixed(2)} kg</div>
          </div>
        </div>

        {data.vendor && (
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Building2 className="h-4 w-4" />
              Packaging Vendor
            </div>
            <div className="font-semibold">{data.vendor.name}</div>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Finished Goods Batches</h3>
          <div className="space-y-2">
            {data.hierarchicalData.finished_goods.map((fg) => (
              <div
                key={fg.batch_id}
                className="p-4 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      {fg.batch_number}
                    </h4>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-medium">{fg.packets.toLocaleString()} Packets</div>
                    <div className="text-muted-foreground">{fg.weight.toFixed(2)} kg</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderFinishedGoodsDetails = (data: Extract<FlowNodeData, { type: 'finishedGoods' }>) => {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white">
            <PackageCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Hash className="h-6 w-6" />
              {data.batchNumber}
            </h2>
            <p className="text-sm text-muted-foreground">Finished Goods Batch</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <PackageCheck className="h-4 w-4" />
              Packets
            </div>
            <div className="text-2xl font-bold">{data.packets.toLocaleString()}</div>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Weight className="h-4 w-4" />
              Weight
            </div>
            <div className="text-2xl font-bold">{data.weight.toFixed(2)} kg</div>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              Quantity
            </div>
            <div className="text-2xl font-bold">{data.quantity.toFixed(2)} kg</div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Product Information</h3>
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Product</span>
                <span className="font-semibold">{data.productName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Brand</span>
                <span className="font-semibold">{data.brand || 'Unbranded'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-background rounded-xl border border-border shadow-lg">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-lg font-semibold">Details</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          aria-label="Close details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {selectedNode.type === 'brand' && renderBrandDetails(selectedNode)}
        {selectedNode.type === 'product' && renderProductDetails(selectedNode)}
        {selectedNode.type === 'packaging' && renderPackagingDetails(selectedNode)}
        {selectedNode.type === 'finishedGoods' && renderFinishedGoodsDetails(selectedNode)}
      </div>
    </div>
  );
});

InventoryDetailPanel.displayName = 'InventoryDetailPanel';


import { useMemo } from 'react';
import { Store, Package, Box, PackageCheck, Building2, Hash, Layers, Weight, Sprout, Package2 } from 'lucide-react';
import type { FlowNodeData } from '../../../types/inventoryFlow';
import { useInventory } from '../../../hooks/useInventory';

interface InventoryTableProps {
  selectedNode: FlowNodeData | null;
}

export function InventoryTable({ selectedNode }: InventoryTableProps) {
  const { hierarchical } = useInventory();

  // Render table based on selected node type
  const tableContent = useMemo(() => {
    if (!selectedNode) {
      // Show all brands summary
      if (!hierarchical || hierarchical.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <Layers className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
            <p className="text-sm text-muted-foreground">Select a node to view details</p>
          </div>
        );
      }

      return (
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="text-lg font-semibold">All Brands</h3>
            <p className="text-sm text-muted-foreground">Select a brand to view its products</p>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Brand
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Products
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Packaging Types
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Batches
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {hierarchical.map((brand) => {
                  const totalProducts = brand.products.length;
                  const totalPackaging = brand.products.reduce((sum, p) => sum + p.packaging.length, 0);
                  const totalBatches = brand.products.reduce(
                    (sum, p) => sum + p.packaging.reduce((s, pack) => s + pack.finished_goods.length, 0),
                    0
                  );

                  return (
                    <tr key={brand.brand || 'unbranded'} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-violet-500" />
                          <span className="font-medium">{brand.brand || 'Unbranded'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{totalProducts}</td>
                      <td className="px-4 py-3 text-sm">{totalPackaging}</td>
                      <td className="px-4 py-3 text-sm">{totalBatches}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    switch (selectedNode.type) {
      case 'brand': {
        const products = selectedNode.hierarchicalData?.products || [];
        return (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/10">
                  <Store className="h-5 w-5 text-violet-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedNode.brand || 'Unbranded'}</h3>
                  <p className="text-sm text-muted-foreground">Products</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Product Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Rice Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Packaging Types
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Batches
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((product) => {
                    const packagingCount = product.packaging.length;
                    const batchesCount = product.packaging.reduce(
                      (sum, pack) => sum + pack.finished_goods.length,
                      0
                    );

                    return (
                      <tr key={product.product_id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-indigo-500" />
                            <span className="font-medium">{product.product_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {product.rice_type
                            ? product.rice_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">{packagingCount}</td>
                        <td className="px-4 py-3 text-sm">{batchesCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case 'product': {
        const packaging = selectedNode.hierarchicalData?.packaging || [];
        return (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10">
                  <Package className="h-5 w-5 text-indigo-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedNode.productName}</h3>
                  <p className="text-sm text-muted-foreground">Packaging</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Capacity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Batches
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Total Packets
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {packaging.map((pack) => {
                    const batchesCount = pack.finished_goods.length;
                    const totalPackets = pack.finished_goods.reduce((sum, fg) => sum + fg.packets, 0);

                    return (
                      <tr key={pack.packaging_id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Box className="h-4 w-4 text-blue-500" />
                            <div className="flex flex-col">
                              <span className="font-medium">{pack.holding_capacity} kg</span>
                              {pack.packaging_number && (
                                <span className="text-xs text-muted-foreground font-mono">{pack.packaging_number}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{pack.packet_type}</td>
                        <td className="px-4 py-3 text-sm">
                          {pack.vendor ? (
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              {pack.vendor.name}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">{batchesCount}</td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {totalPackets.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

        case 'packaging': {
        const finishedGoods = selectedNode.hierarchicalData?.finished_goods || [];
        return (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Box className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedNode.holdingCapacity} {selectedNode.packetType}
                  </h3>
                  <p className="text-sm text-muted-foreground">Finished Goods Batches</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Batch Number
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Packets
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Weight
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Quantity
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {finishedGoods.map((fg) => (
                    <tr key={fg.batch_id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-emerald-500" />
                          <span className="font-medium">{fg.batch_number}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{fg.packets.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">{fg.weight.toFixed(2)} kg</td>
                      <td className="px-4 py-3 text-sm">{fg.quantity.toFixed(2)} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

        case 'finishedGoods': {
        const fg = selectedNode.hierarchicalData || {};
        return (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <PackageCheck className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Hash className="h-5 w-5" />
                    {selectedNode.batchNumber}
                  </h3>
                  <p className="text-sm text-muted-foreground">Finished Goods Batch Details</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-card border border-border">
                    <div className="text-sm text-muted-foreground mb-1">Packets</div>
                    <div className="text-2xl font-bold">{fg.packets.toLocaleString()}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-card border border-border">
                    <div className="text-sm text-muted-foreground mb-1">Weight</div>
                    <div className="text-2xl font-bold">{fg.weight.toFixed(2)} kg</div>
                  </div>
                  <div className="p-4 rounded-lg bg-card border border-border">
                    <div className="text-sm text-muted-foreground mb-1">Quantity</div>
                    <div className="text-2xl font-bold">{fg.quantity.toFixed(2)} kg</div>
                  </div>
                  <div className="p-4 rounded-lg bg-card border border-border">
                    <div className="text-sm text-muted-foreground mb-1">Product</div>
                    <div className="text-lg font-semibold">{selectedNode.productName}</div>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-card border border-border">
                  <div className="text-sm text-muted-foreground mb-2">Brand</div>
                  <div className="text-lg font-semibold">{selectedNode.brand || 'Unbranded'}</div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'vendor': {
        const vendorData = selectedNode.hierarchicalData;
        const brands = vendorData?.brands || [];
        return (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Building2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedNode.vendor?.name || 'Unassigned'}</h3>
                  <p className="text-sm text-muted-foreground">Packaging Vendor</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Brand
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Products
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Packaging
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {brands.map((brand: any) => {
                    const totalProducts = brand.products?.length || 0;
                    const totalPackaging = brand.products?.reduce((sum: number, p: any) => sum + (p.packaging?.length || 0), 0) || 0;
                    return (
                      <tr key={brand.brand} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Store className="h-4 w-4 text-violet-500" />
                            <span className="font-medium">{brand.brand || 'Unbranded'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{totalProducts}</td>
                        <td className="px-4 py-3 text-sm">{totalPackaging}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case 'capacity': {
        const capacityData = selectedNode.hierarchicalData;
        const brands = capacityData?.brands || [];
        return (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Weight className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedNode.capacity} kg</h3>
                  <p className="text-sm text-muted-foreground">Holding Capacity</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Brand
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Products
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Packaging
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {brands.map((brand: any) => {
                    const totalProducts = brand.products?.length || 0;
                    const totalPackaging = brand.products?.reduce((sum: number, p: any) => sum + (p.packaging?.length || 0), 0) || 0;
                    return (
                      <tr key={brand.brand} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Store className="h-4 w-4 text-violet-500" />
                            <span className="font-medium">{brand.brand || 'Unbranded'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{totalProducts}</td>
                        <td className="px-4 py-3 text-sm">{totalPackaging}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case 'riceType': {
        const riceTypeData = selectedNode.hierarchicalData;
        const products = riceTypeData?.products || [];
        return (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Sprout className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedNode.riceType === 'unclassified' 
                      ? 'Unclassified' 
                      : selectedNode.riceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </h3>
                  <p className="text-sm text-muted-foreground">Rice Type</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Product Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Packaging Types
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Batches
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((product: any) => {
                    const packagingCount = product.packaging?.length || 0;
                    const batchesCount = product.packaging?.reduce(
                      (sum: number, pack: any) => sum + (pack.finished_goods?.length || 0),
                      0
                    ) || 0;
                    return (
                      <tr key={product.product_id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-indigo-500" />
                            <span className="font-medium">{product.product_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{packagingCount}</td>
                        <td className="px-4 py-3 text-sm">{batchesCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case 'packetType': {
        const packetTypeData = selectedNode.hierarchicalData;
        const brands = packetTypeData?.brands || [];
        return (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Package2 className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedNode.packetType}</h3>
                  <p className="text-sm text-muted-foreground">Packet Type</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Brand
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Products
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Packaging
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {brands.map((brand: any) => {
                    const totalProducts = brand.products?.length || 0;
                    const totalPackaging = brand.products?.reduce((sum: number, p: any) => sum + (p.packaging?.length || 0), 0) || 0;
                    return (
                      <tr key={brand.brand} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Store className="h-4 w-4 text-violet-500" />
                            <span className="font-medium">{brand.brand || 'Unbranded'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{totalProducts}</td>
                        <td className="px-4 py-3 text-sm">{totalPackaging}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  }, [selectedNode, hierarchical]);

  return <div className="h-full">{tableContent}</div>;
}


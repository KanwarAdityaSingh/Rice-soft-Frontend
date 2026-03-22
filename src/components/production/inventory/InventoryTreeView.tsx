import { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Store, Package, Box, PackageCheck, Hash, Building2 } from 'lucide-react';
import type { HierarchicalInventory } from '../../../types/entities';
import { formatPacketTypeLabel } from '../../../constants/bagAndPacketTypes';
import type { FlowNodeData } from '../../../types/inventoryFlow';

interface InventoryTreeViewProps {
  hierarchical: HierarchicalInventory[];
  selectedNodeId: string | null;
  onNodeSelect: (nodeData: FlowNodeData | null) => void;
  searchQuery: string;
  loading?: boolean;
}

export function InventoryTreeView({
  hierarchical,
  selectedNodeId,
  onNodeSelect,
  searchQuery,
  loading = false,
}: InventoryTreeViewProps) {
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [expandedPackaging, setExpandedPackaging] = useState<Set<string>>(new Set());
  const selectedNodeRef = useRef<HTMLDivElement | null>(null);

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery) return hierarchical;

    const q = searchQuery.toLowerCase();
    return hierarchical
      .filter((brand) => {
        const matchesBrand = brand.brand.toLowerCase().includes(q);
        const hasMatchingProducts = brand.products.some(
          (product) =>
            product.product_name.toLowerCase().includes(q) ||
            (product.rice_type && product.rice_type.toLowerCase().includes(q)) ||
            product.packaging.some(
              (pack) =>
                pack.packet_type.toLowerCase().includes(q) ||
                (pack.packaging_number && pack.packaging_number.toLowerCase().includes(q)) ||
                (pack.vendor && pack.vendor.name.toLowerCase().includes(q)) ||
                pack.finished_goods.some((fg) => fg.batch_number.toLowerCase().includes(q))
            )
        );
        return matchesBrand || hasMatchingProducts;
      })
      .map((brand) => ({
        ...brand,
        products: brand.products
          .filter((product) => {
            const matchesProduct =
              product.product_name.toLowerCase().includes(q) ||
              (product.rice_type && product.rice_type.toLowerCase().includes(q));
            const hasMatchingPackaging = product.packaging.some(
              (pack) =>
                pack.packet_type.toLowerCase().includes(q) ||
                (pack.vendor && pack.vendor.name.toLowerCase().includes(q)) ||
                pack.finished_goods.some((fg) => fg.batch_number.toLowerCase().includes(q))
            );
            return matchesProduct || hasMatchingPackaging;
          })
          .map((product) => ({
            ...product,
            packaging: product.packaging.filter(
              (pack) =>
                pack.packet_type.toLowerCase().includes(q) ||
                (pack.packaging_number && pack.packaging_number.toLowerCase().includes(q)) ||
                (pack.vendor && pack.vendor.name.toLowerCase().includes(q)) ||
                pack.finished_goods.some((fg) => fg.batch_number.toLowerCase().includes(q))
            ),
          })),
      }))
      .filter((brand) => brand.products.length > 0);
  }, [hierarchical, searchQuery]);

  // Auto-expand nodes that match search
  useEffect(() => {
    if (searchQuery) {
      const brandsToExpand = new Set<string>();
      const productsToExpand = new Set<string>();
      const packagingToExpand = new Set<string>();

      filteredData.forEach((brand) => {
        brandsToExpand.add(brand.brand || 'unbranded');
        brand.products.forEach((product) => {
          productsToExpand.add(product.product_id);
          product.packaging.forEach((pack) => {
            packagingToExpand.add(pack.packaging_id);
          });
        });
      });

      setExpandedBrands(brandsToExpand);
      setExpandedProducts(productsToExpand);
      setExpandedPackaging(packagingToExpand);
    }
  }, [searchQuery, filteredData]);

  // Scroll to selected node
  useEffect(() => {
    if (selectedNodeRef.current) {
      selectedNodeRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [selectedNodeId]);

  const toggleBrand = (brand: string) => {
    setExpandedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brand)) {
        next.delete(brand);
      } else {
        next.add(brand);
      }
      return next;
    });
  };

  const toggleProduct = (productId: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const togglePackaging = (packagingId: string) => {
    setExpandedPackaging((prev) => {
      const next = new Set(prev);
      if (next.has(packagingId)) {
        next.delete(packagingId);
      } else {
        next.add(packagingId);
      }
      return next;
    });
  };

  const handleBrandClick = (brandData: HierarchicalInventory) => {
    const nodeData: FlowNodeData = {
      type: 'brand',
      brand: brandData.brand,
      hierarchicalData: brandData,
    };
    onNodeSelect(nodeData);
  };

  const handleProductClick = (product: HierarchicalInventory['products'][0], brand: string) => {
    const nodeData: FlowNodeData = {
      type: 'product',
      productId: product.product_id,
      productName: product.product_name,
      riceType: product.rice_type,
      brand,
      hierarchicalData: product,
    };
    onNodeSelect(nodeData);
  };

  const handlePackagingClick = (
    pack: HierarchicalInventory['products'][0]['packaging'][0],
    productId: string,
    productName: string,
    brand: string
  ) => {
    const nodeData: FlowNodeData = {
      type: 'packaging',
      packagingId: pack.packaging_id,
      holdingCapacity: pack.holding_capacity,
      packetType: pack.packet_type,
      vendor: pack.vendor,
      productId,
      productName,
      brand,
      hierarchicalData: pack,
    };
    onNodeSelect(nodeData);
  };

  const handleFinishedGoodsClick = (
    fg: HierarchicalInventory['products'][0]['packaging'][0]['finished_goods'][0],
    packagingId: string,
    productId: string,
    productName: string,
    brand: string
  ) => {
    const nodeData: FlowNodeData = {
      type: 'finishedGoods',
      batchId: fg.batch_id,
      batchNumber: fg.batch_number,
      quantity: fg.quantity,
      packets: fg.packets,
      weight: fg.weight,
      packagingId,
      productId,
      productName,
      brand,
      hierarchicalData: fg,
    };
    onNodeSelect(nodeData);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading inventory...</p>
        </div>
      </div>
    );
  }

  if (!hierarchical || hierarchical.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <Package className="h-12 w-12 text-muted-foreground opacity-50 mx-auto" />
          <p className="text-muted-foreground">No inventory data available</p>
          <p className="text-xs text-muted-foreground">Inventory will appear here after batches are created and packaged.</p>
        </div>
      </div>
    );
  }

  if (filteredData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <Package className="h-12 w-12 text-muted-foreground opacity-50 mx-auto" />
          <p className="text-muted-foreground">No results found for your search</p>
          <p className="text-xs text-muted-foreground">Try a different search term</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="space-y-1">
        {filteredData.map((brandData) => {
          const brandKey = brandData.brand || 'unbranded';
          const brandNodeId = `brand-${brandKey}`;
          const isBrandExpanded = expandedBrands.has(brandKey);
          const isBrandSelected = selectedNodeId === brandNodeId;

          return (
            <div key={brandKey} className="select-none">
              {/* Brand Level */}
              <div
                ref={isBrandSelected ? selectedNodeRef : null}
                className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-300 ${
                  isBrandSelected
                    ? 'bg-gradient-to-r from-violet-500/20 to-purple-600/20 text-foreground shadow-lg ring-2 ring-violet-500/50 scale-[1.02]'
                    : 'hover:bg-gradient-to-r hover:from-violet-500/10 hover:to-purple-600/10 text-foreground hover:shadow-md'
                }`}
                onClick={() => handleBrandClick(brandData)}
                style={{
                  borderLeft: '4px solid',
                  borderColor: isBrandSelected ? 'rgb(139, 92, 246)' : 'rgba(139, 92, 246, 0.3)',
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBrand(brandKey);
                  }}
                  className={`p-1.5 rounded-lg transition-all duration-300 ${
                    isBrandExpanded 
                      ? 'bg-violet-500/20 rotate-0' 
                      : 'hover:bg-violet-500/10 rotate-0'
                  }`}
                >
                  {isBrandExpanded ? (
                    <ChevronDown className="h-4 w-4 text-violet-600" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-violet-600" />
                  )}
                </button>
                <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm">
                  <Store className="h-4 w-4" />
                </div>
                <span className="font-semibold flex-1 text-base">{brandKey}</span>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-700 text-xs font-medium border border-violet-500/20">
                    {brandData.products.length} {brandData.products.length === 1 ? 'Product' : 'Products'}
                  </span>
                </div>
              </div>

              {/* Products Level */}
              {isBrandExpanded && (
                <div className="ml-6 space-y-1 mt-1">
                  {brandData.products.map((product) => {
                    const productNodeId = `product-${product.product_id}`;
                    const isProductExpanded = expandedProducts.has(product.product_id);
                    const isProductSelected = selectedNodeId === productNodeId;

                    return (
                      <div key={product.product_id} className="select-none">
                        <div
                          ref={isProductSelected ? selectedNodeRef : null}
                          className={`group relative flex items-center gap-3 px-4 py-2.5 ml-8 rounded-lg cursor-pointer transition-all duration-300 ${
                            isProductSelected
                              ? 'bg-gradient-to-r from-indigo-500/20 to-blue-600/20 text-foreground shadow-md ring-2 ring-indigo-500/50 scale-[1.01]'
                              : 'hover:bg-gradient-to-r hover:from-indigo-500/10 hover:to-blue-600/10 text-foreground hover:shadow-sm'
                          }`}
                          onClick={() => handleProductClick(product, brandData.brand)}
                          style={{
                            borderLeft: '3px solid',
                            borderColor: isProductSelected ? 'rgb(99, 102, 241)' : 'rgba(99, 102, 241, 0.25)',
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleProduct(product.product_id);
                            }}
                            className={`p-1 rounded-md transition-all duration-300 ${
                              isProductExpanded 
                                ? 'bg-indigo-500/20' 
                                : 'hover:bg-indigo-500/10'
                            }`}
                          >
                            {isProductExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 text-indigo-600" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-indigo-600" />
                            )}
                          </button>
                          <div className="p-1.5 rounded-md bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-sm">
                            <Package className="h-3.5 w-3.5" />
                          </div>
                          <span className="font-medium flex-1 text-sm">{product.product_name}</span>
                          {product.rice_type && (
                            <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 border border-amber-500/20 font-medium">
                              {product.rice_type.replace(/_/g, ' ')}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 text-xs font-medium border border-indigo-500/20">
                            {product.packaging.length} {product.packaging.length === 1 ? 'Packaging' : 'Packaging'}
                          </span>
                        </div>

                        {/* Packaging Level */}
                        {isProductExpanded && (
                          <div className="ml-6 space-y-1 mt-1">
                            {product.packaging.map((pack) => {
                              const packagingNodeId = `packaging-${pack.packaging_id}`;
                              const isPackagingExpanded = expandedPackaging.has(pack.packaging_id);
                              const isPackagingSelected = selectedNodeId === packagingNodeId;

                              return (
                                <div key={pack.packaging_id} className="select-none">
                                  <div
                                    ref={isPackagingSelected ? selectedNodeRef : null}
                                    className={`group relative flex items-center gap-3 px-3 py-2 ml-12 rounded-lg cursor-pointer transition-all duration-300 ${
                                      isPackagingSelected
                                        ? 'bg-gradient-to-r from-blue-500/20 to-cyan-600/20 text-foreground shadow-md ring-2 ring-blue-500/50 scale-[1.01]'
                                        : 'hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-cyan-600/10 text-foreground hover:shadow-sm'
                                    }`}
                                    onClick={() =>
                                      handlePackagingClick(pack, product.product_id, product.product_name, brandData.brand)
                                    }
                                    style={{
                                      borderLeft: '3px solid',
                                      borderColor: isPackagingSelected ? 'rgb(59, 130, 246)' : 'rgba(59, 130, 246, 0.25)',
                                    }}
                                  >
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        togglePackaging(pack.packaging_id);
                                      }}
                                      className={`p-1 rounded-md transition-all duration-300 ${
                                        isPackagingExpanded 
                                          ? 'bg-blue-500/20' 
                                          : 'hover:bg-blue-500/10'
                                      }`}
                                    >
                                      {isPackagingExpanded ? (
                                        <ChevronDown className="h-3 w-3 text-blue-600" />
                                      ) : (
                                        <ChevronRight className="h-3 w-3 text-blue-600" />
                                      )}
                                    </button>
                                    <div className="p-1.5 rounded-md bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-sm">
                                      <Box className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="flex items-center gap-2 flex-1">
                                      <span className="font-medium text-sm">
                                        {pack.holding_capacity}kg {formatPacketTypeLabel(pack.packet_type)}
                                      </span>
                                      {pack.packaging_number && (
                                        <span className="text-xs font-mono font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                          {pack.packaging_number}
                                        </span>
                                      )}
                                    </div>
                                    {pack.vendor && (
                                      <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-700 border border-slate-500/20">
                                        <Building2 className="h-3 w-3" />
                                        <span className="font-medium">{pack.vendor.name}</span>
                                      </div>
                                    )}
                                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 text-xs font-medium border border-blue-500/20">
                                      {pack.finished_goods.length} {pack.finished_goods.length === 1 ? 'Batch' : 'Batches'}
                                    </span>
                                  </div>

                                  {/* Finished Goods Level */}
                                  {isPackagingExpanded && (
                                    <div className="ml-6 space-y-1 mt-1">
                                      {pack.finished_goods.map((fg) => {
                                        const finishedGoodsNodeId = `finishedGoods-${fg.batch_id}`;
                                        const isFinishedGoodsSelected = selectedNodeId === finishedGoodsNodeId;

                                        return (
                                          <div
                                            key={fg.batch_id}
                                            ref={isFinishedGoodsSelected ? selectedNodeRef : null}
                                            className={`group relative flex items-center gap-2 px-3 py-2 ml-16 rounded-md cursor-pointer transition-all duration-300 ${
                                              isFinishedGoodsSelected
                                                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-600/20 text-foreground shadow-sm ring-2 ring-emerald-500/50'
                                                : 'hover:bg-gradient-to-r hover:from-emerald-500/10 hover:to-teal-600/10 text-foreground hover:shadow-sm'
                                            }`}
                                            onClick={() =>
                                              handleFinishedGoodsClick(
                                                fg,
                                                pack.packaging_id,
                                                product.product_id,
                                                product.product_name,
                                                brandData.brand
                                              )
                                            }
                                            style={{
                                              borderLeft: '2px solid',
                                              borderColor: isFinishedGoodsSelected ? 'rgb(16, 185, 129)' : 'rgba(16, 185, 129, 0.2)',
                                            }}
                                          >
                                            <div className="p-1 rounded bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                                              <PackageCheck className="h-3 w-3" />
                                            </div>
                                            <Hash className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                                            <span className="font-medium flex-1 text-sm">{fg.batch_number}</span>
                                            <div className="flex items-center gap-2">
                                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 text-xs font-medium border border-emerald-500/20">
                                                {fg.packets} {fg.packets === 1 ? 'Packet' : 'Packets'}
                                              </span>
                                              <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-700 text-xs font-medium border border-teal-500/20">
                                                {fg.weight.toFixed(2)} kg
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


import { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Store, Package, Box, PackageCheck, Hash, Building2 } from 'lucide-react';
import type { HierarchicalInventory } from '../../../types/entities';
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
                className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                  isBrandSelected
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'hover:bg-muted/50 text-foreground'
                }`}
                onClick={() => handleBrandClick(brandData)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBrand(brandKey);
                  }}
                  className="p-0.5 hover:bg-background/20 rounded transition-colors"
                >
                  {isBrandExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                <Store className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium flex-1">{brandKey}</span>
                <span className="text-xs opacity-70">
                  {brandData.products.length} {brandData.products.length === 1 ? 'product' : 'products'}
                </span>
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
                          className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                            isProductSelected
                              ? 'bg-primary/80 text-primary-foreground shadow-sm'
                              : 'hover:bg-muted/30 text-foreground'
                          }`}
                          onClick={() => handleProductClick(product, brandData.brand)}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleProduct(product.product_id);
                            }}
                            className="p-0.5 hover:bg-background/20 rounded transition-colors"
                          >
                            {isProductExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                          <Package className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium flex-1">{product.product_name}</span>
                          {product.rice_type && (
                            <span className="text-xs opacity-70 px-2 py-0.5 rounded bg-background/50">
                              {product.rice_type.replace(/_/g, ' ')}
                            </span>
                          )}
                          <span className="text-xs opacity-70">
                            {product.packaging.length} {product.packaging.length === 1 ? 'packaging' : 'packaging'}
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
                                    className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                                      isPackagingSelected
                                        ? 'bg-primary/60 text-primary-foreground shadow-sm'
                                        : 'hover:bg-muted/20 text-foreground'
                                    }`}
                                    onClick={() =>
                                      handlePackagingClick(pack, product.product_id, product.product_name, brandData.brand)
                                    }
                                  >
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        togglePackaging(pack.packaging_id);
                                      }}
                                      className="p-0.5 hover:bg-background/20 rounded transition-colors"
                                    >
                                      {isPackagingExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </button>
                                    <Box className="h-4 w-4 flex-shrink-0" />
                                    <span className="font-medium flex-1">
                                      {pack.holding_capacity} {pack.packet_type}
                                    </span>
                                    {pack.vendor && (
                                      <div className="flex items-center gap-1 text-xs opacity-70">
                                        <Building2 className="h-3 w-3" />
                                        <span>{pack.vendor.name}</span>
                                      </div>
                                    )}
                                    <span className="text-xs opacity-70">
                                      {pack.finished_goods.length} {pack.finished_goods.length === 1 ? 'batch' : 'batches'}
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
                                            className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                                              isFinishedGoodsSelected
                                                ? 'bg-primary/40 text-primary-foreground shadow-sm'
                                                : 'hover:bg-muted/10 text-foreground'
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
                                          >
                                            <PackageCheck className="h-3.5 w-3.5 flex-shrink-0 ml-1" />
                                            <Hash className="h-3 w-3 flex-shrink-0" />
                                            <span className="font-medium flex-1 text-sm">{fg.batch_number}</span>
                                            <span className="text-xs opacity-70">
                                              {fg.packets} {fg.packets === 1 ? 'packet' : 'packets'}
                                            </span>
                                            <span className="text-xs opacity-70">{fg.weight.toFixed(2)} kg</span>
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


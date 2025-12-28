import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, Package, Box, Store, Search, TrendingUp } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { useInventory } from '../../../hooks/useInventory';
import type { HierarchicalInventory } from '../../../types/entities';

export function HierarchicalInventoryView() {
  const { hierarchical, fetchHierarchicalInventory, loading } = useInventory();
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [expandedPackaging, setExpandedPackaging] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchHierarchicalInventory();
  }, [fetchHierarchicalInventory]);

  const toggleBrand = (brand: string) => {
    setExpandedBrands(prev => {
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
    setExpandedProducts(prev => {
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
    setExpandedPackaging(prev => {
      const next = new Set(prev);
      if (next.has(packagingId)) {
        next.delete(packagingId);
      } else {
        next.add(packagingId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allBrands = new Set(hierarchical.map(b => b.brand));
    const allProducts = new Set(hierarchical.flatMap(b => b.products.map(p => p.product_id)));
    const allPackaging = new Set(hierarchical.flatMap(b => 
      b.products.flatMap(p => p.packaging.map(pkg => pkg.packaging_id))
    ));
    setExpandedBrands(allBrands);
    setExpandedProducts(allProducts);
    setExpandedPackaging(allPackaging);
  };

  const collapseAll = () => {
    setExpandedBrands(new Set());
    setExpandedProducts(new Set());
    setExpandedPackaging(new Set());
  };

  const filteredData = useMemo(() => {
    if (!searchQuery) return hierarchical;
    
    const q = searchQuery.toLowerCase();
    return hierarchical.map(brand => ({
      ...brand,
      products: brand.products.filter(product => {
        const matchesProduct = product.product_name.toLowerCase().includes(q) ||
          (product.rice_type || '').toLowerCase().includes(q);
        
        const matchingPackaging = product.packaging.filter(pkg => {
          const matchesPackaging = pkg.packet_type.toLowerCase().includes(q) ||
            pkg.vendor?.name.toLowerCase().includes(q) ||
            pkg.finished_goods.some(fg => fg.batch_number.toLowerCase().includes(q));
          return matchesPackaging;
        });
        
        return matchesProduct || matchingPackaging.length > 0;
      }).map(product => ({
        ...product,
        packaging: product.packaging.filter(pkg => {
          const matchesPackaging = pkg.packet_type.toLowerCase().includes(q) ||
            pkg.vendor?.name.toLowerCase().includes(q) ||
            pkg.finished_goods.some(fg => fg.batch_number.toLowerCase().includes(q));
          return matchesPackaging;
        }),
      })),
    })).filter(brand => brand.products.length > 0);
  }, [hierarchical, searchQuery]);

  const formatNumber = (num: number, decimals = 0): string => {
    return num.toLocaleString('en-IN', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (hierarchical.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Package}
          title="No inventory found"
          description="Inventory will appear here after batches are created and packaged."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by brand, product, packaging, vendor, or batch..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Hierarchical Tree */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="divide-y divide-border/60">
          {filteredData.map((brandData) => {
            const isBrandExpanded = expandedBrands.has(brandData.brand);
            const brandTotal = brandData.products.reduce((sum, p) => 
              sum + p.packaging.reduce((s, pkg) => 
                s + pkg.finished_goods.reduce((ss, fg) => ss + fg.weight, 0), 0
              ), 0
            );
            const brandPackets = brandData.products.reduce((sum, p) => 
              sum + p.packaging.reduce((s, pkg) => 
                s + pkg.finished_goods.reduce((ss, fg) => ss + fg.packets, 0), 0
              ), 0
            );

            return (
              <div key={brandData.brand} className="bg-card">
                {/* Brand Level */}
                <button
                  onClick={() => toggleBrand(brandData.brand)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isBrandExpanded ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Store className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-lg">{brandData.brand || 'No Brand'}</div>
                      <div className="text-xs text-muted-foreground">
                        {brandData.products.length} product{brandData.products.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <div className="font-semibold">{formatNumber(brandPackets)}</div>
                      <div className="text-xs text-muted-foreground">packets</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatNumber(brandTotal, 2)}</div>
                      <div className="text-xs text-muted-foreground">kg</div>
                    </div>
                  </div>
                </button>

                {/* Products Level */}
                {isBrandExpanded && (
                  <div className="bg-muted/20">
                    {brandData.products.map((product) => {
                      const isProductExpanded = expandedProducts.has(product.product_id);
                      const productTotal = product.packaging.reduce((sum, pkg) => 
                        sum + pkg.finished_goods.reduce((s, fg) => s + fg.weight, 0), 0
                      );
                      const productPackets = product.packaging.reduce((sum, pkg) => 
                        sum + pkg.finished_goods.reduce((s, fg) => s + fg.packets, 0), 0
                      );

                      return (
                        <div key={product.product_id} className="border-t border-border/40">
                          <button
                            onClick={() => toggleProduct(product.product_id)}
                            className="w-full flex items-center justify-between p-4 pl-12 hover:bg-muted/40 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {isProductExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <div className="p-1.5 rounded-lg bg-violet-500/10">
                                <Package className="h-4 w-4 text-violet-600" />
                              </div>
                              <div className="text-left">
                                <div className="font-medium">{product.product_name}</div>
                                {product.rice_type && (
                                  <div className="text-xs text-muted-foreground">
                                    {product.rice_type.replace(/_/g, ' ')}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="text-right">
                                <div className="font-semibold">{formatNumber(productPackets)}</div>
                                <div className="text-xs text-muted-foreground">packets</div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">{formatNumber(productTotal, 2)}</div>
                                <div className="text-xs text-muted-foreground">kg</div>
                              </div>
                            </div>
                          </button>

                          {/* Packaging Level */}
                          {isProductExpanded && (
                            <div className="bg-muted/30">
                              {product.packaging.map((pkg) => {
                                const isPackagingExpanded = expandedPackaging.has(pkg.packaging_id);
                                const packagingTotal = pkg.finished_goods.reduce((sum, fg) => sum + fg.weight, 0);
                                const packagingPackets = pkg.finished_goods.reduce((sum, fg) => sum + fg.packets, 0);

                                return (
                                  <div key={pkg.packaging_id} className="border-t border-border/30">
                                    <button
                                      onClick={() => togglePackaging(pkg.packaging_id)}
                                      className="w-full flex items-center justify-between p-4 pl-20 hover:bg-muted/50 transition-colors"
                                    >
                                      <div className="flex items-center gap-3">
                                        {isPackagingExpanded ? (
                                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        )}
                                        <div className="p-1.5 rounded-lg bg-sky-500/10">
                                          <Box className="h-4 w-4 text-sky-600" />
                                        </div>
                                        <div className="text-left">
                                          <div className="flex items-center gap-2">
                                            <div className="font-medium text-sm">
                                              {pkg.holding_capacity}kg {pkg.packet_type}
                                            </div>
                                            {pkg.packaging_number && (
                                              <span className="text-xs font-mono font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                                {pkg.packaging_number}
                                              </span>
                                            )}
                                          </div>
                                          {pkg.vendor && (
                                            <div className="text-xs text-muted-foreground">
                                              Vendor: {pkg.vendor.name}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-4 text-sm">
                                        <div className="text-right">
                                          <div className="font-semibold">{formatNumber(packagingPackets)}</div>
                                          <div className="text-xs text-muted-foreground">packets</div>
                                        </div>
                                        <div className="text-right">
                                          <div className="font-semibold">{formatNumber(packagingTotal, 2)}</div>
                                          <div className="text-xs text-muted-foreground">kg</div>
                                        </div>
                                      </div>
                                    </button>

                                    {/* Finished Goods Level */}
                                    {isPackagingExpanded && pkg.finished_goods.length > 0 && (
                                      <div className="bg-muted/40">
                                        <div className="px-4 py-2 border-b border-border/30">
                                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Finished Goods
                                          </div>
                                        </div>
                                        {pkg.finished_goods.map((fg) => (
                                          <div
                                            key={`${fg.batch_id}-${pkg.packaging_id}`}
                                            className="flex items-center justify-between p-3 pl-28 border-b border-border/20 hover:bg-muted/60 transition-colors"
                                          >
                                            <div className="flex items-center gap-2">
                                              <div className="p-1 rounded bg-emerald-500/10">
                                                <TrendingUp className="h-3 w-3 text-emerald-600" />
                                              </div>
                                              <div>
                                                <div className="text-sm font-medium">{fg.batch_number}</div>
                                                <div className="text-xs text-muted-foreground">
                                                  {fg.packets} packet{fg.packets !== 1 ? 's' : ''}
                                                </div>
                                              </div>
                                            </div>
                                            <div className="text-sm font-mono text-muted-foreground">
                                              {formatNumber(fg.weight, 2)} kg
                                            </div>
                                          </div>
                                        ))}
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
    </div>
  );
}


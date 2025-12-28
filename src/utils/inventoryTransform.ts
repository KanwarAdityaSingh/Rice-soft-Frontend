import type { HierarchicalInventory } from '../types/entities';

/**
 * Generic multi-level grouping utility
 */
export function groupBy<T>(
  array: T[],
  keys: Array<keyof T | ((item: T) => string | number | null)>
): Record<string, T[]> {
  if (keys.length === 0) return {};
  
  const [firstKey, ...restKeys] = keys;
  const getKey = typeof firstKey === 'function' 
    ? firstKey 
    : (item: T) => String(item[firstKey] ?? 'null');
  
  const grouped = array.reduce((acc, item) => {
    const key = getKey(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, T[]>);
  
  if (restKeys.length > 0) {
    return Object.entries(grouped).reduce((acc, [key, items]) => {
      acc[key] = groupBy(items, restKeys);
      return acc;
    }, {} as Record<string, any>);
  }
  
  return grouped;
}

/**
 * Transform hierarchical data by capacity (Brand → Product → Capacity → Packaging → Finished Goods)
 */
export function transformByCapacity(
  data: HierarchicalInventory[]
): Array<{
  brand: string;
  products: Array<{
    product_id: string;
    product_name: string;
    rice_type: string | null;
    packaging_by_capacity: Record<string, HierarchicalInventory['products'][0]['packaging']>;
  }>;
}> {
  return data.map(brandGroup => ({
    brand: brandGroup.brand,
    products: brandGroup.products.map(product => {
      const capacityMap: Record<string, typeof product.packaging> = {};
      
      product.packaging.forEach(pkg => {
        const capacity = String(pkg.holding_capacity);
        if (!capacityMap[capacity]) {
          capacityMap[capacity] = [];
        }
        capacityMap[capacity].push(pkg);
      });
      
      return {
        product_id: product.product_id,
        product_name: product.product_name,
        rice_type: product.rice_type,
        packaging_by_capacity: capacityMap,
      };
    }),
  }));
}

/**
 * Transform hierarchical data by vendor (Brand → Product → Vendor → Packaging → Finished Goods)
 */
export function transformByVendor(
  data: HierarchicalInventory[]
): Array<{
  brand: string;
  products: Array<{
    product_id: string;
    product_name: string;
    rice_type: string | null;
    packaging_by_vendor: Array<{
      vendor: { id: string; name: string } | null;
      packaging: HierarchicalInventory['products'][0]['packaging'];
    }>;
  }>;
}> {
  return data.map(brandGroup => ({
    brand: brandGroup.brand,
    products: brandGroup.products.map(product => {
      const vendorMap = new Map<string, {
        vendor: { id: string; name: string } | null;
        packaging: typeof product.packaging;
      }>();
      
      product.packaging.forEach(pkg => {
        const vendorKey = pkg.vendor?.id || 'unassigned';
        if (!vendorMap.has(vendorKey)) {
          vendorMap.set(vendorKey, {
            vendor: pkg.vendor,
            packaging: [],
          });
        }
        vendorMap.get(vendorKey)!.packaging.push(pkg);
      });
      
      return {
        product_id: product.product_id,
        product_name: product.product_name,
        rice_type: product.rice_type,
        packaging_by_vendor: Array.from(vendorMap.values()),
      };
    }),
  }));
}

/**
 * Transform hierarchical data by rice type (Brand → Rice Type → Product → Packaging → Finished Goods)
 */
export function transformByRiceType(
  data: HierarchicalInventory[]
): Array<{
  brand: string;
  rice_types: Array<{
    rice_type: string;
    products: HierarchicalInventory['products'];
  }>;
}> {
  return data.map(brandGroup => {
    const riceTypeMap = new Map<string, typeof brandGroup.products>();
    
    brandGroup.products.forEach(product => {
      const riceTypeKey = product.rice_type || 'unclassified';
      if (!riceTypeMap.has(riceTypeKey)) {
        riceTypeMap.set(riceTypeKey, []);
      }
      riceTypeMap.get(riceTypeKey)!.push(product);
    });
    
    return {
      brand: brandGroup.brand,
      rice_types: Array.from(riceTypeMap.entries()).map(([riceType, products]) => ({
        rice_type: riceType,
        products,
      })),
    };
  });
}

/**
 * Transform hierarchical data by vendor at top level (Vendor → Brand → Product → Packaging → Finished Goods)
 */
export function transformByVendorTopLevel(
  data: HierarchicalInventory[]
): Array<{
  vendor: { id: string; name: string } | null;
  brands: Array<{
    brand: string;
    products: Array<{
      product_id: string;
      product_name: string;
      rice_type: string | null;
      packaging: HierarchicalInventory['products'][0]['packaging'];
    }>;
  }>;
}> {
  const vendorMap = new Map<string, {
    vendor: { id: string; name: string } | null;
    brands: Map<string, {
      brand: string;
      products: Array<{
        product_id: string;
        product_name: string;
        rice_type: string | null;
        packaging: HierarchicalInventory['products'][0]['packaging'];
      }>;
    }>;
  }>();
  
  data.forEach(brandGroup => {
    brandGroup.products.forEach(product => {
      product.packaging.forEach(pkg => {
        const vendorKey = pkg.vendor?.id || 'unassigned';
        const vendorName = pkg.vendor?.name || 'Unassigned';
        
        if (!vendorMap.has(vendorKey)) {
          vendorMap.set(vendorKey, {
            vendor: pkg.vendor || { id: 'unassigned', name: 'Unassigned' },
            brands: new Map(),
          });
        }
        
        const vendorData = vendorMap.get(vendorKey)!;
        const brandKey = brandGroup.brand;
        
        if (!vendorData.brands.has(brandKey)) {
          vendorData.brands.set(brandKey, {
            brand: brandKey,
            products: [],
          });
        }
        
        let productEntry = vendorData.brands.get(brandKey)!.products.find(
          p => p.product_id === product.product_id
        );
        
        if (!productEntry) {
          productEntry = {
            product_id: product.product_id,
            product_name: product.product_name,
            rice_type: product.rice_type,
            packaging: [],
          };
          vendorData.brands.get(brandKey)!.products.push(productEntry);
        }
        
        productEntry.packaging.push(pkg);
      });
    });
  });
  
  return Array.from(vendorMap.values()).map(vendorData => ({
    vendor: vendorData.vendor,
    brands: Array.from(vendorData.brands.values()),
  }));
}

/**
 * Transform hierarchical data by capacity at top level (Capacity → Brand → Product → Packaging → Finished Goods)
 */
export function transformByCapacityTopLevel(
  data: HierarchicalInventory[]
): Array<{
  capacity: number;
  brands: Array<{
    brand: string;
    products: Array<{
      product_id: string;
      product_name: string;
      rice_type: string | null;
      packaging: HierarchicalInventory['products'][0]['packaging'];
    }>;
  }>;
}> {
  const capacityMap = new Map<number, {
    capacity: number;
    brands: Map<string, {
      brand: string;
      products: Array<{
        product_id: string;
        product_name: string;
        rice_type: string | null;
        packaging: HierarchicalInventory['products'][0]['packaging'];
      }>;
    }>;
  }>();
  
  data.forEach(brandGroup => {
    brandGroup.products.forEach(product => {
      product.packaging.forEach(pkg => {
        const capacity = pkg.holding_capacity;
        
        if (!capacityMap.has(capacity)) {
          capacityMap.set(capacity, {
            capacity,
            brands: new Map(),
          });
        }
        
        const capacityData = capacityMap.get(capacity)!;
        const brandKey = brandGroup.brand;
        
        if (!capacityData.brands.has(brandKey)) {
          capacityData.brands.set(brandKey, {
            brand: brandKey,
            products: [],
          });
        }
        
        let productEntry = capacityData.brands.get(brandKey)!.products.find(
          p => p.product_id === product.product_id
        );
        
        if (!productEntry) {
          productEntry = {
            product_id: product.product_id,
            product_name: product.product_name,
            rice_type: product.rice_type,
            packaging: [],
          };
          capacityData.brands.get(brandKey)!.products.push(productEntry);
        }
        
        productEntry.packaging.push(pkg);
      });
    });
  });
  
  return Array.from(capacityMap.values()).map(capacityData => ({
    capacity: capacityData.capacity,
    brands: Array.from(capacityData.brands.values()),
  }));
}

/**
 * Transform hierarchical data by packet type at top level (Packet Type → Brand → Product → Packaging → Finished Goods)
 */
export function transformByPacketTypeTopLevel(
  data: HierarchicalInventory[]
): Array<{
  packet_type: string;
  brands: Array<{
    brand: string;
    products: Array<{
      product_id: string;
      product_name: string;
      rice_type: string | null;
      packaging: HierarchicalInventory['products'][0]['packaging'];
    }>;
  }>;
}> {
  const typeMap = new Map<string, {
    packet_type: string;
    brands: Map<string, {
      brand: string;
      products: Array<{
        product_id: string;
        product_name: string;
        rice_type: string | null;
        packaging: HierarchicalInventory['products'][0]['packaging'];
      }>;
    }>;
  }>();
  
  data.forEach(brandGroup => {
    brandGroup.products.forEach(product => {
      product.packaging.forEach(pkg => {
        const packetType = pkg.packet_type;
        
        if (!typeMap.has(packetType)) {
          typeMap.set(packetType, {
            packet_type: packetType,
            brands: new Map(),
          });
        }
        
        const typeData = typeMap.get(packetType)!;
        const brandKey = brandGroup.brand;
        
        if (!typeData.brands.has(brandKey)) {
          typeData.brands.set(brandKey, {
            brand: brandKey,
            products: [],
          });
        }
        
        let productEntry = typeData.brands.get(brandKey)!.products.find(
          p => p.product_id === product.product_id
        );
        
        if (!productEntry) {
          productEntry = {
            product_id: product.product_id,
            product_name: product.product_name,
            rice_type: product.rice_type,
            packaging: [],
          };
          typeData.brands.get(brandKey)!.products.push(productEntry);
        }
        
        productEntry.packaging.push(pkg);
      });
    });
  });
  
  return Array.from(typeMap.values()).map(typeData => ({
    packet_type: typeData.packet_type,
    brands: Array.from(typeData.brands.values()),
  }));
}

/**
 * Extended inventory filters interface
 */
export interface ExtendedInventoryFilters {
  // Brand filters
  brands?: string[];
  
  // Product filters
  product_ids?: string[];
  rice_types?: string[];
  
  // Packaging filters
  holding_capacities?: number[];
  packet_types?: string[];
  vendor_ids?: string[];
  ordered_weight_range?: { min?: number; max?: number };
  
  // Finished goods filters
  batch_ids?: string[];
  min_quantity?: number;
  max_quantity?: number;
  
  // Bags filters
  bag_types?: ('jute' | 'pp')[];
  bag_capacities?: number[];
  
  // Search
  search_text?: string;
}

/**
 * Apply filters to hierarchical inventory data
 */
export function applyInventoryFilters(
  data: HierarchicalInventory[],
  filters: ExtendedInventoryFilters
): HierarchicalInventory[] {
  return data
    .filter(brandGroup => 
      !filters.brands || filters.brands.length === 0 || filters.brands.includes(brandGroup.brand)
    )
    .map(brandGroup => ({
      ...brandGroup,
      products: brandGroup.products
        .filter(product => {
          if (filters.product_ids && filters.product_ids.length > 0 && !filters.product_ids.includes(product.product_id)) return false;
          if (filters.rice_types && filters.rice_types.length > 0 && (!product.rice_type || !filters.rice_types.includes(product.rice_type))) return false;
          if (filters.search_text) {
            const searchLower = filters.search_text.toLowerCase();
            if (!product.product_name.toLowerCase().includes(searchLower)) return false;
          }
          return true;
        })
        .map(product => ({
          ...product,
          packaging: product.packaging
            .filter(pkg => {
              if (filters.holding_capacities && filters.holding_capacities.length > 0 && !filters.holding_capacities.includes(pkg.holding_capacity)) return false;
              if (filters.packet_types && filters.packet_types.length > 0 && !filters.packet_types.includes(pkg.packet_type)) return false;
              if (filters.vendor_ids && filters.vendor_ids.length > 0) {
                if (!pkg.vendor || !filters.vendor_ids.includes(pkg.vendor.id)) return false;
              }
              return true;
            })
            .map(pkg => ({
              ...pkg,
              finished_goods: pkg.finished_goods.filter(fg => {
                if (filters.batch_ids && filters.batch_ids.length > 0 && !filters.batch_ids.includes(fg.batch_id)) return false;
                if (filters.min_quantity && fg.quantity < filters.min_quantity) return false;
                if (filters.max_quantity && fg.quantity > filters.max_quantity) return false;
                if (filters.search_text) {
                  const searchLower = filters.search_text.toLowerCase();
                  if (!fg.batch_number.toLowerCase().includes(searchLower)) return false;
                }
                return true;
              })
            }))
        }))
    }))
    .filter(brandGroup => brandGroup.products.length > 0)
    .map(brandGroup => ({
      ...brandGroup,
      products: brandGroup.products.filter(product => product.packaging.length > 0)
    }))
    .filter(brandGroup => brandGroup.products.length > 0);
}

/**
 * Search inventory across all levels
 */
export function searchInventory(
  data: HierarchicalInventory[],
  searchQuery: string
): {
  brands: string[];
  products: Array<{ product_id: string; product_name: string }>;
  packaging: Array<{ packaging_id: string; label: string }>;
  finished_goods: Array<{ batch_id: string; batch_number: string }>;
} {
  const query = searchQuery.toLowerCase();
  const results = {
    brands: [] as string[],
    products: [] as Array<{ product_id: string; product_name: string }>,
    packaging: [] as Array<{ packaging_id: string; label: string }>,
    finished_goods: [] as Array<{ batch_id: string; batch_number: string }>,
  };
  
  data.forEach(brandGroup => {
    if (brandGroup.brand.toLowerCase().includes(query)) {
      results.brands.push(brandGroup.brand);
    }
    
    brandGroup.products.forEach(product => {
      if (product.product_name.toLowerCase().includes(query)) {
        results.products.push({
          product_id: product.product_id,
          product_name: product.product_name,
        });
      }
      
      product.packaging.forEach(pkg => {
        const pkgLabel = `${pkg.holding_capacity}kg ${pkg.packet_type}`;
        if (pkgLabel.toLowerCase().includes(query) || 
            pkg.vendor?.name.toLowerCase().includes(query)) {
          results.packaging.push({
            packaging_id: pkg.packaging_id,
            label: pkgLabel,
          });
        }
        
        pkg.finished_goods.forEach(fg => {
          if (fg.batch_number.toLowerCase().includes(query)) {
            results.finished_goods.push({
              batch_id: fg.batch_id,
              batch_number: fg.batch_number,
            });
          }
        });
      });
    });
  });
  
  return results;
}

/**
 * Calculate totals for a group of finished goods
 */
export function calculateFinishedGoodsTotals(
  finishedGoods: HierarchicalInventory['products'][0]['packaging'][0]['finished_goods']
): {
  total_packets: number;
  total_weight: number;
  total_batches: number;
} {
  return {
    total_packets: finishedGoods.reduce((sum, item) => sum + (item.packets || 0), 0),
    total_weight: finishedGoods.reduce((sum, item) => sum + (item.weight || item.quantity || 0), 0),
    total_batches: new Set(finishedGoods.map(item => item.batch_id)).size,
  };
}

/**
 * Get unique values from hierarchical data for filter options
 */
export function getUniqueFilterValues(data: HierarchicalInventory[]): {
  brands: string[];
  rice_types: string[];
  capacities: number[];
  packet_types: string[];
  vendors: Array<{ id: string; name: string }>;
} {
  const brands = new Set<string>();
  const riceTypes = new Set<string>();
  const capacities = new Set<number>();
  const packetTypes = new Set<string>();
  const vendors = new Map<string, { id: string; name: string }>();
  
  data.forEach(brandGroup => {
    brands.add(brandGroup.brand);
    
    brandGroup.products.forEach(product => {
      if (product.rice_type) {
        riceTypes.add(product.rice_type);
      }
      
      product.packaging.forEach(pkg => {
        capacities.add(pkg.holding_capacity);
        packetTypes.add(pkg.packet_type);
        
        if (pkg.vendor) {
          vendors.set(pkg.vendor.id, pkg.vendor);
        }
      });
    });
  });
  
  return {
    brands: Array.from(brands).sort(),
    rice_types: Array.from(riceTypes).sort(),
    capacities: Array.from(capacities).sort((a, b) => a - b),
    packet_types: Array.from(packetTypes).sort(),
    vendors: Array.from(vendors.values()).sort((a, b) => a.name.localeCompare(b.name)),
  };
}


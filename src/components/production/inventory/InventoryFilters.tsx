import { useState, useMemo } from 'react';
import { X, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import type { ExtendedInventoryFilters } from '../../../utils/inventoryTransform';
import { getUniqueFilterValues } from '../../../utils/inventoryTransform';
import type { HierarchicalInventory } from '../../../types/entities';

interface InventoryFiltersProps {
  hierarchical: HierarchicalInventory[];
  filters: ExtendedInventoryFilters;
  onFiltersChange: (filters: ExtendedInventoryFilters) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function InventoryFilters({
  hierarchical,
  filters,
  onFiltersChange,
  isOpen,
  onToggle,
}: InventoryFiltersProps) {
  const uniqueValues = useMemo(() => getUniqueFilterValues(hierarchical), [hierarchical]);

  const updateFilter = <K extends keyof ExtendedInventoryFilters>(
    key: K,
    value: ExtendedInventoryFilters[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const toggleArrayFilter = <K extends keyof ExtendedInventoryFilters>(
    key: K,
    value: string | number
  ) => {
    const current = (filters[key] as any[]) || [];
    const newValue = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateFilter(key, newValue as any);
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.brands?.length ||
      filters.product_ids?.length ||
      filters.rice_types?.length ||
      filters.holding_capacities?.length ||
      filters.packet_types?.length ||
      filters.vendor_ids?.length ||
      filters.ordered_weight_range?.min ||
      filters.ordered_weight_range?.max ||
      filters.batch_ids?.length ||
      filters.min_quantity ||
      filters.max_quantity ||
      filters.bag_types?.length ||
      filters.bag_capacities?.length ||
      filters.search_text
    );
  }, [filters]);

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={`fixed right-4 top-24 z-40 p-3 rounded-lg shadow-lg transition-all ${
          isOpen
            ? 'bg-primary text-primary-foreground'
            : 'bg-card border border-border hover:bg-muted'
        }`}
        title={isOpen ? 'Hide Filters' : 'Show Filters'}
      >
        <Filter className="h-5 w-5" />
        {hasActiveFilters && !isOpen && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-xs text-white">
            !
          </span>
        )}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-80 bg-card border-l border-border shadow-2xl z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Filters</h3>
              {hasActiveFilters && (
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                  Active
                </span>
              )}
            </div>
            <button
              onClick={onToggle}
              className="p-1 rounded-md hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Filter Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <input
                type="text"
                value={filters.search_text || ''}
                onChange={(e) => updateFilter('search_text', e.target.value || undefined)}
                placeholder="Search products, batches, vendors..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Date Range</label>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">From Date</label>
                  <input
                    type="date"
                    value={filters.date_range?.from || ''}
                    onChange={(e) => {
                      const from = e.target.value || undefined;
                      updateFilter('date_range', {
                        ...filters.date_range,
                        from,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">To Date</label>
                  <input
                    type="date"
                    value={filters.date_range?.to || ''}
                    onChange={(e) => {
                      const to = e.target.value || undefined;
                      updateFilter('date_range', {
                        ...filters.date_range,
                        to,
                      });
                    }}
                    min={filters.date_range?.from}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                {(filters.date_range?.from || filters.date_range?.to) && (
                  <button
                    onClick={() => updateFilter('date_range', undefined)}
                    className="w-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    Clear Date Range
                  </button>
                )}
              </div>
            </div>

            {/* Brands */}
            <div>
              <label className="block text-sm font-medium mb-2">Brands</label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {uniqueValues.brands.map((brand) => (
                  <label
                    key={brand}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-md"
                  >
                    <input
                      type="checkbox"
                      checked={filters.brands?.includes(brand) || false}
                      onChange={() => toggleArrayFilter('brands', brand)}
                      className="rounded border-border"
                    />
                    <span className="text-sm">{brand || 'Unbranded'}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Rice Types */}
            <div>
              <label className="block text-sm font-medium mb-2">Rice Types</label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {uniqueValues.rice_types.map((riceType) => (
                  <label
                    key={riceType}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-md"
                  >
                    <input
                      type="checkbox"
                      checked={filters.rice_types?.includes(riceType) || false}
                      onChange={() => toggleArrayFilter('rice_types', riceType)}
                      className="rounded border-border"
                    />
                    <span className="text-sm">
                      {riceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Capacities */}
            <div>
              <label className="block text-sm font-medium mb-2">Holding Capacities</label>
              <div className="space-y-2">
                {uniqueValues.capacities.map((capacity) => (
                  <label
                    key={capacity}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-md"
                  >
                    <input
                      type="checkbox"
                      checked={filters.holding_capacities?.includes(capacity) || false}
                      onChange={() => toggleArrayFilter('holding_capacities', capacity)}
                      className="rounded border-border"
                    />
                    <span className="text-sm">{capacity} kg</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Packet Types */}
            <div>
              <label className="block text-sm font-medium mb-2">Packet Types</label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {uniqueValues.packet_types.map((packetType) => (
                  <label
                    key={packetType}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-md"
                  >
                    <input
                      type="checkbox"
                      checked={filters.packet_types?.includes(packetType) || false}
                      onChange={() => toggleArrayFilter('packet_types', packetType)}
                      className="rounded border-border"
                    />
                    <span className="text-sm">{packetType}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Vendors */}
            <div>
              <label className="block text-sm font-medium mb-2">Vendors</label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {uniqueValues.vendors.map((vendor) => (
                  <label
                    key={vendor.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-md"
                  >
                    <input
                      type="checkbox"
                      checked={filters.vendor_ids?.includes(vendor.id) || false}
                      onChange={() => toggleArrayFilter('vendor_ids', vendor.id)}
                      className="rounded border-border"
                    />
                    <span className="text-sm">{vendor.name}</span>
                  </label>
                ))}
                <label className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-md">
                  <input
                    type="checkbox"
                    checked={filters.vendor_ids?.includes('unassigned') || false}
                    onChange={() => toggleArrayFilter('vendor_ids', 'unassigned')}
                    className="rounded border-border"
                  />
                  <span className="text-sm text-muted-foreground">Unassigned</span>
                </label>
              </div>
            </div>

            {/* Quantity Range */}
            <div>
              <label className="block text-sm font-medium mb-2">Quantity Range (kg)</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Min</label>
                  <input
                    type="number"
                    value={filters.min_quantity || ''}
                    onChange={(e) =>
                      updateFilter('min_quantity', e.target.value ? Number(e.target.value) : undefined)
                    }
                    placeholder="Min"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Max</label>
                  <input
                    type="number"
                    value={filters.max_quantity || ''}
                    onChange={(e) =>
                      updateFilter('max_quantity', e.target.value ? Number(e.target.value) : undefined)
                    }
                    placeholder="Max"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <button
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="w-full px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      </div>
    </>
  );
}


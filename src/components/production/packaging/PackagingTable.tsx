import { useMemo, useState, useEffect } from 'react';
import { Box, Plus, Scale, TrendingUp, Package, FlaskConical, Warehouse } from 'lucide-react';
import { SearchBar } from '../../admin/shared/SearchBar';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { ActionButtons } from '../../admin/shared/ActionButtons';
import { ConfirmDialog } from '../../admin/shared/ConfirmDialog';
import { AlertDialog } from '../../shared/AlertDialog';
import { GodownFilterSelect } from '../../shared/GodownFilterSelect';
import { usePackaging } from '../../../hooks/usePackaging';
import { useInventory } from '../../../hooks/useInventory';
import { useProducts } from '../../../hooks/useProducts';
import { usePackagingVendors } from '../../../hooks/usePackagingVendors';
import { PackagingFormModal } from './PackagingFormModal';
import { EmptyBagSnapshotDisplay } from './EmptyBagSnapshotDisplay';
import type { Packaging, PackagingPacketsInventoryRow } from '../../../types/entities';
import { formatPacketTypeLabel } from '../../../constants/bagAndPacketTypes';
import { packagingHasAnyEmptyBagSnapshot } from '../../../utils/empty-bag-cost';

function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

export function PackagingTable() {
  const [godownFilter, setGodownFilter] = useState<string | undefined>();
  const { packaging, loading, deletePackaging, refetch } = usePackaging();
  const { packets: packetsInventory, fetchPackets } = useInventory();
  const { products } = useProducts();
  const { packagingVendors } = usePackagingVendors();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('error');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // Create product map for quick lookup
  const productMap = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach(product => {
      map.set(product.id, product.name);
    });
    return map;
  }, [products]);

  // Create vendor map for quick lookup
  const vendorMap = useMemo(() => {
    const map = new Map<string, string>();
    packagingVendors.forEach(vendor => {
      map.set(vendor.id, vendor.name);
    });
    return map;
  }, [packagingVendors]);

  // Fetch packets inventory when component mounts (fetchPackets is now memoized)
  useEffect(() => {
    fetchPackets();
  }, [fetchPackets]);

  /** Prefer per-godown rows from GET /packaging; fallback to global packets inventory */
  const getAvailableQuantity = (pkg: Packaging): number => {
    const rows = pkg.packets_inventory;
    if (rows && rows.length > 0) {
      return rows.reduce((sum, r) => sum + (Number(r.available_quantity) || 0), 0);
    }
    const holdingCapacity = num(pkg.holding_capacity);
    const inventory = packetsInventory.find(
      (pkt) =>
        pkt.packaging?.id === pkg.id ||
        (pkt.packaging?.holding_capacity === holdingCapacity && pkt.packaging?.packet_type === pkg.packet_type)
    );
    if (!inventory) return 0;
    const qty = typeof inventory.available_quantity === 'string'
      ? parseInt(inventory.available_quantity, 10)
      : inventory.available_quantity;
    return Number.isNaN(Number(qty)) ? 0 : Number(qty);
  };

  /** Rows + total for card; when godown filter is on, only that godown’s lines and qty */
  const getDisplayInventory = (pkg: Packaging) => {
    const rows = pkg.packets_inventory ?? [];
    if (rows.length > 0) {
      const filteredRows = godownFilter
        ? rows.filter((pi) => pi.godown_id === godownFilter)
        : rows;
      const total = filteredRows.reduce((s, r) => s + (Number(r.available_quantity) || 0), 0);
      return { rows: filteredRows, total };
    }
    return { rows: [] as PackagingPacketsInventoryRow[], total: getAvailableQuantity(pkg) };
  };

  // Get style based on packet type
  const getTypeStyle = (type: string): { gradient: string; bgLight: string; text: string } => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('bopp')) {
      return { gradient: 'from-fuchsia-500 to-pink-500', bgLight: 'bg-fuchsia-500/10', text: 'text-fuchsia-700' };
    }
    if (lowerType.includes('non-woven') || lowerType.includes('non woven')) {
      return { gradient: 'from-teal-500 to-emerald-500', bgLight: 'bg-teal-500/10', text: 'text-teal-700' };
    }
    if (lowerType.includes('vacuum') || lowerType.includes('pouch')) {
      return { gradient: 'from-emerald-500 to-green-500', bgLight: 'bg-emerald-500/10', text: 'text-emerald-700' };
    }
    if (lowerType.includes('pp') || lowerType.includes('woven')) {
      return { gradient: 'from-sky-500 to-cyan-500', bgLight: 'bg-sky-500/10', text: 'text-sky-600' };
    }
    if (lowerType.includes('jute')) {
      return { gradient: 'from-amber-500 to-orange-500', bgLight: 'bg-amber-500/10', text: 'text-amber-600' };
    }
    if (lowerType.includes('hdpe')) {
      return { gradient: 'from-violet-500 to-purple-500', bgLight: 'bg-violet-500/10', text: 'text-violet-600' };
    }
    return { gradient: 'from-primary to-accent', bgLight: 'bg-primary/10', text: 'text-primary' };
  };

  const filtered = useMemo(() => {
    let rows = packaging;
    if (godownFilter) {
      rows = rows.filter((p) =>
        p.packets_inventory?.some((pi) => pi.godown_id === godownFilter)
      );
    }
    if (!searchQuery.trim()) return rows;

    const q = searchQuery.toLowerCase();
    return rows.filter((p) => {
      const productName = productMap.get(p.product_id)?.toLowerCase() || '';
      const vendorName = p.packaging_vendor_id ? vendorMap.get(p.packaging_vendor_id)?.toLowerCase() || '' : '';
      const packagingNumber = p.packaging_number?.toLowerCase() || '';
      const godownText = (p.packets_inventory ?? [])
        .map((pi) => `${pi.godown_name ?? ''} ${pi.godown_code ?? ''}`.toLowerCase())
        .join(' ');
      return (
        productName.includes(q) ||
        p.packet_type.toLowerCase().includes(q) ||
        vendorName.includes(q) ||
        p.holding_capacity.toString().includes(q) ||
        packagingNumber.includes(q) ||
        p.id.toLowerCase().includes(q) ||
        godownText.includes(q)
      );
    });
  }, [packaging, searchQuery, productMap, vendorMap, godownFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-end">
        <div className="flex-1 min-w-[200px]">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search packaging, godown..."
          />
        </div>
        <GodownFilterSelect value={godownFilter} onChange={setGodownFilter} label="Filter by godown" />
        <button
          className="btn-primary rounded-xl inline-flex items-center justify-center gap-2 w-full sm:w-auto"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" /> Create Packaging
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Box}
          title="No packaging found"
          description="Create your first packaging type to get started."
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((pkg) => {
            const { rows: invRows, total: available } = getDisplayInventory(pkg);
            const typeStyle = getTypeStyle(pkg.packet_type);
            const hasStock = available > 0;
            const productName = productMap.get(pkg.product_id) || 'Unknown Product';
            const holdCap = num(pkg.holding_capacity);
            const ordW = pkg.ordered_weight != null ? num(pkg.ordered_weight) : null;

            return (
              <article
                key={pkg.id}
                className="group relative rounded-2xl bg-card border border-border overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/30"
              >
                {/* Top gradient bar */}
                <div className={`h-1.5 bg-gradient-to-r ${typeStyle.gradient}`} />

                <div className="p-5">
                  {/* Packaging Number & Product Name (Primary - Top) */}
                  <div className="mb-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-start gap-2 flex-1">
                        <FlaskConical className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">
                          {productName}
                        </h3>
                      </div>
                      {pkg.packaging_number && (
                        <span className="text-xs font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md whitespace-nowrap">
                          {pkg.packaging_number}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground ml-6">
                      Product + Weight
                    </div>
                  </div>

                  {/* Weight (Secondary - Below Product) */}
                  <div className="flex items-start justify-between mb-3 pb-3 border-b border-border/60">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-bold text-foreground tracking-tight">
                          {holdCap % 1 === 0 ? holdCap.toFixed(0) : holdCap.toFixed(2)}
                        </span>
                        <span className="text-lg text-muted-foreground font-medium">kg</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Weight
                      </div>
                    </div>
                    <div className={`p-2.5 rounded-xl ${typeStyle.bgLight}`}>
                      <Scale className={`h-5 w-5 ${typeStyle.text}`} />
                    </div>
                  </div>

                  {/* Packet Type */}
                  <div className="mb-3">
                    <span className={`inline-flex items-center gap-2 px-2.5 py-1 text-xs font-semibold rounded-lg ${typeStyle.bgLight} ${typeStyle.text}`}>
                      <Box className="h-3.5 w-3.5" />
                      {formatPacketTypeLabel(pkg.packet_type)}
                    </span>
                  </div>

                  {/* Stock by godown (from API) + total */}
                  {invRows.length > 0 ? (
                    <div className="py-2.5 border-t border-border/60 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Warehouse className="h-3.5 w-3.5" />
                        {godownFilter ? 'Empty packets (selected godown)' : 'Empty packets by godown'}
                      </div>
                      <ul className="space-y-1.5">
                        {invRows.map((row) => (
                          <li
                            key={row.godown_id}
                            className="flex items-center justify-between gap-2 text-xs rounded-lg bg-muted/40 px-2 py-1.5"
                          >
                            <span className="truncate text-muted-foreground" title={row.godown_name ?? row.godown_id}>
                              {row.godown_name ?? row.godown_code ?? row.godown_id.slice(0, 8)}
                            </span>
                            <span className="font-mono font-semibold text-emerald-600 shrink-0">
                              {Number(row.available_quantity).toLocaleString('en-IN')} pcs
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-center justify-between pt-1 border-t border-border/40">
                        <span className="text-xs text-muted-foreground">Total</span>
                        <span className={`text-sm font-bold font-mono ${hasStock ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                          {available.toLocaleString('en-IN')} pcs
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between py-2.5 border-t border-border/60">
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">Available Stock</div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-lg font-bold font-mono ${hasStock ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                            {available.toLocaleString('en-IN')}
                          </span>
                          <span className="text-xs text-muted-foreground">pcs</span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                        hasStock
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {hasStock ? (
                          <>
                            <TrendingUp className="h-3 w-3" />
                            In Stock
                          </>
                        ) : (
                          <>
                            <Package className="h-3 w-3" />
                            Empty
                          </>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Vendor (if available) */}
                  {pkg.packaging_vendor_id && (
                    <div className="text-xs text-muted-foreground pt-2 border-t border-border/40">
                      <span className="font-medium">Vendor:</span> {vendorMap.get(pkg.packaging_vendor_id) || 'Unknown'}
                    </div>
                  )}
                  {ordW != null && ordW > 0 && (
                    <div className="text-xs text-muted-foreground pt-1">
                      <span className="font-medium">Ordered:</span> {ordW.toLocaleString('en-IN')} kg
                    </div>
                  )}
                  {packagingHasAnyEmptyBagSnapshot(pkg) && (
                    <div className="pt-2 border-t border-border/40">
                      <EmptyBagSnapshotDisplay
                        title="Empty bag receipt snapshot"
                        values={pkg}
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-3 flex items-center justify-end pt-3 border-t border-border/60">
                    <ActionButtons
                      isActive={true}
                      onEdit={() => {
                        setEditId(pkg.id);
                        setCreateOpen(true);
                      }}
                      onDelete={() => {
                        setSelectedId(pkg.id);
                        setDeleteDialogOpen(true);
                      }}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={async () => {
          if (selectedId) {
            try {
              await deletePackaging(selectedId);
              setSelectedId(null);
              setDeleteDialogOpen(false);
            } catch (error: any) {
              setAlertType('error');
              setAlertTitle('Failed to Delete Packaging');
              setAlertMessage(
                error?.message ||
                  error?.data?.message ||
                  error?.error ||
                  'An error occurred while deleting the packaging. Please try again.'
              );
              setAlertOpen(true);
              setDeleteDialogOpen(false);
            }
          }
        }}
        title="Delete Packaging"
        description="Are you sure you want to delete this packaging? This action cannot be undone."
        confirmText="Delete"
      />

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
      />

      <PackagingFormModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setEditId(null);
            refetch();
          }
        }}
        packagingId={editId}
      />
    </div>
  );
}

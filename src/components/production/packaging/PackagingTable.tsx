import { useMemo, useState, useEffect } from 'react';
import { Box, Plus, PackagePlus } from 'lucide-react';
import { SearchBar } from '../../admin/shared/SearchBar';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { ActionButtons } from '../../admin/shared/ActionButtons';
import { ConfirmDialog } from '../../admin/shared/ConfirmDialog';
import { AlertDialog } from '../../shared/AlertDialog';
import { usePackaging } from '../../../hooks/usePackaging';
import { useInventory } from '../../../hooks/useInventory';
import { PackagingFormModal } from './PackagingFormModal';
import { AddPacketsInventoryModal } from './AddPacketsInventoryModal';

export function PackagingTable() {
  const { packaging, loading, deletePackaging, refetch } = usePackaging();
  const { packets: packetsInventory, fetchPackets } = useInventory();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [inventoryPackagingId, setInventoryPackagingId] = useState<string | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('error');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // Fetch packets inventory when component mounts
  useEffect(() => {
    fetchPackets();
  }, [fetchPackets]);

  // Get available quantity for a packaging item
  const getAvailableQuantity = (pkgId: string, holdingCapacity: number, packetType: string): number => {
    const inventory = packetsInventory.find(
      (pkt) =>
        pkt.packaging?.id === pkgId ||
        (pkt.packaging?.holding_capacity === holdingCapacity && pkt.packaging?.packet_type === packetType)
    );
    if (!inventory) return 0;
    const qty = typeof inventory.available_quantity === 'string' 
      ? parseInt(inventory.available_quantity) 
      : inventory.available_quantity;
    return isNaN(qty) ? 0 : qty;
  };

  const filtered = useMemo(() => {
    return packaging.filter((p) => {
      const q = searchQuery.toLowerCase();
      return (
        p.packet_type.toLowerCase().includes(q) ||
        p.source?.toLowerCase().includes(q) ||
        false
      );
    });
  }, [packaging, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search packaging..."
          />
        </div>
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
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((pkg) => (
            <article
              key={pkg.id}
              className="group rounded-2xl p-4 bg-gradient-to-br from-background to-muted/40 border border-border/60 hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                    <Box className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold leading-tight">{pkg.packet_type}</h3>
                    <div className="text-xs text-muted-foreground mt-1">
                      {pkg.holding_capacity} kg capacity
                    </div>
                    {(() => {
                      const available = getAvailableQuantity(pkg.id, pkg.holding_capacity, pkg.packet_type);
                      return available > 0 ? (
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                          {available} available
                        </div>
                      ) : null;
                    })()}
                    {pkg.source && (
                      <div className="text-xs text-muted-foreground mt-1">Source: {pkg.source}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => {
                    setInventoryPackagingId(pkg.id);
                    setInventoryOpen(true);
                  }}
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  <PackagePlus className="h-3 w-3" />
                  Add Inventory
                </button>
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
            </article>
          ))}
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

      <AddPacketsInventoryModal
        open={inventoryOpen}
        onOpenChange={(open) => {
          setInventoryOpen(open);
          if (!open) {
            setInventoryPackagingId(null);
            refetch();
            fetchPackets(); // Refresh packets inventory
          }
        }}
        packagingId={inventoryPackagingId}
      />
    </div>
  );
}


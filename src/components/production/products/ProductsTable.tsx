import { useMemo, useState } from 'react';
import { Package, Plus, Link2 } from 'lucide-react';
import { SearchBar } from '../../admin/shared/SearchBar';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { ActionButtons } from '../../admin/shared/ActionButtons';
import { ConfirmDialog } from '../../admin/shared/ConfirmDialog';
import { AlertDialog } from '../../shared/AlertDialog';
import { useProducts } from '../../../hooks/useProducts';
import { ProductFormModal } from './ProductFormModal';
import { ProductRecipeLinkModal } from './ProductRecipeLinkModal';

export function ProductsTable() {
  const { products, loading, deleteProduct, refetch } = useProducts();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkProductId, setLinkProductId] = useState<string | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('error');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) || false) ||
        (p.brand?.toLowerCase().includes(q) || false)
      );
    });
  }, [products, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search products..."
          />
        </div>
        <button
          className="btn-primary rounded-xl inline-flex items-center justify-center gap-2 w-full sm:w-auto"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" /> Create Product
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products found"
          description="Create your first product to get started."
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <article
              key={product.id}
              className="group rounded-2xl p-4 bg-gradient-to-br from-background to-muted/40 border border-border/60 hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold leading-tight">{product.name}</h3>
                    {product.brand && (
                      <div className="text-xs text-muted-foreground mt-1">{product.brand}</div>
                    )}
                    {product.recipes && product.recipes.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {product.recipes.length} recipe{product.recipes.length !== 1 ? 's' : ''} linked
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {product.description && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  {product.description}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => {
                    setLinkProductId(product.id);
                    setLinkOpen(true);
                  }}
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Link2 className="h-3 w-3" />
                  Manage Recipes
                </button>
                <ActionButtons
                  isActive={true}
                  onEdit={() => {
                    setEditId(product.id);
                    setCreateOpen(true);
                  }}
                  onDelete={() => {
                    setSelectedId(product.id);
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
              await deleteProduct(selectedId);
              setSelectedId(null);
              setDeleteDialogOpen(false);
            } catch (error: any) {
              setAlertType('error');
              setAlertTitle('Failed to Delete Product');
              setAlertMessage(
                error?.message ||
                  error?.data?.message ||
                  error?.error ||
                  'An error occurred while deleting the product. Please try again.'
              );
              setAlertOpen(true);
              setDeleteDialogOpen(false);
            }
          }
        }}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
      />

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
      />

      <ProductFormModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setEditId(null);
            refetch();
          }
        }}
        productId={editId}
      />

      <ProductRecipeLinkModal
        open={linkOpen}
        onOpenChange={(open) => {
          setLinkOpen(open);
          if (!open) {
            setLinkProductId(null);
            refetch();
          }
        }}
        productId={linkProductId}
      />
    </div>
  );
}


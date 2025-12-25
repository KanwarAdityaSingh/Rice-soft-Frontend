import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { AlertDialog } from '../../shared/AlertDialog';
import { useProducts } from '../../../hooks/useProducts';
import { useRecipes } from '../../../hooks/useRecipes';

interface ProductRecipeLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
}

export function ProductRecipeLinkModal({ open, onOpenChange, productId }: ProductRecipeLinkModalProps) {
  const { products, linkRecipe, unlinkRecipe, refetch } = useProducts();
  const { recipes } = useRecipes();
  const [loading, setLoading] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const product = productId ? products.find((p) => p.id === productId) : null;
  const linkedRecipeIds = product?.recipes?.map((r) => r.id) || [];
  const availableRecipes = recipes.filter((r) => !linkedRecipeIds.includes(r.id));

  const handleLink = async (recipeId: string) => {
    if (!productId) return;
    setLoading(true);
    try {
      await linkRecipe(productId, { recipe_id: recipeId });
      setAlertType('success');
      setAlertTitle('Recipe Linked');
      setAlertMessage('Recipe has been linked to the product successfully.');
      setAlertOpen(true);
      refetch();
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error?.message || 'Failed to link recipe. Please try again.');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async (recipeId: string) => {
    if (!productId) return;
    setLoading(true);
    try {
      await unlinkRecipe(productId, recipeId);
      setAlertType('success');
      setAlertTitle('Recipe Unlinked');
      setAlertMessage('Recipe has been unlinked from the product successfully.');
      setAlertOpen(true);
      refetch();
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error?.message || 'Failed to unlink recipe. Please try again.');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background rounded-2xl shadow-xl z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-border/60">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-2xl font-bold">
                  Manage Recipes for {product.name}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>

              {/* Linked Recipes */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-3">Linked Recipes</h3>
                {product.recipes && product.recipes.length > 0 ? (
                  <div className="space-y-2">
                    {product.recipes.map((recipe) => (
                      <div
                        key={recipe.id}
                        className="flex items-center justify-between p-3 border border-border rounded-lg"
                      >
                        <span className="text-sm">{recipe.recipe_name}</span>
                        <button
                          onClick={() => handleUnlink(recipe.id)}
                          disabled={loading}
                          className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No recipes linked yet.</p>
                )}
              </div>

              {/* Available Recipes */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Available Recipes</h3>
                {availableRecipes.length > 0 ? (
                  <div className="space-y-2">
                    {availableRecipes.map((recipe) => (
                      <div
                        key={recipe.id}
                        className="flex items-center justify-between p-3 border border-border rounded-lg"
                      >
                        <span className="text-sm">{recipe.recipe_name}</span>
                        <button
                          onClick={() => handleLink(recipe.id)}
                          disabled={loading}
                          className="btn-primary text-sm px-3 py-1.5 inline-flex items-center gap-1.5"
                        >
                          <Plus className="h-4 w-4" /> Link
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">All recipes are already linked.</p>
                )}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
      />
    </>
  );
}


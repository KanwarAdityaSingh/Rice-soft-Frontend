import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { AlertDialog } from '../../shared/AlertDialog';
import { useProducts } from '../../../hooks/useProducts';
import { useRecipes } from '../../../hooks/useRecipes';
import { productsAPI } from '../../../services/products.api';
import type { CreateProductRequest, UpdateProductRequest, PacketType } from '../../../types/entities';

const PACKET_TYPES: PacketType[] = ['PP Bag', 'Jute Bag', 'HDPE Bag'];

interface ProductFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId?: string | null;
}

export function ProductFormModal({ open, onOpenChange, productId }: ProductFormModalProps) {
  const { createProduct, updateProduct, products, linkRecipe, unlinkRecipe, refetch } = useProducts();
  const { recipes, loading: recipesLoading } = useRecipes();
  const [formData, setFormData] = useState<CreateProductRequest>({
    name: '',
    description: '',
    brand: '',
    packet_type: 'PP Bag', // Required field
  });
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [newRecipeId, setNewRecipeId] = useState<string>('');
  const [recipeToAdd, setRecipeToAdd] = useState<string>('');
  const [brands, setBrands] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const brandsFetchedRef = useRef(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [linkingRecipe, setLinkingRecipe] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // Fetch brands when modal opens (only once per modal session)
  useEffect(() => {
    if (!open) {
      // Reset when modal closes
      brandsFetchedRef.current = false;
      return;
    }
    
    // Only fetch once per modal open
    if (!brandsFetchedRef.current) {
      brandsFetchedRef.current = true;
      const fetchBrands = async () => {
        setLoadingBrands(true);
        try {
          const brandsData = await productsAPI.getBrands();
          setBrands(brandsData);
        } catch (error) {
          console.error('Failed to fetch brands:', error);
        } finally {
          setLoadingBrands(false);
        }
      };
      fetchBrands();
    }
  }, [open]);

  useEffect(() => {
    if (productId && open) {
      const product = products.find((p) => p.id === productId);
      if (product) {
        setFormData({
          name: product.name,
          description: product.description || '',
          brand: product.brand || '',
          packet_type: 'PP Bag', // Default for editing (packet_type is not stored on product, it's used for packaging creation)
        });
        setSelectedRecipeIds(product.recipes?.map((r) => r.id) || []);
      }
    } else if (open) {
      setFormData({ name: '', description: '', brand: '', packet_type: 'PP Bag' });
      setSelectedRecipeIds([]);
      setNewRecipeId('');
      setRecipeToAdd('');
    }
  }, [productId, open, products]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }
    if (!formData.packet_type) {
      newErrors.packet_type = 'Packet type is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddRecipe = async (recipeId?: string) => {
    const recipeIdToAdd = recipeId || newRecipeId || recipeToAdd;
    if (!recipeIdToAdd) return;
    
    // For existing product, link via API
    if (productId) {
      if (selectedRecipeIds.includes(recipeIdToAdd)) {
        setAlertType('warning');
        setAlertTitle('Recipe Already Linked');
        setAlertMessage('This recipe is already linked to the product.');
        setAlertOpen(true);
        return;
      }

      setLinkingRecipe(true);
      try {
        await linkRecipe(productId, { recipe_id: recipeIdToAdd });
        setSelectedRecipeIds([...selectedRecipeIds, recipeIdToAdd]);
        setNewRecipeId('');
        await refetch();
      } catch (error: any) {
        setAlertType('error');
        setAlertTitle('Error');
        setAlertMessage(error?.message || 'Failed to link recipe. Please try again.');
        setAlertOpen(true);
      } finally {
        setLinkingRecipe(false);
      }
    } else {
      // For new product, just add to selected list (will be linked after creation)
      if (selectedRecipeIds.includes(recipeIdToAdd)) {
        setAlertType('warning');
        setAlertTitle('Recipe Already Selected');
        setAlertMessage('This recipe is already selected.');
        setAlertOpen(true);
        return;
      }
      setSelectedRecipeIds([...selectedRecipeIds, recipeIdToAdd]);
      setRecipeToAdd('');
    }
  };

  const handleRemoveRecipe = async (recipeId: string) => {
    if (productId) {
      // For existing product, unlink via API
      setLinkingRecipe(true);
      try {
        await unlinkRecipe(productId, recipeId);
        setSelectedRecipeIds(selectedRecipeIds.filter((id) => id !== recipeId));
        await refetch();
      } catch (error: any) {
        setAlertType('error');
        setAlertTitle('Error');
        setAlertMessage(error?.message || 'Failed to unlink recipe. Please try again.');
        setAlertOpen(true);
      } finally {
        setLinkingRecipe(false);
      }
    } else {
      // For new product, just remove from selected list
      setSelectedRecipeIds(selectedRecipeIds.filter((id) => id !== recipeId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      let createdProductId: string | null = null;
      if (productId) {
        await updateProduct(productId, formData as UpdateProductRequest);
        setAlertType('success');
        setAlertTitle('Product Updated');
        setAlertMessage('Product has been updated successfully.');
      } else {
        const newProduct = await createProduct(formData);
        createdProductId = newProduct.id;
        setAlertType('success');
        setAlertTitle('Product Created');
        setAlertMessage('Product has been created successfully.');
        
        // Link recipes if any were selected during creation
        if (selectedRecipeIds.length > 0 && createdProductId) {
          for (const recipeId of selectedRecipeIds) {
            try {
              await linkRecipe(createdProductId, { recipe_id: recipeId });
            } catch (error) {
              console.error('Failed to link recipe:', error);
            }
          }
        }
      }
      setAlertOpen(true);
      setTimeout(() => {
        onOpenChange(false);
        refetch();
      }, 1500);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error?.message || 'Failed to save product. Please try again.');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const availableRecipes = recipes.filter((r) => !selectedRecipeIds.includes(r.id));
  const currentProduct = productId ? products.find((p) => p.id === productId) : null;
  const linkedRecipes = currentProduct?.recipes || [];

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background rounded-2xl shadow-xl z-50 w-full max-w-2xl border border-border/60">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-2xl font-bold">
                  {productId ? 'Edit Product' : 'Create Product'}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Product Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (errors.name) setErrors({ ...errors, name: '' });
                    }}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., Premium Mixed Rice"
                  />
                  {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={3}
                    placeholder="Product description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Brand</label>
                  <select
                    value={formData.brand || ''}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={loadingBrands}
                  >
                    <option value="">Select a brand (optional)</option>
                    {brands.map((brand) => (
                      <option key={brand.value} value={brand.value}>
                        {brand.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Packet Type *</label>
                  <select
                    value={formData.packet_type}
                    onChange={(e) => {
                      setFormData({ ...formData, packet_type: e.target.value as PacketType });
                      if (errors.packet_type) setErrors({ ...errors, packet_type: '' });
                    }}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {PACKET_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  {errors.packet_type && (
                    <p className="mt-1 text-sm text-destructive">{errors.packet_type}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    This will be used for all auto-created packaging entries (10kg, 25kg, 50kg)
                  </p>
                </div>

                {/* Recipe Linking Section */}
                <div className="pt-4 border-t border-border">
                  <label className="block text-sm font-medium mb-3">Recipes</label>
                  
                  {/* Linked Recipes (for editing) */}
                  {productId && linkedRecipes.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs text-muted-foreground mb-2">Linked Recipes:</div>
                      <div className="space-y-2">
                        {linkedRecipes.map((recipe) => (
                          <div
                            key={recipe.id}
                            className="flex items-center justify-between p-2 border border-border rounded-lg bg-muted/30"
                          >
                            <span className="text-sm">{recipe.recipe_name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveRecipe(recipe.id)}
                              disabled={linkingRecipe}
                              className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add Recipe (for editing existing product) */}
                  {productId && (
                    <>
                      {recipesLoading ? (
                        <div className="flex justify-center py-4">
                          <LoadingSpinner />
                        </div>
                      ) : availableRecipes.length > 0 ? (
                        <div className="mb-4">
                          <div className="flex gap-2">
                            <select
                              value={newRecipeId}
                              onChange={(e) => setNewRecipeId(e.target.value)}
                              className="flex-1 px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            >
                              <option value="">Select a recipe to link...</option>
                              {availableRecipes.map((recipe) => (
                                <option key={recipe.id} value={recipe.id}>
                                  {recipe.recipe_name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                handleAddRecipe();
                              }}
                              disabled={!newRecipeId || linkingRecipe}
                              className="btn-primary px-4 py-2 rounded-lg inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {linkingRecipe ? <LoadingSpinner /> : <Plus className="h-4 w-4" />}
                              Link
                            </button>
                          </div>
                        </div>
                      ) : linkedRecipes.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No recipes available. Create recipes first to link them to this product.
                        </p>
                      ) : null}
                    </>
                  )}

                  {/* Select Recipes (for creating new product) */}
                  {!productId && (
                    <>
                      {/* Show selected recipes */}
                      {selectedRecipeIds.length > 0 && (
                        <div className="mb-4">
                          <div className="text-xs text-muted-foreground mb-2">Selected Recipes:</div>
                          <div className="space-y-2">
                            {selectedRecipeIds.map((recipeId) => {
                              const recipe = recipes.find((r) => r.id === recipeId);
                              if (!recipe) return null;
                              return (
                                <div
                                  key={recipeId}
                                  className="flex items-center justify-between p-2 border border-border rounded-lg bg-muted/30"
                                >
                                  <span className="text-sm">{recipe.recipe_name}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveRecipe(recipeId)}
                                    className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Add Recipe Dropdown */}
                      {recipesLoading ? (
                        <div className="flex justify-center py-4">
                          <LoadingSpinner />
                        </div>
                      ) : recipes.length > 0 ? (
                        <div>
                          <div className="text-xs text-muted-foreground mb-2">
                            Add recipes to link (optional):
                          </div>
                          <div className="flex gap-2">
                            <select
                              value={recipeToAdd}
                              onChange={(e) => setRecipeToAdd(e.target.value)}
                              className="flex-1 px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            >
                              <option value="">Select a recipe to add...</option>
                              {recipes
                                .filter((r) => !selectedRecipeIds.includes(r.id))
                                .map((recipe) => (
                                  <option key={recipe.id} value={recipe.id}>
                                    {recipe.recipe_name}
                                  </option>
                                ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleAddRecipe()}
                              disabled={!recipeToAdd}
                              className="btn-primary px-4 py-2 rounded-lg inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus className="h-4 w-4" /> Add
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No recipes available. Create recipes first to link them to products.
                        </p>
                      )}
                    </>
                  )}

                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Dialog.Close asChild>
                    <button type="button" className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors">
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <LoadingSpinner /> : productId ? 'Update Product' : 'Create Product'}
                  </button>
                </div>
              </form>
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


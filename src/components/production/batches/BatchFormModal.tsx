import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X, CheckCircle2, Circle, Package, Box, Plus, Trash2, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { AlertDialog } from '../../shared/AlertDialog';
import { useBatches } from '../../../hooks/useBatches';
import { useProducts } from '../../../hooks/useProducts';
import { useRecipes } from '../../../hooks/useRecipes';
import { usePackaging } from '../../../hooks/usePackaging';
import { useInventory } from '../../../hooks/useInventory';
import { lotsAPI } from '../../../services/lots.api';
import { inventoryAPI } from '../../../services/inventory.api';
import type { Batch, BatchProduct, BatchPackaging, Recipe, Lot, LotsInventory } from '../../../types/entities';

interface BatchFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId?: string | null;
}

type Stage = 1 | 2 | 3;

export function BatchFormModal({ open, onOpenChange, batchId }: BatchFormModalProps) {
  const { createBatch, getBatchDetails, addProductToBatch, getBatchProducts, removeProductFromBatch, addPackagingToBatch, getBatchPackaging, removePackagingFromBatch, refetch } = useBatches();
  const { products } = useProducts();
  const { recipes } = useRecipes();
  const { packaging, fetchPackagingByProduct } = usePackaging();
  const { packets: packetsInventory, refetch: refetchInventory } = useInventory();
  
  // Stage 1: Recipe Attachment
  const [recipeId, setRecipeId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(0);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);
  const [lotsInventory, setLotsInventory] = useState<LotsInventory[]>([]);
  
  // Batch state
  const [currentBatch, setCurrentBatch] = useState<Batch | null>(null);
  const [batchProducts, setBatchProducts] = useState<BatchProduct[]>([]);
  const [batchPackaging, setBatchPackaging] = useState<BatchPackaging[]>([]);
  
  // Stage 2: Product Attachment
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  
  // Stage 3: Packaging Attachment
  const [packagingForProducts, setPackagingForProducts] = useState<Record<string, any[]>>({});
  const [packagingQuantities, setPackagingQuantities] = useState<Record<string, { packagingId: string; quantity: number }>>({});
  
  const [currentStage, setCurrentStage] = useState<Stage>(1);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // Load batch data if editing
  useEffect(() => {
    if (batchId && open) {
      loadBatchData();
    } else if (open) {
      resetForm();
    }
  }, [batchId, open]);

  // Load lots and inventory when form opens
  useEffect(() => {
    if (open) {
      loadInitialData();
    }
  }, [open]);

  // Load packaging for products when batch products change
  useEffect(() => {
    if (batchProducts.length > 0 && currentBatch) {
      loadPackagingForProducts();
    }
  }, [batchProducts, currentBatch]);

  const loadInitialData = async () => {
        setLoadingData(true);
        try {
      const [lotsData, inventoryData] = await Promise.all([
            lotsAPI.getAllLots(),
            inventoryAPI.getLots(),
          ]);
          setLots(lotsData);
          setLotsInventory(inventoryData);
          refetchInventory();
    } catch (error) {
          console.error('Failed to fetch data:', error);
        } finally {
          setLoadingData(false);
        }
      };

  const loadBatchData = async () => {
    if (!batchId) return;
    setLoadingData(true);
    try {
      const batchDetails = await getBatchDetails(batchId);
      setCurrentBatch(batchDetails as any);
      
      // Determine current stage based on status
      if (batchDetails.status === 'recipe_attached') {
        setCurrentStage(2);
      } else if (batchDetails.status === 'ready_to_pack' || batchDetails.status === 'packaged') {
        setCurrentStage(3);
      }
      
      // Load products and packaging
      if (batchDetails.status !== 'recipe_attached') {
        const products = await getBatchProducts(batchId);
        setBatchProducts(products);
        
        if (batchDetails.status === 'packaged') {
          const packaging = await getBatchPackaging(batchId);
          setBatchPackaging(packaging);
        }
      }
      
      setRecipeId(batchDetails.recipe_id);
      setQuantity(batchDetails.quantity);
      const recipe = recipes.find(r => r.id === batchDetails.recipe_id);
      setSelectedRecipe(recipe || null);
    } catch (error) {
      console.error('Failed to load batch data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const loadPackagingForProducts = async () => {
    const packagingMap: Record<string, any[]> = {};
    for (const bp of batchProducts) {
      try {
        const pkg = await fetchPackagingByProduct(bp.product_id);
        packagingMap[bp.product_id] = pkg;
      } catch (error) {
        console.error(`Failed to load packaging for product ${bp.product_id}:`, error);
        packagingMap[bp.product_id] = [];
      }
    }
    setPackagingForProducts(packagingMap);
  };

  const resetForm = () => {
    setCurrentBatch(null);
    setRecipeId('');
    setQuantity(0);
    setSelectedRecipe(null);
    setBatchProducts([]);
    setBatchPackaging([]);
    setSelectedProductId('');
    setPackagingForProducts({});
    setPackagingQuantities({});
    setCurrentStage(1);
    setErrors({});
  };

  // Stage 1: Create Batch with Recipe
  const handleStage1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!recipeId) {
      newErrors.recipeId = 'Recipe is required';
    }
    if (quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      const newBatch = await createBatch({ recipe_id: recipeId, quantity });
      setCurrentBatch(newBatch);
      setCurrentStage(2);
      setAlertType('success');
      setAlertTitle('Batch Created');
      setAlertMessage('Batch created successfully. You can now add products.');
      setAlertOpen(true);
      await refetch();
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error?.message || 'Failed to create batch. Please try again.');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Stage 2: Add Product to Batch
  const handleAddProduct = async () => {
    if (!selectedProductId || !currentBatch) return;
    
    setLoading(true);
    try {
      await addProductToBatch(currentBatch.id, selectedProductId);
      const updatedProducts = await getBatchProducts(currentBatch.id);
      setBatchProducts(updatedProducts);
      setSelectedProductId('');
      setAlertType('success');
      setAlertTitle('Product Added');
      setAlertMessage('Product added to batch successfully.');
      setAlertOpen(true);
      await refetch();
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error?.message || 'Failed to add product. Please try again.');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveProduct = async (productId: string) => {
    if (!currentBatch) return;
    
    setLoading(true);
    try {
      await removeProductFromBatch(currentBatch.id, productId);
      const updatedProducts = await getBatchProducts(currentBatch.id);
      setBatchProducts(updatedProducts);
      // Remove packaging for this product
      setBatchPackaging(prev => prev.filter(bp => bp.product_id !== productId));
      await refetch();
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error?.message || 'Failed to remove product. Please try again.');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Stage 3: Add Packaging to Batch
  const handleAddPackaging = async (productId: string) => {
    if (!currentBatch) return;
    const pkgData = packagingQuantities[productId];
    if (!pkgData || !pkgData.packagingId || pkgData.quantity <= 0) {
      setAlertType('warning');
      setAlertTitle('Invalid Input');
      setAlertMessage('Please select packaging and enter quantity.');
      setAlertOpen(true);
      return;
    }

    setLoading(true);
    try {
      await addPackagingToBatch(currentBatch.id, productId, pkgData.packagingId, pkgData.quantity);
      const updatedPackaging = await getBatchPackaging(currentBatch.id);
      setBatchPackaging(updatedPackaging);
      setPackagingQuantities(prev => ({ ...prev, [productId]: { packagingId: '', quantity: 0 } }));
        setAlertType('success');
      setAlertTitle('Packaging Added');
      setAlertMessage('Packaging added to batch successfully.');
      setAlertOpen(true);
      await refetch();
      refetchInventory();
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error?.message || 'Failed to add packaging. Please try again.');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePackaging = async (packagingId: string) => {
    if (!currentBatch) return;
    
    setLoading(true);
    try {
      await removePackagingFromBatch(currentBatch.id, packagingId);
      const updatedPackaging = await getBatchPackaging(currentBatch.id);
      setBatchPackaging(updatedPackaging);
      await refetch();
      refetchInventory();
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error?.message || 'Failed to remove packaging. Please try again.');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const getAvailablePackets = (packagingId: string): number => {
    const inventory = packetsInventory.find(p => p.packaging?.id === packagingId);
    if (!inventory) return 0;
    return typeof inventory.available_quantity === 'string' 
      ? parseInt(inventory.available_quantity) 
      : inventory.available_quantity;
  };

  const getPacketsNeeded = (quantity: number, holdingCapacity: number): number => {
    return Math.ceil(quantity / holdingCapacity);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      recipe_attached: { label: 'Recipe Attached', color: 'bg-blue-500/10 text-blue-600' },
      ready_to_pack: { label: 'Ready to Pack', color: 'bg-yellow-500/10 text-yellow-600' },
      packaged: { label: 'Packaged', color: 'bg-green-500/10 text-green-600' },
      completed: { label: 'Completed', color: 'bg-purple-500/10 text-purple-600' },
      cancelled: { label: 'Cancelled', color: 'bg-red-500/10 text-red-600' },
    };
    const config = statusConfig[status] || { label: status, color: 'bg-gray-500/10 text-gray-600' };
    return (
      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background rounded-2xl shadow-xl z-50 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-border/60">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                <Dialog.Title className="text-2xl font-bold">
                  {batchId ? 'Edit Batch' : 'Create Batch'}
                </Dialog.Title>
                  <Dialog.Description className="sr-only">
                    {batchId ? 'Edit batch details and manage three-stage workflow' : 'Create a new batch using the three-stage workflow: Recipe → Products → Packaging'}
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>

              {/* Stage Progress Indicator */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-2 ${currentStage >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                    {currentStage > 1 ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    <span className="text-sm font-medium">1. Recipe</span>
                  </div>
                  <div className="h-px w-8 bg-border" />
                  <div className={`flex items-center gap-2 ${currentStage >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                    {currentStage > 2 ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    <span className="text-sm font-medium">2. Products</span>
                  </div>
                  <div className="h-px w-8 bg-border" />
                  <div className={`flex items-center gap-2 ${currentStage >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                    {currentStage >= 3 ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    <span className="text-sm font-medium">3. Packaging</span>
                  </div>
                </div>
                {currentBatch && getStatusBadge(currentBatch.status)}
              </div>

              {loadingData ? (
                <div className="flex justify-center py-20">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Stage 1: Recipe Attachment */}
                  <div className={`rounded-xl border ${currentStage >= 1 ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'} p-6`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2 rounded-lg ${currentStage >= 1 ? 'bg-primary/10' : 'bg-muted'}`}>
                        <Package className={`h-5 w-5 ${currentStage >= 1 ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                <div>
                        <h3 className="font-semibold text-lg">Stage 1: Recipe Attachment</h3>
                        <p className="text-sm text-muted-foreground">Select recipe and quantity to create batch</p>
                      </div>
                </div>

                    {!currentBatch ? (
                      <form onSubmit={handleStage1Submit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Recipe *</label>
                  <select
                            value={recipeId}
                    onChange={(e) => {
                              setRecipeId(e.target.value);
                              const recipe = recipes.find(r => r.id === e.target.value);
                              setSelectedRecipe(recipe || null);
                              if (errors.recipeId) setErrors({ ...errors, recipeId: '' });
                            }}
                            className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">Select a recipe</option>
                            {recipes.map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.recipe_name}
                      </option>
                    ))}
                  </select>
                          {errors.recipeId && <p className="mt-1 text-sm text-destructive">{errors.recipeId}</p>}
                </div>

                  <div>
                          <label className="block text-sm font-medium mb-2">Quantity (kg) *</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                            value={quantity || ''}
                      onChange={(e) => {
                              setQuantity(parseFloat(e.target.value) || 0);
                              if (errors.quantity) setErrors({ ...errors, quantity: '' });
                            }}
                            className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Enter quantity in kg"
                          />
                          {errors.quantity && <p className="mt-1 text-sm text-destructive">{errors.quantity}</p>}
                        </div>
                        
                        {selectedRecipe && (
                          <div className="p-4 rounded-lg bg-muted/50 border border-border">
                            <h4 className="text-sm font-semibold mb-2">Recipe Formula:</h4>
                            <div className="space-y-1 text-sm">
                              {selectedRecipe.formula?.map((item, idx) => {
                                const lot = lots.find(l => l.id === item.lot_id);
                                const lotInventory = lotsInventory.find(li => li.lot_id === item.lot_id);
                                const requiredQty = (quantity * item.percentage) / 100;
                                const availableQty = typeof lotInventory?.available_quantity === 'string' 
                                  ? parseFloat(lotInventory.available_quantity) 
                                  : (lotInventory?.available_quantity || 0);
                                const hasEnough = availableQty >= requiredQty;
                                
                                return (
                                  <div key={idx} className="flex items-center justify-between">
                                    <span>
                                      {lot?.lot_number || 'Unknown'} - {item.percentage}%
                                    </span>
                                    <span className={hasEnough ? 'text-emerald-600' : 'text-red-600'}>
                                      {requiredQty.toFixed(2)} kg / {availableQty.toFixed(2)} kg available
                                    </span>
                                </div>
                                );
                              })}
                                  </div>
                                </div>
                        )}

                        <button
                          type="submit"
                          disabled={loading || !recipeId || quantity <= 0}
                          className="btn-primary px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? <LoadingSpinner /> : 'Create Batch'}
                        </button>
                      </form>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <span className="text-sm font-medium">Recipe: {selectedRecipe?.recipe_name || 'N/A'}</span>
                          <span className="text-sm text-muted-foreground">Quantity: {quantity} kg</span>
                              </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Recipe attached and lots deducted
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stage 2: Product Attachment */}
                  {currentBatch && (
                    <div className={`rounded-xl border ${currentStage >= 2 ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'} p-6`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-lg ${currentStage >= 2 ? 'bg-primary/10' : 'bg-muted'}`}>
                          <Package className={`h-5 w-5 ${currentStage >= 2 ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                  <div>
                          <h3 className="font-semibold text-lg">Stage 2: Product Attachment</h3>
                          <p className="text-sm text-muted-foreground">Add products to this batch</p>
                      </div>
                      </div>

                      {currentBatch.status === 'recipe_attached' || currentBatch.status === 'ready_to_pack' || currentBatch.status === 'packaged' ? (
                        <div className="space-y-4">
                          <div className="flex gap-2">
                            <select
                              value={selectedProductId}
                              onChange={(e) => setSelectedProductId(e.target.value)}
                              className="flex-1 px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="">Select a product</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name} {product.brand ? `(${product.brand})` : ''}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={handleAddProduct}
                              disabled={loading || !selectedProductId}
                              className="btn-primary px-4 py-2 rounded-lg inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus className="h-4 w-4" /> Add Product
                            </button>
                          </div>

                          {batchProducts.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold">Attached Products:</h4>
                              {batchProducts.map((bp) => {
                                const product = products.find(p => p.id === bp.product_id);
                                  return (
                                  <div key={bp.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                                    <span className="text-sm font-medium">{product?.name || 'Unknown Product'}</span>
                                    <button
                                      onClick={() => handleRemoveProduct(bp.product_id)}
                                      disabled={loading}
                                      className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                            </div>
                      ) : (
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Batch must be in "recipe_attached" status to add products
                                  </div>
                                )}
                                  </div>
                                )}

                  {/* Stage 3: Packaging Attachment */}
                  {currentBatch && batchProducts.length > 0 && (
                    <div className={`rounded-xl border ${currentStage >= 3 ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'} p-6`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-lg ${currentStage >= 3 ? 'bg-primary/10' : 'bg-muted'}`}>
                          <Box className={`h-5 w-5 ${currentStage >= 3 ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                        <div>
                          <h3 className="font-semibold text-lg">Stage 3: Packaging Attachment</h3>
                          <p className="text-sm text-muted-foreground">Add packaging for each product</p>
                  </div>
                      </div>

                      {(currentBatch.status === 'ready_to_pack' || currentBatch.status === 'packaged') ? (
                        <div className="space-y-6">
                          {batchProducts.map((bp) => {
                            const product = products.find(p => p.id === bp.product_id);
                            const productPackaging = packagingForProducts[bp.product_id] || [];
                            const attachedPackaging = batchPackaging.filter(bpkg => bpkg.product_id === bp.product_id);
                            
                            return (
                              <div key={bp.id} className="p-4 rounded-lg border border-border bg-card">
                                <h4 className="font-semibold mb-3">{product?.name || 'Unknown Product'}</h4>
                                
                                {productPackaging.length > 0 ? (
                                  <div className="space-y-3">
                                    <div className="flex gap-2">
                  <select
                                        value={packagingQuantities[bp.product_id]?.packagingId || ''}
                    onChange={(e) => {
                                          setPackagingQuantities(prev => ({
                                            ...prev,
                                            [bp.product_id]: {
                                              ...prev[bp.product_id],
                                              packagingId: e.target.value,
                                              quantity: prev[bp.product_id]?.quantity || 0,
                                            },
                                          }));
                                        }}
                                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                      >
                                        <option value="">Select packaging</option>
                                        {productPackaging.map((pkg) => {
                                          const available = getAvailablePackets(pkg.id);
                                          return (
                      <option key={pkg.id} value={pkg.id}>
                                              {pkg.holding_capacity}kg {pkg.packet_type} ({available} available)
                      </option>
                                          );
                                        })}
                  </select>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                                        value={packagingQuantities[bp.product_id]?.quantity || ''}
                    onChange={(e) => {
                                          setPackagingQuantities(prev => ({
                                            ...prev,
                                            [bp.product_id]: {
                                              ...prev[bp.product_id],
                                              packagingId: prev[bp.product_id]?.packagingId || '',
                                              quantity: parseFloat(e.target.value) || 0,
                                            },
                                          }));
                                        }}
                                        placeholder="Quantity (kg)"
                                        className="w-32 px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                      />
                                      <button
                                        onClick={() => handleAddPackaging(bp.product_id)}
                                        disabled={loading}
                                        className="btn-primary px-4 py-2 rounded-lg inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                      >
                                        <Plus className="h-3 w-3" /> Add
                                      </button>
                      </div>
                      
                                    {attachedPackaging.length > 0 && (
                                      <div className="space-y-2 pt-3 border-t border-border">
                                        <h5 className="text-xs font-semibold text-muted-foreground uppercase">Attached Packaging:</h5>
                                        {attachedPackaging.map((bpkg) => {
                                          const pkg = productPackaging.find(p => p.id === bpkg.packaging_id);
                                          const packetsNeeded = pkg ? getPacketsNeeded(bpkg.quantity, pkg.holding_capacity) : 0;
                                          return (
                                            <div key={bpkg.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
                                              <span>
                                                {pkg?.holding_capacity}kg {pkg?.packet_type} - {bpkg.quantity} kg ({packetsNeeded} packets)
                                    </span>
                                              <button
                                                onClick={() => handleRemovePackaging(bpkg.id)}
                                                disabled={loading}
                                                className="p-1 text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </button>
                                </div>
                                          );
                                        })}
                                  </div>
                                )}
                              </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">No packaging available for this product</p>
                      )}
                        </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                          Batch must be in "ready_to_pack" or "packaged" status to add packaging
                          </div>
                        )}
                      </div>
                    )}
                      </div>
                    )}
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

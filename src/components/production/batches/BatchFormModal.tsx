import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X, CheckCircle2, Circle, Package, Box, Plus, Trash2, AlertCircle, Filter, Search, XCircle } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { AlertDialog } from '../../shared/AlertDialog';
import { useBatches } from '../../../hooks/useBatches';
import { useProducts } from '../../../hooks/useProducts';
import { useRecipes } from '../../../hooks/useRecipes';
import { usePackaging } from '../../../hooks/usePackaging';
import { usePackagingVendors } from '../../../hooks/usePackagingVendors';
import { packagingAPI } from '../../../services/packaging.api';
import { useInventory } from '../../../hooks/useInventory';
import { lotsAPI } from '../../../services/lots.api';
import { inventoryAPI } from '../../../services/inventory.api';
import type { CreateBatchRequest, Batch, BatchProduct, BatchPackaging, Recipe, Lot, LotsInventory, Packaging, PackagingVendor } from '../../../types/entities';

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
  const { packagingVendors } = usePackagingVendors();
  const { packets: packetsInventory, refetch: refetchInventory } = useInventory();
  
  // Stage 1: Recipe Attachment
  const [recipeId, setRecipeId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(0);
  const [batchNumber, setBatchNumber] = useState<string>('');
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
  const [packagingForProducts, setPackagingForProducts] = useState<Record<string, Packaging[]>>({});
  const [packagingQuantities, setPackagingQuantities] = useState<Record<string, { packagingId: string; quantity: number }>>({});
  const [packagingFilters, setPackagingFilters] = useState<{
    capacities: number[];
    packetTypes: string[];
    vendorIds: string[];
    showOnlyAvailable: boolean;
    searchText: string;
  }>({
    capacities: [],
    packetTypes: [],
    vendorIds: [],
    showOnlyAvailable: false,
    searchText: '',
  });
  const [packagingValidationErrors, setPackagingValidationErrors] = useState<Record<string, string>>({});
  
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
    setBatchNumber('');
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
      const newBatch = await createBatch({ 
        recipe_id: recipeId, 
        quantity,
        batch_number: batchNumber || undefined
      });
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
      const batchData = await addProductToBatch(currentBatch.id, selectedProductId);
      const updatedProducts = await getBatchProducts(currentBatch.id);
      setBatchProducts(updatedProducts);
      setSelectedProductId('');
      
      // Check if batch status is 'ready_to_pack'
      if (batchData && batchData.status === 'ready_to_pack') {
        // Enable Stage 3
        setCurrentStage(3);
        // Update local batch state with returned batch data
        setCurrentBatch(batchData);
      }
      
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

    // Validate selection
    const validation = validatePackagingSelection(productId, pkgData.packagingId, pkgData.quantity);
    if (!validation.valid) {
      setPackagingValidationErrors(prev => ({ ...prev, [productId]: validation.error || 'Invalid selection' }));
      setAlertType('warning');
      setAlertTitle('Validation Error');
      setAlertMessage(validation.error || 'Invalid packaging selection.');
      setAlertOpen(true);
      return;
    }

    // Clear validation error
    setPackagingValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[productId];
      return newErrors;
    });

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

  const handleQuantityChange = (productId: string, packagingId: string, quantity: number) => {
    setPackagingQuantities(prev => ({
      ...prev,
      [productId]: { packagingId, quantity }
    }));

    // Real-time validation
    if (packagingId && quantity > 0) {
      const validation = validatePackagingSelection(productId, packagingId, quantity);
      if (!validation.valid) {
        setPackagingValidationErrors(prev => ({ ...prev, [productId]: validation.error || 'Invalid selection' }));
      } else {
        setPackagingValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[productId];
          return newErrors;
        });
      }
    } else {
      setPackagingValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[productId];
        return newErrors;
      });
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

  const getVendorForPackaging = (packaging: Packaging): PackagingVendor | null => {
    if (!packaging.packaging_vendor_id) return null;
    return packagingVendors.find(v => v.id === packaging.packaging_vendor_id) || null;
  };

  const getPackagingAvailabilityStatus = (packaging: Packaging): {
    status: 'available' | 'low_stock' | 'out_of_stock';
    availablePackets: number;
    availableWeight: number;
    message: string;
  } => {
    const availablePackets = getAvailablePackets(packaging.id);
    const availableWeight = availablePackets * packaging.holding_capacity;
    
    let status: 'available' | 'low_stock' | 'out_of_stock';
    let message: string;
    
    if (availablePackets === 0) {
      status = 'out_of_stock';
      message = 'Out of stock';
    } else if (availablePackets < 10) {
      status = 'low_stock';
      message = `Low stock (${availablePackets} packets)`;
    } else {
      status = 'available';
      message = `${availablePackets} packets available (${availableWeight}kg)`;
    }
    
    return { status, availablePackets, availableWeight, message };
  };

  const validatePackagingSelection = (
    productId: string,
    packagingId: string,
    quantity: number
  ): { valid: boolean; error?: string; packetsNeeded?: number } => {
    const packaging = packagingForProducts[productId]?.find(p => p.id === packagingId);
    if (!packaging) {
      return { valid: false, error: 'Packaging not found' };
    }

    if (!quantity || quantity <= 0) {
      return { valid: false, error: 'Quantity must be greater than 0' };
    }

    if (quantity > 10000) {
      return { valid: false, error: 'Quantity cannot exceed 10,000 kg' };
    }

    const availablePackets = getAvailablePackets(packagingId);
    const packetsNeeded = getPacketsNeeded(quantity, packaging.holding_capacity);

    if (packetsNeeded > availablePackets) {
      return {
        valid: false,
        error: `Insufficient packets. Available: ${availablePackets}, Required: ${packetsNeeded}`,
        packetsNeeded
      };
    }

    return { valid: true, packetsNeeded };
  };

  const filterPackagingForProduct = (productId: string): Packaging[] => {
    const productPackaging = packagingForProducts[productId] || [];
    
    return productPackaging.filter(pkg => {
      // Filter by capacity
      if (packagingFilters.capacities.length > 0 && !packagingFilters.capacities.includes(pkg.holding_capacity)) {
        return false;
      }

      // Filter by packet type
      if (packagingFilters.packetTypes.length > 0 && !packagingFilters.packetTypes.includes(pkg.packet_type)) {
        return false;
      }

      // Filter by vendor
      if (packagingFilters.vendorIds.length > 0) {
        if (!pkg.packaging_vendor_id || !packagingFilters.vendorIds.includes(pkg.packaging_vendor_id)) {
          return false;
        }
      }

      // Filter by availability
      if (packagingFilters.showOnlyAvailable) {
        const availablePackets = getAvailablePackets(pkg.id);
        if (availablePackets === 0) return false;
      }

      // Filter by search text
      if (packagingFilters.searchText) {
        const searchLower = packagingFilters.searchText.toLowerCase();
        const matchesType = pkg.packet_type.toLowerCase().includes(searchLower);
        const vendor = getVendorForPackaging(pkg);
        const matchesVendor = vendor?.name.toLowerCase().includes(searchLower);
        if (!matchesType && !matchesVendor) return false;
      }

      return true;
    });
  };

  const getUniquePacketTypes = (): string[] => {
    const types = new Set<string>();
    Object.values(packagingForProducts).forEach(packagingList => {
      packagingList.forEach(pkg => types.add(pkg.packet_type));
    });
    return Array.from(types).sort();
  };

  const getUniqueCapacities = (): number[] => {
    const capacities = new Set<number>();
    Object.values(packagingForProducts).forEach(packagingList => {
      packagingList.forEach(pkg => capacities.add(pkg.holding_capacity));
    });
    return Array.from(capacities).sort((a, b) => a - b);
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

                        <div>
                          <label className="block text-sm font-medium mb-2">Batch Number (Optional)</label>
                          <input
                            type="text"
                            value={batchNumber || ''}
                            onChange={(e) => setBatchNumber(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Leave empty for auto-generation"
                          />
                          <p className="mt-1 text-xs text-muted-foreground">
                            Leave empty for auto-generation (BATCH-001, BATCH-002, etc.)
                          </p>
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
                          {/* Enhanced Filters */}
                          <div className="rounded-xl border border-border bg-gradient-to-br from-card to-muted/20 p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-5">
                              <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-primary/10">
                                  <Filter className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-semibold">Filter Packaging</h4>
                                  <p className="text-xs text-muted-foreground">Refine your packaging selection</p>
                                </div>
                              </div>
                              {(packagingFilters.capacities.length > 0 || 
                                packagingFilters.packetTypes.length > 0 || 
                                packagingFilters.vendorIds.length > 0 || 
                                packagingFilters.showOnlyAvailable || 
                                packagingFilters.searchText) && (
                                <button
                                  onClick={() => setPackagingFilters({
                                    capacities: [],
                                    packetTypes: [],
                                    vendorIds: [],
                                    showOnlyAvailable: false,
                                    searchText: '',
                                  })}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Clear All
                                </button>
                              )}
                            </div>

                            {/* Search Bar */}
                            <div className="mb-5">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                  type="text"
                                  value={packagingFilters.searchText}
                                  onChange={(e) => setPackagingFilters(prev => ({ ...prev, searchText: e.target.value }))}
                                  placeholder="Search by packet type or vendor name..."
                                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                                {packagingFilters.searchText && (
                                  <button
                                    onClick={() => setPackagingFilters(prev => ({ ...prev, searchText: '' }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                                  >
                                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Capacity Filter - Pills */}
                              <div className="space-y-2">
                                <label className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-3">
                                  Capacity
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  {[10, 25, 50].map(cap => {
                                    const isSelected = packagingFilters.capacities.includes(cap);
                                    return (
                                      <button
                                        key={cap}
                                        type="button"
                                        onClick={() => {
                                          if (isSelected) {
                                            setPackagingFilters(prev => ({
                                              ...prev,
                                              capacities: prev.capacities.filter(c => c !== cap)
                                            }));
                                          } else {
                                            setPackagingFilters(prev => ({
                                              ...prev,
                                              capacities: [...prev.capacities, cap]
                                            }));
                                          }
                                        }}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                          isSelected
                                            ? 'bg-primary text-primary-foreground shadow-sm scale-105'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border'
                                        }`}
                                      >
                                        {cap}kg
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Packet Type Filter - Card */}
                              <div className="space-y-2">
                                <label className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-3">
                                  Packet Type
                                </label>
                                <div className="max-h-32 overflow-y-auto space-y-1.5 p-2 rounded-lg border border-border bg-background/50">
                                  {getUniquePacketTypes().length > 0 ? (
                                    getUniquePacketTypes().map(type => {
                                      const isSelected = packagingFilters.packetTypes.includes(type);
                                      return (
                                        <label
                                          key={type}
                                          className={`flex items-center gap-2.5 cursor-pointer p-2 rounded-md transition-colors ${
                                            isSelected
                                              ? 'bg-primary/10 border border-primary/20'
                                              : 'hover:bg-muted/50'
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setPackagingFilters(prev => ({
                                                  ...prev,
                                                  packetTypes: [...prev.packetTypes, type]
                                                }));
                                              } else {
                                                setPackagingFilters(prev => ({
                                                  ...prev,
                                                  packetTypes: prev.packetTypes.filter(t => t !== type)
                                                }));
                                              }
                                            }}
                                            className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
                                          />
                                          <span className="text-sm">{type}</span>
                                          {isSelected && (
                                            <CheckCircle2 className="h-3.5 w-3.5 text-primary ml-auto" />
                                          )}
                                        </label>
                                      );
                                    })
                                  ) : (
                                    <p className="text-xs text-muted-foreground text-center py-2">No types available</p>
                                  )}
                                </div>
                              </div>

                              {/* Vendor Filter - Card */}
                              <div className="space-y-2">
                                <label className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-3">
                                  Vendor
                                </label>
                                <div className="max-h-32 overflow-y-auto space-y-1.5 p-2 rounded-lg border border-border bg-background/50">
                                  {packagingVendors.length > 0 ? (
                                    packagingVendors.map(vendor => {
                                      const isSelected = packagingFilters.vendorIds.includes(vendor.id);
                                      return (
                                        <label
                                          key={vendor.id}
                                          className={`flex items-center gap-2.5 cursor-pointer p-2 rounded-md transition-colors ${
                                            isSelected
                                              ? 'bg-primary/10 border border-primary/20'
                                              : 'hover:bg-muted/50'
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setPackagingFilters(prev => ({
                                                  ...prev,
                                                  vendorIds: [...prev.vendorIds, vendor.id]
                                                }));
                                              } else {
                                                setPackagingFilters(prev => ({
                                                  ...prev,
                                                  vendorIds: prev.vendorIds.filter(v => v !== vendor.id)
                                                }));
                                              }
                                            }}
                                            className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
                                          />
                                          <span className="text-sm flex-1 truncate">{vendor.name}</span>
                                          {isSelected && (
                                            <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                                          )}
                                        </label>
                                      );
                                    })
                                  ) : (
                                    <p className="text-xs text-muted-foreground text-center py-2">No vendors available</p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Availability Toggle */}
                            <div className="mt-4 pt-4 border-t border-border">
                              <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                  <input
                                    type="checkbox"
                                    checked={packagingFilters.showOnlyAvailable}
                                    onChange={(e) => setPackagingFilters(prev => ({ ...prev, showOnlyAvailable: e.target.checked }))}
                                    className="sr-only peer"
                                  />
                                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </div>
                                <div>
                                  <span className="text-sm font-medium">Show only available packaging</span>
                                  <p className="text-xs text-muted-foreground">Hide out-of-stock items</p>
                                </div>
                              </label>
                            </div>

                            {/* Active Filters Badges */}
                            {(packagingFilters.capacities.length > 0 || 
                              packagingFilters.packetTypes.length > 0 || 
                              packagingFilters.vendorIds.length > 0) && (
                              <div className="mt-4 pt-4 border-t border-border">
                                <div className="flex flex-wrap gap-2">
                                  {packagingFilters.capacities.map(cap => (
                                    <span
                                      key={cap}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                                    >
                                      {cap}kg
                                      <button
                                        onClick={() => setPackagingFilters(prev => ({
                                          ...prev,
                                          capacities: prev.capacities.filter(c => c !== cap)
                                        }))}
                                        className="hover:bg-primary/20 rounded-full p-0.5"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </span>
                                  ))}
                                  {packagingFilters.packetTypes.map(type => (
                                    <span
                                      key={type}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                                    >
                                      {type}
                                      <button
                                        onClick={() => setPackagingFilters(prev => ({
                                          ...prev,
                                          packetTypes: prev.packetTypes.filter(t => t !== type)
                                        }))}
                                        className="hover:bg-primary/20 rounded-full p-0.5"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </span>
                                  ))}
                                  {packagingFilters.vendorIds.map(vendorId => {
                                    const vendor = packagingVendors.find(v => v.id === vendorId);
                                    return (
                                      <span
                                        key={vendorId}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                                      >
                                        {vendor?.name || 'Unknown'}
                                        <button
                                          onClick={() => setPackagingFilters(prev => ({
                                            ...prev,
                                            vendorIds: prev.vendorIds.filter(v => v !== vendorId)
                                          }))}
                                          className="hover:bg-primary/20 rounded-full p-0.5"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Products with Packaging */}
                          {batchProducts.map((bp) => {
                            const product = products.find(p => p.id === bp.product_id);
                            const filteredPackaging = filterPackagingForProduct(bp.product_id);
                            const attachedPackaging = batchPackaging.filter(bpkg => bpkg.product_id === bp.product_id);
                            const selectedPkg = packagingQuantities[bp.product_id];
                            const selectedPackaging = filteredPackaging.find(p => p.id === selectedPkg?.packagingId);
                            const packetsNeeded = selectedPackaging && selectedPkg?.quantity 
                              ? getPacketsNeeded(selectedPkg.quantity, selectedPackaging.holding_capacity)
                              : 0;
                            
                            return (
                              <div key={bp.id} className="p-4 rounded-lg border border-border bg-card">
                                <h4 className="font-semibold mb-4">{product?.name || 'Unknown Product'}</h4>
                                
                                {filteredPackaging.length > 0 ? (
                                  <div className="space-y-4">
                                    {/* Packaging Selection */}
                                    <div className="space-y-2">
                                      <label className="block text-sm font-medium">Select Packaging</label>
                                      <select
                                        value={selectedPkg?.packagingId || ''}
                                        onChange={(e) => {
                                          const newPkgId = e.target.value;
                                          const currentQty = selectedPkg?.quantity || 0;
                                          handleQuantityChange(bp.product_id, newPkgId, currentQty);
                                        }}
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                      >
                                        <option value="">Select packaging</option>
                                        {filteredPackaging.map((pkg) => {
                                          const availability = getPackagingAvailabilityStatus(pkg);
                                          const vendor = getVendorForPackaging(pkg);
                                          const packagingNumber = pkg.packaging_number || '';
                                          return (
                                            <option key={pkg.id} value={pkg.id} disabled={availability.status === 'out_of_stock'}>
                                              {packagingNumber && `${packagingNumber} - `}{pkg.holding_capacity}kg {pkg.packet_type}
                                              {vendor && ` - ${vendor.name}`}
                                              {` (${availability.message})`}
                                            </option>
                                          );
                                        })}
                                      </select>
                                    </div>

                                    {/* Quantity Input with Real-time Validation */}
                                    {selectedPkg?.packagingId && (
                                      <div className="space-y-2">
                                        <label className="block text-sm font-medium">Quantity (kg)</label>
                                        <div className="flex gap-2">
                                          <input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={selectedPkg.quantity || ''}
                                            onChange={(e) => {
                                              const qty = parseFloat(e.target.value) || 0;
                                              handleQuantityChange(bp.product_id, selectedPkg.packagingId, qty);
                                            }}
                                            placeholder="Enter quantity"
                                            className={`flex-1 px-3 py-2 rounded-lg border ${
                                              packagingValidationErrors[bp.product_id] 
                                                ? 'border-destructive' 
                                                : 'border-border'
                                            } bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm`}
                                          />
                                          <button
                                            onClick={() => handleAddPackaging(bp.product_id)}
                                            disabled={loading || !!packagingValidationErrors[bp.product_id] || !selectedPkg.quantity || selectedPkg.quantity <= 0}
                                            className="btn-primary px-4 py-2 rounded-lg inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                          >
                                            <Plus className="h-3 w-3" /> Add
                                          </button>
                                        </div>
                                        
                                        {/* Validation Error */}
                                        {packagingValidationErrors[bp.product_id] && (
                                          <p className="text-xs text-destructive">{packagingValidationErrors[bp.product_id]}</p>
                                        )}

                                        {/* Real-time Info */}
                                        {selectedPackaging && selectedPkg.quantity > 0 && (
                                          <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm space-y-1">
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Packets needed:</span>
                                              <span className="font-medium">{packetsNeeded}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Available:</span>
                                              <span className="font-medium">{getAvailablePackets(selectedPackaging.id)} packets</span>
                                            </div>
                                            {selectedPackaging.packaging_vendor_id && (
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">Vendor:</span>
                                                <span className="font-medium">{getVendorForPackaging(selectedPackaging)?.name || 'Unknown'}</span>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Selected Packaging Display */}
                                    {selectedPackaging && (
                                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                                        <div className="flex items-start justify-between">
                                          <div>
                                            <div className="flex items-center gap-2 font-medium text-sm">
                                              {selectedPackaging.holding_capacity}kg {selectedPackaging.packet_type}
                                              {selectedPackaging.packaging_number && (
                                                <span className="text-xs font-mono font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                                  {selectedPackaging.packaging_number}
                                                </span>
                                              )}
                                            </div>
                                            {getVendorForPackaging(selectedPackaging) && (
                                              <div className="text-xs text-muted-foreground mt-1">
                                                Vendor: {getVendorForPackaging(selectedPackaging)?.name}
                                              </div>
                                            )}
                                            <div className="text-xs text-muted-foreground mt-1">
                                              {getPackagingAvailabilityStatus(selectedPackaging).message}
                                            </div>
                                          </div>
                                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            getPackagingAvailabilityStatus(selectedPackaging).status === 'available' 
                                              ? 'bg-green-500/10 text-green-600'
                                              : getPackagingAvailabilityStatus(selectedPackaging).status === 'low_stock'
                                              ? 'bg-yellow-500/10 text-yellow-600'
                                              : 'bg-red-500/10 text-red-600'
                                          }`}>
                                            {getPackagingAvailabilityStatus(selectedPackaging).status === 'available' ? 'Available' :
                                             getPackagingAvailabilityStatus(selectedPackaging).status === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Attached Packaging List */}
                                    {attachedPackaging.length > 0 && (
                                      <div className="space-y-2 pt-3 border-t border-border">
                                        <h5 className="text-xs font-semibold text-muted-foreground uppercase">Attached Packaging:</h5>
                                        {attachedPackaging.map((bpkg) => {
                                          const pkg = filteredPackaging.find(p => p.id === bpkg.packaging_id) || packagingForProducts[bp.product_id]?.find(p => p.id === bpkg.packaging_id);
                                          const packetsNeeded = pkg ? getPacketsNeeded(bpkg.quantity, pkg.holding_capacity) : 0;
                                          const vendor = pkg ? getVendorForPackaging(pkg) : null;
                                          return (
                                            <div key={bpkg.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
                                              <div>
                                                <div className="flex items-center gap-2">
                                                  <span className="font-medium">
                                                    {pkg?.holding_capacity}kg {pkg?.packet_type}
                                                  </span>
                                                  {pkg?.packaging_number && (
                                                    <span className="text-xs font-mono font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                                      {pkg.packaging_number}
                                                    </span>
                                                  )}
                                                </div>
                                                {vendor && (
                                                  <span className="text-muted-foreground ml-2">- {vendor.name}</span>
                                                )}
                                                <div className="text-xs text-muted-foreground mt-1">
                                                  {bpkg.quantity} kg ({packetsNeeded} packets)
                                                </div>
                                              </div>
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
                                  <p className="text-sm text-muted-foreground">No packaging available for this product (matching filters)</p>
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

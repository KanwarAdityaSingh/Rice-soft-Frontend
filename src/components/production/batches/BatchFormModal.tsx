import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X, AlertCircle, Calculator } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { AlertDialog } from '../../shared/AlertDialog';
import { useBatches } from '../../../hooks/useBatches';
import { useProducts } from '../../../hooks/useProducts';
import { useRecipes } from '../../../hooks/useRecipes';
import { usePackaging } from '../../../hooks/usePackaging';
import { useInventory } from '../../../hooks/useInventory';
import { lotsAPI } from '../../../services/lots.api';
import { inventoryAPI } from '../../../services/inventory.api';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import type { CreateBatchRequest, UpdateBatchRequest, BatchStatus, Lot, LotsInventory, Recipe } from '../../../types/entities';

interface BatchFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId?: string | null;
}

export function BatchFormModal({ open, onOpenChange, batchId }: BatchFormModalProps) {
  const { createBatch, updateBatch, batches } = useBatches();
  const { products } = useProducts();
  const { recipes } = useRecipes();
  const { packaging } = usePackaging();
  const { packets: packetsInventory } = useInventory();
  const [formData, setFormData] = useState<CreateBatchRequest>({
    product_id: '',
    recipe_id: '',
    packaging_id: '',
    quantity: 0,
    status: 'planned',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [lots, setLots] = useState<Lot[]>([]);
  const [lotsInventory, setLotsInventory] = useState<LotsInventory[]>([]);
  const [riceCodes, setRiceCodes] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // Load batch data if editing
  useEffect(() => {
    if (batchId && open) {
      const batch = batches.find((b) => b.id === batchId);
      if (batch) {
        setFormData({
          product_id: batch.product_id,
          recipe_id: batch.recipe_id,
          packaging_id: batch.packaging_id,
          quantity: batch.quantity,
          status: batch.status,
        });
      }
    } else if (open) {
      setFormData({
        product_id: '',
        recipe_id: '',
        packaging_id: '',
        quantity: 0,
        status: 'planned',
      });
    }
  }, [batchId, open, batches]);

  // Fetch lots and inventory when form opens
  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        setLoadingData(true);
        try {
          const [lotsData, inventoryData, riceCodesData] = await Promise.all([
            lotsAPI.getAllLots(),
            inventoryAPI.getLots(),
            riceCodesAPI.getAllRiceCodes(),
          ]);
          setLots(lotsData);
          setLotsInventory(inventoryData);
          setRiceCodes(riceCodesData);
        } catch (error: any) {
          console.error('Failed to fetch data:', error);
        } finally {
          setLoadingData(false);
        }
      };
      fetchData();
    }
  }, [open]);

  // Filter recipes by selected product
  const availableRecipes = formData.product_id
    ? recipes.filter((r) => {
        const product = products.find((p) => p.id === formData.product_id);
        return product?.recipes?.some((pr) => pr.id === r.id);
      })
    : [];

  // Get selected recipe
  const selectedRecipe = recipes.find((r) => r.id === formData.recipe_id);
  const selectedPackaging = packaging.find((p) => p.id === formData.packaging_id);

  // Calculate lot quantities and packets needed
  const calculateLotQuantities = () => {
    if (!selectedRecipe || !formData.quantity) return [];
    return selectedRecipe.formula.map((item) => {
      const lot = lots.find((l) => l.id === item.lot_id);
      const available = getAvailableQuantity(item.lot_id);
      const required = (formData.quantity * item.percentage) / 100;
      return {
        lot_id: item.lot_id,
        lot_number: lot?.lot_number || 'N/A',
        rice_code: getRiceCodeName(lot?.rice_code_id),
        percentage: item.percentage,
        required_quantity: required,
        available_quantity: available,
        sufficient: available >= required,
      };
    });
  };

  const calculatePacketsNeeded = () => {
    if (!selectedPackaging || !formData.quantity) return 0;
    return Math.ceil(formData.quantity / selectedPackaging.holding_capacity);
  };

  const getAvailableQuantity = (lotId: string): number => {
    const inventory = lotsInventory.find((li) => li.lot_id === lotId);
    if (!inventory) return 0;
    // Parse string to number (API returns as string)
    const quantity = typeof inventory.available_quantity === 'string' 
      ? parseFloat(inventory.available_quantity) 
      : inventory.available_quantity;
    return isNaN(quantity) ? 0 : quantity;
  };

  const getRiceCodeName = (riceCodeId: string | null | undefined): string => {
    if (!riceCodeId) return '';
    const riceCode = riceCodes.find((rc) => rc.rice_code_id === riceCodeId);
    return riceCode?.rice_code_name || '';
  };

  // Calculate maximum batch quantity
  const calculateMaxQuantity = () => {
    if (!selectedRecipe || selectedRecipe.formula.length === 0) return null;
    
    const allLotCalculations: Array<{ 
      lot: string; 
      riceCode: string;
      maxQty: number; 
      available: number; 
      percentage: number;
      isLimiting: boolean;
    }> = [];
    
    selectedRecipe.formula.forEach((item) => {
      const available = getAvailableQuantity(item.lot_id);
      const lot = lots.find((l) => l.id === item.lot_id);
      const riceCode = getRiceCodeName(lot?.rice_code_id);
      
      if (item.percentage > 0) {
        // Calculate: if we have X kg available at Y%, max batch = (X / Y) * 100
        const maxFromThisLot = available > 0 ? (available / item.percentage) * 100 : 0;
        allLotCalculations.push({
          lot: lot?.lot_number || 'N/A',
          riceCode: riceCode || 'N/A',
          maxQty: maxFromThisLot,
          available,
          percentage: item.percentage,
          isLimiting: false, // Will be set below
        });
      }
    });
    
    if (allLotCalculations.length === 0) return null;
    
    // Find the limiting lot (minimum max quantity)
    const limitingLot = allLotCalculations.reduce((min, current) => 
      current.maxQty < min.maxQty ? current : min
    );
    
    // Mark the limiting lot
    allLotCalculations.forEach((lot) => {
      lot.isLimiting = lot.lot === limitingLot.lot && lot.maxQty === limitingLot.maxQty;
    });
    
    // Also check packaging availability if selected
    let maxFromPackaging = null;
    let availablePacketsCount = null;
    if (selectedPackaging) {
      const packagingInv = packetsInventory.find((p) => p.packaging_id === selectedPackaging.id);
      if (packagingInv) {
        availablePacketsCount = typeof packagingInv.available_quantity === 'string'
          ? parseInt(packagingInv.available_quantity)
          : packagingInv.available_quantity || 0;
        if (availablePacketsCount > 0) {
          maxFromPackaging = availablePacketsCount * selectedPackaging.holding_capacity;
        }
      }
    }
    
    // Return the minimum of lot-based max and packaging-based max
    const finalMax = maxFromPackaging !== null
      ? Math.min(limitingLot.maxQty, maxFromPackaging)
      : limitingLot.maxQty;
    
    return {
      maxQuantity: finalMax,
      allLotCalculations,
      limitingLot,
      maxFromPackaging,
      availablePacketsCount,
    };
  };

  const maxQuantityInfo = calculateMaxQuantity();
  const lotQuantities = calculateLotQuantities();
  const packetsNeeded = calculatePacketsNeeded();
  const allLotsSufficient = lotQuantities.every((lq) => lq.sufficient);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.product_id) {
      newErrors.product_id = 'Product is required';
    }
    if (!formData.recipe_id) {
      newErrors.recipe_id = 'Recipe is required';
    }
    if (!formData.packaging_id) {
      newErrors.packaging_id = 'Packaging is required';
    }
    if (formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }
    if (maxQuantityInfo && formData.quantity > maxQuantityInfo.maxQuantity) {
      newErrors.quantity = `Quantity cannot exceed maximum available: ${maxQuantityInfo.maxQuantity.toFixed(2)} kg`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (batchId) {
        await updateBatch(batchId, formData as UpdateBatchRequest);
        setAlertType('success');
        setAlertTitle('Batch Updated');
        setAlertMessage('Batch has been updated successfully.');
      } else {
        await createBatch(formData);
        setAlertType('success');
        setAlertTitle('Batch Created');
        setAlertMessage('Batch has been created successfully. Inventory has been updated automatically.');
      }
      setAlertOpen(true);
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error?.message || 'Failed to save batch. Please try again.');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background rounded-2xl shadow-xl z-50 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-border/60">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-2xl font-bold">
                  {batchId ? 'Edit Batch' : 'Create Batch'}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>
              <Dialog.Description className="sr-only">
                {batchId ? 'Edit batch details and update inventory' : 'Create a new batch by selecting product, recipe, packaging, and quantity'}
              </Dialog.Description>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Product Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">Product *</label>
                  <select
                    value={formData.product_id}
                    onChange={(e) => {
                      setFormData({ ...formData, product_id: e.target.value, recipe_id: '' });
                      if (errors.product_id) setErrors({ ...errors, product_id: '' });
                    }}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select Product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                  {errors.product_id && (
                    <p className="mt-1 text-sm text-destructive">{errors.product_id}</p>
                  )}
                </div>

                {/* Recipe Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">Recipe *</label>
                  <select
                    value={formData.recipe_id}
                    onChange={(e) => {
                      setFormData({ ...formData, recipe_id: e.target.value });
                      if (errors.recipe_id) setErrors({ ...errors, recipe_id: '' });
                    }}
                    disabled={!formData.product_id || availableRecipes.length === 0}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  >
                    <option value="">
                      {!formData.product_id
                        ? 'Select a product first'
                        : availableRecipes.length === 0
                        ? 'No recipes available for this product'
                        : 'Select Recipe'}
                    </option>
                    {availableRecipes.map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.recipe_name}
                      </option>
                    ))}
                  </select>
                  {errors.recipe_id && (
                    <p className="mt-1 text-sm text-destructive">{errors.recipe_id}</p>
                  )}
                </div>

                {/* Packaging Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">Packaging *</label>
                  <select
                    value={formData.packaging_id}
                    onChange={(e) => {
                      setFormData({ ...formData, packaging_id: e.target.value });
                      if (errors.packaging_id) setErrors({ ...errors, packaging_id: '' });
                    }}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select Packaging</option>
                    {packaging.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.packet_type} ({pkg.holding_capacity} kg){pkg.source ? ` - ${pkg.source}` : ''}
                      </option>
                    ))}
                  </select>
                  {errors.packaging_id && (
                    <p className="mt-1 text-sm text-destructive">{errors.packaging_id}</p>
                  )}
                </div>

                {/* Quantity */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">Batch Quantity (kg) *</label>
                    {maxQuantityInfo && selectedRecipe && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, quantity: maxQuantityInfo.maxQuantity });
                          if (errors.quantity) setErrors({ ...errors, quantity: '' });
                        }}
                        className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                      >
                        Use Max: {maxQuantityInfo.maxQuantity.toFixed(2)} kg
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={maxQuantityInfo ? maxQuantityInfo.maxQuantity : undefined}
                    value={formData.quantity || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      const newErrors = { ...errors };
                      
                      // Validate against maximum
                      if (maxQuantityInfo && value > maxQuantityInfo.maxQuantity) {
                        newErrors.quantity = `Quantity cannot exceed maximum available: ${maxQuantityInfo.maxQuantity.toFixed(2)} kg`;
                      } else if (newErrors.quantity && newErrors.quantity.includes('exceed')) {
                        delete newErrors.quantity;
                      }
                      
                      setFormData({ ...formData, quantity: value });
                      setErrors(newErrors);
                    }}
                    onBlur={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      if (maxQuantityInfo && value > maxQuantityInfo.maxQuantity) {
                        setFormData({ ...formData, quantity: maxQuantityInfo.maxQuantity });
                        setErrors({ ...errors, quantity: '' });
                      }
                    }}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                    style={{
                      WebkitAppearance: 'none',
                      MozAppearance: 'textfield',
                    }}
                    placeholder="e.g., 1000"
                  />
                  {errors.quantity && (
                    <p className="mt-1 text-sm text-destructive">{errors.quantity}</p>
                  )}
                  {maxQuantityInfo && selectedRecipe && (
                    <div className="mt-2 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-4">
                      <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <div>
                          <div className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
                            Maximum Batch Quantity: <span className="text-lg font-bold">{maxQuantityInfo.maxQuantity.toFixed(2)} kg</span>
                          </div>
                          <div className="text-[10px] text-blue-700 dark:text-blue-300 mt-0.5">
                            This is the minimum of all lot calculations below
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="text-xs font-semibold text-blue-800 dark:text-blue-200">
                          Maximum Quantity Based on Each Lot:
                        </div>
                        {maxQuantityInfo.allLotCalculations.map((lotCalc, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg text-xs ${
                              lotCalc.isLimiting
                                ? 'bg-amber-500/20 border-2 border-amber-500/60'
                                : 'bg-blue-500/5 border border-blue-500/20'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{lotCalc.lot}</span>
                                  {lotCalc.isLimiting && (
                                    <span className="px-2 py-0.5 bg-amber-500/40 text-amber-900 dark:text-amber-100 rounded text-[10px] font-bold">
                                      ⚠ LIMITING FACTOR
                                    </span>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-sm">
                                    {lotCalc.maxQty.toFixed(2)} kg
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    max batch
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-[10px] text-muted-foreground">
                                {lotCalc.riceCode} • Recipe: {lotCalc.percentage}%
                              </div>
                              
                              <div className="pt-1.5 border-t border-current/10">
                                <div className="text-[10px] font-medium text-blue-800 dark:text-blue-200 mb-1">
                                  Calculation:
                                </div>
                                <div className="text-[10px] text-blue-700 dark:text-blue-300 font-mono bg-blue-500/10 p-1.5 rounded">
                                  Available: {lotCalc.available.toFixed(2)} kg ÷ {lotCalc.percentage}% × 100 = <span className="font-bold">{lotCalc.maxQty.toFixed(2)} kg</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-1.5">
                                  With {lotCalc.available.toFixed(2)} kg available at {lotCalc.percentage}% of the recipe, 
                                  you can create up to <span className="font-semibold">{lotCalc.maxQty.toFixed(2)} kg</span> of batch.
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {maxQuantityInfo.availablePacketsCount !== null && maxQuantityInfo.availablePacketsCount > 0 && (
                        <div className="pt-3 border-t border-blue-500/20">
                          <div className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1">
                            Packaging Constraint:
                          </div>
                          <div className="text-xs text-blue-700 dark:text-blue-300">
                            Available: <span className="font-semibold">{maxQuantityInfo.availablePacketsCount} packets</span>
                            {maxQuantityInfo.maxFromPackaging !== null && (
                              <>
                                {' '}• Capacity: <span className="font-semibold">{maxQuantityInfo.maxFromPackaging.toFixed(2)} kg</span>
                                {maxQuantityInfo.maxFromPackaging < maxQuantityInfo.maxQuantity && (
                                  <span className="ml-1 text-amber-600">(Limiting factor)</span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="pt-2 border-t border-blue-500/20 bg-blue-500/5 p-2 rounded">
                        <div className="text-[10px] font-semibold text-blue-900 dark:text-blue-100 mb-1">
                          💡 How it works:
                        </div>
                        <div className="text-[10px] text-blue-700 dark:text-blue-300 leading-relaxed">
                          Each lot can only support a certain batch quantity based on its available inventory and percentage in the recipe. 
                          The <span className="font-semibold">limiting lot</span> is the one with the <span className="font-semibold">smallest maximum</span>, 
                          which determines your overall maximum batch quantity. You cannot exceed this amount because that lot would run out.
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status (only for editing) */}
                {batchId && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value as BatchStatus })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="planned">Planned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                )}

                {/* Calculations Preview */}
                {selectedRecipe && formData.quantity > 0 && (
                  <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Calculator className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Calculations Preview</h3>
                    </div>

                    {/* Lot Breakdown */}
                    {lotQuantities.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Lot Requirements:</h4>
                        <div className="space-y-2">
                          {lotQuantities.map((lq, idx) => (
                            <div
                              key={idx}
                              className={`p-2 rounded text-sm ${
                                lq.sufficient ? 'bg-emerald-500/10' : 'bg-destructive/10'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>
                                  {lq.lot_number} ({lq.rice_code}) - {lq.percentage}%
                                </span>
                                <span className={lq.sufficient ? 'text-emerald-600' : 'text-destructive'}>
                                  {lq.required_quantity.toFixed(2)} kg / {lq.available_quantity.toFixed(2)} kg
                                  {!lq.sufficient && (
                                    <AlertCircle className="h-4 w-4 inline ml-1" />
                                  )}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                        {!allLotsSufficient && (
                          <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <span>Some lots have insufficient inventory</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Packets Needed */}
                    {selectedPackaging && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Packets Needed:</h4>
                        <p className="text-sm">
                          {packetsNeeded} packets of {selectedPackaging.packet_type} ({selectedPackaging.holding_capacity} kg each)
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Dialog.Close asChild>
                    <button type="button" className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors">
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={loading || (formData.quantity > 0 && !allLotsSufficient)}
                    className="btn-primary px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <LoadingSpinner /> : batchId ? 'Update Batch' : 'Create Batch'}
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


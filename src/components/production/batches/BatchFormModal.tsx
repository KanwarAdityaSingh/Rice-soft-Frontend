import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X, AlertCircle, Calculator, Package } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { AlertDialog } from '../../shared/AlertDialog';
import { useBatches } from '../../../hooks/useBatches';
import { useProducts } from '../../../hooks/useProducts';
import { useRecipes } from '../../../hooks/useRecipes';
import { usePackaging } from '../../../hooks/usePackaging';
import { packagingAPI } from '../../../services/packaging.api';
import { useInventory } from '../../../hooks/useInventory';
import { lotsAPI } from '../../../services/lots.api';
import { inventoryAPI } from '../../../services/inventory.api';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import type { CreateBatchRequest, UpdateBatchRequest, BatchStatus, Lot, LotsInventory, Recipe, PackagingQuantity } from '../../../types/entities';

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
    packaging_quantities: [
      { weight: 10, quantity: 0, enabled: false },
      { weight: 25, quantity: 0, enabled: false },
      { weight: 50, quantity: 0, enabled: false },
    ] as any,
    status: 'planned',
  });
  const [productPackaging, setProductPackaging] = useState<any[]>([]);
  const [loadingPackaging, setLoadingPackaging] = useState(false);
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
        // For editing, use old format (backward compatible)
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
        packaging_quantities: [
          { weight: 10, quantity: 0, enabled: false },
          { weight: 25, quantity: 0, enabled: false },
          { weight: 50, quantity: 0, enabled: false },
        ] as any,
        status: 'planned',
      });
      setProductPackaging([]);
    }
  }, [batchId, open, batches]);

  // Fetch packaging for selected product
  useEffect(() => {
    if (formData.product_id && open && !batchId) {
      let cancelled = false;
      const fetchPackaging = async () => {
        setLoadingPackaging(true);
        try {
          const packagingData = await packagingAPI.getAllPackaging(formData.product_id);
          if (cancelled) return;
          
          setProductPackaging(packagingData);
          // Initialize packaging_quantities with available weights
          setFormData(prev => {
            // Only update if packaging_quantities is not already initialized
            const hasInitialized = (prev.packaging_quantities as any)?.some((pq: any) => pq.packaging);
            if (hasInitialized) return prev;
            
            return {
              ...prev,
              packaging_quantities: [10, 25, 50].map(weight => {
                const existing = (prev.packaging_quantities as any)?.find((pq: any) => pq.weight === weight);
                return existing || {
                  weight: weight as 10 | 25 | 50,
                  quantity: 0,
                  enabled: false,
                  packaging: packagingData.find(p => parseFloat(p.holding_capacity.toString()) === weight)
                };
              })
            };
          });
        } catch (error) {
          if (cancelled) return;
          console.error('Failed to fetch packaging:', error);
          setProductPackaging([]);
        } finally {
          if (!cancelled) {
            setLoadingPackaging(false);
          }
        }
      };
      fetchPackaging();
      
      return () => {
        cancelled = true;
      };
    } else if (!formData.product_id) {
      setProductPackaging([]);
    }
  }, [formData.product_id, open, batchId]);

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
  
  // Calculate total quantity from packaging_quantities
  const totalQuantity = formData.packaging_quantities
    ? (formData.packaging_quantities as any[])
        .filter((pq: any) => pq.enabled && pq.quantity > 0)
        .reduce((sum: number, pq: any) => sum + (pq.quantity || 0), 0)
    : (formData.quantity || 0);

  // Calculate lot quantities and packets needed
  const calculateLotQuantities = () => {
    if (!selectedRecipe || !totalQuantity || totalQuantity <= 0) return [];
    return selectedRecipe.formula.map((item) => {
      const lot = lots.find((l) => l.id === item.lot_id);
      const available = getAvailableQuantity(item.lot_id);
      const required = (totalQuantity * item.percentage) / 100;
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
    if (!formData.packaging_quantities || totalQuantity <= 0) return [];
    return (formData.packaging_quantities as any[])
      .filter((pq: any) => pq.enabled && pq.quantity > 0)
      .map((pq: any) => ({
        weight: pq.weight,
        quantity: pq.quantity,
        packets: Math.ceil(pq.quantity / pq.weight),
        packaging: productPackaging.find(p => parseFloat(p.holding_capacity.toString()) === pq.weight)
      }));
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
    
    // Check packaging availability for all sizes
    let maxFromPackaging = null;
    let packagingConstraints: Array<{ 
      weight: number; 
      packetType: string;
      available: number; 
      maxQty: number;
      holdingCapacity: number;
      isLimiting: boolean;
    }> = [];
    
    if (productPackaging.length > 0) {
      productPackaging.forEach((pkg) => {
        const packagingInv = packetsInventory.find((p) => p.packaging_id === pkg.id);
        if (packagingInv) {
          const availablePacketsCount = typeof packagingInv.available_quantity === 'string'
            ? parseInt(packagingInv.available_quantity)
            : packagingInv.available_quantity || 0;
          const holdingCapacity = parseFloat(pkg.holding_capacity.toString());
          if (availablePacketsCount > 0) {
            const maxQty = availablePacketsCount * holdingCapacity;
            packagingConstraints.push({
              weight: holdingCapacity,
              packetType: pkg.packet_type,
              available: availablePacketsCount,
              maxQty,
              holdingCapacity,
              isLimiting: false, // Will be set below
            });
            if (maxFromPackaging === null || maxQty < maxFromPackaging) {
              maxFromPackaging = maxQty;
            }
          } else {
            // Include even if no packets available (for display purposes)
            packagingConstraints.push({
              weight: holdingCapacity,
              packetType: pkg.packet_type,
              available: 0,
              maxQty: 0,
              holdingCapacity,
              isLimiting: false,
            });
          }
        } else {
          // Include packaging that exists but has no inventory
          const holdingCapacity = parseFloat(pkg.holding_capacity.toString());
          packagingConstraints.push({
            weight: holdingCapacity,
            packetType: pkg.packet_type,
            available: 0,
            maxQty: 0,
            holdingCapacity,
            isLimiting: false,
          });
        }
      });
    }
    
    // Mark limiting packaging constraints
    if (maxFromPackaging !== null && limitingLot) {
      const overallMax = Math.min(limitingLot.maxQty, maxFromPackaging);
      packagingConstraints.forEach((pc) => {
        pc.isLimiting = pc.maxQty > 0 && pc.maxQty === maxFromPackaging && pc.maxQty < limitingLot.maxQty;
      });
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
      packagingConstraints,
    };
  };

  const maxQuantityInfo = calculateMaxQuantity();
  const lotQuantities = calculateLotQuantities();
  const packetsNeeded = calculatePacketsNeeded();
  const allLotsSufficient = lotQuantities.every((lq) => lq.sufficient);
  
  // Check if at least one packaging quantity is enabled
  const hasPackagingQuantities = formData.packaging_quantities
    ? (formData.packaging_quantities as any[]).some((pq: any) => pq.enabled && pq.quantity > 0)
    : false;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.product_id) {
      newErrors.product_id = 'Product is required';
    }
    if (!formData.recipe_id) {
      newErrors.recipe_id = 'Recipe is required';
    }
    
    // For new batches, validate packaging_quantities
    if (!batchId) {
      if (!formData.packaging_quantities || !hasPackagingQuantities) {
        newErrors.packaging_quantities = 'At least one packaging quantity is required';
      } else {
        // Validate each enabled quantity
        (formData.packaging_quantities as any[]).forEach((pq: any, index: number) => {
          if (pq.enabled) {
            if (pq.quantity <= 0) {
              newErrors[`packaging_quantities.${index}.quantity`] = 'Quantity must be greater than 0';
            }
            if (![10, 25, 50].includes(pq.weight)) {
              newErrors[`packaging_quantities.${index}.weight`] = 'Weight must be 10, 25, or 50';
            }
          }
        });
      }
      
      if (totalQuantity <= 0) {
        newErrors.quantity = 'Total quantity must be greater than 0';
      }
      if (maxQuantityInfo && totalQuantity > maxQuantityInfo.maxQuantity) {
        newErrors.quantity = `Total quantity cannot exceed maximum available: ${maxQuantityInfo.maxQuantity.toFixed(2)} kg`;
      }
    } else {
      // For editing, use old validation
    if (!formData.packaging_id) {
      newErrors.packaging_id = 'Packaging is required';
    }
      if ((formData.quantity || 0) <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }
      if (maxQuantityInfo && (formData.quantity || 0) > maxQuantityInfo.maxQuantity) {
      newErrors.quantity = `Quantity cannot exceed maximum available: ${maxQuantityInfo.maxQuantity.toFixed(2)} kg`;
      }
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
        // For editing, use old format
        await updateBatch(batchId, formData as UpdateBatchRequest);
        setAlertType('success');
        setAlertTitle('Batch Updated');
        setAlertMessage('Batch has been updated successfully.');
      } else {
        // For new batches, use packaging_quantities format
        const packagingQuantities = (formData.packaging_quantities as any[])
          .filter((pq: any) => pq.enabled && pq.quantity > 0)
          .map((pq: any) => ({ weight: pq.weight, quantity: pq.quantity }));
        
        const payload: CreateBatchRequest = {
          product_id: formData.product_id,
          recipe_id: formData.recipe_id,
          packaging_quantities: packagingQuantities,
          status: formData.status,
        };
        
        await createBatch(payload);
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

                {/* Packaging Quantities Selection (New Format) */}
                {!batchId && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Packaging Quantities *</label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Select packaging sizes and specify quantity (kg) for each. At least one is required.
                    </p>
                    {loadingPackaging && formData.product_id ? (
                      <div className="flex justify-center py-4">
                        <LoadingSpinner />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {[10, 25, 50].map((weight) => {
                          const pq = (formData.packaging_quantities as any[])?.find((p: any) => p.weight === weight);
                          const pkg = productPackaging.find((p) => parseFloat(p.holding_capacity.toString()) === weight);
                          const isEnabled = pq?.enabled || false;
                          const quantity = pq?.quantity || 0;
                          const errorKey = `packaging_quantities.${(formData.packaging_quantities as any[])?.findIndex((p: any) => p.weight === weight)}.quantity`;
                          
                          return (
                            <div
                              key={weight}
                              className={`p-3 rounded-lg border ${
                                isEnabled ? 'border-primary/40 bg-primary/5' : 'border-border bg-background'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={isEnabled}
                                  onChange={(e) => {
                                    const updated = (formData.packaging_quantities as any[]).map((p: any) =>
                                      p.weight === weight
                                        ? { ...p, enabled: e.target.checked, quantity: e.target.checked ? p.quantity : 0 }
                                        : p
                                    );
                                    setFormData({ ...formData, packaging_quantities: updated });
                                    if (errors.packaging_quantities) {
                                      const newErrors = { ...errors };
                                      delete newErrors.packaging_quantities;
                                      delete newErrors[errorKey];
                                      setErrors(newErrors);
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
                                  disabled={!pkg}
                                />
                                <label className="flex-1 flex items-center gap-2 cursor-pointer">
                                  <span className="font-medium">{weight}kg</span>
                                  {pkg && (
                                    <span className="text-xs text-muted-foreground">
                                      ({pkg.packet_type})
                                    </span>
                                  )}
                                  {!pkg && formData.product_id && (
                                    <span className="text-xs text-destructive">
                                      (Packaging not available for this product)
                                    </span>
                                  )}
                                </label>
                                {isEnabled && (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      value={quantity || ''}
                                      onChange={(e) => {
                                        const value = parseFloat(e.target.value) || 0;
                                        const updated = (formData.packaging_quantities as any[]).map((p: any) =>
                                          p.weight === weight ? { ...p, quantity: value } : p
                                        );
                                        setFormData({ ...formData, packaging_quantities: updated });
                                        if (errors[errorKey]) {
                                          const newErrors = { ...errors };
                                          delete newErrors[errorKey];
                                          setErrors(newErrors);
                                        }
                                      }}
                                      className="w-24 px-3 py-1.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                      placeholder="kg"
                                      disabled={!isEnabled}
                                    />
                                    <span className="text-sm text-muted-foreground">kg</span>
                                    {quantity > 0 && (
                                      <span className="text-xs text-muted-foreground">
                                        ({Math.ceil(quantity / weight)} packets)
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              {errors[errorKey] && (
                                <p className="mt-1 text-xs text-destructive ml-7">{errors[errorKey]}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {errors.packaging_quantities && (
                      <p className="mt-2 text-sm text-destructive">{errors.packaging_quantities}</p>
                    )}
                    {totalQuantity > 0 && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Total Quantity:</span>
                          <span className="text-lg font-bold">{totalQuantity.toFixed(2)} kg</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Packaging Selection (Old Format for Editing) */}
                {batchId && (
                <div>
                  <label className="block text-sm font-medium mb-2">Packaging *</label>
                  <select
                      value={formData.packaging_id || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, packaging_id: e.target.value });
                      if (errors.packaging_id) setErrors({ ...errors, packaging_id: '' });
                    }}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select Packaging</option>
                      {productPackaging.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.packet_type} ({pkg.holding_capacity} kg){pkg.source ? ` - ${pkg.source}` : ''}
                      </option>
                    ))}
                  </select>
                  {errors.packaging_id && (
                    <p className="mt-1 text-sm text-destructive">{errors.packaging_id}</p>
                  )}
                </div>
                )}

                {/* Quantity (Only for editing old batches) */}
                {batchId && (
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
                    {maxQuantityInfo && selectedRecipe && (formData.quantity || 0) > 0 && (
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
                      
                      {maxQuantityInfo.packagingConstraints && maxQuantityInfo.packagingConstraints.length > 0 && (
                        <div className="pt-3 border-t border-blue-500/20">
                          <div className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-2">
                            Packaging Constraints:
                          </div>
                          <div className="space-y-1">
                            {maxQuantityInfo.packagingConstraints.map((pc: any, idx: number) => (
                              <div key={idx} className="text-xs text-blue-700 dark:text-blue-300">
                                {pc.weight}kg: <span className="font-semibold">{pc.available} packets</span>
                                {' '}• Max: <span className="font-semibold">{pc.maxQty.toFixed(2)} kg</span>
                                {pc.maxQty < maxQuantityInfo.maxQuantity && (
                                  <span className="ml-1 text-amber-600">(Limiting)</span>
                                )}
                              </div>
                            ))}
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
                )}
                
                {/* Summary Section for New Batches */}
                {!batchId && maxQuantityInfo && selectedRecipe && (
                  <div className="space-y-4">
                    {/* Total Quantity Display */}
                    {totalQuantity > 0 && (
                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            Total Batch Quantity:
                          </span>
                          <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                            {totalQuantity.toFixed(2)} kg
                          </span>
                        </div>
                        {totalQuantity > maxQuantityInfo.maxQuantity && (
                          <p className="text-xs text-destructive mt-1">
                            Total quantity exceeds maximum available: {maxQuantityInfo.maxQuantity.toFixed(2)} kg
                          </p>
                        )}
                      </div>
                    )}

                    {/* Packet Types Summary - PRIMARY FOCUS */}
                    {maxQuantityInfo.packagingConstraints && maxQuantityInfo.packagingConstraints.length > 0 && (
                      <div className="p-4 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-2 border-purple-500/30 rounded-xl space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                          <Package className="h-5 w-5 text-purple-600 flex-shrink-0" />
                          <div>
                            <div className="font-bold text-purple-900 dark:text-purple-100 text-base">
                              Available Packet Types & Maximum Quantities
                            </div>
                            <div className="text-xs text-purple-700 dark:text-purple-300 mt-0.5">
                              Maximum quantity you can produce with each packet type
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {[10, 25, 50].map((weight) => {
                            const pc = maxQuantityInfo.packagingConstraints.find(
                              (p: any) => p.weight === weight
                            );
                            if (!pc) return null;

                            const isAvailable = pc.available > 0;
                            const maxQtyForThisType = pc.maxQty;
                            const isLimiting = pc.isLimiting || (maxQtyForThisType > 0 && maxQtyForThisType < maxQuantityInfo.maxQuantity);

                            return (
                              <div
                                key={weight}
                                className={`p-4 rounded-lg border-2 ${
                                  isAvailable
                                    ? isLimiting
                                      ? 'bg-amber-500/20 border-amber-500/60'
                                      : 'bg-purple-500/10 border-purple-500/30'
                                    : 'bg-gray-500/10 border-gray-500/20 opacity-60'
                                }`}
                              >
                                <div className="space-y-2">
                                  {/* Header */}
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-2xl font-bold text-foreground">
                                          {weight}kg
                                        </span>
                                        {isLimiting && isAvailable && (
                                          <span className="px-2 py-0.5 bg-amber-500/40 text-amber-900 dark:text-amber-100 rounded text-[10px] font-bold">
                                            ⚠ LIMITING
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-0.5">
                                        {pc.packetType}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Available Packets */}
                                  <div className="pt-2 border-t border-current/20">
                                    <div className="text-xs text-muted-foreground mb-1">
                                      Available Packets:
                                    </div>
                                    <div className={`text-lg font-bold ${isAvailable ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                                      {pc.available.toLocaleString('en-IN')} pcs
                                    </div>
                                  </div>

                                  {/* Maximum Quantity */}
                                  <div className="pt-2 border-t border-current/20">
                                    <div className="text-xs text-muted-foreground mb-1">
                                      Maximum Quantity:
                                    </div>
                                    <div className={`text-xl font-bold ${isAvailable ? 'text-purple-600 dark:text-purple-400' : 'text-muted-foreground'}`}>
                                      {maxQtyForThisType.toFixed(2)} kg
                                    </div>
                                    {isAvailable && (
                                      <div className="text-[10px] text-muted-foreground mt-1 font-mono bg-purple-500/10 p-1.5 rounded">
                                        {pc.available} packets × {pc.holdingCapacity}kg = {maxQtyForThisType.toFixed(2)}kg
                                      </div>
                                    )}
                                    {!isAvailable && (
                                      <div className="text-[10px] text-destructive mt-1">
                                        No packets available
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Overall Maximum & Lot Details */}
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-4">
                      <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <div>
                          <div className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
                            Overall Maximum Batch Quantity: <span className="text-lg font-bold">{maxQuantityInfo.maxQuantity.toFixed(2)} kg</span>
                          </div>
                          <div className="text-[10px] text-blue-700 dark:text-blue-300 mt-0.5">
                            Limited by: {maxQuantityInfo.maxFromPackaging !== null && maxQuantityInfo.maxFromPackaging < maxQuantityInfo.limitingLot.maxQty
                              ? 'Packaging availability'
                              : 'Raw material lots'}
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
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="pt-2 border-t border-blue-500/20 bg-blue-500/5 p-2 rounded">
                        <div className="text-[10px] font-semibold text-blue-900 dark:text-blue-100 mb-1">
                          💡 How it works:
                        </div>
                        <div className="text-[10px] text-blue-700 dark:text-blue-300 leading-relaxed">
                          Your maximum batch quantity is determined by the <span className="font-semibold">smallest</span> of:
                          <ul className="list-disc list-inside mt-1 space-y-0.5">
                            <li>Raw material lot availability (based on recipe percentages)</li>
                            <li>Empty packet availability (packets × weight per packet)</li>
                          </ul>
                          The overall maximum is the minimum of these constraints.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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
                {selectedRecipe && totalQuantity > 0 && (
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
                    {packetsNeeded.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Packets Needed:</h4>
                        <div className="space-y-1">
                          {packetsNeeded.map((pn: any, idx: number) => (
                            <p key={idx} className="text-sm">
                              {pn.packets} packets of {pn.packaging?.packet_type || 'N/A'} ({pn.weight}kg each) = {pn.quantity.toFixed(2)} kg
                            </p>
                          ))}
                        </div>
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
                    disabled={loading || (totalQuantity > 0 && !allLotsSufficient) || (!batchId && !hasPackagingQuantities)}
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


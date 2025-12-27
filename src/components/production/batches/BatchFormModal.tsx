import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X, AlertCircle, Calculator } from 'lucide-react';
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
  const { packets: packetsInventory, refetch: refetchInventory } = useInventory();
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
  const [totalQuantityInput, setTotalQuantityInput] = useState<number>(0);

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
      setTotalQuantityInput(0);
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
          // Also refresh packets inventory from the hook
          refetchInventory();
        } catch (error: any) {
          console.error('Failed to fetch data:', error);
        } finally {
          setLoadingData(false);
        }
      };
      fetchData();
    }
  }, [open, refetchInventory]);

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

  // Helper function to get number of packets for a packaging quantity
  const getPacketsCount = (pq: any): number => {
    if (!pq || !pq.enabled || pq.quantity <= 0) return 0;
    return Math.floor(pq.quantity / pq.weight);
  };

  // Helper function to distribute total quantity across enabled packet types
  const distributeTotalQuantity = (totalQty: number, enabledWeights: number[]): Record<number, number> => {
    if (enabledWeights.length === 0) return {};
    
    // If only one type is enabled, give all to that type (rounded to nearest whole packet)
    if (enabledWeights.length === 1) {
      const weight = enabledWeights[0];
      const packets = Math.round(totalQty / weight);
      return { [weight]: packets * weight };
    }
    
    // Distribute proportionally based on weight (larger packets get more)
    const totalWeight = enabledWeights.reduce((sum, w) => sum + w, 0);
    const distribution: Record<number, number> = {};
    
    // Calculate ideal packets for each type (can be fractional)
    const idealPackets: Record<number, number> = {};
    
    enabledWeights.forEach(weight => {
      const proportion = weight / totalWeight;
      const idealQty = totalQty * proportion;
      idealPackets[weight] = idealQty / weight;
    });
    
    // Start with floor of each (round down)
    const packets: Record<number, number> = {};
    let currentTotal = 0;
    
    enabledWeights.forEach(weight => {
      packets[weight] = Math.floor(idealPackets[weight]);
      currentTotal += packets[weight] * weight;
    });
    
    // Calculate remainder
    let remainder = totalQty - currentTotal;
    
    // Distribute remainder optimally by trying all combinations
    // Sort weights by how much they need (difference from ideal)
    const sortedWeights = [...enabledWeights].sort((a, b) => {
      const needA = idealPackets[a] - packets[a]; // How much more this type needs
      const needB = idealPackets[b] - packets[b];
      return needB - needA; // Sort descending (most needed first)
    });
    
    // Try to add packets to minimize the difference from target
    while (remainder > 0) {
      let bestWeight: number | null = null;
      let bestDiff = Infinity;
      let bestNewTotal = currentTotal;
      
      // Try adding one packet of each type and see which gets us closest
      for (const weight of sortedWeights) {
        const newTotal = currentTotal + weight;
        const diff = Math.abs(newTotal - totalQty);
        
        // Prefer options that don't exceed target, but if all exceed, pick smallest overage
        if (newTotal <= totalQty) {
          if (diff < bestDiff || (bestNewTotal > totalQty && newTotal <= totalQty)) {
            bestDiff = diff;
            bestWeight = weight;
            bestNewTotal = newTotal;
          }
        } else if (bestNewTotal > totalQty) {
          // If we're already over, pick the one that's least over
          if (newTotal < bestNewTotal) {
            bestDiff = diff;
            bestWeight = weight;
            bestNewTotal = newTotal;
          }
        }
      }
      
      if (bestWeight !== null) {
        packets[bestWeight]++;
        currentTotal = bestNewTotal;
        remainder = totalQty - currentTotal;
        
        // If we're very close (within 1% or 5kg), stop
        if (Math.abs(remainder) < Math.min(totalQty * 0.01, 5)) {
          break;
        }
      } else {
        break; // Can't add any more packets
      }
    }
    
    // Convert back to quantities
    enabledWeights.forEach(weight => {
      distribution[weight] = packets[weight] * weight;
    });
    
    return distribution;
  };

  // Helper function to redistribute when one packet type is edited
  const redistributePackets = (editedWeight: number, editedPackets: number, totalQty: number): Record<number, number> => {
    const enabledPQs = (formData.packaging_quantities as any[]).filter((pq: any) => pq.enabled);
    const otherEnabledWeights = enabledPQs
      .filter((pq: any) => pq.weight !== editedWeight)
      .map((pq: any) => pq.weight);
    
    if (otherEnabledWeights.length === 0) {
      // Only one type enabled, return just that
      return { [editedWeight]: editedPackets * editedWeight };
    }
    
    // Calculate weight used by edited type
    const editedWeightUsed = editedPackets * editedWeight;
    const remainingWeight = totalQty - editedWeightUsed;
    
    if (remainingWeight <= 0) {
      // If edited type uses all or more, set others to 0
      const result: Record<number, number> = { [editedWeight]: editedWeightUsed };
      otherEnabledWeights.forEach(w => { result[w] = 0; });
      return result;
    }
    
    // Distribute remaining weight to other types
    const distribution = distributeTotalQuantity(remainingWeight, otherEnabledWeights);
    return { [editedWeight]: editedWeightUsed, ...distribution };
  };

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

  // Get available packets for a specific packaging weight
  const getAvailablePackets = (weight: number): number => {
    const pkg = productPackaging.find((p) => parseFloat(p.holding_capacity.toString()) === weight);
    if (!pkg) return 0;
    const packagingInv = packetsInventory.find((p) => p.packaging_id === pkg.id);
    if (!packagingInv) return 0;
    return typeof packagingInv.available_quantity === 'string'
      ? parseInt(packagingInv.available_quantity)
      : packagingInv.available_quantity || 0;
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
    let maxFromPackaging: number | null = null;
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
      
      if (totalQuantityInput <= 0) {
        newErrors.totalQuantity = 'Total quantity must be greater than 0';
      }
      if (maxQuantityInfo && totalQuantityInput > maxQuantityInfo.maxQuantity) {
        newErrors.totalQuantity = `Total quantity cannot exceed maximum available: ${maxQuantityInfo.maxQuantity.toFixed(2)} kg`;
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
        // Refresh inventory to update available packets and lots
        try {
          const [inventoryData] = await Promise.all([
            inventoryAPI.getLots(),
            refetchInventory(),
          ]);
          setLotsInventory(inventoryData);
        } catch (error) {
          console.error('Failed to refresh inventory:', error);
          // Still show success even if refresh fails
        }
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

                {/* Total Quantity Input */}
                {!batchId && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium">Total Quantity (kg) *</label>
                      {maxQuantityInfo && selectedRecipe && (
                        <button
                          type="button"
                          onClick={() => {
                            setTotalQuantityInput(maxQuantityInfo.maxQuantity);
                            // Auto-distribute to enabled types
                            const enabledPQs = (formData.packaging_quantities as any[]).filter((pq: any) => pq.enabled);
                            if (enabledPQs.length > 0) {
                              const enabledWeights = enabledPQs.map((pq: any) => pq.weight);
                              const distribution = distributeTotalQuantity(maxQuantityInfo.maxQuantity, enabledWeights);
                              const updated = (formData.packaging_quantities as any[]).map((p: any) => {
                                if (p.enabled && distribution[p.weight] !== undefined) {
                                  return { ...p, quantity: distribution[p.weight] };
                                }
                                return p;
                              });
                              setFormData({ ...formData, packaging_quantities: updated });
                            }
                            if (errors.totalQuantity) setErrors({ ...errors, totalQuantity: '' });
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
                      value={totalQuantityInput || ''}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setTotalQuantityInput(value);
                        
                        // Auto-distribute to enabled types
                        const enabledPQs = (formData.packaging_quantities as any[]).filter((pq: any) => pq.enabled);
                        if (enabledPQs.length > 0 && value > 0) {
                          const enabledWeights = enabledPQs.map((pq: any) => pq.weight);
                          const distribution = distributeTotalQuantity(value, enabledWeights);
                          const updated = (formData.packaging_quantities as any[]).map((p: any) => {
                            if (p.enabled && distribution[p.weight] !== undefined) {
                              return { ...p, quantity: distribution[p.weight] };
                            }
                            return p;
                          });
                          setFormData({ ...formData, packaging_quantities: updated });
                        } else if (value === 0) {
                          // Reset all quantities if total is 0
                          const updated = (formData.packaging_quantities as any[]).map((p: any) => ({
                            ...p,
                            quantity: 0
                          }));
                          setFormData({ ...formData, packaging_quantities: updated });
                        }
                        
                        const newErrors = { ...errors };
                        if (maxQuantityInfo && value > maxQuantityInfo.maxQuantity) {
                          newErrors.totalQuantity = `Total quantity cannot exceed maximum available: ${maxQuantityInfo.maxQuantity.toFixed(2)} kg`;
                        } else if (newErrors.totalQuantity) {
                          delete newErrors.totalQuantity;
                        }
                        setErrors(newErrors);
                      }}
                      onBlur={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        if (maxQuantityInfo && value > maxQuantityInfo.maxQuantity) {
                          setTotalQuantityInput(maxQuantityInfo.maxQuantity);
                          // Redistribute with max value
                          const enabledPQs = (formData.packaging_quantities as any[]).filter((pq: any) => pq.enabled);
                          if (enabledPQs.length > 0) {
                            const enabledWeights = enabledPQs.map((pq: any) => pq.weight);
                            const distribution = distributeTotalQuantity(maxQuantityInfo.maxQuantity, enabledWeights);
                            const updated = (formData.packaging_quantities as any[]).map((p: any) => {
                              if (p.enabled && distribution[p.weight] !== undefined) {
                                return { ...p, quantity: distribution[p.weight] };
                              }
                              return p;
                            });
                            setFormData({ ...formData, packaging_quantities: updated });
                          }
                          setErrors({ ...errors, totalQuantity: '' });
                        }
                      }}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                      style={{
                        WebkitAppearance: 'none',
                        MozAppearance: 'textfield',
                      }}
                      placeholder="e.g., 1000"
                    />
                    {errors.totalQuantity && (
                      <p className="mt-1 text-sm text-destructive">{errors.totalQuantity}</p>
                    )}
                    
                    {/* Lot Summary - Show how max quantity is calculated */}
                    {maxQuantityInfo && selectedRecipe && totalQuantityInput > 0 && (
                      <div className="mt-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-3">
                        <div className="flex items-center gap-2">
                          <Calculator className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          <div>
                            <div className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
                              Maximum Batch Quantity: <span className="text-lg font-bold">{maxQuantityInfo.maxQuantity.toFixed(2)} kg</span>
                            </div>
                            <div className="text-[10px] text-blue-700 dark:text-blue-300 mt-0.5">
                              Limited by: {maxQuantityInfo.maxFromPackaging !== null && maxQuantityInfo.maxFromPackaging < maxQuantityInfo.limitingLot.maxQty
                                ? 'Packaging availability'
                                : 'Raw material lots'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-blue-800 dark:text-blue-200">
                            Maximum Quantity Based on Each Lot:
                          </div>
                          {maxQuantityInfo.allLotCalculations.map((lotCalc, idx) => (
                            <div
                              key={idx}
                              className={`p-2 rounded-lg text-xs ${
                                lotCalc.isLimiting
                                  ? 'bg-amber-500/20 border border-amber-500/40'
                                  : 'bg-blue-500/5 border border-blue-500/20'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{lotCalc.lot}</span>
                                  {lotCalc.isLimiting && (
                                    <span className="px-1.5 py-0.5 bg-amber-500/40 text-amber-900 dark:text-amber-100 rounded text-[10px] font-bold">
                                      ⚠ LIMITING
                                    </span>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-sm">
                                    {lotCalc.maxQty.toFixed(2)} kg
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-[10px] text-muted-foreground mt-1">
                                {lotCalc.riceCode} • Recipe: {lotCalc.percentage}% • Available: {lotCalc.available.toFixed(2)} kg
                              </div>
                              
                              <div className="text-[10px] text-blue-700 dark:text-blue-300 font-mono bg-blue-500/10 p-1 rounded mt-1">
                                {lotCalc.available.toFixed(2)} kg ÷ {lotCalc.percentage}% × 100 = {lotCalc.maxQty.toFixed(2)} kg
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Packaging Quantities Selection (New Format) */}
                {!batchId && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Packaging Quantities *</label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Select packaging sizes and specify number of packets for each. At least one is required.
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
                                    
                                    // If total quantity is set, redistribute to enabled types
                                    if (totalQuantityInput > 0) {
                                      const enabledPQs = updated.filter((pq: any) => pq.enabled);
                                      if (enabledPQs.length > 0) {
                                        const enabledWeights = enabledPQs.map((pq: any) => pq.weight);
                                        const distribution = distributeTotalQuantity(totalQuantityInput, enabledWeights);
                                        const finalUpdated = updated.map((p: any) => {
                                          if (p.enabled && distribution[p.weight] !== undefined) {
                                            return { ...p, quantity: distribution[p.weight] };
                                          }
                                          return p;
                                        });
                                        setFormData({ ...formData, packaging_quantities: finalUpdated });
                                      } else {
                                        // No types enabled, reset all quantities
                                        const finalUpdated = updated.map((p: any) => ({ ...p, quantity: 0 }));
                                        setFormData({ ...formData, packaging_quantities: finalUpdated });
                                      }
                                    } else {
                                      setFormData({ ...formData, packaging_quantities: updated });
                                    }
                                    
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
                                {pkg && isEnabled && (() => {
                                  const availablePkts = getAvailablePackets(weight);
                                  const maxQty = availablePkts * weight;
                                  return (
                                    <div className="text-xs text-muted-foreground">
                                      <span className="text-emerald-600">Available: {availablePkts.toLocaleString('en-IN')} pcs</span>
                                      {' • '}
                                      <span className="text-purple-600">Max: {maxQty.toFixed(2)} kg</span>
                                    </div>
                                  );
                                })()}
                                {isEnabled && (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      max={getAvailablePackets(weight)}
                                      value={getPacketsCount(pq) || ''}
                                      onChange={(e) => {
                                        const packets = parseInt(e.target.value) || 0;
                                        const availablePkts = getAvailablePackets(weight);
                                        // Cap at available packets
                                        const cappedPackets = Math.min(packets, availablePkts);
                                        const newQuantity = cappedPackets * weight;
                                        
                                        // If total quantity is set, redistribute others
                                        if (totalQuantityInput > 0) {
                                          const distribution = redistributePackets(weight, cappedPackets, totalQuantityInput);
                                          const updated = (formData.packaging_quantities as any[]).map((p: any) => {
                                            if (p.weight === weight) {
                                              return { ...p, quantity: newQuantity };
                                            } else if (p.enabled && distribution[p.weight] !== undefined) {
                                              return { ...p, quantity: distribution[p.weight] };
                                            }
                                            return p;
                                          });
                                          setFormData({ ...formData, packaging_quantities: updated });
                                        } else {
                                          // Just update this one
                                          const updated = (formData.packaging_quantities as any[]).map((p: any) =>
                                            p.weight === weight ? { ...p, quantity: newQuantity } : p
                                          );
                                          setFormData({ ...formData, packaging_quantities: updated });
                                          // Update total quantity input
                                          const newTotal = updated
                                            .filter((pq: any) => pq.enabled)
                                            .reduce((sum: number, pq: any) => sum + (pq.quantity || 0), 0);
                                          setTotalQuantityInput(newTotal);
                                        }
                                        
                                        if (errors[errorKey]) {
                                          const newErrors = { ...errors };
                                          delete newErrors[errorKey];
                                          setErrors(newErrors);
                                        }
                                      }}
                                      className="w-24 px-3 py-1.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                      placeholder="packets"
                                      disabled={!isEnabled}
                                    />
                                    <span className="text-sm text-muted-foreground">packets</span>
                                    {quantity > 0 && (
                                      <span className="text-xs text-muted-foreground">
                                        ({quantity.toFixed(2)} kg)
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
                    
                    {/* Total Sum Display */}
                    {(() => {
                      const totalSum = (formData.packaging_quantities as any[])
                        .filter((pq: any) => pq.enabled && pq.quantity > 0)
                        .reduce((sum: number, pq: any) => sum + (pq.quantity || 0), 0);
                      
                      if (totalSum > 0 || totalQuantityInput > 0) {
                        const difference = totalQuantityInput - totalSum;
                        const isLess = difference > 0.01; // Use small threshold for floating point comparison
                        
                        return (
                          <div className={`mt-3 p-3 rounded-lg border ${
                            isLess 
                              ? 'bg-amber-500/10 border-amber-500/30' 
                              : 'bg-muted/50 border-border'
                          }`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">Total Selected Quantity:</span>
                              <span className="text-lg font-bold">{totalSum.toFixed(2)} kg</span>
                            </div>
                            {totalQuantityInput > 0 && (
                              <>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium">Entered Total Quantity:</span>
                                  <span className="text-lg font-bold">{totalQuantityInput.toFixed(2)} kg</span>
                                </div>
                                {isLess && (
                                  <div className="mt-2 pt-2 border-t border-current/20">
                                    <p className="text-xs text-amber-700 dark:text-amber-300">
                                      ⚠️ Selected quantities ({totalSum.toFixed(2)} kg) are less than entered total quantity ({totalQuantityInput.toFixed(2)} kg) by {difference.toFixed(2)} kg. Please manually increase the number of packets for any enabled type to match the total.
                                    </p>
                                  </div>
                                )}
                                {!isLess && Math.abs(difference) < 0.01 && (
                                  <div className="mt-2 pt-2 border-t border-current/20">
                                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                                      ✓ Selected quantities match the entered total quantity
                                    </p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}
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


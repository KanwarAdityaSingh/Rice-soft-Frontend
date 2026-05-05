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
import { useInventory } from '../../../hooks/useInventory';
import { lotsAPI } from '../../../services/lots.api';
import { inventoryAPI } from '../../../services/inventory.api';
import { useGodowns } from '../../../hooks/useGodowns';
import type {
  AttachBatchProductRequest,
  Batch,
  BatchProduct,
  BatchPackaging,
  QualityParameter,
  Recipe,
  Lot,
  LotsInventory,
  Packaging,
  PackagingVendor,
} from '../../../types/entities';
import { formatPacketTypeLabel } from '../../../constants/bagAndPacketTypes';
import { parametersAPI } from '../../../services/parameters.api';
import { QualityParametersFields } from '../../shared/QualityParametersFields';
import {
  draftFromQualityParameter,
  qualityDraftHasAnyValue,
  qualityDraftToNullableFields,
  qualityParameterRowHasValues,
  emptyQualityParameterDraft,
  type QualityParameterFieldKey,
} from '../../../utils/qualityParameters';

interface BatchFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId?: string | null;
}

type Stage = 1 | 2 | 3;

/** API may return `holding_capacity` as a decimal string */
function packagingHoldingCapacityKg(p: Packaging): number {
  const v = p.holding_capacity;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

function formatBatchProductCostRupee(value: unknown): string | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(n)) return null;
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface BatchProductQualityBlockProps {
  batchId: string;
  productId: string;
  parameter: QualityParameter | null;
  disabled: boolean;
  onRowChange: (productId: string, row: QualityParameter | null) => void;
  onNotify: (type: 'success' | 'error' | 'warning', title: string, message: string) => void;
}

function BatchProductQualityBlock({
  batchId,
  productId,
  parameter,
  disabled,
  onRowChange,
  onNotify,
}: BatchProductQualityBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(emptyQualityParameterDraft());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(draftFromQualityParameter(parameter));
  }, [parameter]);

  const setField = (key: QualityParameterFieldKey, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const refetchRow = async (): Promise<QualityParameter | null> => {
    const rows = await parametersAPI.list({ batch_id: batchId, product_id: productId });
    return rows?.[0] ?? null;
  };

  const handleSave = async () => {
    const hasValues = qualityDraftHasAnyValue(draft);
    const fields = qualityDraftToNullableFields(draft);
    setSaving(true);
    try {
      if (parameter?.id) {
        if (!hasValues) {
          await parametersAPI.delete(parameter.id);
          onRowChange(productId, await refetchRow());
          onNotify('success', 'Saved', 'Quality parameters cleared.');
        } else {
          await parametersAPI.update(parameter.id, fields);
          onRowChange(productId, await refetchRow());
          onNotify('success', 'Saved', 'Quality parameters updated.');
        }
      } else {
        if (!hasValues) {
          onNotify('warning', 'Nothing to save', 'Enter at least one value first.');
          return;
        }
        await parametersAPI.create({
          batch_id: batchId,
          product_id: productId,
          ...fields,
        });
        onRowChange(productId, await refetchRow());
        onNotify('success', 'Saved', 'Quality parameters saved.');
      }
      setExpanded(false);
    } catch (e: any) {
      onNotify('error', 'Error', e?.message || 'Failed to save quality parameters.');
    } finally {
      setSaving(false);
    }
  };

  const summaryLabel = qualityParameterRowHasValues(parameter) ? 'Recorded' : 'Not set';

  return (
    <div className="mt-2 pt-2 border-t border-border/60">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-2 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <span>Quality parameters</span>
        <span className="shrink-0 text-[10px] font-normal tabular-nums">{summaryLabel}</span>
      </button>
      {expanded && (
        <div className="mt-2 space-y-2">
          <QualityParametersFields draft={draft} onChange={setField} disabled={disabled || saving} compact />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={disabled || saving}
              className="px-3 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save parameters'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function BatchFormModal({ open, onOpenChange, batchId }: BatchFormModalProps) {
  const { createBatch, getBatchDetails, addProductToBatch, getBatchProducts, removeProductFromBatch, addPackagingToBatch, getBatchPackaging, removePackagingFromBatch, refetch } = useBatches();
  const { products } = useProducts();
  const { recipes } = useRecipes();
  const { packaging, fetchPackagingByProduct } = usePackaging();
  const { packagingVendors } = usePackagingVendors();
  const { packets: packetsInventory, fetchPackets } = useInventory();
  const { godowns } = useGodowns(false);

  const [godownId, setGodownId] = useState<string>('');
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
  const [parametersByProductId, setParametersByProductId] = useState<Record<string, QualityParameter | null>>({});
  
  // Stage 2: Product Attachment
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  /** Optional total cost (₹) when attaching a product — empty means omit */
  const [attachProductCost, setAttachProductCost] = useState<string>('');
  
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

  // Load lots and lots-inventory scoped to selected / batch godown
  useEffect(() => {
    if (!open) return;
    const g = currentBatch?.godown_id ?? godownId;
    if (g) {
      loadLotsData(g);
    } else {
      setLots([]);
      setLotsInventory([]);
    }
  }, [open, currentBatch?.godown_id, godownId]);

  // Empty packets are godown-scoped; backend validates against batch godown — keep list in sync
  useEffect(() => {
    if (!open) return;
    const g = currentBatch?.godown_id ?? godownId;
    if (g) void fetchPackets({ godown_id: g });
  }, [open, currentBatch?.godown_id, godownId, fetchPackets]);

  // Load packaging for products when batch products change
  useEffect(() => {
    if (batchProducts.length > 0 && currentBatch) {
      loadPackagingForProducts();
    }
  }, [batchProducts, currentBatch]);

  // Load quality-parameter rows per batch product (optional 0–1 row per product in practice)
  useEffect(() => {
    if (!open || !currentBatch?.id || batchProducts.length === 0) {
      if (!open) setParametersByProductId({});
      return;
    }
    let cancelled = false;
    const load = async () => {
      const map: Record<string, QualityParameter | null> = {};
      try {
        await Promise.all(
          batchProducts.map(async (bp) => {
            const rows = await parametersAPI.list({
              batch_id: currentBatch.id,
              product_id: bp.product_id,
            });
            map[bp.product_id] = rows?.[0] ?? null;
          })
        );
        if (!cancelled) setParametersByProductId(map);
      } catch (e) {
        console.error('Failed to load batch quality parameters:', e);
        if (!cancelled) setParametersByProductId({});
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [open, currentBatch?.id, batchProducts]);

  const loadLotsData = async (godown: string) => {
    setLoadingData(true);
    try {
      const [lotsData, inventoryData] = await Promise.all([
        lotsAPI.getAllLots(undefined, godown),
        inventoryAPI.getLots({ godown_id: godown }),
      ]);
      setLots(lotsData);
      setLotsInventory(inventoryData);
      void fetchPackets({ godown_id: godown });
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
      
      setGodownId(batchDetails.godown_id ?? '');
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
    setGodownId('');
    setRecipeId('');
    setQuantity(0);
    setBatchNumber('');
    setSelectedRecipe(null);
    setBatchProducts([]);
    setBatchPackaging([]);
    setParametersByProductId({});
    setSelectedProductId('');
    setAttachProductCost('');
    setPackagingForProducts({});
    setPackagingQuantities({});
    setCurrentStage(1);
    setErrors({});
  };

  // Stage 1: Create Batch with Recipe
  const handleStage1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!godownId) {
      newErrors.godownId = 'Godown is required';
    }
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
        godown_id: godownId,
        recipe_id: recipeId,
        quantity,
        batch_number: batchNumber || undefined,
      });
      setCurrentBatch(newBatch);
      setCurrentStage(2);
      setAlertType('success');
      setAlertTitle('Stage 1 Complete - Batch Created');
      setAlertMessage(`Batch ${newBatch.batch_number} created successfully with status: ${newBatch.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}. You can now add products.`);
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

    const costTrimmed = attachProductCost.trim();
    let costValue: number | undefined;
    if (costTrimmed !== '') {
      const parsed = parseFloat(costTrimmed);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setAlertType('warning');
        setAlertTitle('Invalid cost');
        setAlertMessage('Cost must be zero or positive.');
        setAlertOpen(true);
        return;
      }
      costValue = Math.round(parsed * 100) / 100;
    }

    const payload: AttachBatchProductRequest = { product_id: selectedProductId };
    if (costValue !== undefined) {
      payload.cost = costValue;
    }

    setLoading(true);
    try {
      const batchData = await addProductToBatch(currentBatch.id, payload);
      const updatedProducts = await getBatchProducts(currentBatch.id);
      setBatchProducts(updatedProducts);
      setSelectedProductId('');
      setAttachProductCost('');

      // Check if batch status is 'ready_to_pack'
      if (batchData && batchData.status === 'ready_to_pack') {
        // Enable Stage 3
        setCurrentStage(3);
        // Update local batch state with returned batch data
        setCurrentBatch(batchData);
        setAlertType('success');
        setAlertTitle('Stage 2 Complete - Ready to Pack');
        setAlertMessage(`Batch ${batchData.batch_number} is now ready to pack (Status: ${batchData.status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}). You can now add packaging.`);
      } else {
        setAlertType('success');
        setAlertTitle('Product Added');
        setAlertMessage(`Product added to batch ${currentBatch.batch_number} successfully. Current status: ${currentBatch.status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}.`);
      }
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
      setBatchPackaging((prev) => prev.filter((bp) => bp.product_id !== productId));
      setParametersByProductId((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
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
      
      // Fetch updated batch details to check status
      const updatedBatch = await getBatchDetails(currentBatch.id);
      setCurrentBatch(updatedBatch as any);

      const productIdsInBatch = batchProducts.map((bp) => bp.product_id);
      const productIdsWithPackaging = new Set(updatedPackaging.map((p) => p.product_id));
      const allBatchProductsHavePackaging =
        productIdsInBatch.length > 0 &&
        productIdsInBatch.every((id) => productIdsWithPackaging.has(id));
      
      // Only auto-close when the batch is packaged AND every attached product has packaging,
      // so multi-product batches stay open until the user finishes all products.
      if (updatedBatch.status === 'packaged' && allBatchProductsHavePackaging) {
        setAlertType('success');
        setAlertTitle('Stage 3 Complete - Batch Packaged');
        setAlertMessage(`Batch ${updatedBatch.batch_number} has been packaged successfully! Status: ${updatedBatch.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}.`);
        setAlertOpen(true);
        setTimeout(() => {
          onOpenChange(false);
        }, 2000);
      } else {
        setAlertType('success');
        setAlertTitle('Packaging Added');
        setAlertMessage(`Packaging added to batch ${currentBatch.batch_number} successfully. Current status: ${updatedBatch.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}.`);
        setAlertOpen(true);
      }
      await refetch();
      {
        const g = currentBatch.godown_id ?? godownId;
        if (g) void fetchPackets({ godown_id: g });
      }
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
      {
        const g = currentBatch.godown_id ?? godownId;
        if (g) void fetchPackets({ godown_id: g });
      }
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error?.message || 'Failed to remove packaging. Please try again.');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Count empty packets available for the batch godown only (matches server validation).
   * Prefer GET /packaging `packets_inventory` when present; else use godown-filtered packets inventory.
   */
  const getAvailablePackets = (packagingId: string, packaging?: Packaging): number => {
    const g = currentBatch?.godown_id ?? godownId;
    if (g && packaging?.packets_inventory && packaging.packets_inventory.length > 0) {
      const row = packaging.packets_inventory.find((pi) => pi.godown_id === g);
      return row ? Number(row.available_quantity) || 0 : 0;
    }
    const inventory = packetsInventory.find((p) => p.packaging?.id === packagingId);
    if (!inventory) return 0;
    const qty = inventory.available_quantity;
    return typeof qty === 'string' ? parseInt(qty, 10) : qty;
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
    const availablePackets = getAvailablePackets(packaging.id, packaging);
    const availableWeight = availablePackets * packagingHoldingCapacityKg(packaging);
    
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

    const availablePackets = getAvailablePackets(packagingId, packaging);
    const packetsNeeded = getPacketsNeeded(quantity, packagingHoldingCapacityKg(packaging));

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
      if (packagingFilters.capacities.length > 0 && !packagingFilters.capacities.includes(packagingHoldingCapacityKg(pkg))) {
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
        const availablePackets = getAvailablePackets(pkg.id, pkg);
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
      packagingList.forEach(pkg => capacities.add(packagingHoldingCapacityKg(pkg)));
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
                          <label className="block text-sm font-medium mb-2">Godown *</label>
                          <select
                            value={godownId}
                            onChange={(e) => {
                              setGodownId(e.target.value);
                              if (errors.godownId) setErrors({ ...errors, godownId: '' });
                            }}
                            className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">Select godown</option>
                            {godowns
                              .filter((g) => g.is_active)
                              .map((g) => (
                                <option key={g.id} value={g.id}>
                                  {g.name}
                                </option>
                              ))}
                          </select>
                          {errors.godownId && <p className="mt-1 text-sm text-destructive">{errors.godownId}</p>}
                        </div>
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

                        {/* Batch Number field commented out - auto-generated by backend */}
                        {/* <div>
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
                        </div> */}
                        
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
                          disabled={loading || !godownId || !recipeId || quantity <= 0}
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
                          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                            <div className="flex-1 min-w-[200px] space-y-1">
                              <label className="block text-xs font-medium text-muted-foreground">Product *</label>
                              <select
                                value={selectedProductId}
                                onChange={(e) => setSelectedProductId(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                              >
                                <option value="">Select a product</option>
                                {products.map((product) => (
                                  <option key={product.id} value={product.id}>
                                    {product.name} {product.brand ? `(${product.brand})` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="w-full sm:w-36 space-y-1">
                              <label className="block text-xs font-medium text-muted-foreground">Cost (₹)</label>
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={attachProductCost}
                                onChange={(e) => setAttachProductCost(e.target.value)}
                                disabled={loading}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm tabular-nums"
                                placeholder="Optional"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={handleAddProduct}
                              disabled={loading || !selectedProductId}
                              className="btn-primary px-4 py-2 rounded-lg inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed sm:shrink-0"
                            >
                              <Plus className="h-4 w-4" /> Add Product
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Leave cost blank to omit (server keeps existing cost on re-attach). Max 2 decimal places — values are rounded to paise on save.
                          </p>

                          {batchProducts.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold text-muted-foreground">Attached Products ({batchProducts.length})</h4>
                              <div className="flex flex-col gap-2">
                                {batchProducts.map((bp) => {
                                  const product = products.find((p) => p.id === bp.product_id);
                                  const costLabel = formatBatchProductCostRupee(bp.cost);
                                  return (
                                    <div
                                      key={bp.id}
                                      className="group relative rounded-lg bg-gradient-to-br from-card to-muted/30 border border-border hover:border-primary/40 hover:shadow-md transition-all duration-200"
                                    >
                                      <div className="flex items-center justify-between p-3">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                          <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                                            <Package className="h-4 w-4" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm text-foreground truncate">
                                              {product?.name || 'Unknown Product'}
                                            </div>
                                            {product?.brand && (
                                              <div className="text-xs text-muted-foreground mt-0.5">{product.brand}</div>
                                            )}
                                            {costLabel ? (
                                              <div className="text-xs text-muted-foreground mt-1 tabular-nums">
                                                Attached cost{' '}
                                                <span className="font-semibold text-foreground">{costLabel}</span>
                                              </div>
                                            ) : null}
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveProduct(bp.product_id)}
                                          disabled={loading}
                                          className="ml-2 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all duration-200 disabled:opacity-50 flex-shrink-0"
                                          title="Remove product"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                      <div className="px-3 pb-3">
                                        <BatchProductQualityBlock
                                          batchId={currentBatch!.id}
                                          productId={bp.product_id}
                                          parameter={parametersByProductId[bp.product_id] ?? null}
                                          disabled={loading}
                                          onRowChange={(pid, row) =>
                                            setParametersByProductId((prev) => ({ ...prev, [pid]: row }))
                                          }
                                          onNotify={(type, title, message) => {
                                            setAlertType(type);
                                            setAlertTitle(title);
                                            setAlertMessage(message);
                                            setAlertOpen(true);
                                          }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
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
                          {/* Compact Filters */}
                          <div className="rounded-lg border border-border bg-card p-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              {/* Search */}
                              <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <input
                                  type="text"
                                  value={packagingFilters.searchText}
                                  onChange={(e) => setPackagingFilters(prev => ({ ...prev, searchText: e.target.value }))}
                                  placeholder="Search..."
                                  className="w-full pl-8 pr-8 py-1.5 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                                {packagingFilters.searchText && (
                                  <button
                                    onClick={() => setPackagingFilters(prev => ({ ...prev, searchText: '' }))}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded"
                                  >
                                    <X className="h-3 w-3 text-muted-foreground" />
                                  </button>
                                )}
                              </div>

                              {/* Capacity Filter Pills */}
                              <div className="flex items-center gap-1.5">
                                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
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
                                      className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                                        isSelected
                                          ? 'bg-primary text-primary-foreground'
                                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                      }`}
                                    >
                                      {cap}kg
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Packet Type Dropdown */}
                              {getUniquePacketTypes().length > 0 && (
                                <div className="relative">
                                  <select
                                    value=""
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        const type = e.target.value;
                                        if (!packagingFilters.packetTypes.includes(type)) {
                                          setPackagingFilters(prev => ({
                                            ...prev,
                                            packetTypes: [...prev.packetTypes, type]
                                          }));
                                        }
                                        e.target.value = '';
                                      }
                                    }}
                                    className="px-2 py-1.5 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary appearance-none pr-6"
                                  >
                                    <option value="">Type...</option>
                                    {getUniquePacketTypes().map(type => (
                                      <option key={type} value={type}>{type}</option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {/* Vendor Dropdown */}
                              {packagingVendors.length > 0 && (
                                <div className="relative">
                                  <select
                                    value=""
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        const vendorId = e.target.value;
                                        if (!packagingFilters.vendorIds.includes(vendorId)) {
                                          setPackagingFilters(prev => ({
                                            ...prev,
                                            vendorIds: [...prev.vendorIds, vendorId]
                                          }));
                                        }
                                        e.target.value = '';
                                      }
                                    }}
                                    className="px-2 py-1.5 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary appearance-none pr-6 max-w-[150px]"
                                  >
                                    <option value="">Vendor...</option>
                                    {packagingVendors.map(vendor => (
                                      <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {/* Availability Toggle */}
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={packagingFilters.showOnlyAvailable}
                                  onChange={(e) => setPackagingFilters(prev => ({ ...prev, showOnlyAvailable: e.target.checked }))}
                                  className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-1 focus:ring-primary"
                                />
                                <span className="text-xs text-muted-foreground">Available only</span>
                              </label>

                              {/* Clear All */}
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
                                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                >
                                  <XCircle className="h-3 w-3" />
                                  Clear
                                </button>
                              )}
                            </div>

                            {/* Active Filter Chips */}
                            {(packagingFilters.capacities.length > 0 || 
                              packagingFilters.packetTypes.length > 0 || 
                              packagingFilters.vendorIds.length > 0) && (
                              <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border">
                                {packagingFilters.capacities.map(cap => (
                                  <span
                                    key={cap}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary"
                                  >
                                    {cap}kg
                                    <button
                                      onClick={() => setPackagingFilters(prev => ({
                                        ...prev,
                                        capacities: prev.capacities.filter(c => c !== cap)
                                      }))}
                                      className="hover:bg-primary/20 rounded p-0.5"
                                    >
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  </span>
                                ))}
                                {packagingFilters.packetTypes.map(type => (
                                  <span
                                    key={type}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary"
                                  >
                                    {type}
                                    <button
                                      onClick={() => setPackagingFilters(prev => ({
                                        ...prev,
                                        packetTypes: prev.packetTypes.filter(t => t !== type)
                                      }))}
                                      className="hover:bg-primary/20 rounded p-0.5"
                                    >
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  </span>
                                ))}
                                {packagingFilters.vendorIds.map(vendorId => {
                                  const vendor = packagingVendors.find(v => v.id === vendorId);
                                  return (
                                    <span
                                      key={vendorId}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary"
                                    >
                                      {vendor?.name || 'Unknown'}
                                      <button
                                        onClick={() => setPackagingFilters(prev => ({
                                          ...prev,
                                          vendorIds: prev.vendorIds.filter(v => v !== vendorId)
                                        }))}
                                        className="hover:bg-primary/20 rounded p-0.5"
                                      >
                                        <X className="h-2.5 w-2.5" />
                                      </button>
                                    </span>
                                  );
                                })}
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
                              ? getPacketsNeeded(selectedPkg.quantity, packagingHoldingCapacityKg(selectedPackaging))
                              : 0;
                            
                            return (
                              <div key={bp.id} className="p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
                                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <Package className="h-4 w-4" />
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-sm">{product?.name || 'Unknown Product'}</h4>
                                    {product?.brand && (
                                      <p className="text-xs text-muted-foreground mt-0.5">{product.brand}</p>
                                    )}
                                  </div>
                                  {attachedPackaging.length > 0 && (
                                    <span className="px-2 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-600">
                                      {attachedPackaging.length} packaging
                                    </span>
                                  )}
                                </div>
                                
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
                                              {packagingNumber && `${packagingNumber} - `}{pkg.holding_capacity}kg {formatPacketTypeLabel(pkg.packet_type)}
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
                                              <span className="font-medium">{getAvailablePackets(selectedPackaging.id, selectedPackaging)} packets</span>
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
                                              {selectedPackaging.holding_capacity}kg {formatPacketTypeLabel(selectedPackaging.packet_type)}
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
                                          const packetsNeeded = pkg ? getPacketsNeeded(bpkg.quantity, packagingHoldingCapacityKg(pkg)) : 0;
                                          const vendor = pkg ? getVendorForPackaging(pkg) : null;
                                          return (
                                            <div key={bpkg.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
                                              <div>
                                                <div className="flex items-center gap-2">
                                                  <span className="font-medium">
                                                    {pkg ? `${pkg.holding_capacity}kg ${formatPacketTypeLabel(pkg.packet_type)}` : '—'}
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

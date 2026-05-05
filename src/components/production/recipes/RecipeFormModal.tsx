import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertCircle, Calculator, Loader2 } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { AlertDialog } from '../../shared/AlertDialog';
import { useRecipes } from '../../../hooks/useRecipes';
import { lotsAPI } from '../../../services/lots.api';
import { inventoryAPI } from '../../../services/inventory.api';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { recipesAPI } from '../../../services/recipes.api';
import type {
  CreateRecipeRequest,
  UpdateRecipeRequest,
  RecipeFormulaItem,
  Lot,
  LotsInventory,
  RecipeCostPreviewResponse,
} from '../../../types/entities';

interface RecipeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeId?: string | null;
}

export function RecipeFormModal({ open, onOpenChange, recipeId }: RecipeFormModalProps) {
  const { createRecipe, updateRecipe, recipes } = useRecipes();
  const [formData, setFormData] = useState<{ recipe_name: string; formula: RecipeFormulaItem[] }>({
    recipe_name: '',
    formula: [{ lot_id: '', percentage: 0 }],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [lots, setLots] = useState<Lot[]>([]);
  const [lotsInventory, setLotsInventory] = useState<LotsInventory[]>([]);
  const [riceCodes, setRiceCodes] = useState<any[]>([]);
  const [loadingLots, setLoadingLots] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const [previewQuantityKg, setPreviewQuantityKg] = useState<number>(1000);
  const [costPreview, setCostPreview] = useState<RecipeCostPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Load recipe data if editing
  useEffect(() => {
    if (recipeId && open) {
      const recipe = recipes.find((r) => r.id === recipeId);
      if (recipe) {
        setFormData({
          recipe_name: recipe.recipe_name,
          formula: recipe.formula.length > 0 ? recipe.formula : [{ lot_id: '', percentage: 0 }],
        });
      }
    } else if (open) {
      setFormData({
        recipe_name: '',
        formula: [{ lot_id: '', percentage: 0 }],
      });
    }
  }, [recipeId, open, recipes]);

  useEffect(() => {
    if (!open) {
      setCostPreview(null);
      setPreviewError(null);
    }
  }, [open]);

  // Fetch lots and inventory
  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        setLoadingLots(true);
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
          console.error('Failed to fetch lots:', error);
        } finally {
          setLoadingLots(false);
        }
      };
      fetchData();
    }
  }, [open]);

  const getLotDisplayName = (lotId: string): string => {
    const lot = lots.find((l) => l.id === lotId);
    if (!lot) return '';
    const riceCode = riceCodes.find((rc) => rc.rice_code_id === lot.rice_code_id);
    const parts: string[] = [];
    if (lot.lot_number) parts.push(`Lot ${lot.lot_number}`);
    if (riceCode?.rice_code_name) parts.push(riceCode.rice_code_name);
    return parts.join(' - ') || lotId;
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

  const calculateTotalPercentage = (): number => {
    return formData.formula.reduce((sum, item) => sum + (item.percentage || 0), 0);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.recipe_name.trim()) {
      newErrors.recipe_name = 'Recipe name is required';
    }

    if (formData.formula.length === 0) {
      newErrors.formula = 'At least one lot is required';
    }

    // Check for duplicate lots
    const lotIds = formData.formula.map((f) => f.lot_id).filter((id) => id);
    const duplicates = lotIds.filter((id, index) => lotIds.indexOf(id) !== index);
    if (duplicates.length > 0) {
      newErrors.formula = 'Duplicate lots are not allowed';
    }

    // Validate each formula item
    formData.formula.forEach((item, index) => {
      if (!item.lot_id) {
        newErrors[`formula_${index}_lot`] = 'Lot is required';
      }
      if (item.percentage <= 0 || item.percentage > 100) {
        newErrors[`formula_${index}_percentage`] = 'Percentage must be between 0 and 100';
      }
    });

    // Check total percentage
    const total = calculateTotalPercentage();
    if (Math.abs(total - 100) > 0.01) {
      newErrors.percentage_total = `Percentages must sum to 100% (currently ${total.toFixed(2)}%)`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (recipeId) {
        await updateRecipe(recipeId, formData as UpdateRecipeRequest);
        setAlertType('success');
        setAlertTitle('Recipe Updated');
        setAlertMessage('Recipe has been updated successfully.');
      } else {
        await createRecipe(formData as CreateRecipeRequest);
        setAlertType('success');
        setAlertTitle('Recipe Created');
        setAlertMessage('Recipe has been created successfully.');
      }
      setAlertOpen(true);
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error?.message || 'Failed to save recipe. Please try again.');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const addFormulaItem = () => {
    setFormData({
      ...formData,
      formula: [...formData.formula, { lot_id: '', percentage: 0 }],
    });
  };

  const removeFormulaItem = (index: number) => {
    setFormData({
      ...formData,
      formula: formData.formula.filter((_, i) => i !== index),
    });
  };

  const updateFormulaItem = (index: number, field: 'lot_id' | 'percentage', value: string | number) => {
    const newFormula = [...formData.formula];
    newFormula[index] = { ...newFormula[index], [field]: value };
    setFormData({ ...formData, formula: newFormula });
    // Clear errors for this field
    const errorKey = `formula_${index}_${field}`;
    if (errors[errorKey]) {
      const newErrors = { ...errors };
      delete newErrors[errorKey];
      setErrors(newErrors);
    }
  };

  const totalPercentage = calculateTotalPercentage();
  const isValidPercentage = Math.abs(totalPercentage - 100) < 0.01;

  const formatInr = (n: number) =>
    `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;

  const canRunCostPreview =
    isValidPercentage &&
    !loadingLots &&
    previewQuantityKg > 0 &&
    formData.formula.length > 0 &&
    formData.formula.every((f) => f.lot_id);

  const handlePreviewCost = async () => {
    if (!canRunCostPreview) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const formula = formData.formula
        .filter((f) => f.lot_id)
        .map((f) => ({ lot_id: f.lot_id, percentage: f.percentage }));
      const data = recipeId
        ? await recipesAPI.previewRecipeCostById(recipeId, { quantity_kg: previewQuantityKg })
        : await recipesAPI.previewRecipeCostByFormula({ quantity_kg: previewQuantityKg, formula });
      setCostPreview(data);
    } catch (e: any) {
      const msg =
        e?.message ||
        e?.data?.message ||
        (typeof e?.data === 'string' ? e.data : null) ||
        'Failed to preview cost.';
      setPreviewError(msg);
      setCostPreview(null);
    } finally {
      setPreviewLoading(false);
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
                  {recipeId ? 'Edit Recipe' : 'Create Recipe'}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Recipe Name */}
                <div>
                  <label className="block text-sm font-medium mb-2">Recipe Name *</label>
                  <input
                    type="text"
                    value={formData.recipe_name}
                    onChange={(e) => {
                      setFormData({ ...formData, recipe_name: e.target.value });
                      if (errors.recipe_name) {
                        setErrors({ ...errors, recipe_name: '' });
                      }
                    }}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., Premium Mix 30-40-30"
                  />
                  {errors.recipe_name && (
                    <p className="mt-1 text-sm text-destructive">{errors.recipe_name}</p>
                  )}
                </div>

                {/* Formula */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">Formula *</label>
                    <button
                      type="button"
                      onClick={addFormulaItem}
                      className="btn-primary text-sm px-3 py-1.5 inline-flex items-center gap-1.5"
                    >
                      <Plus className="h-4 w-4" /> Add Lot
                    </button>
                  </div>

                  {loadingLots ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.formula.map((item, index) => (
                        <div key={index} className="p-4 border border-border rounded-lg space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 grid grid-cols-2 gap-3">
                              {/* Lot Selection */}
                              <div>
                                <label className="block text-xs font-medium mb-1.5">Lot *</label>
                                <select
                                  value={item.lot_id}
                                  onChange={(e) => updateFormulaItem(index, 'lot_id', e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                >
                                  <option value="">Select Lot</option>
                                  {lots.map((lot) => {
                                    const available = getAvailableQuantity(lot.id);
                                    const isSelected = formData.formula.some((f, i) => f.lot_id === lot.id && i !== index);
                                    return (
                                      <option
                                        key={lot.id}
                                        value={lot.id}
                                        disabled={isSelected || available <= 0}
                                      >
                                        {getLotDisplayName(lot.id)} ({available.toFixed(2)} kg available)
                                      </option>
                                    );
                                  })}
                                </select>
                                {errors[`formula_${index}_lot`] && (
                                  <p className="mt-1 text-xs text-destructive">
                                    {errors[`formula_${index}_lot`]}
                                  </p>
                                )}
                              </div>

                              {/* Percentage */}
                              <div>
                                <label className="block text-xs font-medium mb-1.5">Percentage (%) *</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={item.percentage || ''}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0;
                                    updateFormulaItem(index, 'percentage', value);
                                  }}
                                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                  placeholder="0.00"
                                />
                                {errors[`formula_${index}_percentage`] && (
                                  <p className="mt-1 text-xs text-destructive">
                                    {errors[`formula_${index}_percentage`]}
                                  </p>
                                )}
                              </div>
                            </div>
                            {formData.formula.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeFormulaItem(index)}
                                className="ml-3 p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Total Percentage Display */}
                  <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Percentage:</span>
                      <span
                        className={`text-sm font-bold ${
                          isValidPercentage ? 'text-emerald-600' : 'text-destructive'
                        }`}
                      >
                        {totalPercentage.toFixed(2)}%
                      </span>
                    </div>
                    {!isValidPercentage && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span>Percentages must sum to exactly 100%</span>
                      </div>
                    )}
                  </div>

                  {errors.formula && (
                    <p className="mt-2 text-sm text-destructive">{errors.formula}</p>
                  )}
                  {errors.percentage_total && (
                    <p className="mt-2 text-sm text-destructive">{errors.percentage_total}</p>
                  )}
                </div>

                {/* Cost preview — inward slip lot rates */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <h3 className="text-sm font-semibold">Recipe cost preview</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Uses{' '}
                          <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                            kg × (% ÷ 100) × lot rate
                          </code>
                          . Percentages must total 100%.
                          {recipeId ? (
                            <span className="block mt-1 text-amber-700 dark:text-amber-400/90">
                              This preview calls the saved recipe on the server—save formula changes before calculating if you edited lots or percentages.
                            </span>
                          ) : (
                            <span className="block mt-1">Uses the formula as entered below.</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="w-full sm:w-48">
                      <label htmlFor="preview-qty-kg" className="block text-xs font-medium mb-1">
                        Quantity (kg)
                      </label>
                      <input
                        id="preview-qty-kg"
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={previewQuantityKg || ''}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setPreviewQuantityKg(Number.isFinite(v) ? v : 0);
                          setCostPreview(null);
                          setPreviewError(null);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void handlePreviewCost()}
                      disabled={!canRunCostPreview || previewLoading}
                      className="btn-primary px-4 py-2 rounded-lg text-sm inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {previewLoading ? 'Calculating…' : 'Calculate cost'}
                    </button>
                  </div>
                  {!canRunCostPreview && (
                    <p className="text-xs text-muted-foreground">
                      Select all lots, set percentages to sum to 100%, and enter a positive quantity.
                    </p>
                  )}
                  {previewError && (
                    <div className="flex gap-2 text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{previewError}</span>
                    </div>
                  )}
                  {costPreview && costPreview.lines?.length > 0 && (
                    <div className="space-y-3 border-t border-border pt-4">
                      {(costPreview.recipe_name || costPreview.assumption) && (
                        <div className="text-xs space-y-1">
                          {costPreview.recipe_name && (
                            <p>
                              <span className="text-muted-foreground">Recipe:</span>{' '}
                              <span className="font-medium">{costPreview.recipe_name}</span>
                            </p>
                          )}
                          {costPreview.assumption && (
                            <p className="text-muted-foreground">{costPreview.assumption}</p>
                          )}
                        </div>
                      )}
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/40 border-b border-border text-left">
                              <th className="py-2 px-3 font-semibold">Lot</th>
                              <th className="py-2 px-3 font-semibold text-right">%</th>
                              <th className="py-2 px-3 font-semibold text-right">kg from lot</th>
                              <th className="py-2 px-3 font-semibold text-right">Rate / kg</th>
                              <th className="py-2 px-3 font-semibold text-right">Line cost</th>
                            </tr>
                          </thead>
                          <tbody>
                            {costPreview.lines.map((line, idx) => (
                              <tr key={`${line.lot_id}-${idx}`} className="border-b border-border/60 last:border-0">
                                <td className="py-2 px-3">{getLotDisplayName(line.lot_id) || line.lot_id}</td>
                                <td className="py-2 px-3 text-right font-mono tabular-nums">
                                  {line.percentage != null ? `${Number(line.percentage).toFixed(2)}%` : '—'}
                                </td>
                                <td className="py-2 px-3 text-right font-mono tabular-nums">
                                  {Number(line.kg_from_lot).toLocaleString('en-IN', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 4,
                                  })}
                                </td>
                                <td className="py-2 px-3 text-right font-mono tabular-nums">
                                  {formatInr(Number(line.rate))}
                                </td>
                                <td className="py-2 px-3 text-right font-mono tabular-nums font-medium">
                                  {formatInr(Number(line.line_cost))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-muted/25 font-semibold">
                              <td colSpan={4} className="py-2 px-3 text-right">
                                Total ({Number(costPreview.quantity_kg).toLocaleString('en-IN')} kg)
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums">
                                {formatInr(Number(costPreview.total_cost))}
                              </td>
                            </tr>
                            <tr className="bg-primary/5">
                              <td colSpan={4} className="py-2 px-3 text-right text-muted-foreground font-normal">
                                Blended rate / kg
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums text-primary font-semibold">
                                {formatInr(Number(costPreview.blended_rate_per_kg))}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Dialog.Close asChild>
                    <button type="button" className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors">
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={loading || !isValidPercentage}
                    className="btn-primary px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <LoadingSpinner /> : recipeId ? 'Update Recipe' : 'Create Recipe'}
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


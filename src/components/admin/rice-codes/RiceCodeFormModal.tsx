import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { useRiceCodes } from '../../../hooks/useRiceCodes';
import { riceCodesAPI, type CreateRiceCodeRequest, type UpdateRiceCodeRequest } from '../../../services/riceCodes.api';
import { AlertDialog } from '../../shared/AlertDialog';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import type { RiceCategory, RiceCode, RiceType } from '../../../types/entities';
import { getRiceCategoryLabel } from '../../../utils/riceCategory';
import { getRiceCodeVariantKeys } from '../../../utils/riceCodeVariants';

interface RiceCodeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  riceCode?: RiceCode | null;
  onCreate?: (data: CreateRiceCodeRequest) => Promise<RiceCode>;
  onUpdate?: (id: string, data: UpdateRiceCodeRequest) => Promise<RiceCode>;
  nested?: boolean;
}

export function RiceCodeFormModal({
  open,
  onOpenChange,
  riceCode,
  onCreate,
  onUpdate,
  nested = false,
}: RiceCodeFormModalProps) {
  const hook = useRiceCodes();
  const createRiceCode = onCreate || hook.createRiceCode;
  const updateRiceCode = onUpdate || hook.updateRiceCode;

  const [categories, setCategories] = useState<RiceType[]>([]);
  const [variantOptions, setVariantOptions] = useState<RiceType[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [formData, setFormData] = useState<CreateRiceCodeRequest>({
    rice_code_name: '',
    category: 'basmati',
    variants: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadCategories = async () => {
      setLoadingMeta(true);
      try {
        const data = await riceCodesAPI.getRiceCategories();
        if (!cancelled) setCategories(data);
      } catch {
        if (!cancelled) {
          setCategories([
            { value: 'basmati', label: 'Basmati' },
            { value: 'non_basmati', label: 'Non Basmati' },
          ]);
        }
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    };
    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadVariants = async () => {
      try {
        const data = await riceCodesAPI.getRiceVariants(formData.category);
        if (!cancelled) setVariantOptions(data);
      } catch {
        if (!cancelled) setVariantOptions([]);
      }
    };
    void loadVariants();
    return () => {
      cancelled = true;
    };
  }, [open, formData.category]);

  useEffect(() => {
    if (riceCode) {
      setFormData({
        rice_code_name: riceCode.rice_code_name,
        category: riceCode.category ?? 'basmati',
        variants: getRiceCodeVariantKeys(riceCode.variants),
      });
    } else {
      setFormData({
        rice_code_name: '',
        category: 'basmati',
        variants: [],
      });
    }
    setErrors({});
  }, [riceCode, open]);

  const toggleVariant = (value: string) => {
    setFormData((prev) => {
      const has = prev.variants.includes(value);
      return {
        ...prev,
        variants: has ? prev.variants.filter((v) => v !== value) : [...prev.variants, value],
      };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.rice_code_name.trim()) {
      newErrors.rice_code_name = 'Rice code name is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    if (formData.variants.length === 0) {
      newErrors.variants = 'Select at least one variant';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        rice_code_name: formData.rice_code_name.trim(),
        category: formData.category,
        variants: formData.variants,
      };
      if (riceCode) {
        await updateRiceCode(riceCode.rice_code_id, payload);
        setAlertType('success');
        setAlertTitle('Rice Code Updated Successfully');
        setAlertMessage('The rice code has been updated successfully.');
      } else {
        await createRiceCode(payload);
        setAlertType('success');
        setAlertTitle('Rice Code Created Successfully');
        setAlertMessage('The rice code has been created successfully.');
      }
      setAlertOpen(true);
      onOpenChange(false);
      setFormData({ rice_code_name: '', category: 'basmati', variants: [] });
      setErrors({});
    } catch (error: unknown) {
      setAlertType('error');
      setAlertTitle(riceCode ? 'Failed to Update Rice Code' : 'Failed to Create Rice Code');
      const err = error as { message?: string; data?: { message?: string } };
      setAlertMessage(
        err?.message ||
          err?.data?.message ||
          (riceCode
            ? 'An error occurred while updating the rice code. Please try again.'
            : 'An error occurred while creating the rice code. Please try again.'),
      );
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={`fixed inset-0 bg-black/50 backdrop-blur-sm ${nested ? 'z-[60]' : 'z-40'}`} />
        <Dialog.Content
          className={`fixed left-[50%] top-[50%] max-w-md translate-x-[-50%] translate-y-[-50%] w-full ${nested ? 'z-[70]' : 'z-50'}`}
        >
          <div className="glass rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-semibold">
                {riceCode ? 'Edit Rice Code' : 'Create Rice Code'}
              </Dialog.Title>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg p-1 hover:bg-muted/50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingMeta ? (
              <LoadingSpinner />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as RiceCategory,
                        variants: [],
                      })
                    }
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                  {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Rice Code Name *</label>
                  <input
                    type="text"
                    value={formData.rice_code_name}
                    onChange={(e) => setFormData({ ...formData, rice_code_name: e.target.value.trim() })}
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
                    placeholder="e.g., 1121, 1718"
                  />
                  {errors.rice_code_name && (
                    <p className="mt-1 text-xs text-red-600">{errors.rice_code_name}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Variants *{' '}
                    <span className="text-muted-foreground font-normal">
                      ({getRiceCategoryLabel(formData.category, categories)})
                    </span>
                  </label>
                  <div className="space-y-2 rounded-lg border border-border/60 p-3 max-h-40 overflow-y-auto">
                    {variantOptions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No variants for this category</p>
                    ) : (
                      variantOptions.map((variant) => (
                        <label key={variant.value} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.variants.includes(variant.value)}
                            onChange={() => toggleVariant(variant.value)}
                          />
                          <span>{variant.label}</span>
                        </label>
                      ))
                    )}
                  </div>
                  {errors.variants && <p className="mt-1 text-xs text-red-600">{errors.variants}</p>}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="flex-1 rounded-lg border border-border bg-background/60 px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={loading} className="btn-primary flex-1">
                    {loading
                      ? riceCode
                        ? 'Updating...'
                        : 'Creating...'
                      : riceCode
                        ? 'Update Rice Code'
                        : 'Create Rice Code'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        buttonText="OK"
      />
    </Dialog.Root>
  );
}

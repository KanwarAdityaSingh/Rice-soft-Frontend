import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import type { RiceCategory, RiceType } from '../../../types/entities';
import { LoadingSpinner } from '../shared/LoadingSpinner';

interface RiceTypesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RiceTypesModal({ open, onOpenChange }: RiceTypesModalProps) {
  const [categories, setCategories] = useState<RiceType[]>([]);
  const [variantsByCategory, setVariantsByCategory] = useState<Record<string, RiceType[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const cats = await riceCodesAPI.getRiceCategories();
        setCategories(cats);
        const entries = await Promise.all(
          cats.map(async (cat) => {
            const variants = await riceCodesAPI.getRiceVariants(cat.value as RiceCategory);
            return [cat.value, variants] as const;
          }),
        );
        setVariantsByCategory(Object.fromEntries(entries));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load variants');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-w-md translate-x-[-50%] translate-y-[-50%] w-full">
          <div className="glass rounded-2xl p-6 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-semibold">Rice Variants</Dialog.Title>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg p-1 hover:bg-muted/50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No categories found</p>
              </div>
            ) : (
              <div className="space-y-5">
                {categories.map((cat) => (
                  <section key={cat.value}>
                    <h3 className="text-sm font-semibold mb-2">{cat.label}</h3>
                    <div className="space-y-2">
                      {(variantsByCategory[cat.value] ?? []).map((variant) => (
                        <div
                          key={variant.value}
                          className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 p-3"
                        >
                          <div>
                            <div className="text-sm font-medium">{variant.label}</div>
                            <div className="text-xs text-muted-foreground">Code: {variant.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button type="button" onClick={() => onOpenChange(false)} className="btn-primary px-4 py-2 text-sm">
                Close
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

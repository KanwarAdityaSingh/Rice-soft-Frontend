import * as Dialog from '@radix-ui/react-dialog';
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useRiceCodes } from '../../../hooks/useRiceCodes';
import { type CreateRiceCodeRequest, type UpdateRiceCodeRequest } from '../../../services/riceCodes.api';
import type { RiceCode } from '../../../types/entities';

interface RiceCodeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  riceCode?: RiceCode | null;
  onCreate?: (data: CreateRiceCodeRequest) => Promise<RiceCode>;
  onUpdate?: (id: string, data: UpdateRiceCodeRequest) => Promise<RiceCode>;
}

export function RiceCodeFormModal({ open, onOpenChange, riceCode, onCreate, onUpdate }: RiceCodeFormModalProps) {
  // Use passed functions if provided, otherwise fall back to hook
  // Always call hook (React requirement), but prefer passed functions
  const hook = useRiceCodes();
  const createRiceCode = onCreate || hook.createRiceCode;
  const updateRiceCode = onUpdate || hook.updateRiceCode;
  const [formData, setFormData] = useState<CreateRiceCodeRequest>({
    rice_code_name: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (riceCode) {
      setFormData({
        rice_code_name: riceCode.rice_code_name,
      });
    } else {
      setFormData({
        rice_code_name: '',
      });
    }
    setErrors({});
  }, [riceCode, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.rice_code_name.trim()) {
      newErrors.rice_code_name = 'Rice code name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      if (riceCode) {
        await updateRiceCode(riceCode.rice_code_id, formData as UpdateRiceCodeRequest);
      } else {
        await createRiceCode(formData);
      }
      onOpenChange(false);
      setFormData({ rice_code_name: '' });
      setErrors({});
    } catch (error: any) {
      setErrors({ submit: error.message || 'Failed to save rice code' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-w-md translate-x-[-50%] translate-y-[-50%] w-full">
          <div className="glass rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-semibold">
                {riceCode ? 'Edit Rice Code' : 'Create Rice Code'}
              </Dialog.Title>
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-lg p-1 hover:bg-muted/50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Rice Code Name *</label>
                <input
                  type="text"
                  value={formData.rice_code_name}
                  onChange={(e) => setFormData({ ...formData, rice_code_name: e.target.value.trim() })}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                  placeholder="e.g., Basmati 1121, Non-Basmati Raw"
                />
                {errors.rice_code_name && <p className="mt-1 text-xs text-red-600">{errors.rice_code_name}</p>}
              </div>

              {errors.submit && <p className="text-xs text-red-600">{errors.submit}</p>}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 rounded-lg border border-border bg-background/60 px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? (riceCode ? 'Updating...' : 'Creating...') : riceCode ? 'Update Rice Code' : 'Create Rice Code'}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}


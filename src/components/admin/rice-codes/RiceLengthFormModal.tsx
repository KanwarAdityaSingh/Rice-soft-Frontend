import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { RiceLengthRecord } from '../../../types/entities';
import type { CreateRiceLengthRequest, UpdateRiceLengthRequest } from '../../../services/riceLengths.api';
import { AlertDialog } from '../../shared/AlertDialog';

interface RiceLengthFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  riceLength?: RiceLengthRecord | null;
  onCreate: (data: CreateRiceLengthRequest) => Promise<RiceLengthRecord>;
  onUpdate: (id: string, data: UpdateRiceLengthRequest) => Promise<RiceLengthRecord>;
}

export function RiceLengthFormModal({
  open,
  onOpenChange,
  riceLength,
  onCreate,
  onUpdate,
}: RiceLengthFormModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    if (riceLength) {
      setCode(riceLength.code);
      setName(riceLength.name);
      setIsActive(riceLength.is_active);
    } else {
      setCode('');
      setName('');
      setIsActive(true);
    }
    setErrors({});
  }, [riceLength, open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!code.trim()) nextErrors.code = 'Code is required';
    if (!name.trim()) nextErrors.name = 'Name is required';
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      if (riceLength) {
        await onUpdate(riceLength.id, {
          code: code.trim(),
          name: name.trim(),
          is_active: isActive,
        });
      } else {
        await onCreate({
          code: code.trim(),
          name: name.trim(),
          is_active: isActive,
        });
      }
      onOpenChange(false);
    } catch (err: unknown) {
      setAlertMessage(err instanceof Error ? err.message : 'Failed to save rice length');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-[70] max-w-md translate-x-[-50%] translate-y-[-50%] w-full">
            <div className="glass rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-xl font-semibold">
                  {riceLength ? 'Edit Rice Length' : 'Add Rice Length'}
                </Dialog.Title>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="rounded-lg p-1 hover:bg-muted/50 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Code</label>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="dubar"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dubar (Double)"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  Active
                </label>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => onOpenChange(false)} className="btn-secondary px-4 py-2 text-sm">
                    Cancel
                  </button>
                  <button type="submit" disabled={loading} className="btn-primary px-4 py-2 text-sm">
                    {loading ? 'Saving…' : riceLength ? 'Update' : 'Create'}
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
        type="error"
        title="Failed to Save Rice Length"
        message={alertMessage}
      />
    </>
  );
}

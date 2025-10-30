import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import type { RiceType } from '../../../types/entities';
import { LoadingSpinner } from '../shared/LoadingSpinner';

interface RiceTypesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RiceTypesModal({ open, onOpenChange }: RiceTypesModalProps) {
  const [riceTypes, setRiceTypes] = useState<RiceType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchRiceTypes();
    }
  }, [open]);

  const fetchRiceTypes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await riceCodesAPI.getRiceTypes();
      setRiceTypes(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load rice types');
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
              <Dialog.Title className="text-xl font-semibold">Rice Types</Dialog.Title>
              <button
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
            ) : riceTypes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No rice types found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {riceTypes.map((type) => (
                  <div
                    key={type.value}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">Value: {type.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => onOpenChange(false)}
                className="btn-primary px-4 py-2 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

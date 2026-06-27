import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useRiceLengths } from '../../../hooks/useRiceLengths';
import type { RiceLengthRecord } from '../../../types/entities';
import { isAdmin } from '../../../utils/permissions';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { ActionButtons } from '../shared/ActionButtons';
import { RiceLengthFormModal } from './RiceLengthFormModal';

interface RiceLengthsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RiceLengthsModal({ open, onOpenChange }: RiceLengthsModalProps) {
  const {
    riceLengths,
    loading,
    error,
    fetchRiceLengths,
    createRiceLength,
    updateRiceLength,
    deleteRiceLength,
  } = useRiceLengths();

  const [includeInactive, setIncludeInactive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editLength, setEditLength] = useState<RiceLengthRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      void fetchRiceLengths(includeInactive);
    }
  }, [open, includeInactive, fetchRiceLengths]);

  const sorted = [...riceLengths].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-w-lg translate-x-[-50%] translate-y-[-50%] w-full">
            <div className="glass rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <Dialog.Title className="text-xl font-semibold">Rice Lengths</Dialog.Title>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="rounded-lg p-1 hover:bg-muted/50 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={includeInactive}
                    onChange={(e) => setIncludeInactive(e.target.checked)}
                  />
                  Show inactive
                </label>
                {isAdmin() && (
                  <button
                    type="button"
                    className="btn-primary inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg"
                    onClick={() => {
                      setEditLength(null);
                      setFormOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add length
                  </button>
                )}
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              ) : sorted.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No rice lengths found</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {sorted.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 p-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{item.name}</span>
                          {!item.is_active && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">Code: {item.code}</div>
                      </div>
                      {isAdmin() && (
                        <ActionButtons
                          permissionEntity="riceCode"
                          onEdit={() => {
                            setEditLength(item);
                            setFormOpen(true);
                          }}
                          onDelete={() => setDeleteId(item.id)}
                        />
                      )}
                    </div>
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

      <RiceLengthFormModal
        open={formOpen}
        onOpenChange={(next) => {
          setFormOpen(next);
          if (!next) setEditLength(null);
        }}
        riceLength={editLength}
        onCreate={createRiceLength}
        onUpdate={updateRiceLength}
      />

      <ConfirmDialog
        open={deleteId != null}
        onOpenChange={(next) => {
          if (!next) setDeleteId(null);
        }}
        title="Delete Rice Length"
        description="Delete this rice length? This is blocked if any sauda still references it."
        confirmText="Delete"
        variant="danger"
        onConfirm={async () => {
          if (deleteId) {
            await deleteRiceLength(deleteId);
            setDeleteId(null);
          }
        }}
      />
    </>
  );
}

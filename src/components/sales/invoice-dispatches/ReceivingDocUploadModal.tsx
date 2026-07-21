import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { useInvoiceDispatches } from '../../../hooks/useInvoiceDispatches';
import { UploadedDocumentPreview } from '../../shared/UploadedDocumentPreview';
import { toast } from '../../../utils/toast';
import { extractApiErrorMessage } from '../../../utils/mastersIndiaSales';
import type { InvoiceDispatch } from '../../../types/sales';

const ACCEPT = 'image/jpeg,image/png,image/gif,application/pdf,.pdf';
const MAX_BYTES = 10 * 1024 * 1024;

function validateReceivingDocFile(file: File): string | null {
  const okType =
    /^(image\/jpeg|image\/png|image\/gif|application\/pdf)$/i.test(file.type) ||
    /\.(jpe?g|png|gif|pdf)$/i.test(file.name);
  if (!okType) return 'Receiving document must be a JPEG, PNG, GIF, or PDF';
  if (file.size > MAX_BYTES) return 'File must be 10MB or smaller';
  return null;
}

interface ReceivingDocUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dispatch: InvoiceDispatch | null;
  onSuccess?: () => void;
}

export function ReceivingDocUploadModal({
  open,
  onOpenChange,
  dispatch,
  onSuccess,
}: ReceivingDocUploadModalProps) {
  const { uploadReceivingDoc } = useInvoiceDispatches();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const existingUrl =
    dispatch?.receiving_doc_image_url?.trim() ||
    dispatch?.receiving_doc_pdf_url?.trim() ||
    null;

  useEffect(() => {
    if (!open) {
      setFile(null);
      setError(null);
      setPreviewUrl((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return null;
      });
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelect = (next: File | null) => {
    setError(null);
    setPreviewUrl((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
    if (!next) {
      setFile(null);
      return;
    }
    const err = validateReceivingDocFile(next);
    if (err) {
      setFile(null);
      setError(err);
      return;
    }
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
  };

  const handleUpload = async () => {
    if (!dispatch || !file) return;
    setUploading(true);
    try {
      await uploadReceivingDoc(dispatch.id, file);
      toast.success(
        existingUrl ? 'Receiving document replaced' : 'Receiving document uploaded',
        dispatch.internal_invoice_number,
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      toast.error(
        'Upload failed',
        extractApiErrorMessage(e, 'Could not upload receiving document'),
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] max-w-md translate-x-[-50%] translate-y-[-50%] rounded-xl border border-border bg-background shadow-xl outline-none">
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-base font-semibold">
                Receiving document
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                {dispatch?.internal_invoice_number
                  ? `Upload for ${dispatch.internal_invoice_number}`
                  : 'JPEG, PNG, GIF, or PDF — max 10MB'}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg p-2 hover:bg-muted"
                aria-label="Close"
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4 px-5 py-4">
            {existingUrl && !file && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Current document
                </p>
                <UploadedDocumentPreview
                  url={existingUrl}
                  compact
                  alt="Receiving document"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium">
                {existingUrl ? 'Replace file' : 'Choose file'}
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept={ACCEPT}
                  disabled={uploading}
                  onChange={(e) => {
                    handleFileSelect(e.target.files?.[0] || null);
                    e.target.value = '';
                  }}
                  className={`w-full rounded-lg border bg-background px-3 py-2 text-sm file:mr-2 file:rounded file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-xs file:text-primary ${
                    error ? 'border-red-500' : 'border-border'
                  }`}
                />
                {file && !error && (
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <Check className="h-4 w-4 text-emerald-500" />
                  </div>
                )}
              </div>
              {file && (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  Selected: {file.name}
                </p>
              )}
              {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
            </div>

            {previewUrl && file?.type.startsWith('image/') ? (
              <div className="overflow-hidden rounded-md border border-border bg-muted/30">
                <img
                  src={previewUrl}
                  alt="Receiving document preview"
                  className="mx-auto h-auto max-h-40 w-full object-contain"
                />
              </div>
            ) : file ? (
              <UploadedDocumentPreview
                url={previewUrl}
                compact
                alt="Receiving document preview"
              />
            ) : null}
          </div>

          <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
            <button
              type="button"
              disabled={uploading}
              onClick={() => onOpenChange(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!file || uploading || Boolean(error)}
              onClick={() => void handleUpload()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              {existingUrl ? 'Replace' : 'Upload'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

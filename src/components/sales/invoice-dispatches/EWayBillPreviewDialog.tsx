import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useMemo, useState } from 'react';
import { X, Download, Truck, Loader2, CircleAlert } from 'lucide-react';
import type {
  CreateEWayBillRequest,
  EWayBillPreviewResponse,
} from '../../../types/sales';
import {
  buildBillOfSupplyViewModel,
  needsManualDistanceKm,
  resolvePreviewDistanceError,
  resolvePreviewDistanceKm,
  resolvePreviewDistanceSource,
} from '../../../utils/ewayBillPreviewData';
import { downloadBillOfSupplyPdf } from '../../../utils/ewayBillPdfPrint';
import {
  BillOfSupplyDocument,
  BILL_OF_SUPPLY_GOOGLE_FONTS,
  BILL_OF_SUPPLY_STYLES,
} from './pdf/BillOfSupplyDocument';
import { toast } from '../../../utils/toast';

const BOS_FONT_LINK_ID = 'bill-of-supply-google-fonts';

interface EWayBillPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: EWayBillPreviewResponse | null;
  /**
   * bill-of-supply: preview + download PDF (optional generate when onConfirmGenerate is set).
   * e-way: also allows confirming Masters India e-way generate.
   */
  mode?: 'bill-of-supply' | 'e-way';
  /** When true, confirm will call force regenerate (e-way mode) */
  force?: boolean;
  confirming?: boolean;
  /**
   * Generate e-way with Masters India.
   * Receives `distance_km` when the user entered/confirmed distance in this dialog.
   */
  onConfirmGenerate?: (overrides: Pick<CreateEWayBillRequest, 'distance_km'>) => void;
}

function parseDistanceKmInput(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function EWayBillPreviewDialog({
  open,
  onOpenChange,
  preview,
  mode = 'bill-of-supply',
  force = false,
  confirming = false,
  onConfirmGenerate,
}: EWayBillPreviewDialogProps) {
  const showEWayConfirm = Boolean(onConfirmGenerate) && (mode === 'e-way' || mode === 'bill-of-supply');
  const [downloading, setDownloading] = useState(false);
  const [distanceKmInput, setDistanceKmInput] = useState('');
  const [distanceInputError, setDistanceInputError] = useState<string | null>(null);

  const assetBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const distanceErrorMsg = preview ? resolvePreviewDistanceError(preview) : '';
  const distanceSource = preview ? resolvePreviewDistanceSource(preview) : null;
  const previewDistanceKm = preview ? resolvePreviewDistanceKm(preview) : null;
  const distanceNeedsManual = needsManualDistanceKm(preview);

  useEffect(() => {
    if (!open) return;
    if (document.getElementById(BOS_FONT_LINK_ID)) return;
    const link = document.createElement('link');
    link.id = BOS_FONT_LINK_ID;
    link.rel = 'stylesheet';
    link.href = BILL_OF_SUPPLY_GOOGLE_FONTS;
    document.head.appendChild(link);
  }, [open]);

  useEffect(() => {
    if (!open || !preview) {
      setDistanceKmInput('');
      setDistanceInputError(null);
      return;
    }
    const km = resolvePreviewDistanceKm(preview);
    setDistanceKmInput(km != null ? String(km) : '');
    setDistanceInputError(null);
  }, [open, preview]);

  const viewModel = useMemo(() => {
    if (!preview) return null;
    const base = buildBillOfSupplyViewModel(preview);
    const overrideKm = parseDistanceKmInput(distanceKmInput);
    if (overrideKm == null) return base;
    return {
      ...base,
      distanceKm: String(overrideKm),
      distanceSource:
        previewDistanceKm != null && overrideKm === previewDistanceKm
          ? base.distanceSource
          : ('request' as const),
      distanceError:
        previewDistanceKm != null && overrideKm === previewDistanceKm
          ? base.distanceError
          : '',
    };
  }, [preview, distanceKmInput, previewDistanceKm]);

  const resolvedDistanceForGenerate = parseDistanceKmInput(distanceKmInput);

  const handleDownload = async () => {
    if (!viewModel) return;
    setDownloading(true);
    try {
      const name = viewModel.invoiceNo
        ? `Bill-of-Supply-${viewModel.invoiceNo.replace(/[^\w.-]+/g, '_')}`
        : 'Bill-of-Supply';
      await downloadBillOfSupplyPdf(viewModel, name);
      toast.success('Downloaded', 'Bill of Supply PDF saved.');
    } catch (err: unknown) {
      toast.error(
        'Download failed',
        err instanceof Error ? err.message : 'Could not generate PDF',
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleConfirmGenerate = () => {
    if (!onConfirmGenerate) return;
    const km = parseDistanceKmInput(distanceKmInput);
    if (km == null) {
      setDistanceInputError('Enter distance in km before generating the e-way bill.');
      toast.error(
        'Distance required',
        'Enter transportation distance (km). Generate cannot proceed without it.',
      );
      return;
    }
    setDistanceInputError(null);
    onConfirmGenerate({ distance_km: km });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-[60] flex max-h-[92vh] w-[96vw] max-w-[880px] translate-x-[-50%] translate-y-[-50%] flex-col outline-none">
          <div className="flex max-h-[92vh] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
              <div>
                <Dialog.Title className="text-base font-semibold sm:text-lg">
                  {mode === 'e-way' ? 'E-Way Bill Preview' : 'Bill of Supply Preview'}
                </Dialog.Title>
                <Dialog.Description className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                  {mode === 'e-way'
                    ? 'Review the document, then confirm to generate the e-way bill with Masters India.'
                    : 'Review the Bill of Supply, then download the PDF.'}
                  {viewModel?.distanceKm ? (
                    <span className="ml-1">
                      Distance: {viewModel.distanceKm} km
                      {viewModel.distanceSource && viewModel.distanceSource !== 'unavailable'
                        ? ` (${viewModel.distanceSource})`
                        : ''}
                    </span>
                  ) : null}
                  {preview?.already_generated && preview.existing_eway_bill_number ? (
                    <span className="ml-1">
                      · Existing E-Way: {preview.existing_eway_bill_number}
                    </span>
                  ) : null}
                </Dialog.Description>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg p-1.5 hover:bg-muted"
                aria-label="Close"
                disabled={confirming}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {(distanceNeedsManual || distanceErrorMsg) && (
              <div className="border-b border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100 sm:px-5">
                <div className="flex gap-2">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="min-w-0 space-y-2">
                    <p className="font-medium">
                      {distanceSource === 'unavailable' || distanceErrorMsg
                        ? 'Distance could not be calculated'
                        : 'Distance required for e-way generate'}
                    </p>
                    {distanceErrorMsg ? (
                      <p className="text-xs leading-snug text-amber-900/90 dark:text-amber-100/90">
                        {distanceErrorMsg}
                      </p>
                    ) : (
                      <p className="text-xs text-amber-900/80 dark:text-amber-100/80">
                        Preview and PDF download still work. Enter distance (km) before generating
                        the e-way bill.
                      </p>
                    )}
                    <div className="flex flex-wrap items-end gap-2 pt-1">
                      <label className="block min-w-[140px] flex-1 sm:flex-none">
                        <span className="mb-1 block text-xs font-medium">Distance (km)</span>
                        <input
                          type="number"
                          min={0}
                          step="1"
                          inputMode="decimal"
                          value={distanceKmInput}
                          disabled={confirming}
                          onChange={(e) => {
                            setDistanceKmInput(e.target.value);
                            if (distanceInputError) setDistanceInputError(null);
                          }}
                          placeholder="e.g. 120"
                          className={`w-full rounded-lg border bg-background px-3 py-1.5 text-sm text-foreground ${
                            distanceInputError ? 'border-red-500' : 'border-border'
                          }`}
                        />
                      </label>
                      {distanceInputError && (
                        <p className="w-full text-xs text-red-600 dark:text-red-400">
                          {distanceInputError}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!distanceNeedsManual && !distanceErrorMsg && preview && (
              <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2 sm:px-5">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Distance (km)</span>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    inputMode="decimal"
                    value={distanceKmInput}
                    disabled={confirming}
                    onChange={(e) => setDistanceKmInput(e.target.value)}
                    className="w-28 rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
                  />
                  {distanceSource ? (
                    <span className="text-[11px]">source: {distanceSource}</span>
                  ) : null}
                </label>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-auto bg-muted/30 p-3 sm:p-4">
              {viewModel ? (
                <div className="mx-auto w-fit max-w-full overflow-x-auto rounded-lg border border-border bg-[#FAF9F7] shadow-sm">
                  <style>{BILL_OF_SUPPLY_STYLES}</style>
                  <BillOfSupplyDocument data={viewModel} assetBaseUrl={assetBaseUrl} />
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No preview data.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={confirming}
                className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={!viewModel || downloading || confirming}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 ${
                  showEWayConfirm
                    ? 'border border-border bg-background hover:bg-muted'
                    : 'bg-primary text-primary-foreground hover:opacity-90'
                }`}
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {showEWayConfirm ? 'Download PDF' : 'Download Bill of Supply'}
              </button>
              {showEWayConfirm && (
                <button
                  type="button"
                  onClick={handleConfirmGenerate}
                  disabled={!viewModel || confirming || resolvedDistanceForGenerate == null}
                  title={
                    resolvedDistanceForGenerate == null
                      ? 'Enter distance (km) before generating'
                      : undefined
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {confirming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Truck className="h-4 w-4" />
                  )}
                  {force ? 'Confirm & Regenerate E-Way' : 'Confirm & Generate E-Way'}
                </button>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

import { useRef, useState } from 'react';
import { AlertTriangle, Loader2, ScanLine, Upload, X } from 'lucide-react';
import type { KaantaWeightExtraction } from '../../../types/entities';
import {
  formatKaantaNeedsReviewWarning,
  formatKaantaVehicleMismatchWarning,
} from '../../../utils/kaantaExtraction';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

interface CombinedKaantaSlipUploadProps {
  previewUrl: string | null;
  extracting: boolean;
  extractionResult: KaantaWeightExtraction | null;
  disabled?: boolean;
  onFileSelected: (file: File) => void;
  onClear: () => void;
}

export function CombinedKaantaSlipUpload({
  previewUrl,
  extracting,
  extractionResult,
  disabled = false,
  onFileSelected,
  onClear,
}: CombinedKaantaSlipUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const vehicleWarning = extractionResult ? formatKaantaVehicleMismatchWarning(extractionResult) : null;
  const reviewWarning = extractionResult ? formatKaantaNeedsReviewWarning(extractionResult) : null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      window.alert('Please upload a JPEG, PNG, or GIF image.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      window.alert('Image must be 5 MB or smaller.');
      return;
    }
    onFileSelected(file);
  };

  return (
    <div className="rounded-lg border border-border/80 bg-card/40 p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-foreground">Upload kaanta slip (combined)</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            AI will read Gross, Tare, and Net weights from a single weighbridge receipt.
          </p>
        </div>
        {(previewUrl || extractionResult) && (
          <button
            type="button"
            onClick={onClear}
            disabled={disabled || extracting}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground disabled:opacity-50"
            title="Clear slip"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {previewUrl ? (
        <div className="flex gap-3 items-start">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="shrink-0 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            title="Click to view full image"
          >
            <img
              src={previewUrl}
              alt="Combined kaanta slip preview"
              className="h-20 w-20 rounded-md border border-border object-cover cursor-zoom-in transition-opacity hover:opacity-90"
            />
          </button>
          <div className="min-w-0 flex-1 space-y-2">
            {extracting ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                Reading weights from slip…
              </div>
            ) : extractionResult ? (
              <div className="text-[11px] text-muted-foreground space-y-1 tabular-nums">
                {extractionResult.full_truck_weight != null && (
                  <p>Gross: <span className="font-medium text-foreground">{extractionResult.full_truck_weight} kg</span></p>
                )}
                {extractionResult.empty_truck_weight != null && (
                  <p>Tare: <span className="font-medium text-foreground">{extractionResult.empty_truck_weight} kg</span></p>
                )}
                {extractionResult.kaanta_weight != null && (
                  <p>Net: <span className="font-medium text-emerald-600 dark:text-emerald-400">{extractionResult.kaanta_weight} kg</span></p>
                )}
                {extractionResult.ticket_number && (
                  <p>Ticket: <span className="font-medium text-foreground">{extractionResult.ticket_number}</span></p>
                )}
                {extractionResult.vehicle_number && (
                  <p>Slip vehicle: <span className="font-medium text-foreground">{extractionResult.vehicle_number}</span></p>
                )}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || extracting}
              className="text-[11px] text-primary hover:underline disabled:opacity-50"
            >
              Replace image
            </button>
          </div>
        </div>
      ) : (
        <label
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-6 cursor-pointer hover:bg-muted/40 transition-colors ${
            disabled || extracting ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          {extracting ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="h-6 w-6 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground text-center">
            {extracting ? 'Extracting…' : 'Tap to upload combined slip (JPEG, PNG, GIF · max 5 MB)'}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif"
            className="hidden"
            disabled={disabled || extracting}
            onChange={handleChange}
          />
        </label>
      )}

      {previewUrl && (
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif"
          className="hidden"
          disabled={disabled || extracting}
          onChange={handleChange}
        />
      )}

      {vehicleWarning && (
        <div
          className="flex items-start gap-2 rounded-md border border-amber-500/35 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-950 dark:text-amber-100"
          role="status"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden />
          <p className="min-w-0 leading-snug">{vehicleWarning}</p>
        </div>
      )}

      {reviewWarning && (
        <div
          className="flex items-start gap-2 rounded-md border border-amber-500/35 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-950 dark:text-amber-100"
          role="status"
        >
          <ScanLine className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden />
          <p className="min-w-0 leading-snug">{reviewWarning}</p>
        </div>
      )}

      {showPreview && previewUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowPreview(false)}
        >
          <button
            type="button"
            onClick={() => setShowPreview(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
            title="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={previewUrl}
            alt="Combined kaanta slip full preview"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

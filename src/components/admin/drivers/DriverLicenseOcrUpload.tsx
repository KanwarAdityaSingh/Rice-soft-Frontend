import { useRef, useState } from 'react';
import { Loader2, ScanLine, Upload, X } from 'lucide-react';
import {
  LICENSE_OCR_ACCEPT,
  LICENSE_OCR_FILE_HINT,
  validateLicenseOcrFile,
} from '../../../utils/driverOcr';

interface DriverLicenseOcrUploadProps {
  scanning: boolean;
  disabled?: boolean;
  onScan: (front: File, back?: File) => void;
  onClear: () => void;
}

export function DriverLicenseOcrUpload({
  scanning,
  disabled = false,
  onScan,
  onClear,
}: DriverLicenseOcrUploadProps) {
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const revokePreview = (url: string | null) => {
    if (url?.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  };

  const setFront = (file: File | null) => {
    revokePreview(frontPreview);
    setFrontFile(file);
    setFrontPreview(file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
  };

  const setBack = (file: File | null) => {
    revokePreview(backPreview);
    setBackFile(file);
    setBackPreview(file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
  };

  const handlePick = (side: 'front' | 'back', file: File | null) => {
    if (!file) return;
    const error = validateLicenseOcrFile(file);
    if (error) {
      setLocalError(error);
      return;
    }
    setLocalError(null);
    if (side === 'front') setFront(file);
    else setBack(file);
  };

  const handleClear = () => {
    setFront(null);
    setBack(null);
    setLocalError(null);
    onClear();
  };

  const handleScan = () => {
    if (!frontFile) {
      setLocalError('Upload the front of the driving licence.');
      return;
    }
    const frontError = validateLicenseOcrFile(frontFile);
    if (frontError) {
      setLocalError(frontError);
      return;
    }
    if (backFile) {
      const backError = validateLicenseOcrFile(backFile);
      if (backError) {
        setLocalError(backError);
        return;
      }
    }
    setLocalError(null);
    onScan(frontFile, backFile ?? undefined);
  };

  const busy = disabled || scanning;

  return (
    <div className="rounded-lg border border-border/80 bg-card/40 p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-foreground">Scan driving licence (OCR)</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Front required, back optional ({LICENSE_OCR_FILE_HINT}). OCR prefills fields — use Verify for full Surepass check.
          </p>
        </div>
        {(frontFile || backFile) && (
          <button
            type="button"
            onClick={handleClear}
            disabled={busy}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground disabled:opacity-50"
            title="Clear uploads"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground">Front *</p>
          <input
            ref={frontRef}
            type="file"
            accept={LICENSE_OCR_ACCEPT}
            className="hidden"
            onChange={(e) => {
              handlePick('front', e.target.files?.[0] ?? null);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => frontRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-xs hover:bg-muted/40 disabled:opacity-50"
          >
            <Upload className="h-4 w-4 shrink-0" />
            {frontFile ? frontFile.name : 'Choose front image or PDF'}
          </button>
          {frontPreview && (
            <img
              src={frontPreview}
              alt="Licence front preview"
              className="h-16 w-full max-w-[8rem] rounded-md border border-border object-cover"
            />
          )}
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground">Back (optional)</p>
          <input
            ref={backRef}
            type="file"
            accept={LICENSE_OCR_ACCEPT}
            className="hidden"
            onChange={(e) => {
              handlePick('back', e.target.files?.[0] ?? null);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => backRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-xs hover:bg-muted/40 disabled:opacity-50"
          >
            <Upload className="h-4 w-4 shrink-0" />
            {backFile ? backFile.name : 'Choose back image or PDF'}
          </button>
          {backPreview && (
            <img
              src={backPreview}
              alt="Licence back preview"
              className="h-16 w-full max-w-[8rem] rounded-md border border-border object-cover"
            />
          )}
        </div>
      </div>

      {localError && <p className="text-xs text-red-600">{localError}</p>}

      <button
        type="button"
        onClick={handleScan}
        disabled={busy || !frontFile}
        className="inline-flex items-center gap-2 rounded-lg bg-primary/90 text-primary-foreground px-3 py-2 text-xs font-medium hover:bg-primary disabled:opacity-50"
      >
        {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
        {scanning ? 'Scanning licence…' : 'Scan licence'}
      </button>
    </div>
  );
}

import { useRef, useState } from 'react';
import { Loader2, ScanLine, Upload, X } from 'lucide-react';
import { DOCUMENT_OCR_ACCEPT, DOCUMENT_OCR_FILE_HINT, validateDocumentOcrFile } from '../../utils/documentOcr';

interface DocumentOcrUploadProps {
  title: string;
  hint?: string;
  scanning: boolean;
  disabled?: boolean;
  onScan: (file: File) => void;
  onClear?: () => void;
}

export function DocumentOcrUpload({
  title,
  hint,
  scanning,
  disabled = false,
  onScan,
  onClear,
}: DocumentOcrUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const revokePreview = (url: string | null) => {
    if (url?.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  };

  const setSelectedFile = (next: File | null) => {
    revokePreview(preview);
    setFile(next);
    setPreview(next && next.type.startsWith('image/') ? URL.createObjectURL(next) : null);
  };

  const handlePick = (picked: File | null) => {
    if (!picked) return;
    const error = validateDocumentOcrFile(picked);
    if (error) {
      setLocalError(error);
      return;
    }
    setLocalError(null);
    setSelectedFile(picked);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setLocalError(null);
    onClear?.();
  };

  const handleScan = () => {
    if (!file) {
      setLocalError('Choose a document image or PDF first.');
      return;
    }
    const error = validateDocumentOcrFile(file);
    if (error) {
      setLocalError(error);
      return;
    }
    setLocalError(null);
    onScan(file);
  };

  const busy = disabled || scanning;

  return (
    <div className="rounded-lg border border-border/80 bg-card/40 p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-foreground">{title}</p>
          {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
        </div>
        {file && (
          <button
            type="button"
            onClick={handleClear}
            disabled={busy}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground disabled:opacity-50"
            title="Clear upload"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={DOCUMENT_OCR_ACCEPT}
        className="hidden"
        onChange={(e) => {
          handlePick(e.target.files?.[0] ?? null);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-xs hover:bg-muted/40 disabled:opacity-50"
      >
        <Upload className="h-4 w-4 shrink-0" />
        {file ? file.name : `Choose image or PDF (${DOCUMENT_OCR_FILE_HINT})`}
      </button>

      {preview && (
        <img
          src={preview}
          alt="Document preview"
          className="h-16 w-full max-w-[8rem] rounded-md border border-border object-cover"
        />
      )}

      {localError && <p className="text-xs text-red-600">{localError}</p>}

      <button
        type="button"
        onClick={handleScan}
        disabled={busy || !file}
        className="inline-flex items-center gap-2 rounded-lg bg-primary/90 text-primary-foreground px-3 py-2 text-xs font-medium hover:bg-primary disabled:opacity-50"
      >
        {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
        {scanning ? 'Scanning…' : 'Scan document'}
      </button>
    </div>
  );
}

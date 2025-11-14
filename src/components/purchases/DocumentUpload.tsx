import { useState } from 'react';
import { Upload, FileImage, FileText, Loader2 } from 'lucide-react';

interface DocumentUploadProps {
  label: string;
  currentUrl?: string | null;
  onUpload: (file: File) => Promise<void>;
  accept?: string;
  maxSizeMB?: number;
  loading?: boolean;
}

export function DocumentUpload({
  label,
  currentUrl,
  onUpload,
  accept = 'image/*,.pdf',
  maxSizeMB = 10,
  loading = false,
}: DocumentUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    
    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    setUploading(true);
    try {
      await onUpload(file);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  if (currentUrl) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium block">{label}</label>
        <div className="relative group">
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border border-border bg-background/60 p-3 hover:bg-background/80 transition-colors"
          >
            <div className="flex items-center gap-3">
              {currentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <FileImage className="h-8 w-8 text-primary" />
              ) : (
                <FileText className="h-8 w-8 text-primary" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Document uploaded</p>
                <p className="text-xs text-muted-foreground truncate">Click to view</p>
              </div>
            </div>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium block">{label}</label>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        } ${uploading || loading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading || loading}
        />
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          {uploading || loading ? (
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium">
              {uploading || loading ? 'Uploading...' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {accept.includes('image') ? 'Image or PDF' : 'File'} (max {maxSizeMB}MB)
            </p>
          </div>
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}


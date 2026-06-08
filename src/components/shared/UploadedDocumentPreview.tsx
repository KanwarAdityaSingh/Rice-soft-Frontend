import { ExternalLink, FileText } from 'lucide-react';

/** Detect image URLs by path extension (S3 keys are usually path-based). */
export function isLikelyImageUrl(url: string): boolean {
  const path = url.trim().split(/[?#]/)[0]?.toLowerCase() ?? '';
  return /\.(jpe?g|png|gif|webp|bmp|svg)$/.test(path);
}

/** Normalized `url` from typical upload JSON bodies (`{ url }` or `{ data: { url } }` already unwrapped). */
export function extractUploadResponseUrl(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const o = data as Record<string, unknown>;
  const url = o.url;
  if (typeof url === 'string' && url.trim()) return url.trim();
  return undefined;
}

interface UploadedDocumentPreviewProps {
  url?: string | null;
  /** Tighter max height for dense layouts (forms, tables). */
  compact?: boolean;
  className?: string;
  alt?: string;
}

/**
 * Renders a small inline preview for uploaded assets: image thumbnails when the URL looks like an image,
 * otherwise a PDF/document affordance with an open-in-new-tab link.
 */
export function UploadedDocumentPreview({
  url,
  compact,
  className = '',
  alt = 'Uploaded document',
}: UploadedDocumentPreviewProps) {
  if (!url?.trim()) return null;

  const u = url.trim();

  if (isLikelyImageUrl(u)) {
    const maxImg = compact ? 'max-h-28' : 'max-h-48';
    return (
      <div className={`overflow-hidden rounded-md border border-border bg-muted/30 ${className}`}>
        <a href={u} target="_blank" rel="noopener noreferrer" className="block">
          <img src={u} alt={alt} className={`mx-auto h-auto w-full ${maxImg} object-contain`} />
        </a>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-md border border-border bg-muted/25 px-2 py-1.5 ${className}`}
    >
      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <a
        href={u}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-w-0 flex-1 items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        <span className="truncate">Open document</span>
        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
      </a>
    </div>
  );
}

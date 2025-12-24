import * as Dialog from '@radix-ui/react-dialog';
import { X, Download, ExternalLink, FileText, Image as ImageIcon, ZoomIn, ZoomOut, RotateCw, Loader2 } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';

export interface DocumentInfo {
  url: string;
  label: string;
  type?: 'image' | 'pdf' | 'auto';
}

interface DocumentViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentInfo | null;
  documents?: DocumentInfo[];
}

export function DocumentViewerModal({ open, onOpenChange, document, documents }: DocumentViewerModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  // Get all valid documents
  const allDocs = documents?.filter(d => d.url) || (document?.url ? [document] : []);
  const currentDoc = allDocs[activeIndex] || document;

  // Reset state when modal opens or document changes
  useEffect(() => {
    if (open) {
      setLoading(true);
      setError(false);
      setZoom(1);
      setRotation(0);
      setActiveIndex(0);
    }
  }, [open, document]);

  // Determine if the document is a PDF
  const isPdf = useCallback((doc: DocumentInfo | null): boolean => {
    if (!doc?.url) return false;
    if (doc.type === 'pdf') return true;
    if (doc.type === 'image') return false;
    // Auto-detect from URL
    return doc.url.toLowerCase().includes('.pdf');
  }, []);

  const handleDownload = async () => {
    if (!currentDoc?.url) return;
    
    try {
      // Open in new tab for download (S3 URLs are direct)
      const link = window.document.createElement('a');
      link.href = currentDoc.url;
      link.download = currentDoc.label || 'document';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    } catch (err) {
      console.error('Download failed:', err);
      // Fallback: open in new tab
      window.open(currentDoc.url, '_blank');
    }
  };

  const handleOpenExternal = () => {
    if (currentDoc?.url) {
      window.open(currentDoc.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  if (!currentDoc?.url) return null;

  const currentIsPdf = isPdf(currentDoc);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md animate-in fade-in-0 duration-200" />
        <Dialog.Content className="fixed inset-4 z-[101] flex flex-col animate-in fade-in-0 zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                {currentIsPdf ? (
                  <FileText className="h-5 w-5 text-white" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-white" />
                )}
              </div>
              <div>
                <Dialog.Title className="text-lg font-semibold text-white">
                  {currentDoc.label}
                </Dialog.Title>
                {allDocs.length > 1 && (
                  <p className="text-sm text-white/60">
                    {activeIndex + 1} of {allDocs.length}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Zoom controls - only for images */}
              {!currentIsPdf && (
                <>
                  <button
                    onClick={handleZoomOut}
                    className="p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
                    title="Zoom Out"
                  >
                    <ZoomOut className="h-5 w-5" />
                  </button>
                  <span className="text-sm text-white/60 min-w-[3rem] text-center font-medium">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    className="p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
                    title="Zoom In"
                  >
                    <ZoomIn className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleRotate}
                    className="p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
                    title="Rotate"
                  >
                    <RotateCw className="h-5 w-5" />
                  </button>
                  <div className="w-px h-6 bg-white/20 mx-1" />
                </>
              )}
              
              <button
                onClick={handleOpenExternal}
                className="p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
                title="Open in New Tab"
              >
                <ExternalLink className="h-5 w-5" />
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-200 font-medium"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download</span>
              </button>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Document thumbnails - if multiple */}
          {allDocs.length > 1 && (
            <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto bg-black/40">
              {allDocs.map((doc, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setActiveIndex(index);
                    setLoading(true);
                    setError(false);
                    setZoom(1);
                    setRotation(0);
                  }}
                  className={`flex-shrink-0 p-2 rounded-lg transition-all duration-200 ${
                    index === activeIndex
                      ? 'bg-white/20 ring-2 ring-white/50'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-[100px]">
                    {isPdf(doc) ? (
                      <FileText className="h-4 w-4 text-red-400" />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-blue-400" />
                    )}
                    <span className="text-xs text-white/80 truncate max-w-[80px]">
                      {doc.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            {currentIsPdf ? (
              // PDF Viewer
              <div className="w-full h-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden">
                <iframe
                  src={`${currentDoc.url}#toolbar=1&navpanes=0`}
                  className="w-full h-full"
                  title={currentDoc.label}
                  onLoad={() => setLoading(false)}
                />
              </div>
            ) : (
              // Image Viewer
              <div 
                className="relative flex items-center justify-center w-full h-full overflow-auto"
                style={{ cursor: zoom > 1 ? 'grab' : 'default' }}
              >
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-10 w-10 text-white animate-spin" />
                      <span className="text-white/80 text-sm">Loading image...</span>
                    </div>
                  </div>
                )}
                
                {error && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4 p-8 bg-white/10 rounded-2xl backdrop-blur-sm">
                      <div className="p-4 bg-red-500/20 rounded-full">
                        <ImageIcon className="h-10 w-10 text-red-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-white font-medium">Failed to load image</p>
                        <p className="text-white/60 text-sm mt-1">The image could not be loaded</p>
                      </div>
                      <button
                        onClick={handleOpenExternal}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open in Browser
                      </button>
                    </div>
                  </div>
                )}

                <img
                  src={currentDoc.url}
                  alt={currentDoc.label}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-transform duration-200"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    display: loading || error ? 'none' : 'block'
                  }}
                  onLoad={() => {
                    setLoading(false);
                    setError(false);
                  }}
                  onError={() => {
                    setLoading(false);
                    setError(true);
                  }}
                  draggable={false}
                />
              </div>
            )}
          </div>

          {/* Navigation arrows for multiple documents */}
          {allDocs.length > 1 && (
            <>
              <button
                onClick={() => {
                  setActiveIndex(prev => (prev - 1 + allDocs.length) % allDocs.length);
                  setLoading(true);
                  setError(false);
                  setZoom(1);
                  setRotation(0);
                }}
                className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all duration-200 backdrop-blur-sm"
                title="Previous"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setActiveIndex(prev => (prev + 1) % allDocs.length);
                  setLoading(true);
                  setError(false);
                  setZoom(1);
                  setRotation(0);
                }}
                className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all duration-200 backdrop-blur-sm"
                title="Next"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Footer hint */}
          <div className="text-center py-2 text-white/40 text-xs">
            Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Esc</kbd> to close
            {!currentIsPdf && zoom > 1 && ' • Scroll to pan'}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Utility component for document action button in dropdowns/tables
interface ViewDocumentButtonProps {
  url: string | null | undefined;
  label: string;
  onView: (doc: DocumentInfo) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function ViewDocumentButton({ url, label, onView, className = '', size = 'sm' }: ViewDocumentButtonProps) {
  if (!url) return null;

  const isPdf = url.toLowerCase().includes('.pdf');

  return (
    <button
      onClick={() => onView({ url, label, type: isPdf ? 'pdf' : 'image' })}
      className={`inline-flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors ${className}`}
      title={`View ${label}`}
    >
      {isPdf ? (
        <FileText className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
      ) : (
        <ImageIcon className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
      )}
      <span className={size === 'sm' ? 'text-xs' : 'text-sm'}>{label}</span>
    </button>
  );
}

// Document indicator badges for tables
interface DocumentIndicatorProps {
  documents: Array<{ url: string | null | undefined; label: string; icon?: React.ReactNode }>;
  onViewAll: (docs: DocumentInfo[]) => void;
}

export function DocumentIndicator({ documents, onViewAll }: DocumentIndicatorProps) {
  const validDocs = documents.filter(d => d.url) as Array<{ url: string; label: string }>;
  
  if (validDocs.length === 0) return null;

  return (
    <button
      onClick={() => onViewAll(validDocs.map(d => ({ 
        url: d.url, 
        label: d.label,
        type: d.url.toLowerCase().includes('.pdf') ? 'pdf' as const : 'image' as const
      })))}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
      title="View documents"
    >
      <ImageIcon className="h-3.5 w-3.5" />
      <span>{validDocs.length} {validDocs.length === 1 ? 'doc' : 'docs'}</span>
    </button>
  );
}



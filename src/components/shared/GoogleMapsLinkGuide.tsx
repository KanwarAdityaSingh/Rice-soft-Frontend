import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { Info, X } from 'lucide-react';

const GUIDE_IMAGE_PATH = '/images/google-maps-share-location-guide.png';

export function GoogleMapsLinkGuideDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-[71] w-[95vw] max-w-3xl translate-x-[-50%] translate-y-[-50%] max-h-[90vh] overflow-y-auto">
          <div className="glass rounded-2xl p-4 sm:p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3 mb-4">
              <Dialog.Title className="text-lg font-semibold pr-2">
                How to Share a Location on Google Maps
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-lg p-1 hover:bg-muted/50 transition-colors shrink-0"
                  aria-label="Close guide"
                >
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Step-by-step guide for copying a Google Maps share link or Plus Code.
            </Dialog.Description>
            <img
              src={GUIDE_IMAGE_PATH}
              alt="How to share a location on Google Maps — select Share, copy the link, or copy the Plus Code"
              className="w-full h-auto rounded-lg border border-border/60"
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface GoogleMapsLinkFieldLabelProps {
  label?: string;
  className?: string;
}

/** Field label with an info button that opens the Google Maps share-link guide. */
export function GoogleMapsLinkFieldLabel({
  label = 'Google Maps Location Link',
  className = 'text-sm font-medium mb-1.5',
}: GoogleMapsLinkFieldLabelProps) {
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <>
      <div className={`flex items-center gap-1.5 ${className}`}>
        <span>{label}</span>
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          className="inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          title="How to get a Google Maps link"
          aria-label="How to get a Google Maps link"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>
      <GoogleMapsLinkGuideDialog open={guideOpen} onOpenChange={setGuideOpen} />
    </>
  );
}

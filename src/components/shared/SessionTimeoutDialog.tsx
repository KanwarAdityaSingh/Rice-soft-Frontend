import * as Dialog from '@radix-ui/react-dialog'
import { motion } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'

interface SessionTimeoutDialogProps {
  open: boolean
  secondsLeft: number
  onStaySignedIn: () => void
}

export function SessionTimeoutDialog({
  open,
  secondsLeft,
  onStaySignedIn,
}: SessionTimeoutDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onStaySignedIn() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[90] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="glass rounded-xl p-6 shadow-2xl"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-yellow-100 dark:bg-yellow-900/30">
                <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1">
                <Dialog.Title className="text-lg font-semibold">
                  You’re about to be signed out
                </Dialog.Title>
                <Dialog.Description className="mt-2 text-sm text-muted-foreground">
                  You’ve been inactive for a while. For security, you’ll be logged out
                  in <span className="font-semibold text-foreground">{secondsLeft}s</span>.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  aria-label="Close"
                  className="rounded-md p-1 hover:bg-muted/60 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={onStaySignedIn}
                className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-700 transition-colors"
              >
                Stay signed in
              </button>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}



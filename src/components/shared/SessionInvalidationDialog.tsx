import * as Dialog from '@radix-ui/react-dialog'
import { motion } from 'framer-motion'
import { Info, X } from 'lucide-react'

interface SessionInvalidationDialogProps {
  open: boolean
  onClose: () => void
}

export function SessionInvalidationDialog({
  open,
  onClose,
}: SessionInvalidationDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
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
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <Info className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <Dialog.Title className="text-lg font-semibold">
                  Session ended
                </Dialog.Title>
                <Dialog.Description className="mt-2 text-sm text-muted-foreground">
                  You have been logged out because you logged in from another device. Redirecting to the login page…
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
              <Dialog.Close asChild>
                <button
                  onClick={onClose}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  OK
                </button>
              </Dialog.Close>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}



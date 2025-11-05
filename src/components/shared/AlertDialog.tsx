import * as Dialog from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: AlertType;
  title: string;
  message?: string;
  buttonText?: string;
}

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors = {
  success: {
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    icon: 'text-green-600 dark:text-green-400',
    button: 'bg-green-600 hover:bg-green-700',
  },
  error: {
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    icon: 'text-red-600 dark:text-red-400',
    button: 'bg-red-600 hover:bg-red-700',
  },
  info: {
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    icon: 'text-blue-600 dark:text-blue-400',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
  warning: {
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: 'text-yellow-600 dark:text-yellow-400',
    button: 'bg-yellow-600 hover:bg-yellow-700',
  },
};

export function AlertDialog({
  open,
  onOpenChange,
  type,
  title,
  message,
  buttonText = 'OK',
}: AlertDialogProps) {
  const Icon = icons[type];
  const colorClass = colors[type];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-w-md w-[90vw] translate-x-[-50%] translate-y-[-50%]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl"
          >
            <div className="flex gap-4">
              <div
                className={`flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-lg sm:rounded-xl ${colorClass.iconBg}`}
              >
                <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${colorClass.icon}`} />
              </div>
              <div className="flex-1 min-w-0">
                <Dialog.Title className="text-base sm:text-lg font-semibold">
                  {title}
                </Dialog.Title>
                {message && (
                  <Dialog.Description className="mt-2 text-sm text-muted-foreground">
                    {message}
                  </Dialog.Description>
                )}
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="flex-shrink-0 rounded-lg p-1 hover:bg-muted/50 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 sm:mt-6 flex justify-end">
              <button
                onClick={() => onOpenChange(false)}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${colorClass.button}`}
              >
                {buttonText}
              </button>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}


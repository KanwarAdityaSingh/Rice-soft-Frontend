import * as ToastPrimitive from '@radix-ui/react-toast';
import { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastData;
  onClose: (id: string) => void;
}

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors = {
  success: {
    bg: 'bg-green-500/10 border-green-500/20',
    icon: 'text-green-600',
    title: 'text-green-900 dark:text-green-100',
    desc: 'text-green-700 dark:text-green-300',
  },
  error: {
    bg: 'bg-red-500/10 border-red-500/20',
    icon: 'text-red-600',
    title: 'text-red-900 dark:text-red-100',
    desc: 'text-red-700 dark:text-red-300',
  },
  info: {
    bg: 'bg-blue-500/10 border-blue-500/20',
    icon: 'text-blue-600',
    title: 'text-blue-900 dark:text-blue-100',
    desc: 'text-blue-700 dark:text-blue-300',
  },
  warning: {
    bg: 'bg-orange-500/10 border-orange-500/20',
    icon: 'text-orange-600',
    title: 'text-orange-900 dark:text-orange-100',
    desc: 'text-orange-700 dark:text-orange-300',
  },
};

export function Toast({ toast, onClose }: ToastProps) {
  const [isOpen, setIsOpen] = useState(true);
  const Icon = icons[toast.type];
  const colorClass = colors[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsOpen(false);
      setTimeout(() => onClose(toast.id), 300);
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
          className="glass border-2 border-border/50 rounded-xl p-4 shadow-lg backdrop-blur-xl"
        >
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${colorClass.bg} flex items-center justify-center`}>
              <Icon className={`h-5 w-5 ${colorClass.icon}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${colorClass.title}`}>{toast.title}</p>
              {toast.description && (
                <p className={`text-xs mt-1 ${colorClass.desc}`}>{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                setTimeout(() => onClose(toast.id), 300);
              }}
              className="flex-shrink-0 p-1 hover:bg-muted/50 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = (toast: Omit<ToastData, 'id'>) => {
    const id = `toast-${toastId++}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const success = (title: string, description?: string) => 
    showToast({ type: 'success', title, description });
  const error = (title: string, description?: string) => 
    showToast({ type: 'error', title, description });
  const info = (title: string, description?: string) => 
    showToast({ type: 'info', title, description });
  const warning = (title: string, description?: string) => 
    showToast({ type: 'warning', title, description });

  return { toasts, removeToast, success, error, info, warning };
}


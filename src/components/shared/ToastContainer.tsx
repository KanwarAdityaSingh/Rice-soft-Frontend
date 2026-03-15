import { useEffect } from 'react';
import { useToast, Toast } from './Toast';
import { AnimatePresence } from 'framer-motion';
import { setToastInstance } from '../../utils/toast';

export function ToastContainer() {
  const { toasts, removeToast, success, error, info, warning } = useToast();

  useEffect(() => {
    setToastInstance({ toasts, removeToast, success, error, info, warning });
    return () => setToastInstance(null);
  }, [removeToast, success, error, info, warning]);

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-md">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
}


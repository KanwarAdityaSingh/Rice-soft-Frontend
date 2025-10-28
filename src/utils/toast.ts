// Global toast instance
import { useToast } from '../components/shared/Toast';

let toastInstance: ReturnType<typeof useToast> | null = null;

export function setToastInstance(instance: ReturnType<typeof useToast>) {
  toastInstance = instance;
}

export const toast = {
  success: (title: string, description?: string) => 
    toastInstance?.success(title, description),
  error: (title: string, description?: string) => 
    toastInstance?.error(title, description),
  info: (title: string, description?: string) => 
    toastInstance?.info(title, description),
  warning: (title: string, description?: string) => 
    toastInstance?.warning(title, description),
};


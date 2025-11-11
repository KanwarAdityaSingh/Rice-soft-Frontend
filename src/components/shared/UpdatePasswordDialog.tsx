import { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Eye, EyeOff, KeyRound, Loader2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { authAPI } from '../../services/auth.api';
import { ApiError } from '../../services/api';
import { validatePassword } from '../../utils/validation';
import { AlertDialog } from './AlertDialog';

interface UpdatePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FieldErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
};

export function UpdatePasswordDialog({ open, onOpenChange }: UpdatePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');

  const newPasswordLength = useMemo(() => newPassword.length, [newPassword]);

  const resetState = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors({});
    setIsLoading(false);
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  useEffect(() => {
    if (!open) {
      // Clear sensitive data when dialog closes
      resetState();
    }
  }, [open]);

  const validate = (): boolean => {
    const nextErrors: FieldErrors = {};

    if (!currentPassword) {
      nextErrors.currentPassword = 'Current password is required';
    }
    if (!newPassword) {
      nextErrors.newPassword = 'New password is required';
    } else {
      if (!validatePassword(newPassword)) {
        nextErrors.newPassword = 'Password must be at least 6 characters';
      } else if (newPassword.length > 100) {
        nextErrors.newPassword = 'Password must be at most 100 characters';
      }
    }
    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your new password';
    } else if (newPassword && confirmPassword !== newPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }
    if (currentPassword && newPassword && currentPassword === newPassword) {
      nextErrors.newPassword = 'New password must be different from your current password';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setErrors({});

    if (!validate()) return;

    setIsLoading(true);
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      setAlertType('success');
      setAlertTitle('Password changed successfully');
      setAlertMessage('');
      setAlertOpen(true);
      // Clear fields after success
      resetState();
    } catch (err) {
      const fieldErrors: FieldErrors = {};
      let generalMessage = 'Unable to update password. Please try again.';

      if (err instanceof ApiError) {
        const backendMessage = err.data?.error || err.message || '';
        if (err.status === 401) {
          // Auth service will handle redirect; provide friendly message
          generalMessage = 'Please log in again';
        } else if (err.status === 400) {
          if (backendMessage.includes('different from current')) {
            fieldErrors.newPassword = 'New password must be different from your current password';
          } else if (backendMessage.toLowerCase().includes('length')) {
            fieldErrors.newPassword = backendMessage.replace(/\"/g, '');
          } else {
            generalMessage = err.message || generalMessage;
          }
        } else if (err.status === 401 && backendMessage.toLowerCase().includes('current password')) {
          fieldErrors.currentPassword = 'The current password you entered is incorrect';
        } else {
          generalMessage = err.message || generalMessage;
        }
      } else if (err instanceof Error) {
        generalMessage = err.message;
      }

      setErrors({ ...fieldErrors, general: Object.keys(fieldErrors).length ? undefined : generalMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-[90vw] md:w-full max-w-md translate-x-[-50%] translate-y-[-50%]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <KeyRound className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <Dialog.Title className="text-lg sm:text-xl font-semibold">
                    Update Password
                  </Dialog.Title>
                  <Dialog.Description className="text-xs text-muted-foreground mt-0.5">
                    Enter your current and new password
                  </Dialog.Description>
                </div>
              </div>
              <button 
                onClick={() => onOpenChange(false)} 
                className="rounded-lg p-1 hover:bg-muted/50 transition-colors"
                disabled={isLoading}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {errors.general && (
              <div className="mb-3 text-sm text-red-500">
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      if (errors.currentPassword) setErrors((prev) => ({ ...prev, currentPassword: undefined }));
                    }}
                    className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none"
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowCurrent((s) => !s)}
                    tabIndex={-1}
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="mt-1 text-xs text-red-500">{errors.currentPassword}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: undefined }));
                    }}
                    onBlur={() => validate()}
                    className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none"
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowNew((s) => !s)}
                    tabIndex={-1}
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{newPasswordLength} / 100</p>
                </div>
                {errors.newPassword && (
                  <p className="mt-1 text-xs text-red-500">{errors.newPassword}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                    }}
                    onBlur={() => validate()}
                    className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none"
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirm((s) => !s)}
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
                )}
              </div>

              <div className="pt-1 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg px-4 py-2 text-sm hover:bg-muted/60"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white bg-primary hover:opacity-90 disabled:opacity-60 flex items-center gap-2"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />} Update Password
                </button>
              </div>
            </form>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>

      <AlertDialog
        open={alertOpen}
        onOpenChange={(o) => {
          setAlertOpen(o);
          if (!o) {
            // Close the password dialog after acknowledging success
            if (alertType === 'success') {
              onOpenChange(false);
            }
          }
        }}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        buttonText="OK"
      />
    </Dialog.Root>
  );
}



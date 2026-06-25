import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useSalesmen } from '../../../hooks/useSalesmen';
import { validateEmail, sanitizePhoneInput, validatePhone } from '../../../utils/validation';
import { EmailVerifyButton } from '../../shared/EmailVerifyButton';
import { isVerifiedEmailInput, normalizeVerifiedEmail, VERIFIED_EMAIL_INPUT_CLASS } from '../../../utils/emailVerification';
import { PhoneInput } from '../../shared/PhoneInput';
import { SalespersonPreviewDialog } from './SalespersonPreviewDialog';
import { AlertDialog } from '../../shared/AlertDialog';
import type { CreateSalesmanRequest, Salesman } from '../../../types/entities';

interface SalesmanFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the modal updates this salesperson instead of creating one */
  editingSalesman?: Salesman | null;
}

export function SalesmanFormModal({ open, onOpenChange, editingSalesman = null }: SalesmanFormModalProps) {
  const { createSalesman, updateSalesman } = useSalesmen();
  const isEdit = Boolean(editingSalesman);
  const [formData, setFormData] = useState<CreateSalesmanRequest>({
    name: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editingSalesman) {
      setFormData({
        name: editingSalesman.name,
        email: editingSalesman.email,
        phone: editingSalesman.phone,
        is_active: editingSalesman.is_active,
      });
    } else {
      setFormData({ name: '', email: '', phone: '' });
    }
    setErrors({});
    setVerifiedEmail(null);
  }, [open, editingSalesman]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) newErrors.name = 'Name is required';
    // Email is optional, but if provided, must be valid
    if (formData.email && !validateEmail(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.phone) newErrors.phone = 'Phone is required';
    else if (!validatePhone(formData.phone)) newErrors.phone = 'Enter a valid 10-digit mobile number';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (editingSalesman) {
      setLoading(true);
      try {
        await updateSalesman(editingSalesman.id, {
          name: formData.name,
          email: formData.email,
          phone: sanitizePhoneInput(formData.phone),
          is_active: formData.is_active,
        });
        setFormData({ name: '', email: '', phone: '' });
        setErrors({});
        setAlertType('success');
        setAlertTitle('Salesperson Updated');
        setAlertMessage('The salesperson has been updated successfully.');
        setAlertOpen(true);
        onOpenChange(false);
      } catch (error: any) {
        setAlertType('error');
        setAlertTitle('Failed to Update Salesperson');
        setAlertMessage(
          error?.message ||
            error?.data?.message ||
            error?.response?.data?.message ||
            'An error occurred while updating the salesperson. Please try again.'
        );
        setAlertOpen(true);
      } finally {
        setLoading(false);
      }
      return;
    }

    onOpenChange(false);
    setPreviewOpen(true);
  };

  const handlePreviewConfirm = async (data: CreateSalesmanRequest) => {
    setLoading(true);
    try {
      await createSalesman(data);
      setPreviewOpen(false);
      setFormData({ name: '', email: '', phone: '' });
      setErrors({});
      setAlertType('success');
      setAlertTitle('Salesperson Created Successfully');
      setAlertMessage('The salesperson has been created successfully.');
      setAlertOpen(true);
      onOpenChange(false);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Failed to Create Salesperson');
      const errorMessage =
        error?.message ||
        error?.data?.message ||
        error?.response?.data?.message ||
        'An error occurred while creating the salesperson. Please try again.';
      setAlertMessage(errorMessage);
      setAlertOpen(true);
      setPreviewOpen(false);
      onOpenChange(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-w-md translate-x-[-50%] translate-y-[-50%] w-full">
          <div className="glass rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-semibold">
                {isEdit ? 'Edit Salesperson' : 'Create Salesperson'}
              </Dialog.Title>
              <button onClick={() => onOpenChange(false)} className="rounded-lg p-1 hover:bg-muted/50 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} className="space-y-4">
              {!isEdit && (
                <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 mb-2">
                  <p className="text-sm text-primary/90">
                    <span className="font-medium">Note:</span> The user will be created with password:{' '}
                    <span className="font-mono font-semibold">defaultPassword123</span>
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      if (isVerifiedEmailInput(formData.email ?? '', { verifiedSingleEmail: verifiedEmail })) return;
                      setFormData({ ...formData, email: e.target.value });
                    }}
                    readOnly={isVerifiedEmailInput(formData.email ?? '', { verifiedSingleEmail: verifiedEmail })}
                    className={`flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary ${
                      isVerifiedEmailInput(formData.email ?? '', { verifiedSingleEmail: verifiedEmail })
                        ? VERIFIED_EMAIL_INPUT_CLASS
                        : ''
                    }`}
                  />
                  <EmailVerifyButton
                    email={formData.email ?? ''}
                    verifiedFromSnapshot={verifiedEmail === normalizeVerifiedEmail(formData.email ?? '')}
                    onError={(message) => setErrors({ ...errors, email: message })}
                    onVerified={() => {
                      const nextErrors = { ...errors };
                      delete nextErrors.email;
                      setErrors(nextErrors);
                      setVerifiedEmail(normalizeVerifiedEmail(formData.email ?? ''));
                    }}
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Phone *</label>
                <PhoneInput
                  value={formData.phone}
                  onChange={(phone) => setFormData({ ...formData, phone })}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                />
                {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
              </div>

              {isEdit && (
                <div className="flex items-center gap-2">
                  <input
                    id="salesman-active"
                    type="checkbox"
                    checked={formData.is_active !== false}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-border"
                  />
                  <label htmlFor="salesman-active" className="text-sm font-medium">
                    Active
                  </label>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => onOpenChange(false)} className="flex-1 rounded-lg border border-border bg-background/60 px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn-primary flex-1"
                >
                  {isEdit ? 'Update Salesperson' : 'Create Salesperson'}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
      
      {/* Preview Dialog */}
      <SalespersonPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        formData={formData}
        onConfirm={handlePreviewConfirm}
      />

      {/* Alert Dialog for API Response */}
      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        buttonText="OK"
      />
    </Dialog.Root>
  );
}


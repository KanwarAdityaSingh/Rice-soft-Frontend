import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { CustomSelect } from '../../shared/CustomSelect';
import { usersAPI } from '../../../services/users.api';
import { validateEmail, validateUsername, validatePassword } from '../../../utils/validation';
import { AlertDialog } from '../../shared/AlertDialog';
import type { CreateUserRequest, UpdateUserRequest, User } from '../../../types/entities';

interface UserFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
}

export function UserFormModal({ open, onOpenChange, user }: UserFormModalProps) {
  const isEdit = !!user;
  const [formData, setFormData] = useState<CreateUserRequest>({
    username: '',
    email: '',
    password: '',
    full_name: '',
    phone: '',
    user_type: 'admin',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // Reset form when modal opens/closes or user changes
  useEffect(() => {
    if (open) {
      if (user) {
        // Edit mode - populate form with user data
        setFormData({
          username: user.username,
          email: user.email,
          password: '', // Don't populate password for edit
          full_name: user.full_name || '',
          phone: user.phone || '',
          user_type: user.user_type === 'admin' || user.user_type === 'custom' ? user.user_type : 'admin',
        });
      } else {
        // Create mode - reset form
        setFormData({
          username: '',
          email: '',
          password: '',
          full_name: '',
          phone: '',
          user_type: 'admin',
        });
      }
      setErrors({});
    }
  }, [open, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!validateUsername(formData.username)) {
      newErrors.username = 'Invalid username';
    }
    // Email is optional, but if provided, it must be valid
    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Invalid email';
    }
    // Only validate password for create mode or if password is provided in edit mode
    if (!isEdit && !validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (!formData.full_name) {
      newErrors.full_name = 'Full name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      if (isEdit && user) {
        // Update user - only include password if it's provided
        const updateData: UpdateUserRequest = {
          username: formData.username,
          full_name: formData.full_name,
          phone: formData.phone || undefined,
          user_type: formData.user_type,
        };
        
        // Only include email if it's provided (not empty)
        if (formData.email?.trim()) {
          updateData.email = formData.email.trim();
        }
        
        // Only include password if it's provided (not empty)
        if (formData.password.trim()) {
          updateData.password = formData.password;
        }
        
        await usersAPI.updateUser(user.id, updateData);
        
        // Show success alert
        setAlertType('success');
        setAlertTitle('User Updated Successfully');
        setAlertMessage('The user has been updated successfully.');
        setAlertOpen(true);
        onOpenChange(false);
      } else {
        // Create user - only include email if provided
        const createData: CreateUserRequest = {
          username: formData.username,
          password: formData.password,
          full_name: formData.full_name,
          phone: formData.phone || undefined,
          user_type: formData.user_type,
        };
        
        // Only include email if it's provided (not empty)
        if (formData.email?.trim()) {
          createData.email = formData.email.trim();
        }
        
        await usersAPI.createUser(createData);
        
        // Show success alert
        setAlertType('success');
        setAlertTitle('User Created Successfully');
        setAlertMessage('The user has been created successfully.');
        setAlertOpen(true);
        onOpenChange(false);
      }
      
      setFormData({
        username: '',
        email: '',
        password: '',
        full_name: '',
        phone: '',
        user_type: 'admin',
      });
      setErrors({});
    } catch (error: any) {
      // Show error alert with API response
      setAlertType('error');
      setAlertTitle(isEdit ? 'Failed to Update User' : 'Failed to Create User');
      // Extract error message from various possible locations
      const errorMessage = 
        error?.message || 
        error?.data?.message || 
        error?.response?.data?.message || 
        (isEdit ? 'An error occurred while updating the user. Please try again.' : 'An error occurred while creating the user. Please try again.');
      setAlertMessage(errorMessage);
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[85vh] w-full max-w-md translate-x-[-50%] translate-y-[-50%] animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0         data-[state=closed]:zoom-out-95 duration-200"
        >
          <div className="glass rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-semibold">
                {isEdit ? 'Edit User' : 'Create User'}
              </Dialog.Title>
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-lg p-1 hover:bg-muted/50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">User Type *</label>
                <CustomSelect
                  value={formData.user_type}
                  onChange={(value) => setFormData({ ...formData, user_type: value as any })}
                  options={[
                    { value: 'admin', label: 'Admin' },
                    { value: 'custom', label: 'System User' }
                  ]}
                  placeholder="Select User Type"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                  placeholder="john_admin"
                />
                {errors.username && <p className="mt-1 text-xs text-red-600">{errors.username}</p>}
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                  placeholder="john@example.com (optional)"
                />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Password {isEdit ? '(leave blank to keep current)' : '*'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                  placeholder={isEdit ? "Leave blank to keep current password" : "••••••••"}
                />
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Full Name *</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                  placeholder="John Doe"
                />
                {errors.full_name && <p className="mt-1 text-xs text-red-600">{errors.full_name}</p>}
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                  placeholder="9876543210"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 rounded-lg border border-border bg-background/60 px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1"
                >
                  {loading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update User' : 'Create User')}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>

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


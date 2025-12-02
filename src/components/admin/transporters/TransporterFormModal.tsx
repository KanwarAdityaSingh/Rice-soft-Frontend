import * as Dialog from '@radix-ui/react-dialog';
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useTransporters } from '../../../hooks/useTransporters';
import { transportersAPI } from '../../../services/transporters.api';
import { AlertDialog } from '../../shared/AlertDialog';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import type { CreateTransporterRequest, UpdateTransporterRequest, Transporter } from '../../../types/entities';

interface TransporterFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transporterId?: string | null;
}

export function TransporterFormModal({ open, onOpenChange, transporterId }: TransporterFormModalProps) {
  const { createTransporter, updateTransporter } = useTransporters();
  const isEditMode = !!transporterId;
  const [formData, setFormData] = useState<CreateTransporterRequest>({
    business_name: '',
    contact_person: '',
    phone: '',
    email: null,
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    },
    gst_number: null,
    pan_number: null,
    vehicle_numbers: [],
    bank_details: {},
    is_active: true,
  });
  const [newVehicleNumber, setNewVehicleNumber] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingTransporter, setLoadingTransporter] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    if (open && transporterId && isEditMode) {
      loadTransporterData();
    } else if (open && !transporterId) {
      resetForm();
    }
  }, [open, transporterId]);

  const loadTransporterData = async () => {
    if (!transporterId) return;
    setLoadingTransporter(true);
    try {
      const transporter = await transportersAPI.getTransporterById(transporterId);
      setFormData({
        business_name: transporter.business_name,
        contact_person: transporter.contact_person,
        phone: transporter.phone,
        email: transporter.email || null,
        address: transporter.address,
        gst_number: transporter.gst_number || null,
        pan_number: transporter.pan_number || null,
        vehicle_numbers: transporter.vehicle_numbers || [],
        bank_details: transporter.bank_details || {},
        is_active: transporter.is_active,
      });
      setErrors({});
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to load transporter data');
      setAlertOpen(true);
    } finally {
      setLoadingTransporter(false);
    }
  };

  const resetForm = () => {
    setFormData({
      business_name: '',
      contact_person: '',
      phone: '',
      email: null,
      address: {
        street: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
      },
      gst_number: null,
      pan_number: null,
      vehicle_numbers: [],
      bank_details: {},
      is_active: true,
    });
    setNewVehicleNumber('');
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.business_name.trim()) {
      newErrors.business_name = 'Business name is required';
    }
    if (!formData.contact_person.trim()) {
      newErrors.contact_person = 'Contact person is required';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.address.street.trim()) {
      newErrors['address.street'] = 'Street is required';
    }
    if (!formData.address.city.trim()) {
      newErrors['address.city'] = 'City is required';
    }
    if (!formData.address.state.trim()) {
      newErrors['address.state'] = 'State is required';
    }
    if (!formData.address.pincode.trim()) {
      newErrors['address.pincode'] = 'Pincode is required';
    }
    if (!formData.address.country.trim()) {
      newErrors['address.country'] = 'Country is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isEditMode && transporterId) {
        await updateTransporter(transporterId, formData as UpdateTransporterRequest);
        setAlertType('success');
        setAlertTitle('Success');
        setAlertMessage('Transporter updated successfully');
      } else {
        await createTransporter(formData);
        setAlertType('success');
        setAlertTitle('Success');
        setAlertMessage('Transporter created successfully');
      }
      setAlertOpen(true);
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 1500);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to save transporter');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const addVehicleNumber = () => {
    if (newVehicleNumber.trim() && !formData.vehicle_numbers.includes(newVehicleNumber.trim())) {
      setFormData({
        ...formData,
        vehicle_numbers: [...formData.vehicle_numbers, newVehicleNumber.trim()],
      });
      setNewVehicleNumber('');
    }
  };

  const removeVehicleNumber = (index: number) => {
    setFormData({
      ...formData,
      vehicle_numbers: formData.vehicle_numbers.filter((_, i) => i !== index),
    });
  };

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-[90vw] md:w-full max-w-3xl translate-x-[-50%] translate-y-[-50%]">
            <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-xl sm:text-2xl font-semibold">
                  {isEditMode ? 'Edit Transporter' : 'Create Transporter'}
                </Dialog.Title>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {loadingTransporter ? (
                <div className="flex justify-center py-10">
                  <LoadingSpinner />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Business Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.business_name}
                        onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors.business_name ? 'border-red-500' : 'border-border'
                        }`}
                        placeholder="ABC Transport Services"
                      />
                      {errors.business_name && (
                        <p className="text-xs text-red-500 mt-1">{errors.business_name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Contact Person <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.contact_person}
                        onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors.contact_person ? 'border-red-500' : 'border-border'
                        }`}
                        placeholder="John Doe"
                      />
                      {errors.contact_person && (
                        <p className="text-xs text-red-500 mt-1">{errors.contact_person}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors.phone ? 'border-red-500' : 'border-border'
                        }`}
                        placeholder="+91-9876543210"
                      />
                      {errors.phone && (
                        <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value || null })}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors.email ? 'border-red-500' : 'border-border'
                        }`}
                        placeholder="contact@abctransport.com"
                      />
                      {errors.email && (
                        <p className="text-xs text-red-500 mt-1">{errors.email}</p>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium mb-1">
                        Street <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.address.street}
                        onChange={(e) => setFormData({
                          ...formData,
                          address: { ...formData.address, street: e.target.value },
                        })}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors['address.street'] ? 'border-red-500' : 'border-border'
                        }`}
                        placeholder="123 Main Street"
                      />
                      {errors['address.street'] && (
                        <p className="text-xs text-red-500 mt-1">{errors['address.street']}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.address.city}
                        onChange={(e) => setFormData({
                          ...formData,
                          address: { ...formData.address, city: e.target.value },
                        })}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors['address.city'] ? 'border-red-500' : 'border-border'
                        }`}
                        placeholder="Mumbai"
                      />
                      {errors['address.city'] && (
                        <p className="text-xs text-red-500 mt-1">{errors['address.city']}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        State <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.address.state}
                        onChange={(e) => setFormData({
                          ...formData,
                          address: { ...formData.address, state: e.target.value },
                        })}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors['address.state'] ? 'border-red-500' : 'border-border'
                        }`}
                        placeholder="Maharashtra"
                      />
                      {errors['address.state'] && (
                        <p className="text-xs text-red-500 mt-1">{errors['address.state']}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Pincode <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.address.pincode}
                        onChange={(e) => setFormData({
                          ...formData,
                          address: { ...formData.address, pincode: e.target.value },
                        })}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors['address.pincode'] ? 'border-red-500' : 'border-border'
                        }`}
                        placeholder="400001"
                      />
                      {errors['address.pincode'] && (
                        <p className="text-xs text-red-500 mt-1">{errors['address.pincode']}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Country <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.address.country}
                        onChange={(e) => setFormData({
                          ...formData,
                          address: { ...formData.address, country: e.target.value },
                        })}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors['address.country'] ? 'border-red-500' : 'border-border'
                        }`}
                        placeholder="India"
                      />
                      {errors['address.country'] && (
                        <p className="text-xs text-red-500 mt-1">{errors['address.country']}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">GST Number</label>
                      <input
                        type="text"
                        value={formData.gst_number || ''}
                        onChange={(e) => setFormData({ ...formData, gst_number: e.target.value || null })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                        placeholder="27ABCDE1234F1Z5"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">PAN Number</label>
                      <input
                        type="text"
                        value={formData.pan_number || ''}
                        onChange={(e) => setFormData({ ...formData, pan_number: e.target.value || null })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                        placeholder="ABCDE1234F"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium mb-1">Vehicle Numbers</label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={newVehicleNumber}
                          onChange={(e) => setNewVehicleNumber(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addVehicleNumber();
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-border rounded-lg bg-background"
                          placeholder="MH01AB1234"
                        />
                        <button
                          type="button"
                          onClick={addVehicleNumber}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      {formData.vehicle_numbers.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.vehicle_numbers.map((vehicle, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 px-3 py-1 bg-muted rounded-lg"
                            >
                              <span className="text-sm">{vehicle}</span>
                              <button
                                type="button"
                                onClick={() => removeVehicleNumber(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Status</label>
                      <select
                        value={formData.is_active ? 'active' : 'inactive'}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
      />
    </>
  );
}


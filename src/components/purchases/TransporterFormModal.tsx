import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useTransporters } from '../../hooks/useTransporters';
import { pincodeAPI } from '../../services/pincode.api';
import { LoadingSpinner } from '../admin/shared/LoadingSpinner';
import { AlertDialog } from '../shared/AlertDialog';
import type { CreateTransporterRequest, UpdateTransporterRequest } from '../../types/entities';

interface TransporterFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transporterId?: string | null;
}

export function TransporterFormModal({ open, onOpenChange, transporterId }: TransporterFormModalProps) {
  const { createTransporter, updateTransporter } = useTransporters();
  const [formData, setFormData] = useState<CreateTransporterRequest>({
    business_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    },
    gst_number: '',
    pan_number: '',
    vehicle_numbers: [],
    bank_details: {
      bank_name: '',
      ifsc_code: '',
      account_number: '',
      branch: '',
    },
    is_active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [newVehicleNumber, setNewVehicleNumber] = useState('');

  const isEditMode = !!transporterId;

  useEffect(() => {
    if (open && !transporterId) {
      // Reset form for create mode
      setFormData({
        business_name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: { street: '', city: '', state: '', pincode: '', country: 'India' },
        gst_number: '',
        pan_number: '',
        vehicle_numbers: [],
        bank_details: { bank_name: '', ifsc_code: '', account_number: '', branch: '' },
        is_active: true,
      });
      setStep(1);
      setErrors({});
    }
  }, [open, transporterId]);

  const handlePincodeLookup = async (pincode: string) => {
    if (!/^\d{6}$/.test(pincode)) return;
    setPincodeLoading(true);
    try {
      const response = await pincodeAPI.lookupPincode(pincode);
      const postOffice = response.postOffices?.[0];
      if (postOffice) {
        setFormData({
          ...formData,
          address: {
            ...formData.address,
            city: postOffice.Block || postOffice.District || postOffice.Name || formData.address.city,
            state: postOffice.State || formData.address.state,
            country: postOffice.Country || formData.address.country || 'India',
          },
        });
      }
    } catch (error: any) {
      console.error('Pincode lookup error:', error);
    } finally {
      setPincodeLoading(false);
    }
  };

  const addVehicleNumber = () => {
    if (newVehicleNumber.trim()) {
      setFormData({
        ...formData,
        vehicle_numbers: [...(formData.vehicle_numbers || []), newVehicleNumber.trim()],
      });
      setNewVehicleNumber('');
    }
  };

  const removeVehicleNumber = (index: number) => {
    setFormData({
      ...formData,
      vehicle_numbers: formData.vehicle_numbers?.filter((_, i) => i !== index) || [],
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.business_name) newErrors.business_name = 'Business name required';
    if (!formData.contact_person) newErrors.contact_person = 'Contact person required';
    if (!formData.phone) newErrors.phone = 'Phone required';
    if (!formData.address.street) newErrors.street = 'Street required';
    if (!formData.address.city) newErrors.city = 'City required';
    if (!formData.address.state) newErrors.state = 'State required';
    if (!formData.address.pincode) newErrors.pincode = 'Pincode required';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      if (newErrors.business_name || newErrors.contact_person || newErrors.phone) setStep(1);
      else if (newErrors.street || newErrors.city || newErrors.state || newErrors.pincode) setStep(2);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isEditMode && transporterId) {
        await updateTransporter(transporterId, formData as UpdateTransporterRequest);
        setAlertType('success');
        setAlertTitle('Transporter Updated');
        setAlertMessage('Transporter has been updated successfully.');
      } else {
        await createTransporter(formData);
        setAlertType('success');
        setAlertTitle('Transporter Created');
        setAlertMessage('Transporter has been created successfully.');
      }
      setAlertOpen(true);
      onOpenChange(false);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error?.message || 'An error occurred');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-3xl translate-x-[-50%] translate-y-[-50%]">
            <div className="glass rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-xl font-semibold">
                  {isEditMode ? 'Update Transporter' : 'Create Transporter'}
                </Dialog.Title>
                <button
                  onClick={() => onOpenChange(false)}
                  className="rounded-lg p-1 hover:bg-muted/50 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex gap-2 mb-6">
                {[1, 2, 3].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStep(s)}
                    className={`flex-1 rounded-lg p-2 text-center text-sm font-medium transition-colors ${
                      step >= s ? 'bg-primary/20 text-primary' : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {s === 1 && 'Basic Info'}
                    {s === 2 && 'Address'}
                    {s === 3 && 'Details'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {step === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Business Name *</label>
                      <input
                        type="text"
                        value={formData.business_name}
                        onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      />
                      {errors.business_name && <p className="mt-1 text-xs text-red-600">{errors.business_name}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Contact Person *</label>
                        <input
                          type="text"
                          value={formData.contact_person}
                          onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                          className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                        />
                        {errors.contact_person && <p className="mt-1 text-xs text-red-600">{errors.contact_person}</p>}
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Phone *</label>
                        <input
                          type="text"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                        />
                        {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">GST Number</label>
                        <input
                          type="text"
                          value={formData.gst_number}
                          onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })}
                          className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1.5 block">PAN Number</label>
                        <input
                          type="text"
                          value={formData.pan_number}
                          onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
                          className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                        />
                      </div>
                    </div>

                    <button type="button" onClick={() => setStep(2)} className="btn-primary w-full">
                      Next: Address
                    </button>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Street *</label>
                      <input
                        type="text"
                        value={formData.address.street}
                        onChange={(e) =>
                          setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })
                        }
                        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      />
                      {errors.street && <p className="mt-1 text-xs text-red-600">{errors.street}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">City *</label>
                        <input
                          type="text"
                          value={formData.address.city}
                          onChange={(e) =>
                            setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })
                          }
                          className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                        />
                        {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1.5 block">State *</label>
                        <input
                          type="text"
                          value={formData.address.state}
                          onChange={(e) =>
                            setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })
                          }
                          className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                        />
                        {errors.state && <p className="mt-1 text-xs text-red-600">{errors.state}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Pincode *</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formData.address.pincode}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                              setFormData({ ...formData, address: { ...formData.address, pincode: value } });
                              if (value.length === 6) handlePincodeLookup(value);
                            }}
                            onBlur={(e) => {
                              const value = e.target.value.trim();
                              if (value.length === 6) handlePincodeLookup(value);
                            }}
                            className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                            placeholder="6 digits"
                            maxLength={6}
                          />
                          {pincodeLoading && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <LoadingSpinner size="sm" />
                            </div>
                          )}
                        </div>
                        {errors.pincode && <p className="mt-1 text-xs text-red-600">{errors.pincode}</p>}
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Country</label>
                        <input
                          type="text"
                          value={formData.address.country}
                          onChange={(e) =>
                            setFormData({ ...formData, address: { ...formData.address, country: e.target.value } })
                          }
                          className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">
                        Back
                      </button>
                      <button type="button" onClick={() => setStep(3)} className="btn-primary flex-1">
                        Next: Details
                      </button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Vehicle Numbers</label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={newVehicleNumber}
                          onChange={(e) => setNewVehicleNumber(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addVehicleNumber())}
                          className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                          placeholder="Enter vehicle number"
                        />
                        <button type="button" onClick={addVehicleNumber} className="btn-secondary">
                          Add
                        </button>
                      </div>
                      {formData.vehicle_numbers && formData.vehicle_numbers.length > 0 && (
                        <div className="space-y-1">
                          {formData.vehicle_numbers.map((vn, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between bg-background/60 rounded-lg px-3 py-2 text-sm"
                            >
                              <span>{vn}</span>
                              <button
                                type="button"
                                onClick={() => removeVehicleNumber(idx)}
                                className="text-red-600 hover:text-red-700"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Bank Name</label>
                        <input
                          type="text"
                          value={formData.bank_details?.bank_name || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              bank_details: { ...formData.bank_details, bank_name: e.target.value },
                            })
                          }
                          className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1.5 block">IFSC Code</label>
                        <input
                          type="text"
                          value={formData.bank_details?.ifsc_code || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              bank_details: { ...formData.bank_details, ifsc_code: e.target.value.toUpperCase() },
                            })
                          }
                          className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Account Number</label>
                        <input
                          type="text"
                          value={formData.bank_details?.account_number || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              bank_details: { ...formData.bank_details, account_number: e.target.value },
                            })
                          }
                          className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Branch</label>
                        <input
                          type="text"
                          value={formData.bank_details?.branch || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              bank_details: { ...formData.bank_details, branch: e.target.value },
                            })
                          }
                          className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1">
                        Back
                      </button>
                      <button type="submit" disabled={loading} className="btn-primary flex-1">
                        {loading ? 'Saving...' : isEditMode ? 'Update Transporter' : 'Create Transporter'}
                      </button>
                    </div>
                  </div>
                )}
              </form>
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


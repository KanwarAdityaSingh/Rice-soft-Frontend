import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { X, Search } from 'lucide-react';
import { CustomSelect } from '../../shared/CustomSelect';
import { useBrokers } from '../../../hooks/useBrokers';
import { brokersAPI } from '../../../services/brokers.api';
import { validateEmail, validateGST } from '../../../utils/validation';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import type { CreateBrokerRequest } from '../../../types/entities';

interface BrokerFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BrokerFormModal({ open, onOpenChange }: BrokerFormModalProps) {
  const { createBroker } = useBrokers();
  const [formData, setFormData] = useState<CreateBrokerRequest>({
    business_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    },
    business_details: {
      pan_number: '',
      gst_number: '',
      registration_number: '',
    },
    broker_details: {
      commission_rate: 0,
      specialization: '',
      experience_years: 0,
    },
    type: 'both',
    is_active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleGSTLookup = async () => {
    if (!formData.business_details.gst_number || !validateGST(formData.business_details.gst_number)) {
      setErrors({ ...errors, gst_number: 'Please enter a valid GST number' });
      return;
    }

    setLookupLoading(true);
    try {
      const response = await brokersAPI.lookupGST(formData.business_details.gst_number);
      const mapped = response.data.mapped_data;
      
      setFormData({
        ...formData,
        business_name: mapped.business_name || formData.business_name,
        address: { ...formData.address, ...mapped.address },
        business_details: { ...formData.business_details, ...mapped.business_details },
      });
    } catch (error) {
      setErrors({ ...errors, gst_number: 'Failed to lookup GST details' });
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.business_name) newErrors.business_name = 'Business name required';
    if (!formData.contact_person) newErrors.contact_person = 'Contact person required';
    if (!validateEmail(formData.email)) newErrors.email = 'Valid email required';
    if (!formData.phone) newErrors.phone = 'Phone required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await createBroker(formData);
      onOpenChange(false);
      setFormData({
        business_name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: { street: '', city: '', state: '', pincode: '', country: 'India' },
        business_details: { pan_number: '', gst_number: '', registration_number: '' },
        broker_details: { commission_rate: 0, specialization: '', experience_years: 0 },
        type: 'both',
        is_active: true,
      });
      setErrors({});
      setStep(1);
    } catch (error) {
      // Error handled by hook
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-3xl translate-x-[-50%] translate-y-[-50%]">
          <div className="glass rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-semibold">Create Broker</Dialog.Title>
              <button onClick={() => onOpenChange(false)} className="rounded-lg p-1 hover:bg-muted/50 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Steps */}
            <div className="flex gap-2 mb-6">
              <div className={`flex-1 rounded-lg p-2 text-center text-sm font-medium ${step >= 1 ? 'bg-primary/20 text-primary' : 'bg-muted'}`}>
                1. Basic Info
              </div>
              <div className={`flex-1 rounded-lg p-2 text-center text-sm font-medium ${step >= 2 ? 'bg-primary/20 text-primary' : 'bg-muted'}`}>
                2. Address & Business
              </div>
              <div className={`flex-1 rounded-lg p-2 text-center text-sm font-medium ${step >= 3 ? 'bg-primary/20 text-primary' : 'bg-muted'}`}>
                3. Broker Details
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Step 1: Basic Info */}
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
                      <label className="text-sm font-medium mb-1.5 block">Email *</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      />
                      {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Phone *</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      />
                      {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Type *</label>
                      <CustomSelect
                        value={formData.type}
                        onChange={(value) => setFormData({ ...formData, type: value as any })}
                        options={[
                          { value: 'purchase', label: 'Purchase' },
                          { value: 'sale', label: 'Sale' },
                          { value: 'both', label: 'Both' }
                        ]}
                        placeholder="Select Type"
                      />
                    </div>
                  </div>

                  <button type="button" onClick={() => setStep(2)} className="btn-primary w-full">
                    Next: Address & Business
                  </button>
                </div>
              )}

              {/* Step 2: Address & Business Details */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Street</label>
                    <input
                      type="text"
                      value={formData.address.street}
                      onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">City</label>
                      <input
                        type="text"
                        value={formData.address.city}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1.5 block">State</label>
                      <input
                        type="text"
                        value={formData.address.state}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">GST Number</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.business_details.gst_number}
                        onChange={(e) => setFormData({ ...formData, business_details: { ...formData.business_details, gst_number: e.target.value.toUpperCase() } })}
                        className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                        placeholder="27ABCDE1234F1Z5"
                      />
                      <button type="button" onClick={handleGSTLookup} disabled={lookupLoading} className="btn-secondary flex items-center gap-2 px-4">
                        {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.gst_number && <p className="mt-1 text-xs text-red-600">{errors.gst_number}</p>}
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">
                      Back
                    </button>
                    <button type="button" onClick={() => setStep(3)} className="btn-primary flex-1">
                      Next: Broker Details
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Broker Specific Details */}
              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Commission Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.broker_details?.commission_rate || ''}
                      onChange={(e) => setFormData({ ...formData, broker_details: { ...formData.broker_details!, commission_rate: parseFloat(e.target.value) || 0 } })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Specialization</label>
                    <input
                      type="text"
                      value={formData.broker_details?.specialization || ''}
                      onChange={(e) => setFormData({ ...formData, broker_details: { ...formData.broker_details!, specialization: e.target.value } })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      placeholder="rice, wheat, pulses"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Experience (Years)</label>
                    <input
                      type="number"
                      value={formData.broker_details?.experience_years || ''}
                      onChange={(e) => setFormData({ ...formData, broker_details: { ...formData.broker_details!, experience_years: parseInt(e.target.value) || 0 } })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1">
                      Back
                    </button>
                    <button type="submit" disabled={loading} className="btn-primary flex-1">
                      {loading ? 'Creating...' : 'Create Broker'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
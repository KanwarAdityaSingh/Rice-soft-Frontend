import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { X, Search } from 'lucide-react';
import { CustomSelect } from '../../shared/CustomSelect';
import { useVendors } from '../../../hooks/useVendors';
import { vendorsAPI } from '../../../services/vendors.api';
import { validateEmail, validateGST, validatePAN } from '../../../utils/validation';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { VendorPreviewDialog } from './VendorPreviewDialog';
import { AlertDialog } from '../../shared/AlertDialog';
import type { CreateVendorRequest } from '../../../types/entities';

interface VendorFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VendorFormModal({ open, onOpenChange }: VendorFormModalProps) {
  const { createVendor } = useVendors();
  const [formData, setFormData] = useState<CreateVendorRequest>({
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
    type: 'both',
    is_active: true,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const handleGSTLookup = async () => {
    if (!formData.business_details.gst_number) {
      setErrors({ ...errors, gst_number: 'Please enter a GST number' });
      return;
    }
    
    if (!validateGST(formData.business_details.gst_number)) {
      setErrors({ ...errors, gst_number: 'Invalid GST format' });
      return;
    }

    setLookupLoading(true);
    setErrors({ ...errors, gst_number: '' });
    
    try {
      const response = await vendorsAPI.lookupGST(formData.business_details.gst_number);
      
      // The API service returns response.data, which is { gst_data: {...}, mapped_data: {...} }
      const mapped = response.mapped_data;
      
      // Populate business name if available
      const businessName = mapped?.business_name || formData.business_name;
      
      // Populate address fields (only fill non-empty values)
      const addressUpdate: any = { ...formData.address };
      if (mapped?.address) {
        if (mapped.address.street) addressUpdate.street = mapped.address.street;
        if (mapped.address.city) addressUpdate.city = mapped.address.city;
        if (mapped.address.state) addressUpdate.state = mapped.address.state;
        if (mapped.address.pincode) addressUpdate.pincode = mapped.address.pincode;
        if (mapped.address.country) addressUpdate.country = mapped.address.country;
      }
      
      // Update business details
      const businessDetailsUpdate: any = {
        ...formData.business_details,
      };
      
      // Set GST number if available
      if (mapped?.business_details?.gst_number) {
        businessDetailsUpdate.gst_number = mapped.business_details.gst_number;
      }
      
      // Set PAN number if available
      if (mapped?.business_details?.pan_number) {
        businessDetailsUpdate.pan_number = mapped.business_details.pan_number;
      }
      
      // Set registration number if available
      if (mapped?.business_details?.registration_number) {
        businessDetailsUpdate.registration_number = mapped.business_details.registration_number;
      }
      
      // Set business type if available
      if (mapped?.business_details?.business_type) {
        businessDetailsUpdate.business_type = mapped.business_details.business_type;
      }
      
      setFormData({
        ...formData,
        business_name: businessName,
        address: addressUpdate,
        business_details: businessDetailsUpdate,
      });
      
      // Clear any previous errors
      setErrors({ ...errors, gst_number: '' });
    } catch (error: any) {
      console.error('GST lookup error:', error);
      setErrors({ ...errors, gst_number: error?.message || 'Failed to lookup GST details' });
    } finally {
      setLookupLoading(false);
    }
  };

  const handlePANLookup = async () => {
    if (!formData.business_details.pan_number) {
      setErrors({ ...errors, pan_number: 'Please enter a PAN number' });
      return;
    }
    
    if (!validatePAN(formData.business_details.pan_number)) {
      setErrors({ ...errors, pan_number: 'Invalid PAN format' });
      return;
    }

    setLookupLoading(true);
    setErrors({ ...errors, pan_number: '' });
    
    try {
      const response = await vendorsAPI.lookupPAN(formData.business_details.pan_number);
      
      // The API service returns response.data, which is { pan_data: {...}, mapped_data: {...} }
      const mapped = response.mapped_data;
      const panData = response.pan_data;
      
      // Populate business name if available
      const businessName = mapped?.business_name || formData.business_name;
      
      // Populate contact person if PAN is for a person (individual)
      const contactPerson = panData?.category === 'person' && panData?.name 
        ? panData.name 
        : formData.contact_person;
      
      // Populate address fields (only fill non-empty values)
      const addressUpdate: any = { ...formData.address };
      if (mapped?.address) {
        if (mapped.address.street) addressUpdate.street = mapped.address.street;
        if (mapped.address.city) addressUpdate.city = mapped.address.city;
        if (mapped.address.state) addressUpdate.state = mapped.address.state;
        if (mapped.address.pincode) addressUpdate.pincode = mapped.address.pincode;
        if (mapped.address.country) addressUpdate.country = mapped.address.country;
      }
      
      // Update business details
      const businessDetailsUpdate: any = {
        ...formData.business_details,
      };
      
      // Ensure PAN number is set
      if (mapped?.business_details?.pan_number) {
        businessDetailsUpdate.pan_number = mapped.business_details.pan_number;
      }
      
      // Set business type if available
      if (mapped?.business_details?.business_type) {
        businessDetailsUpdate.business_type = mapped.business_details.business_type;
      }
      
      setFormData({
        ...formData,
        business_name: businessName,
        contact_person: contactPerson,
        address: addressUpdate,
        business_details: businessDetailsUpdate,
      });
      
      // Clear any previous errors
      setErrors({ ...errors, pan_number: '' });
    } catch (error: any) {
      console.error('PAN lookup error:', error);
      setErrors({ ...errors, pan_number: error?.message || 'Failed to lookup PAN details' });
    } finally {
      setLookupLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.business_name) newErrors.business_name = 'Business name required';
    if (!formData.contact_person) newErrors.contact_person = 'Contact person required';
    // Email is optional, but if provided, must be valid
    if (formData.email && !validateEmail(formData.email)) newErrors.email = 'Valid email required';
    if (!formData.phone) newErrors.phone = 'Phone required';
    if (!formData.address.street) newErrors.street = 'Street required';
    if (!formData.address.city) newErrors.city = 'City required';
    if (!formData.address.state) newErrors.state = 'State required';
    if (!formData.address.pincode) newErrors.pincode = 'Pincode required';
    if (!formData.business_details.pan_number && !formData.business_details.gst_number) {
      newErrors.gst_number = 'Either GST or PAN required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Navigate to step with errors
      if (newErrors.business_name || newErrors.contact_person || newErrors.email || newErrors.phone || newErrors.gst_number || newErrors.pan_number) {
        setStep(1);
      } else if (newErrors.street || newErrors.city || newErrors.state || newErrors.pincode) {
        setStep(2);
      }
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate and show preview instead of directly saving
    if (validateForm()) {
      // Close form modal and open preview dialog
      onOpenChange(false);
      setPreviewOpen(true);
    }
  };

  const handlePreviewConfirm = async (data: CreateVendorRequest) => {
    setLoading(true);
    try {
      await createVendor(data);
      setPreviewOpen(false);
      setFormData({
        business_name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: { street: '', city: '', state: '', pincode: '', country: 'India' },
        business_details: { pan_number: '', gst_number: '', registration_number: '' },
        type: 'both',
        is_active: true,
      });
      setErrors({});
      setStep(1);
      // Show success alert
      setAlertType('success');
      setAlertTitle('Vendor Created Successfully');
      setAlertMessage('The vendor has been created successfully.');
      setAlertOpen(true);
      // Close the form modal after success
      onOpenChange(false);
    } catch (error: any) {
      // Show error alert with API response
      setAlertType('error');
      setAlertTitle('Failed to Create Vendor');
      // Extract error message from various possible locations
      const errorMessage = 
        error?.message || 
        error?.data?.message || 
        error?.response?.data?.message || 
        'An error occurred while creating the vendor. Please try again.';
      setAlertMessage(errorMessage);
      setAlertOpen(true);
      setPreviewOpen(false);
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
              <Dialog.Title className="text-xl font-semibold">Create Vendor</Dialog.Title>
              <button onClick={() => onOpenChange(false)} className="rounded-lg p-1 hover:bg-muted/50 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Steps */}
            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`flex-1 rounded-lg p-2 text-center text-sm font-medium transition-colors ${
                  step >= 1 ? 'bg-primary/20 text-primary' : 'bg-muted hover:bg-muted/80'
                }`}
              >
                1. Basic Info
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className={`flex-1 rounded-lg p-2 text-center text-sm font-medium transition-colors ${
                  step >= 2 ? 'bg-primary/20 text-primary' : 'bg-muted hover:bg-muted/80'
                }`}
              >
                2. Address
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className={`flex-1 rounded-lg p-2 text-center text-sm font-medium transition-colors ${
                  step >= 3 ? 'bg-primary/20 text-primary' : 'bg-muted hover:bg-muted/80'
                }`}
              >
                3. Business Details
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} className="space-y-4">
              {step === 1 && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 mb-2">
                    <p className="text-sm text-primary/90">
                      <span className="font-medium">Note:</span> One of the fields (either GST Number or PAN Number) is mandatory.
                    </p>
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
                      <button type="button" onClick={handleGSTLookup} disabled={lookupLoading} className="btn-secondary flex items-center gap-2">
                        {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.gst_number && <p className="mt-1 text-xs text-red-600">{errors.gst_number}</p>}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">PAN Number</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.business_details.pan_number}
                        onChange={(e) => setFormData({ ...formData, business_details: { ...formData.business_details, pan_number: e.target.value.toUpperCase() } })}
                        className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                        placeholder="ABCDE1234F"
                      />
                      <button type="button" onClick={handlePANLookup} disabled={lookupLoading} className="btn-secondary flex items-center gap-2">
                        {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.pan_number && <p className="mt-1 text-xs text-red-600">{errors.pan_number}</p>}
                  </div>

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
                      <label className="text-sm font-medium mb-1.5 block">Email</label>
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
                          { value: 'purchaser', label: 'Purchaser' },
                          { value: 'seller', label: 'Seller' },
                          { value: 'both', label: 'Both' }
                        ]}
                        placeholder="Select Type"
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
                      onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
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
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      />
                      {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1.5 block">State *</label>
                      <input
                        type="text"
                        value={formData.address.state}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      />
                      {errors.state && <p className="mt-1 text-xs text-red-600">{errors.state}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Pincode *</label>
                      <input
                        type="text"
                        value={formData.address.pincode}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, pincode: e.target.value } })}
                        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      />
                      {errors.pincode && <p className="mt-1 text-xs text-red-600">{errors.pincode}</p>}
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Country</label>
                      <input
                        type="text"
                        value={formData.address.country}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, country: e.target.value } })}
                        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">
                      Back
                    </button>
                    <button type="button" onClick={() => setStep(3)} className="btn-primary flex-1">
                      Next: Business Details
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Registration Number</label>
                    <input
                      type="text"
                      value={formData.business_details.registration_number}
                      onChange={(e) => setFormData({ ...formData, business_details: { ...formData.business_details, registration_number: e.target.value } })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1">
                      Back
                    </button>
                    <button type="button" onClick={() => {/* Skip */}} className="btn-secondary">
                      Skip Bank Details
                    </button>
                    <button 
                      type="button" 
                      onClick={handleSubmit}
                      disabled={loading}
                      className="btn-primary flex-1"
                    >
                      Create Vendor
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
      
      {/* Preview Dialog */}
      <VendorPreviewDialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) {
            // If preview is closed without confirming, optionally reopen the form
            // For now, we'll just close it
          }
        }}
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


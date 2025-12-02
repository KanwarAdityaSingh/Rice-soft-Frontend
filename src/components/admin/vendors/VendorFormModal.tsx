import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X, Search, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CustomSelect } from '../../shared/CustomSelect';
import { useVendors } from '../../../hooks/useVendors';
import { vendorsAPI } from '../../../services/vendors.api';
import { leadsAPI } from '../../../services/leads.api';
import { pincodeAPI } from '../../../services/pincode.api';
import { validateEmail, validateGST, validatePAN, validateGoogleLocationLink } from '../../../utils/validation';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { VendorPreviewDialog } from './VendorPreviewDialog';
import { AlertDialog } from '../../shared/AlertDialog';
import type { CreateVendorRequest, UpdateVendorRequest, Lead } from '../../../types/entities';

interface VendorFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId?: string | null;
}

export function VendorFormModal({ open, onOpenChange, vendorId }: VendorFormModalProps) {
  const { createVendor, updateVendor } = useVendors();
  const navigate = useNavigate();
  const isEditMode = !!vendorId;
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
    google_location_link: null,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [loadingVendor, setLoadingVendor] = useState(false);
  const [originalGstNumber, setOriginalGstNumber] = useState<string>('');
  const [originalPanNumber, setOriginalPanNumber] = useState<string>('');
  const [leadData, setLeadData] = useState<Lead | null>(null);

  // Load vendor data when in edit mode
  useEffect(() => {
    if (open && vendorId && isEditMode) {
      loadVendorData();
    } else if (open && !vendorId) {
      // Reset form when opening in create mode
      resetForm();
    }
  }, [open, vendorId]);

  // Load lead data when vendor has lead_id
  useEffect(() => {
    if (open && vendorId && isEditMode && leadData === null) {
      loadLeadData();
    } else if (!open) {
      setLeadData(null);
    }
  }, [open, vendorId, isEditMode]);

  const loadVendorData = async () => {
    if (!vendorId) return;
    
    setLoadingVendor(true);
    try {
      const vendor = await vendorsAPI.getVendorById(vendorId);
      const gstNumber = vendor.business_details?.gst_number || '';
      const panNumber = vendor.business_details?.pan_number || '';
      
      // Store original values to check if they should be disabled
      setOriginalGstNumber(gstNumber);
      setOriginalPanNumber(panNumber);
      
      setFormData({
        business_name: vendor.business_name || '',
        contact_person: vendor.contact_person || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        address: {
          street: vendor.address?.street || '',
          city: vendor.address?.city || '',
          state: vendor.address?.state || '',
          pincode: vendor.address?.pincode || '',
          country: vendor.address?.country || 'India',
        },
        business_details: {
          pan_number: panNumber,
          gst_number: gstNumber,
          registration_number: vendor.business_details?.registration_number || '',
        },
        type: vendor.type || 'both',
        is_active: vendor.is_active ?? true,
        google_location_link: vendor.google_location_link || null,
      });
      setStep(1);
      setErrors({});
    } catch (error: any) {
      console.error('Failed to load vendor:', error);
      setAlertType('error');
      setAlertTitle('Failed to Load Vendor');
      setAlertMessage(error?.message || 'Could not load vendor data. Please try again.');
      setAlertOpen(true);
      onOpenChange(false);
    } finally {
      setLoadingVendor(false);
    }
  };

  const loadLeadData = async () => {
    if (!vendorId) return;
    
    try {
      const vendor = await vendorsAPI.getVendorById(vendorId);
      if (vendor.lead_id) {
        const lead = await leadsAPI.getLeadById(vendor.lead_id);
        setLeadData(lead);
      }
    } catch (error: any) {
      console.error('Failed to load lead data:', error);
      // Don't show error, just log it
    }
  };

  const resetForm = () => {
    setFormData({
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
      google_location_link: null,
    });
    setStep(1);
    setErrors({});
    setOriginalGstNumber('');
    setOriginalPanNumber('');
  };

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

  const handlePincodeLookup = async (pincode: string) => {
    // Only lookup if pincode is exactly 6 digits
    if (!/^\d{6}$/.test(pincode)) {
      return;
    }

    setPincodeLoading(true);
    const errorKey = 'pincode';
    setErrors({ ...errors, [errorKey]: '' });

    try {
      const response = await pincodeAPI.lookupPincode(pincode);
      
      // Extract post office data from response
      const postOffice = response.postOffices?.[0];
      
      if (!postOffice) {
        console.warn('No post office data found in pincode lookup response');
        return;
      }

      // Update address fields from pincode lookup response
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          pincode: postOffice.Pincode || pincode,
          // Fill city, state from response
          city: postOffice.Block || postOffice.District || postOffice.Name || formData.address?.city || '',
          state: postOffice.State || formData.address?.state || '',
          country: postOffice.Country || formData.address?.country || 'India',
        },
      });

      setErrors({ ...errors, [errorKey]: '' });
    } catch (error: any) {
      console.error('Pincode lookup error:', error);
      // Don't show error if pincode is invalid - user might still be typing
    } finally {
      setPincodeLoading(false);
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
    if (formData.google_location_link) {
      const val = formData.google_location_link.trim();
      if (!validateGoogleLocationLink(val)) {
        newErrors.google_location_link = 'Invalid Google Maps link format';
      } else if (val.length > 500) {
        newErrors.google_location_link = 'Link must be at most 500 characters';
      }
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
    
    // Validate form
    if (!validateForm()) {
      return;
    }

    // In edit mode, directly update without preview
    if (isEditMode && vendorId) {
      setLoading(true);
      try {
        await updateVendor(vendorId, formData as UpdateVendorRequest);
        setAlertType('success');
        setAlertTitle('Vendor Updated Successfully');
        setAlertMessage('The vendor has been updated successfully.');
        setAlertOpen(true);
        onOpenChange(false);
      } catch (error: any) {
        setAlertType('error');
        setAlertTitle('Failed to Update Vendor');
        const errorMessage = 
          error?.message || 
          error?.data?.message || 
          error?.response?.data?.message || 
          'An error occurred while updating the vendor. Please try again.';
        setAlertMessage(errorMessage);
        setAlertOpen(true);
      } finally {
        setLoading(false);
      }
    } else {
      // In create mode, show preview dialog
      onOpenChange(false);
      setPreviewOpen(true);
    }
  };

  const handlePreviewConfirm = async (data: CreateVendorRequest | UpdateVendorRequest) => {
    setLoading(true);
    try {
      if (isEditMode && vendorId) {
        await updateVendor(vendorId, data as UpdateVendorRequest);
        setAlertType('success');
        setAlertTitle('Vendor Updated Successfully');
        setAlertMessage('The vendor has been updated successfully.');
      } else {
        await createVendor(data as CreateVendorRequest);
        resetForm();
        setAlertType('success');
        setAlertTitle('Vendor Created Successfully');
        setAlertMessage('The vendor has been created successfully.');
      }
      setPreviewOpen(false);
      setAlertOpen(true);
      // Close the form modal after success
      onOpenChange(false);
    } catch (error: any) {
      // Show error alert with API response
      setAlertType('error');
      setAlertTitle(isEditMode ? 'Failed to Update Vendor' : 'Failed to Create Vendor');
      // Extract error message from various possible locations
      const errorMessage = 
        error?.message || 
        error?.data?.message || 
        error?.response?.data?.message || 
        `An error occurred while ${isEditMode ? 'updating' : 'creating'} the vendor. Please try again.`;
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
              <Dialog.Title className="text-xl font-semibold">
                {isEditMode ? 'Update Vendor' : 'Create Vendor'}
              </Dialog.Title>
              <button onClick={() => onOpenChange(false)} className="rounded-lg p-1 hover:bg-muted/50 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingVendor && (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
                <span className="ml-2 text-sm text-muted-foreground">Loading vendor data...</span>
              </div>
            )}

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
              {isEditMode && leadData && (
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className={`flex-1 rounded-lg p-2 text-center text-sm font-medium transition-colors ${
                    step >= 4 ? 'bg-primary/20 text-primary' : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  4. Lead Details
                </button>
              )}
            </div>

            {!loadingVendor && (
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
                    {isEditMode && originalGstNumber && originalGstNumber.trim().length > 0 ? (
                      <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm pointer-events-none select-none">
                        {originalGstNumber}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.business_details.gst_number}
                          onChange={(e) => setFormData({ ...formData, business_details: { ...formData.business_details, gst_number: e.target.value.toUpperCase() } })}
                          className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                          placeholder="27ABCDE1234F1Z5"
                        />
                        <button 
                          type="button" 
                          onClick={handleGSTLookup} 
                          disabled={lookupLoading} 
                          className="btn-secondary flex items-center gap-2"
                        >
                          {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                        </button>
                      </div>
                    )}
                    {errors.gst_number && <p className="mt-1 text-xs text-red-600">{errors.gst_number}</p>}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">PAN Number</label>
                    {isEditMode && originalPanNumber && originalPanNumber.trim().length > 0 ? (
                      <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm pointer-events-none select-none">
                        {originalPanNumber}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.business_details.pan_number}
                          onChange={(e) => setFormData({ ...formData, business_details: { ...formData.business_details, pan_number: e.target.value.toUpperCase() } })}
                          className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                          placeholder="ABCDE1234F"
                        />
                        <button 
                          type="button" 
                          onClick={handlePANLookup} 
                          disabled={lookupLoading} 
                          className="btn-secondary flex items-center gap-2"
                        >
                          {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                        </button>
                      </div>
                    )}
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
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.address.pincode}
                          onChange={(e) => {
                            // Only allow digits and limit to 6 digits
                            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                            setFormData({ ...formData, address: { ...formData.address, pincode: value } });
                            // Auto-lookup when 6 digits are entered
                            if (value.length === 6) {
                              handlePincodeLookup(value);
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value.trim();
                            if (value.length === 6) {
                              handlePincodeLookup(value);
                            }
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
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, country: e.target.value } })}
                        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Google Maps Location Link */}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Google Maps Location Link</label>
                    <input
                      type="text"
                      value={formData.google_location_link || ''}
                      onChange={(e) => {
                        const value = e.target.value.trim() || null;
                        setFormData({ ...formData, google_location_link: value });
                        if (errors.google_location_link) setErrors({ ...errors, google_location_link: '' });
                      }}
                      onBlur={() => {
                        const val = (formData.google_location_link || '').trim();
                        if (val) {
                          if (!validateGoogleLocationLink(val)) {
                            setErrors({ ...errors, google_location_link: 'Invalid Google Maps link format' });
                          } else {
                            setErrors({ ...errors, google_location_link: '' });
                          }
                        } else {
                          setFormData({ ...formData, google_location_link: null });
                        }
                      }}
                      placeholder="Paste Google Maps link or Plus Code"
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      maxLength={500}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Paste a Google Maps share link or Plus Code. Link will be stored with the vendor.
                    </p>
                    {errors.google_location_link && <p className="mt-1 text-xs text-red-600">{errors.google_location_link}</p>}
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
                    {isEditMode && leadData ? (
                      <button 
                        type="button" 
                        onClick={() => setStep(4)}
                        className="btn-primary flex-1"
                      >
                        Next: Lead Details
                      </button>
                    ) : (
                      <button 
                        type="button" 
                        onClick={handleSubmit}
                        disabled={loading}
                        className="btn-primary flex-1"
                      >
                        {isEditMode ? 'Update Vendor' : 'Create Vendor'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {step === 4 && isEditMode && leadData && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Lead Details</h3>
                    <button
                      type="button"
                      onClick={() => navigate(`/crm/leads/${leadData.id}`)}
                      className="text-xs text-primary hover:text-primary/80 inline-flex items-center gap-1 transition-colors"
                    >
                      View Lead <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Company Name */}
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Company Name</label>
                      <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">
                        {leadData.company_name || '-'}
                      </div>
                    </div>

                    {/* GST Number */}
                    {leadData.business_details?.gst_number && (
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">GST Number</label>
                        <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">
                          {leadData.business_details.gst_number}
                        </div>
                      </div>
                    )}

                    {/* PAN Number */}
                    {leadData.business_details?.pan_number && (
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">PAN Number</label>
                        <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">
                          {leadData.business_details.pan_number}
                        </div>
                      </div>
                    )}

                    {/* Contact Persons */}
                    {leadData.contact_persons && leadData.contact_persons.length > 0 && (
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Contact Persons</label>
                        <div className="space-y-2">
                          {leadData.contact_persons.map((contact, index) => (
                            <div key={index} className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">
                              <div className="font-medium">{contact.name}</div>
                              {contact.phones && contact.phones.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Phones: {contact.phones.filter(p => p && p.trim()).join(', ') || '-'}
                                </div>
                              )}
                              {contact.emails && contact.emails.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Emails: {contact.emails.filter(e => e && e.trim()).join(', ') || '-'}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Phone */}
                    {leadData.phone && (
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Phone</label>
                        <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">
                          {leadData.phone}
                        </div>
                      </div>
                    )}

                    {/* Email */}
                    {leadData.email && (
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Email</label>
                        <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">
                          {leadData.email}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setStep(3)} className="btn-secondary flex-1">
                      Back
                    </button>
                    <button 
                      type="button" 
                      onClick={handleSubmit}
                      disabled={loading}
                      className="btn-primary flex-1"
                    >
                      Update Vendor
                    </button>
                  </div>
                </div>
              )}
            </form>
            )}
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


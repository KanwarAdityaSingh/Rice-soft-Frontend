import * as Dialog from '@radix-ui/react-dialog';
import React, { useState, useEffect } from 'react';
import { X, Plus, Search } from 'lucide-react';
import { useTransporters } from '../../../hooks/useTransporters';
import { transportersAPI } from '../../../services/transporters.api';
import { validateGST, validatePAN, validateAadhaar } from '../../../utils/validation';
import { CustomSelect } from '../../shared/CustomSelect';
import { AlertDialog } from '../../shared/AlertDialog';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import type { ContactPerson, CreateTransporterRequest, UpdateTransporterRequest } from '../../../types/entities';

function isContactPersonRowEmpty(cp: ContactPerson): boolean {
  const name = (cp.name || '').trim();
  const hasPhone = (cp.phones || []).some((p) => p?.trim());
  const hasEmail = (cp.emails || []).some((e) => e?.trim());
  return !name && !hasPhone && !hasEmail;
}

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
    contact_persons: [{ name: '', phones: [''], emails: [''] }],
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    },
    transport_type: 'registered',
    gst_number: null,
    pan_number: null,
    aadhar_number: null,
    bank_details: {},
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingTransporter, setLoadingTransporter] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [gstAutoFilledFields, setGstAutoFilledFields] = useState<Set<string>>(new Set());
  const [originalGstNumber, setOriginalGstNumber] = useState<string>('');
  const [originalPanNumber, setOriginalPanNumber] = useState<string>('');
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
      const gstNumber = transporter.gst_number || '';
      const panNumber = transporter.pan_number || '';
      
      // Store original values to check if they should be disabled
      setOriginalGstNumber(gstNumber);
      setOriginalPanNumber(panNumber);
      
      setFormData({
        business_name: transporter.business_name,
        contact_persons: transporter.contact_persons && transporter.contact_persons.length > 0
          ? transporter.contact_persons.map(cp => ({
              name: cp.name || '',
              phones: cp.phones?.length > 0 ? cp.phones : [''],
              emails: (cp.emails?.length ?? 0) > 0 ? cp.emails : [''],
            }))
          : [{ name: '', phones: [''], emails: [''] }],
        address: transporter.address,
        transport_type: transporter.transport_type || 'registered',
        gst_number: transporter.gst_number || null,
        pan_number: transporter.pan_number || null,
        aadhar_number: transporter.aadhar_number || null,
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
      contact_persons: [{ name: '', phones: [''], emails: [''] }],
      address: {
        street: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
      },
      transport_type: 'registered',
      gst_number: null,
      pan_number: null,
      aadhar_number: null,
      bank_details: {},
      is_active: true,
    });
    setErrors({});
    setGstAutoFilledFields(new Set());
    setOriginalGstNumber('');
    setOriginalPanNumber('');
    setStep(1);
  };

  // Helper function to convert ALL CAPS text to Title Case
  const toTitleCase = (str: string): string => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => {
        if (word.length === 0) return '';
        if (word.length === 1) return word.toUpperCase();
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  };

  const handleGSTLookup = async () => {
    if (!formData.gst_number) {
      setErrors({ ...errors, gst_number: 'Please enter a GST number' });
      return;
    }
    
    if (!validateGST(formData.gst_number)) {
      setErrors({ ...errors, gst_number: 'Invalid GST format' });
      return;
    }

    setLookupLoading(true);
    setErrors({ ...errors, gst_number: '' });
    
    try {
      const response = await transportersAPI.lookupGST(formData.gst_number);
      
      const mapped = response.mapped_data;
      
      // Track which fields are being auto-filled
      const autoFilledFields = new Set<string>();
      
      // Populate business name if available (convert to title case)
      let businessName = formData.business_name;
      if (mapped?.business_name) {
        businessName = toTitleCase(mapped.business_name);
        autoFilledFields.add('business_name');
      }
      
      // Populate address fields (only fill non-empty values, convert to title case)
      const addressUpdate: any = { ...formData.address };
      if (mapped?.address) {
        if (mapped.address.street) {
          addressUpdate.street = toTitleCase(mapped.address.street);
        }
        if (mapped.address.city) {
          addressUpdate.city = toTitleCase(mapped.address.city);
        }
        if (mapped.address.state) {
          addressUpdate.state = toTitleCase(mapped.address.state);
        }
        if (mapped.address.pincode) {
          addressUpdate.pincode = mapped.address.pincode;
        }
        if (mapped.address.country) {
          addressUpdate.country = toTitleCase(mapped.address.country);
        }
      }
      
      // Extract PAN from GST or use mapped PAN
      let panNumber = formData.pan_number;
      if (mapped?.business_details?.pan_number) {
        panNumber = mapped.business_details.pan_number;
        autoFilledFields.add('pan_number');
      } else if (formData.gst_number && formData.gst_number.length >= 12) {
        panNumber = formData.gst_number.slice(2, 12);
        autoFilledFields.add('pan_number');
      }
      
      setFormData({
        ...formData,
        business_name: businessName,
        address: addressUpdate,
        pan_number: panNumber,
      });
      
      // Set the auto-filled fields
      setGstAutoFilledFields(autoFilledFields);
      
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
    if (!formData.pan_number) {
      setErrors({ ...errors, pan_number: 'Please enter a PAN number' });
      return;
    }
    
    if (!validatePAN(formData.pan_number)) {
      setErrors({ ...errors, pan_number: 'Invalid PAN format' });
      return;
    }

    setLookupLoading(true);
    setErrors({ ...errors, pan_number: '' });
    
    try {
      const response = await transportersAPI.lookupPAN(formData.pan_number);
      
      const mapped = response.mapped_data;
      const panData = response.pan_data;
      
      // Track which fields are being auto-filled
      const autoFilledFields = new Set<string>();
      
      // Populate business name if available (convert to title case)
      let businessName = formData.business_name;
      if (mapped?.business_name) {
        businessName = toTitleCase(mapped.business_name);
        autoFilledFields.add('business_name');
      }
      
      // Populate contact person if PAN is for a person (individual)
      let updatedContactPersons = [...formData.contact_persons];
      if (panData?.category === 'person' && panData?.name) {
        updatedContactPersons[0] = { ...updatedContactPersons[0], name: toTitleCase(panData.name) };
      }
      
      // Populate address fields (only fill non-empty values, convert to title case)
      const addressUpdate: any = { ...formData.address };
      if (mapped?.address) {
        if (mapped.address.street) addressUpdate.street = toTitleCase(mapped.address.street);
        if (mapped.address.city) addressUpdate.city = toTitleCase(mapped.address.city);
        if (mapped.address.state) addressUpdate.state = toTitleCase(mapped.address.state);
        if (mapped.address.pincode) addressUpdate.pincode = mapped.address.pincode;
        if (mapped.address.country) addressUpdate.country = toTitleCase(mapped.address.country);
      }
      
      // Mark PAN number as auto-filled
      autoFilledFields.add('pan_number');
      
      setFormData({
        ...formData,
        business_name: businessName,
        contact_persons: updatedContactPersons,
        address: addressUpdate,
      });
      
      // Set the auto-filled fields
      setGstAutoFilledFields(autoFilledFields);
      
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

    if (!formData.business_name.trim()) {
      newErrors.business_name = 'Business name is required';
    }
    
    // Validate based on transport type
    if (formData.transport_type === 'registered') {
      // GST is mandatory for registered transporters
      if (!formData.gst_number) {
        newErrors.gst_number = 'GST number is required for registered transporters';
      } else if (!validateGST(formData.gst_number)) {
        newErrors.gst_number = 'Invalid GST format';
      }
      
      // Validate PAN if provided
      if (formData.pan_number && !validatePAN(formData.pan_number)) {
        newErrors.pan_number = 'Invalid PAN format';
      }
    } else if (formData.aadhar_number?.trim() && !validateAadhaar(formData.aadhar_number)) {
      newErrors.aadhar_number = 'Invalid Aadhaar format (12 digits, cannot start with 0 or 1)';
    }
    
    // Contact persons optional; validate only rows that have any data (name, phone, or email)
    (formData.contact_persons || []).forEach((cp, idx) => {
      if (isContactPersonRowEmpty(cp)) return;
      if (!cp.name || cp.name.trim().length < 2) {
        newErrors[`contact_person_${idx}_name`] = 'Name required (min 2 chars)';
      }
      if (!cp.phones || cp.phones.length === 0 || !cp.phones.some((p) => p?.trim())) {
        newErrors[`contact_person_${idx}_phone`] = 'At least one phone required';
      }
      cp.emails?.forEach((email, emailIdx) => {
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          newErrors[`contact_person_${idx}_email_${emailIdx}`] = 'Valid email required';
        }
      });
    });
    
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
      // Remove vehicle_ids from payload - relationship is managed from vehicle side
      const { vehicle_ids, ...rest } = formData;
      const submitData = {
        ...rest,
        contact_persons: (formData.contact_persons || []).filter((cp) => !isContactPersonRowEmpty(cp)),
      };

      if (isEditMode && transporterId) {
        await updateTransporter(transporterId, submitData as UpdateTransporterRequest);
        setAlertType('success');
        setAlertTitle('Success');
        setAlertMessage('Transporter updated successfully');
      } else {
        await createTransporter(submitData);
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
                  {/* Step 1: Basic Info & Contact Persons */}
                  {step === 1 && (
                    <>
                      {/* Transport Type Selector */}
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Transport Type <span className="text-red-500">*</span>
                        </label>
                        <CustomSelect
                          value={formData.transport_type}
                          onChange={(value) => setFormData({ 
                            ...formData, 
                            transport_type: value as 'registered' | 'unregistered'
                          })}
                          options={[
                            { value: 'registered', label: 'Registered' },
                            { value: 'unregistered', label: 'Unregistered' }
                          ]}
                          placeholder="Select Transport Type"
                        />
                      </div>

                      {/* Note about requirements */}
                      <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
                        <p className="text-sm text-primary/90">
                          <span className="font-medium">Note:</span> {formData.transport_type === 'registered' 
                            ? 'For registered transporters, GST number is mandatory.' 
                            : 'For unregistered transporters, Aadhaar is optional.'}
                        </p>
                      </div>

                      {/* Conditional fields based on transport type */}
                      {formData.transport_type === 'registered' ? (
                        <>
                          {/* GST Number in first row (full width) */}
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              GST Number <span className="text-red-500">*</span>
                            </label>
                            {isEditMode && originalGstNumber && originalGstNumber.trim().length > 0 ? (
                              <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm pointer-events-none select-none">
                                {originalGstNumber}
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={formData.gst_number || ''}
                                  onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() || null })}
                                  className="flex-1 px-3 py-2 border border-border rounded-lg bg-background"
                                  placeholder="27ABCDE1234F1Z5"
                                />
                                <button 
                                  type="button" 
                                  onClick={handleGSTLookup} 
                                  disabled={lookupLoading} 
                                  className="btn-secondary flex items-center gap-2 px-3"
                                >
                                  {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                                </button>
                              </div>
                            )}
                            {errors.gst_number && (
                              <p className="text-xs text-red-500 mt-1">{errors.gst_number}</p>
                            )}
                          </div>

                          {/* PAN Number below GST (full width) */}
                          <div>
                            <label className="block text-sm font-medium mb-1">PAN Number</label>
                            {isEditMode && originalPanNumber && originalPanNumber.trim().length > 0 ? (
                              <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm pointer-events-none select-none">
                                {originalPanNumber}
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={formData.pan_number || ''}
                                  onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() || null })}
                                  className="flex-1 px-3 py-2 border border-border rounded-lg bg-background read-only:cursor-not-allowed"
                                  placeholder="ABCDE1234F"
                                  readOnly={gstAutoFilledFields.has('pan_number')}
                                />
                                <button 
                                  type="button" 
                                  onClick={handlePANLookup} 
                                  disabled={lookupLoading} 
                                  className="btn-secondary flex items-center gap-2 px-3"
                                >
                                  {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                                </button>
                              </div>
                            )}
                            {errors.pan_number && (
                              <p className="text-xs text-red-500 mt-1">{errors.pan_number}</p>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Aadhaar Number for unregistered (full width) */}
                          <div>
                            <label className="block text-sm font-medium mb-1">Aadhaar Number</label>
                            <input
                              type="text"
                              value={formData.aadhar_number || ''}
                              onChange={(e) => setFormData({ ...formData, aadhar_number: e.target.value || null })}
                              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                              placeholder="234567890123"
                              maxLength={12}
                            />
                            {errors.aadhar_number && (
                              <p className="text-xs text-red-500 mt-1">{errors.aadhar_number}</p>
                            )}
                          </div>
                        </>
                      )}

                      {/* Business Name below GST/PAN/Aadhaar */}
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Business Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.business_name}
                            onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-lg bg-background read-only:cursor-not-allowed ${
                              errors.business_name ? 'border-red-500' : 'border-border'
                            }`}
                            placeholder="ABC Transport Services"
                            readOnly={gstAutoFilledFields.has('business_name')}
                          />
                          {errors.business_name && (
                            <p className="text-xs text-red-500 mt-1">{errors.business_name}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        {/* Contact Persons Section */}
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Contact Persons <span className="text-muted-foreground font-normal">(optional)</span>
                          </label>
                          <p className="text-xs text-muted-foreground mb-2">
                            If you add a contact, name and at least one phone are required for that person.
                          </p>
                          <div className="space-y-3">
                            {(formData.contact_persons || []).map((contact, index) => (
                              <div key={index} className="space-y-2 p-3 border border-border rounded-lg bg-background/60">
                                <div className="flex gap-2 items-start">
                                  <input
                                    type="text"
                                    placeholder="Name"
                                    value={contact.name}
                                    onChange={(e) => {
                                      const updated = [...(formData.contact_persons || [])];
                                      updated[index] = { ...updated[index], name: e.target.value };
                                      setFormData({ ...formData, contact_persons: updated });
                                    }}
                                    className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                                  />
                                  {(formData.contact_persons || []).length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = (formData.contact_persons || []).filter((_, i) => i !== index);
                                        setFormData({ ...formData, contact_persons: updated });
                                      }}
                                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                      title="Remove contact person"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                                {errors[`contact_person_${index}_name`] && (
                                  <p className="text-xs text-red-600">{errors[`contact_person_${index}_name`]}</p>
                                )}

                                {/* Phone Numbers */}
                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-muted-foreground">Phone Numbers</label>
                                  {(contact.phones || ['']).map((phone, phoneIndex) => (
                                    <div key={phoneIndex} className="flex gap-2">
                                      <input
                                        type="tel"
                                        placeholder="Phone (10 digits)"
                                        value={phone}
                                        onChange={(e) => {
                                          const updated = [...(formData.contact_persons || [])];
                                          const updatedPhones = [...(updated[index].phones || [''])];
                                          updatedPhones[phoneIndex] = e.target.value;
                                          updated[index] = { ...updated[index], phones: updatedPhones };
                                          setFormData({ ...formData, contact_persons: updated });
                                        }}
                                        className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                                      />
                                      {(contact.phones || ['']).length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = [...(formData.contact_persons || [])];
                                            const updatedPhones = updated[index].phones?.filter((_, i) => i !== phoneIndex) || [];
                                            updated[index] = { ...updated[index], phones: updatedPhones.length > 0 ? updatedPhones : [''] };
                                            setFormData({ ...formData, contact_persons: updated });
                                          }}
                                          className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                          title="Remove phone"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  {errors[`contact_person_${index}_phone`] && (
                                    <p className="text-xs text-red-600">{errors[`contact_person_${index}_phone`]}</p>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...(formData.contact_persons || [])];
                                      updated[index] = { ...updated[index], phones: [...(updated[index].phones || ['']), ''] };
                                      setFormData({ ...formData, contact_persons: updated });
                                    }}
                                    className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                                  >
                                    <Plus className="h-3 w-3" />
                                    Add Phone Number
                                  </button>
                                </div>

                                {/* Email Addresses */}
                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-muted-foreground">Email Addresses</label>
                                  {(contact.emails || ['']).map((email, emailIndex) => (
                                    <div key={emailIndex}>
                                      <div className="flex gap-2">
                                        <input
                                          type="email"
                                          placeholder="Email"
                                          value={email}
                                          onChange={(e) => {
                                            const updated = [...(formData.contact_persons || [])];
                                            const updatedEmails = [...(updated[index].emails || [''])];
                                            updatedEmails[emailIndex] = e.target.value;
                                            updated[index] = { ...updated[index], emails: updatedEmails };
                                            setFormData({ ...formData, contact_persons: updated });
                                          }}
                                          className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                                        />
                                        {(contact.emails || ['']).length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updated = [...(formData.contact_persons || [])];
                                              const updatedEmails = updated[index].emails?.filter((_, i) => i !== emailIndex) || [];
                                              updated[index] = { ...updated[index], emails: updatedEmails.length > 0 ? updatedEmails : [''] };
                                              setFormData({ ...formData, contact_persons: updated });
                                            }}
                                            className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                            title="Remove email"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        )}
                                      </div>
                                      {errors[`contact_person_${index}_email_${emailIndex}`] && (
                                        <p className="text-xs text-red-600 mt-0.5">{errors[`contact_person_${index}_email_${emailIndex}`]}</p>
                                      )}
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...(formData.contact_persons || [])];
                                      updated[index] = { ...updated[index], emails: [...(updated[index].emails || ['']), ''] };
                                      setFormData({ ...formData, contact_persons: updated });
                                    }}
                                    className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                                  >
                                    <Plus className="h-3 w-3" />
                                    Add Email
                                  </button>
                                </div>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  contact_persons: [...(formData.contact_persons || []), { name: '', phones: [''], emails: [''] }]
                                });
                              }}
                              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg border border-dashed border-primary/50 transition-colors"
                            >
                              <Plus className="h-4 w-4" />
                              Add Contact Person
                            </button>
                          </div>
                          {errors.contact_persons && <p className="mt-1 text-xs text-red-600">{errors.contact_persons}</p>}
                        </div>
                      </div>

                      {/* Next Button for Step 1 */}
                      <div className="flex justify-end pt-4">
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Next: Address
                        </button>
                      </div>
                    </>
                  )}

                  {/* Step 2: Address & Vehicles */}
                  {step === 2 && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      </div>

                      {/* Back and Submit buttons for Step 2 */}
                      <div className="flex justify-between gap-3 pt-4">
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                        >
                          Back
                        </button>
                        <div className="flex gap-3">
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
                      </div>
                    </>
                  )}
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

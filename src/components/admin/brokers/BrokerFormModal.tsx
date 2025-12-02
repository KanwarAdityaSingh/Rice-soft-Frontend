import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { X, Search, Plus } from 'lucide-react';
import { CustomSelect } from '../../shared/CustomSelect';
import { useBrokers } from '../../../hooks/useBrokers';
import { brokersAPI } from '../../../services/brokers.api';
import { validateEmail, validatePAN, validateAadhaar, validatePhone } from '../../../utils/validation';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { BrokerPreviewDialog } from './BrokerPreviewDialog';
import { AlertDialog } from '../../shared/AlertDialog';
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
    contact_persons: [{ name: '', phones: [''], emails: [''] }],
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
      aadhaar_number: '',
      registration_number: '',
    },
    broker_details: {
      commission_rate: 0,
      specialization: '',
      experience_years: '',
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Basic validation
    if (!formData.business_name) newErrors.business_name = 'Business name required';
    
    // Validate contact_persons: must have at least one with name and at least one phone
    if (!formData.contact_persons || formData.contact_persons.length === 0) {
      newErrors.contact_persons = 'At least one contact person is required';
    } else {
      const invalidContacts = formData.contact_persons.filter(cp => !cp.name || cp.name.trim().length < 2);
      if (invalidContacts.length > 0) {
        newErrors.contact_persons = 'Each contact person must have a name (minimum 2 characters)';
      }
      // Validate that each contact person has at least one phone number
      const contactsWithoutPhones = formData.contact_persons.filter(cp => 
        !cp.phones || cp.phones.length === 0 || cp.phones.every(p => !p || p.trim().length === 0)
      );
      if (contactsWithoutPhones.length > 0) {
        newErrors.contact_persons = 'Each contact person must have at least one phone number';
      }
      // Validate phone number format (must be exactly 10 digits)
      const invalidPhones = formData.contact_persons.some(cp => 
        cp.phones && cp.phones.some(phone => phone && phone.trim().length > 0 && !validatePhone(phone))
      );
      if (invalidPhones) {
        newErrors.contact_persons = 'Contact person phone numbers must be exactly 10 digits';
      }
    }
    
    // Phone field is required and must be 10 digits
    if (!formData.phone || !formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (formData.phone.trim().length < 10) {
      newErrors.phone = 'Phone must be exactly 10 digits';
    } else if (!validatePhone(formData.phone.trim())) {
      newErrors.phone = 'Invalid phone number format';
    }
    
    // Email is required and must be valid
    if (!formData.email || !formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Validate PAN format if provided
    if (formData.business_details.pan_number && !validatePAN(formData.business_details.pan_number)) {
      newErrors.pan_number = 'Invalid PAN format (e.g., ABCDE1234F)';
    }

    // Validate Aadhaar format if provided
    if (formData.business_details.aadhaar_number && !validateAadhaar(formData.business_details.aadhaar_number)) {
      newErrors.aadhaar_number = 'Invalid Aadhaar format (12 digits, cannot start with 0 or 1)';
    }

    // Ensure at least one of PAN or Aadhaar is provided
    if (!formData.business_details.pan_number && !formData.business_details.aadhaar_number) {
      newErrors.business_details = 'Either PAN number or Aadhaar number must be provided';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Navigate to step with errors
      if (newErrors.business_name || newErrors.contact_persons || newErrors.email || newErrors.phone || newErrors.pan_number || newErrors.aadhaar_number || newErrors.business_details) {
        setStep(1);
      } else if (newErrors.street || newErrors.city || newErrors.state || newErrors.pincode) {
        setStep(2);
      }
      return false;
    }

    return true;
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
      const response = await brokersAPI.lookupPAN(formData.business_details.pan_number);
      
      // The API service returns response.data, which is { pan_data: {...}, mapped_data: {...} }
      const mapped = response.mapped_data;
      const panData = response.pan_data;
      
      // Populate business name if available
      const businessName = mapped?.business_name || formData.business_name;
      
      // If PAN data is for a person, add to contact_persons if not already present
      let contactPersons = [...(formData.contact_persons || [])];
      if (panData?.category === 'person' && panData?.name) {
        const existingContact = contactPersons.find(cp => cp.name === panData.name);
        if (!existingContact) {
          contactPersons = [
            ...contactPersons,
            { name: panData.name, phones: [''] }
          ];
        }
      }
      
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
        contact_persons: contactPersons,
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

  const handleAadhaarLookup = async () => {
    if (!formData.business_details.aadhaar_number) {
      setErrors({ ...errors, aadhaar_number: 'Please enter an Aadhaar number' });
      return;
    }
    
    if (!validateAadhaar(formData.business_details.aadhaar_number)) {
      setErrors({ ...errors, aadhaar_number: 'Invalid Aadhaar format' });
      return;
    }

    setLookupLoading(true);
    setErrors({ ...errors, aadhaar_number: '' });
    
    try {
      const response = await brokersAPI.lookupAadhaar(formData.business_details.aadhaar_number);
      
      // Aadhaar lookup might return different structure - check if it has mapped_data
      // For now, we'll handle it similar to PAN if the structure is similar
      // If the API only returns validation, we'll just clear the error
      if (response && typeof response === 'object' && 'mapped_data' in response) {
        const mapped = (response as any).mapped_data;
        const aadhaarData = (response as any).aadhaar_data;
        
        // Populate business name if available
        const businessName = mapped?.business_name || formData.business_name;
        
        // If Aadhaar data has a name, add to contact_persons if not already present
        let contactPersons = [...(formData.contact_persons || [])];
        const aadhaarName = aadhaarData?.name || mapped?.contact_person;
        if (aadhaarName) {
          const existingContact = contactPersons.find(cp => cp.name === aadhaarName);
          if (!existingContact) {
            contactPersons = [
              ...contactPersons,
              { name: aadhaarName, phones: [''], emails: [''] }
            ];
          }
        }
        
        // Populate address fields (only fill non-empty values)
        const addressUpdate: any = { ...formData.address };
        if (mapped?.address) {
          if (mapped.address.street) addressUpdate.street = mapped.address.street;
          if (mapped.address.city) addressUpdate.city = mapped.address.city;
          if (mapped.address.state) addressUpdate.state = mapped.address.state;
          if (mapped.address.pincode) addressUpdate.pincode = mapped.address.pincode;
          if (mapped.address.country) addressUpdate.country = mapped.address.country;
        }
        
        setFormData({
          ...formData,
          business_name: businessName,
          contact_persons: contactPersons,
          address: addressUpdate,
        });
      }
      
      // Clear any previous errors
      setErrors({ ...errors, aadhaar_number: '' });
    } catch (error: any) {
      console.error('Aadhaar lookup error:', error);
      setErrors({ ...errors, aadhaar_number: error?.message || 'Failed to lookup Aadhaar details' });
    } finally {
      setLookupLoading(false);
    }
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

  const handlePreviewConfirm = async (data: CreateBrokerRequest) => {
    setLoading(true);
    try {
      // Clean up form data before submission
      const cleanedFormData: CreateBrokerRequest = { ...data };
      
      // Filter out empty contact persons (ones with no name) and clean up phones and emails arrays
      if (cleanedFormData.contact_persons) {
        cleanedFormData.contact_persons = cleanedFormData.contact_persons
          .filter(cp => cp.name && cp.name.trim().length > 0)
          .map(cp => ({
            name: cp.name.trim(),
            phones: cp.phones.filter(phone => phone && phone.trim().length > 0),
            emails: cp.emails ? cp.emails.filter(email => email && email.trim().length > 0) : []
          }))
          .filter(cp => cp.phones.length > 0); // Remove contact persons with no valid phones
      }
      
      await createBroker(cleanedFormData);
      setPreviewOpen(false);
      setFormData({
        business_name: '',
        contact_person: '',
        contact_persons: [{ name: '', phones: [''], emails: [''] }],
        email: '',
        phone: '',
        address: { street: '', city: '', state: '', pincode: '', country: 'India' },
        business_details: { pan_number: '', aadhaar_number: '', registration_number: '' },
        broker_details: { commission_rate: 0, specialization: '', experience_years: '' },
        type: 'both',
        is_active: true,
      });
      setErrors({});
      setStep(1);
      // Show success alert
      setAlertType('success');
      setAlertTitle('Broker Created Successfully');
      setAlertMessage('The broker has been created successfully.');
      setAlertOpen(true);
      // Close the form modal after success
      onOpenChange(false);
    } catch (error: any) {
      // Show error alert with API response
      setAlertType('error');
      setAlertTitle('Failed to Create Broker');
      // Extract error message from various possible locations
      const errorMessage = 
        error?.message || 
        error?.data?.message || 
        error?.response?.data?.message || 
        'An error occurred while creating the broker. Please try again.';
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
              <Dialog.Title className="text-xl font-semibold">Create Broker</Dialog.Title>
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
                2. Address & Business
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className={`flex-1 rounded-lg p-2 text-center text-sm font-medium transition-colors ${
                  step >= 3 ? 'bg-primary/20 text-primary' : 'bg-muted hover:bg-muted/80'
                }`}
              >
                3. Broker Details
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} className="space-y-4">
              {/* Step 1: Basic Info */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 mb-2">
                    <p className="text-sm text-primary/90">
                      <span className="font-medium">Note:</span> One of the fields (either PAN Number or Aadhaar Number) is mandatory.
                    </p>
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
                    <label className="text-sm font-medium mb-1.5 block">Aadhaar Number</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.business_details.aadhaar_number}
                        onChange={(e) => setFormData({ ...formData, business_details: { ...formData.business_details, aadhaar_number: e.target.value } })}
                        className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                        placeholder="234567890123"
                        maxLength={12}
                      />
                      <button type="button" onClick={handleAadhaarLookup} disabled={lookupLoading} className="btn-secondary flex items-center gap-2">
                        {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.aadhaar_number && <p className="mt-1 text-xs text-red-600">{errors.aadhaar_number}</p>}
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

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Contact Persons *</label>
                    <div className="space-y-3">
                      {(formData.contact_persons || []).map((contact, index) => (
                        <div key={index} className="space-y-2 p-3 border border-border rounded-lg">
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
                          <div className="space-y-2 pl-0">
                            <label className="text-xs text-muted-foreground">Phone Numbers *</label>
                            {(contact.phones || ['']).map((phone, phoneIndex) => (
                              <div key={phoneIndex} className="flex gap-2 items-center">
                                <input
                                  type="tel"
                                  placeholder="Phone (10 digits)"
                                  value={phone}
                                  onChange={(e) => {
                                    // Only allow digits and limit to 10 digits
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                    const updated = [...(formData.contact_persons || [])];
                                    const updatedPhones = [...(updated[index].phones || [''])];
                                    updatedPhones[phoneIndex] = value;
                                    updated[index] = { ...updated[index], phones: updatedPhones };
                                    setFormData({ ...formData, contact_persons: updated });
                                    // Validate and set error immediately
                                    const errorKey = `contact_person_${index}_phone_${phoneIndex}`;
                                    if (value.length > 0 && value.length < 10) {
                                      setErrors({ ...errors, [errorKey]: 'Phone must be exactly 10 digits' });
                                    } else if (value.length === 10 && !validatePhone(value)) {
                                      setErrors({ ...errors, [errorKey]: 'Invalid phone number format' });
                                    } else {
                                      const newErrors = { ...errors };
                                      delete newErrors[errorKey];
                                      setErrors(newErrors);
                                    }
                                  }}
                                  onBlur={(e) => {
                                    const value = e.target.value.trim();
                                    const errorKey = `contact_person_${index}_phone_${phoneIndex}`;
                                    if (value.length > 0 && value.length < 10) {
                                      setErrors({ ...errors, [errorKey]: 'Phone must be exactly 10 digits' });
                                    } else if (value.length === 10 && !validatePhone(value)) {
                                      setErrors({ ...errors, [errorKey]: 'Invalid phone number format' });
                                    }
                                  }}
                                  className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                                  maxLength={10}
                                />
                                {errors[`contact_person_${index}_phone_${phoneIndex}`] && (
                                  <p className="text-xs text-red-600 mt-0.5">{errors[`contact_person_${index}_phone_${phoneIndex}`]}</p>
                                )}
                                {(contact.phones || ['']).length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...(formData.contact_persons || [])];
                                      const updatedPhones = updated[index].phones.filter((_, i) => i !== phoneIndex);
                                      updated[index] = { ...updated[index], phones: updatedPhones.length > 0 ? updatedPhones : [''] };
                                      setFormData({ ...formData, contact_persons: updated });
                                    }}
                                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                    title="Remove phone number"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            ))}
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
                          <div className="space-y-2 pl-0">
                            <label className="text-xs text-muted-foreground">Email Addresses</label>
                            {(contact.emails || ['']).map((email, emailIndex) => (
                              <div key={emailIndex} className="flex gap-2 items-center">
                                <input
                                  type="email"
                                  placeholder="Email"
                                  value={email}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    const updated = [...(formData.contact_persons || [])];
                                    const updatedEmails = [...(updated[index].emails || [''])];
                                    updatedEmails[emailIndex] = value;
                                    updated[index] = { ...updated[index], emails: updatedEmails };
                                    setFormData({ ...formData, contact_persons: updated });
                                    // Validate email format
                                    const errorKey = `contact_person_${index}_email_${emailIndex}`;
                                    if (value.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                                      setErrors({ ...errors, [errorKey]: 'Invalid email format' });
                                    } else {
                                      const newErrors = { ...errors };
                                      delete newErrors[errorKey];
                                      setErrors(newErrors);
                                    }
                                  }}
                                  onBlur={(e) => {
                                    const value = e.target.value.trim();
                                    const errorKey = `contact_person_${index}_email_${emailIndex}`;
                                    if (value.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                                      setErrors({ ...errors, [errorKey]: 'Invalid email format' });
                                    }
                                  }}
                                  className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                                />
                                {errors[`contact_person_${index}_email_${emailIndex}`] && (
                                  <p className="text-xs text-red-600 mt-0.5">{errors[`contact_person_${index}_email_${emailIndex}`]}</p>
                                )}
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Phone *</label>
                      <input
                        type="tel"
                        placeholder="10 digits only"
                        value={formData.phone || ''}
                        onChange={(e) => {
                          // Only allow digits and limit to 10 digits
                          const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setFormData({ ...formData, phone: value });
                          // Validate and set error immediately
                          if (value.length > 0 && value.length < 10) {
                            setErrors({ ...errors, phone: 'Phone must be exactly 10 digits' });
                          } else if (value.length === 10 && !validatePhone(value)) {
                            setErrors({ ...errors, phone: 'Invalid phone number format' });
                          } else if (value.length === 10 && validatePhone(value)) {
                            const newErrors = { ...errors };
                            delete newErrors.phone;
                            setErrors(newErrors);
                          } else if (value.length === 0) {
                            setErrors({ ...errors, phone: 'Phone is required' });
                          }
                        }}
                        onBlur={(e) => {
                          const value = e.target.value.trim();
                          if (value.length === 0) {
                            setErrors({ ...errors, phone: 'Phone is required' });
                          } else if (value.length < 10) {
                            setErrors({ ...errors, phone: 'Phone must be exactly 10 digits' });
                          } else if (!validatePhone(value)) {
                            setErrors({ ...errors, phone: 'Invalid phone number format' });
                          }
                        }}
                        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                        required
                        maxLength={10}
                      />
                      {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Email *</label>
                      <input
                        type="email"
                        placeholder="example@email.com"
                        value={formData.email}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({ ...formData, email: value });
                          // Validate and set error immediately (don't trim while typing)
                          if (value.length === 0) {
                            setErrors({ ...errors, email: 'Email is required' });
                          } else if (value.trim().length > 0 && !validateEmail(value.trim())) {
                            setErrors({ ...errors, email: 'Please enter a valid email address' });
                          } else if (value.trim().length > 0 && validateEmail(value.trim())) {
                            const newErrors = { ...errors };
                            delete newErrors.email;
                            setErrors(newErrors);
                          }
                        }}
                        onBlur={(e) => {
                          const value = e.target.value.trim();
                          setFormData({ ...formData, email: value });
                          if (value.length === 0) {
                            setErrors({ ...errors, email: 'Email is required' });
                          } else if (!validateEmail(value)) {
                            setErrors({ ...errors, email: 'Please enter a valid email address' });
                          } else {
                            const newErrors = { ...errors };
                            delete newErrors.email;
                            setErrors(newErrors);
                          }
                        }}
                        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      />
                      {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                    </div>
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

                  {errors.business_details && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                      <p className="text-xs text-red-600">{errors.business_details}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Registration Number</label>
                    <input
                      type="text"
                      value={formData.business_details.registration_number}
                      onChange={(e) => setFormData({ ...formData, business_details: { ...formData.business_details, registration_number: e.target.value } })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    />
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
                    <label className="text-sm font-medium mb-1.5 block">State</label>
                    <input
                      type="text"
                      value={formData.broker_details?.experience_years || ''}
                      onChange={(e) => setFormData({ ...formData, broker_details: { ...formData.broker_details!, experience_years: e.target.value } })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1">
                      Back
                    </button>
                    <button 
                      type="button" 
                      onClick={handleSubmit}
                      disabled={loading}
                      className="btn-primary flex-1"
                    >
                      Create Broker
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
      
      {/* Preview Dialog */}
      <BrokerPreviewDialog
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
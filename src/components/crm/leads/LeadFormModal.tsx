import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { validateEmail, validatePhone } from '../../../utils/validation';
import { LeadFormSteps } from './LeadFormSteps';
import { LeadPreviewDialog } from './LeadPreviewDialog';
import { AlertDialog } from '../../shared/AlertDialog';
import type { CreateLeadRequest, UpdateLeadRequest, Lead } from '../../../types/entities';

interface LeadFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CreateLeadRequest | UpdateLeadRequest) => Promise<void>;
  lead?: Lead | null;
  mode?: 'create' | 'edit' | 'pre-conversion';
}

export function LeadFormModal({ open, onOpenChange, onSave, lead, mode: propMode }: LeadFormModalProps) {
  const mode = propMode || (lead ? 'edit' : 'create');
  const isEdit = mode === 'edit' || mode === 'pre-conversion';
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // Function to convert API error messages to user-friendly messages
  const formatErrorMessage = (errorMessage: string): string => {
    if (!errorMessage) return 'An error occurred. Please try again.';
    
    // Remove quotes from field names for easier matching
    const cleanMessage = errorMessage.replace(/"/g, '');
    
    // Check for broker_id errors
    if (cleanMessage.includes('broker_id') && (cleanMessage.includes('must be a string') || cleanMessage.includes('required'))) {
      // If this is the only error, return simple message
      if (!cleanMessage.includes(',')) {
        return 'Broker is required. Please select a broker.';
      }
    }
    
    // Check for location errors (latitude/longitude)
    const hasLocationError = cleanMessage.includes('salesman_latitude') || cleanMessage.includes('salesman_longitude');
    const hasLocationNumberError = hasLocationError && cleanMessage.includes('must be a number');
    const hasLocationRequiredError = hasLocationError && cleanMessage.includes('required');
    
    // If multiple errors, format them nicely
    if (cleanMessage.includes(',')) {
      const errors = cleanMessage.split(',').map(e => e.trim());
      const formattedErrors: string[] = [];
      let hasBrokerError = false;
      let hasLocationErrorInList = false;
      
      errors.forEach(err => {
        if (err.includes('broker_id') && (err.includes('must be a string') || err.includes('required'))) {
          if (!hasBrokerError) {
            formattedErrors.push('Broker is required');
            hasBrokerError = true;
          }
        } else if (err.includes('salesman_latitude') || err.includes('salesman_longitude')) {
          if (!hasLocationErrorInList) {
            if (err.includes('must be a number')) {
              formattedErrors.push('Please capture your location');
            } else if (err.includes('required')) {
              formattedErrors.push('Location is required');
            } else {
              formattedErrors.push('Please capture your location');
            }
            hasLocationErrorInList = true;
          }
        } else {
          // Keep original error for unknown cases
          formattedErrors.push(err);
        }
      });
      
      return formattedErrors.join('. ') + '.';
    }
    
    // Single error cases
    if (cleanMessage.includes('broker_id') && (cleanMessage.includes('must be a string') || cleanMessage.includes('required'))) {
      return 'Broker is required. Please select a broker.';
    }
    
    if (hasLocationNumberError) {
      return 'Please capture your location for latitude and longitude.';
    }
    
    if (hasLocationRequiredError) {
      return 'Location is required. Please capture your location.';
    }
    
    // Return original message if no specific mapping found
    return errorMessage;
  };
  const [formData, setFormData] = useState<CreateLeadRequest>({
    company_name: '',
    contact_persons: [{ name: '', phones: [''] }],
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    business_details: {},
    lead_status: 'new',
    priority: 'medium',
    google_location_link: null,
  });

  useEffect(() => {
    if (lead && open) {
      // Handle backward compatibility: if lead has contact_persons, use it; otherwise convert old contact_person
      let contactPersons = lead.contact_persons || [];
      
      // Backward compatibility: convert old format {name, phone} to new format {name, phones: [phone]}
      contactPersons = contactPersons.map(cp => {
        // If it has old 'phone' field, convert to 'phones' array
        if ('phone' in cp && typeof (cp as any).phone === 'string') {
          return {
            name: cp.name,
            phones: (cp as any).phone ? [(cp as any).phone] : ['']
          };
        }
        // If phones array is empty, ensure at least one empty string
        if (!cp.phones || cp.phones.length === 0) {
          return { name: cp.name, phones: [''] };
        }
        return cp;
      });
      
      if (contactPersons.length === 0 && (lead as any).contact_person) {
        // Backward compatibility: convert old contact_person string to array
        contactPersons = [{ name: (lead as any).contact_person, phones: lead.phone ? [lead.phone] : [''] }];
      }
      // Ensure at least one contact person exists
      if (contactPersons.length === 0) {
        contactPersons = [{ name: '', phones: [''] }];
      }
      
      setFormData({
        company_name: lead.company_name,
        contact_persons: contactPersons,
        email: lead.email,
        phone: lead.phone,
        address: {
          street: lead.address?.street || '',
          city: lead.address?.city || '',
          state: lead.address?.state || '',
          pincode: lead.address?.pincode || '',
          country: lead.address?.country || 'India'
        },
        business_details: lead.business_details || {},
        lead_status: lead.lead_status,
        priority: lead.priority,
        assigned_to: lead.assigned_to,
        broker_id: lead.broker_id || null,
        notes: lead.notes,
        source: lead.source,
        estimated_value: lead.estimated_value,
        expected_close_date: lead.expected_close_date,
        rice_code_id: lead.rice_code_id || null,
        rice_type: lead.rice_type || null,
        salesman_latitude: lead.salesman_latitude || null,
        salesman_longitude: lead.salesman_longitude || null,
        google_location_link: lead.google_location_link || null,
      });
      setStep(1);
    } else if (!lead && open) {
      setFormData({
        company_name: '',
        contact_persons: [{ name: '', phones: [''] }],
        email: '',
        phone: '',
        address: {
          street: '',
          city: '',
          state: '',
          pincode: '',
          country: 'India'
        },
        business_details: {},
        lead_status: 'new',
        priority: 'medium',
        broker_id: null,
        rice_code_id: null,
        rice_type: null,
        salesman_latitude: null,
        salesman_longitude: null,
        google_location_link: null,
      });
      setStep(1);
    }
  }, [lead, open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Step 1 validations
    if (!formData.company_name) newErrors.company_name = 'Business name required';
    
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
    
    // Email validation - optional in create mode, required in edit mode
    if (mode === 'edit' || mode === 'pre-conversion') {
      // Email is required in edit mode
      if (!formData.email || !formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!validateEmail(formData.email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      }
    } else {
      // Email is optional in create mode, but if provided, it must be valid
      if (formData.email && formData.email.trim().length > 0 && !validateEmail(formData.email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      }
    }
    
    // Step 2 validations (Address is required)
    if (!formData.address?.street?.trim()) newErrors.street = 'Street is required';
    if (!formData.address?.city?.trim()) newErrors.city = 'City is required';
    if (!formData.address?.state?.trim()) newErrors.state = 'State is required';
    if (!formData.address?.pincode?.trim()) newErrors.pincode = 'Pincode is required';
    if (!formData.address?.country?.trim()) newErrors.country = 'Country is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Go to the step with errors
      if (newErrors.company_name || newErrors.contact_persons || newErrors.phone || newErrors.email) {
        setStep(1);
      } else if (newErrors.street || newErrors.city || newErrors.state || newErrors.pincode || newErrors.country) {
        setStep(2);
      }
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const maxStep = mode === 'create' ? 2 : 4;
    
    if (step < maxStep) {
      setStep(step + 1);
      return;
    }

    // For create mode, validate and show preview instead of directly saving
    if (mode === 'create') {
      if (validateForm()) {
        // Close form modal and open preview dialog
        onOpenChange(false);
        setPreviewOpen(true);
      }
      return;
    }

    // For edit mode, validate and save directly
    if (!validateForm()) {
      return;
    }

    try {
      // All validations passed, clean up form data before submission
      const cleanedFormData: CreateLeadRequest | UpdateLeadRequest = { ...formData };
      
      // Filter out empty contact persons (ones with no name) and clean up phones arrays
      if (cleanedFormData.contact_persons) {
        cleanedFormData.contact_persons = cleanedFormData.contact_persons
          .filter(cp => cp.name && cp.name.trim().length > 0)
          .map(cp => ({
            name: cp.name.trim(),
            phones: cp.phones.filter(phone => phone && phone.trim().length > 0)
          }))
          .filter(cp => cp.phones.length > 0); // Remove contact persons with no valid phones
      }
      
      // Ensure latitude and longitude are proper numbers when present, null otherwise
      if (formData.salesman_latitude != null) {
        cleanedFormData.salesman_latitude = Number(formData.salesman_latitude);
      } else {
        cleanedFormData.salesman_latitude = null;
      }
      
      if (formData.salesman_longitude != null) {
        cleanedFormData.salesman_longitude = Number(formData.salesman_longitude);
      } else {
        cleanedFormData.salesman_longitude = null;
      }
      // Trim google location link and limit length
      if (formData.google_location_link != null && formData.google_location_link !== undefined) {
        const trimmed = formData.google_location_link?.trim();
        cleanedFormData.google_location_link = trimmed ? trimmed.slice(0, 500) : null;
      }
      
      // Submit the cleaned form data
      await onSave(cleanedFormData);
      
      // Show success alert for edit mode (but not for pre-conversion mode, as it will open conversion dialog)
      if (isEdit && mode !== 'pre-conversion') {
        setAlertType('success');
        setAlertTitle('Lead Updated Successfully');
        setAlertMessage('The lead has been updated successfully.');
        setAlertOpen(true);
      }
      
      // For pre-conversion mode, don't close here - let the parent handle it
      // The parent will open the conversion dialog after successful update
      if (mode !== 'pre-conversion') {
        onOpenChange(false);
      }
      setErrors({});
    } catch (error: any) {
      // Show error alert for edit mode
      if (isEdit) {
        setAlertType('error');
        setAlertTitle(mode === 'pre-conversion' ? 'Failed to Update Pre-Conversion Details' : 'Failed to Update Lead');
        const rawErrorMessage = 
          error?.message || 
          error?.data?.error ||
          error?.data?.message || 
          error?.response?.data?.error ||
          error?.response?.data?.message || 
          (mode === 'pre-conversion' ? 'An error occurred while updating the pre-conversion details. Please try again.' : 'An error occurred while updating the lead. Please try again.');
        setAlertMessage(formatErrorMessage(rawErrorMessage));
        setAlertOpen(true);
      }
    }
  };

  const handlePreviewConfirm = async (data: CreateLeadRequest) => {
    try {
      // Clean up form data before submission
      const cleanedFormData: CreateLeadRequest = { ...data };
      
      // Filter out empty contact persons (ones with no name) and clean up phones arrays
      if (cleanedFormData.contact_persons) {
        cleanedFormData.contact_persons = cleanedFormData.contact_persons
          .filter(cp => cp.name && cp.name.trim().length > 0)
          .map(cp => ({
            name: cp.name.trim(),
            phones: cp.phones.filter(phone => phone && phone.trim().length > 0)
          }))
          .filter(cp => cp.phones.length > 0); // Remove contact persons with no valid phones
      }
      
      // Ensure latitude and longitude are proper numbers when present, null otherwise
      if (data.salesman_latitude != null) {
        cleanedFormData.salesman_latitude = Number(data.salesman_latitude);
      } else {
        cleanedFormData.salesman_latitude = null;
      }
      
      if (data.salesman_longitude != null) {
        cleanedFormData.salesman_longitude = Number(data.salesman_longitude);
      } else {
        cleanedFormData.salesman_longitude = null;
      }
      // Trim google location link and limit length
      if (data.google_location_link != null && data.google_location_link !== undefined) {
        const trimmed = data.google_location_link?.trim();
        cleanedFormData.google_location_link = trimmed ? trimmed.slice(0, 500) : null;
      }
      
      // Submit the cleaned form data
      await onSave(cleanedFormData);
      
      // Show success alert for create mode
      setAlertType('success');
      setAlertTitle('Lead Created Successfully');
      setAlertMessage('The lead has been created successfully.');
      setAlertOpen(true);
      
      setPreviewOpen(false);
      setErrors({});
    } catch (error: any) {
      // Show error alert for create mode
      setAlertType('error');
      setAlertTitle('Failed to Create Lead');
      const rawErrorMessage = 
        error?.message || 
        error?.data?.error ||
        error?.data?.message || 
        error?.response?.data?.error ||
        error?.response?.data?.message || 
        'An error occurred while creating the lead. Please try again.';
      setAlertMessage(formatErrorMessage(rawErrorMessage));
      setAlertOpen(true);
      setPreviewOpen(false);
      throw error;
    }
  };

  const handlePreviewClick = () => {
    if (validateForm()) {
      // Close form modal and open preview dialog
      onOpenChange(false);
      setPreviewOpen(true);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-[90vw] md:w-full max-w-4xl translate-x-[-50%] translate-y-[-50%]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div>
                <Dialog.Title className="text-lg sm:text-xl font-semibold">
                  {mode === 'pre-conversion' ? 'Pre-Conversion Formalities' : isEdit ? 'Edit Lead' : 'Create Lead'}
                </Dialog.Title>
                <Dialog.Description className="sr-only hidden">
                  {mode === 'pre-conversion' ? 'Pre-Conversion Formalities' : isEdit ? 'Edit Lead' : 'Create Lead'} form
                </Dialog.Description>
              </div>
              <button onClick={() => onOpenChange(false)} className="rounded-lg p-1 hover:bg-muted/50 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Steps Indicator */}
            {mode === 'create' ? (
              <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={`flex-1 rounded-lg p-1.5 sm:p-2 text-center text-xs sm:text-sm font-medium transition-colors ${
                    step >= 1 ? 'bg-primary/20 text-primary' : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  <span className="hidden sm:inline">1. </span>Basic Info
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className={`flex-1 rounded-lg p-1.5 sm:p-2 text-center text-xs sm:text-sm font-medium transition-colors ${
                    step >= 2 ? 'bg-primary/20 text-primary' : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  <span className="hidden sm:inline">2. </span>Address & Location
                </button>
              </div>
            ) : (
              <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={`flex-1 rounded-lg p-1.5 sm:p-2 text-center text-xs sm:text-sm font-medium transition-colors ${
                    step >= 1 ? 'bg-primary/20 text-primary' : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  <span className="hidden sm:inline">1. </span>Basic
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className={`flex-1 rounded-lg p-1.5 sm:p-2 text-center text-xs sm:text-sm font-medium transition-colors ${
                    step >= 2 ? 'bg-primary/20 text-primary' : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  <span className="hidden sm:inline">2. </span>Address
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className={`flex-1 rounded-lg p-1.5 sm:p-2 text-center text-xs sm:text-sm font-medium transition-colors ${
                    step >= 3 ? 'bg-primary/20 text-primary' : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  <span className="hidden sm:inline">3. </span>Details
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className={`flex-1 rounded-lg p-1.5 sm:p-2 text-center text-xs sm:text-sm font-medium transition-colors ${
                    step >= 4 ? 'bg-primary/20 text-primary' : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  <span className="hidden sm:inline">4. </span>Location
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <LeadFormSteps
                formData={formData}
                setFormData={setFormData}
                errors={errors}
                setErrors={setErrors}
                step={step}
                setStep={setStep}
                isEdit={isEdit}
                mode={mode}
                onPreviewClick={mode === 'create' ? handlePreviewClick : undefined}
              />
            </form>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
      
      {/* Preview Dialog */}
      <LeadPreviewDialog
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

import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { validateEmail } from '../../../utils/validation';
import { LeadFormSteps } from './LeadFormSteps';
import { LeadPreviewDialog } from './LeadPreviewDialog';
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
  const [formData, setFormData] = useState<CreateLeadRequest>({
    company_name: '',
    contact_person: '',
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
  });

  useEffect(() => {
    if (lead && open) {
      setFormData({
        company_name: lead.company_name,
        contact_person: lead.contact_person,
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
      });
      setStep(1);
    } else if (!lead && open) {
      setFormData({
        company_name: '',
        contact_person: '',
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
      });
      setStep(1);
    }
  }, [lead, open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Step 1 validations
    if (!formData.company_name) newErrors.company_name = 'Business name required';
    if (!formData.contact_person) newErrors.contact_person = 'Contact person required';
    if (!validateEmail(formData.email)) newErrors.email = 'Valid email required';
    
    // Step 2 validations (Address is required)
    if (!formData.address?.street?.trim()) newErrors.street = 'Street is required';
    if (!formData.address?.city?.trim()) newErrors.city = 'City is required';
    if (!formData.address?.state?.trim()) newErrors.state = 'State is required';
    if (!formData.address?.pincode?.trim()) newErrors.pincode = 'Pincode is required';
    if (!formData.address?.country?.trim()) newErrors.country = 'Country is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Go to the step with errors
      if (newErrors.company_name || newErrors.contact_person || newErrors.email) {
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
      
      // Submit the cleaned form data
      await onSave(cleanedFormData);
      onOpenChange(false);
      setErrors({});
    } catch (error) {
      // Error handled by parent
    }
  };

  const handlePreviewConfirm = async (data: CreateLeadRequest) => {
    try {
      // Clean up form data before submission
      const cleanedFormData: CreateLeadRequest = { ...data };
      
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
      
      // Submit the cleaned form data
      await onSave(cleanedFormData);
      setPreviewOpen(false);
      setErrors({});
    } catch (error) {
      // Error handled by parent
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
    </Dialog.Root>
  );
}

import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { validateEmail } from '../../../utils/validation';
import { LeadFormSteps } from './LeadFormSteps';
import type { CreateLeadRequest, UpdateLeadRequest, Lead } from '../../../types/entities';

interface LeadFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CreateLeadRequest | UpdateLeadRequest) => Promise<void>;
  lead?: Lead | null;
}

export function LeadFormModal({ open, onOpenChange, onSave, lead }: LeadFormModalProps) {
  const isEdit = !!lead;
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<CreateLeadRequest>({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: {},
    business_details: {},
    lead_status: 'new',
    priority: 'medium',
    is_existing_customer: false,
  });

  useEffect(() => {
    if (lead && open) {
      setFormData({
        company_name: lead.company_name,
        contact_person: lead.contact_person,
        email: lead.email,
        phone: lead.phone,
        address: lead.address || {},
        business_details: lead.business_details || {},
        lead_status: lead.lead_status,
        priority: lead.priority,
        is_existing_customer: lead.is_existing_customer,
        assigned_to: lead.assigned_to,
        notes: lead.notes,
        source: lead.source,
        estimated_value: lead.estimated_value,
        expected_close_date: lead.expected_close_date,
      });
      setStep(1);
    } else if (!lead && open) {
      setFormData({
        company_name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: {},
        business_details: {},
        lead_status: 'new',
        priority: 'medium',
        is_existing_customer: false,
      });
      setStep(1);
    }
  }, [lead, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    const newErrors: Record<string, string> = {};
    if (!formData.company_name) newErrors.company_name = 'Business name required';
    if (!formData.contact_person) newErrors.contact_person = 'Contact person required';
    if (!validateEmail(formData.email)) newErrors.email = 'Valid email required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setStep(1);
      return;
    }

    try {
      await onSave(formData);
      onOpenChange(false);
      setErrors({});
    } catch (error) {
      // Error handled by parent
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-[90vw] md:w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] translate-x-[-50%] translate-y-[-50%] overflow-hidden">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl my-4 sm:my-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <Dialog.Title className="text-lg sm:text-xl font-semibold">
                {isEdit ? 'Edit Lead' : 'Create Lead'}
              </Dialog.Title>
              <button onClick={() => onOpenChange(false)} className="rounded-lg p-1 hover:bg-muted/50 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Steps Indicator */}
            <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6">
              <div className={`flex-1 rounded-lg p-1.5 sm:p-2 text-center text-xs sm:text-sm font-medium ${step >= 1 ? 'bg-primary/20 text-primary' : 'bg-muted'}`}>
                <span className="hidden sm:inline">1. </span>Basic
              </div>
              <div className={`flex-1 rounded-lg p-1.5 sm:p-2 text-center text-xs sm:text-sm font-medium ${step >= 2 ? 'bg-primary/20 text-primary' : 'bg-muted'}`}>
                <span className="hidden sm:inline">2. </span>Address
              </div>
              <div className={`flex-1 rounded-lg p-1.5 sm:p-2 text-center text-xs sm:text-sm font-medium ${step >= 3 ? 'bg-primary/20 text-primary' : 'bg-muted'}`}>
                <span className="hidden sm:inline">3. </span>Details
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <LeadFormSteps
                formData={formData}
                setFormData={setFormData}
                errors={errors}
                setErrors={setErrors}
                step={step}
                setStep={setStep}
                isEdit={isEdit}
              />
            </form>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

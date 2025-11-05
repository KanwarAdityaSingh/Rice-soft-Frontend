import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle2, Building2, MapPin, Briefcase, Percent } from 'lucide-react';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import type { CreateBrokerRequest } from '../../../types/entities';

interface BrokerPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: CreateBrokerRequest;
  onConfirm: (data: CreateBrokerRequest) => Promise<void>;
}

export function BrokerPreviewDialog({ open, onOpenChange, formData, onConfirm }: BrokerPreviewDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(formData);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create broker:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: string | undefined): string => {
    if (!type) return 'Not set';
    switch (type) {
      case 'purchase':
        return 'Purchase';
      case 'sale':
        return 'Sale';
      case 'both':
        return 'Both';
      default:
        return type;
    }
  };

  const InfoSection = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4" />
        <span>{title}</span>
      </div>
      <div className="pl-6 space-y-2 text-sm text-muted-foreground">
        {children}
      </div>
    </div>
  );

  const InfoRow = ({ label, value }: { label: string; value: string | number | null | undefined }) => {
    if (value === null || value === undefined || value === '') return null;
    return (
      <div className="flex justify-between items-start">
        <span className="text-muted-foreground min-w-[120px]">{label}:</span>
        <span className="text-foreground font-medium text-right flex-1">{value}</span>
      </div>
    );
  };

  // Extract first name from contact person
  const getFirstName = (contactPerson: string | undefined): string => {
    if (!contactPerson) return '';
    return contactPerson.split(' ')[0];
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
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <Dialog.Title className="text-xl sm:text-2xl font-semibold">
                    Review Broker Details
                  </Dialog.Title>
                  <Dialog.Description className="text-sm text-muted-foreground mt-1">
                    Please review all the details before creating the broker
                  </Dialog.Description>
                </div>
              </div>
              <button 
                onClick={() => onOpenChange(false)} 
                className="rounded-lg p-1 hover:bg-muted/50 transition-colors"
                disabled={loading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Information */}
              <InfoSection title="Basic Information" icon={Building2}>
                <InfoRow label="Business Name" value={formData.business_name} />
                <InfoRow label="Contact Person" value={formData.contact_person} />
                <InfoRow label="Email" value={formData.email} />
                <InfoRow label="Phone" value={formData.phone} />
                <InfoRow label="Type" value={getTypeLabel(formData.type)} />
                <InfoRow 
                  label="Status" 
                  value={formData.is_active !== false ? 'Active' : 'Inactive'} 
                />
              </InfoSection>

              {/* Address Information */}
              {formData.address && (
                <InfoSection title="Address Information" icon={MapPin}>
                  <InfoRow label="Street" value={formData.address.street} />
                  <InfoRow label="City" value={formData.address.city} />
                  <InfoRow label="State" value={formData.address.state} />
                  <InfoRow label="Pincode" value={formData.address.pincode} />
                  <InfoRow label="Country" value={formData.address.country} />
                </InfoSection>
              )}

              {/* Business Details */}
              {formData.business_details && (
                <InfoSection title="Business Details" icon={Briefcase}>
                  <InfoRow 
                    label="PAN Number" 
                    value={formData.business_details.pan_number || undefined} 
                  />
                  <InfoRow 
                    label="Aadhaar Number" 
                    value={formData.business_details.aadhaar_number || undefined} 
                  />
                  <InfoRow 
                    label="Registration Number" 
                    value={formData.business_details.registration_number || undefined} 
                  />
                </InfoSection>
              )}

              {/* Broker Details */}
              {formData.broker_details && (
                <InfoSection title="Broker Details" icon={Percent}>
                  <InfoRow 
                    label="Commission Rate (%)" 
                    value={formData.broker_details.commission_rate ? `${formData.broker_details.commission_rate}%` : undefined} 
                  />
                  <InfoRow 
                    label="Specialization" 
                    value={formData.broker_details.specialization || undefined} 
                  />
                  <InfoRow 
                    label="Experience (Years)" 
                    value={formData.broker_details.experience_years || undefined} 
                  />
                </InfoSection>
              )}
            </div>

            {/* User Account Information */}
            {formData.contact_person && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-sm whitespace-nowrap">
                A user account for this broker will be created with username {getFirstName(formData.contact_person)} and password defaultPassword123
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-8 pt-6 border-t border-border">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Creating Broker...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Create Broker</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}


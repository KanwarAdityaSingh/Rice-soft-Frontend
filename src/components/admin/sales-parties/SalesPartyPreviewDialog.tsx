import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle2, Building2, MapPin, Briefcase, UserCheck } from 'lucide-react';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import type { CreateSalesPartyRequest } from '../../../types/entities';
import { formatPhonesForDisplay } from '../../../utils/validation';

interface SalesPartyPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: CreateSalesPartyRequest;
  onConfirm: (data: CreateSalesPartyRequest) => Promise<void>;
}

export function SalesPartyPreviewDialog({ open, onOpenChange, formData, onConfirm }: SalesPartyPreviewDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(formData);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create sales party:', error);
      throw error;
    } finally {
      setLoading(false);
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

  const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="flex justify-between items-start">
        <span className="text-muted-foreground min-w-[120px]">{label}:</span>
        <span className="text-foreground font-medium text-right flex-1">{value}</span>
      </div>
    );
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
                    Review Sales Party Details
                  </Dialog.Title>
                  <Dialog.Description className="text-sm text-muted-foreground mt-1">
                    Please review all the details before creating the sales party
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
              <InfoSection title="Basic Information" icon={Building2}>
                <InfoRow label="Business Name" value={formData.business_name} />
                <InfoRow
                  label="Status"
                  value={formData.is_active !== false ? 'Active' : 'Inactive'}
                />
              </InfoSection>

              {formData.contact_persons && formData.contact_persons.length > 0 && (
                <InfoSection title="Contact Persons" icon={UserCheck}>
                  {formData.contact_persons.map((contact, idx) => (
                    <div key={idx} className="mb-3 p-2 bg-muted/30 rounded-lg">
                      <div className="font-medium text-foreground mb-1">{contact.name}</div>
                      {contact.phones?.length > 0 && (
                        <div className="text-xs">📞 {formatPhonesForDisplay(contact.phones)}</div>
                      )}
                      {contact.emails && contact.emails.length > 0 && (
                        <div className="text-xs">✉️ {contact.emails.join(', ')}</div>
                      )}
                    </div>
                  ))}
                </InfoSection>
              )}

              {formData.address && (
                <InfoSection title="Address Information" icon={MapPin}>
                  <InfoRow label="Street" value={formData.address.street} />
                  <InfoRow label="City" value={formData.address.city} />
                  <InfoRow label="State" value={formData.address.state} />
                  <InfoRow label="Pincode" value={formData.address.pincode} />
                  <InfoRow label="Country" value={formData.address.country} />
                  {formData.google_location_link && (
                    <div className="pl-6">
                      <a
                        href={formData.google_location_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-xs"
                      >
                        Open Location in Google Maps
                      </a>
                    </div>
                  )}
                </InfoSection>
              )}

              {formData.business_details && (
                <InfoSection title="Business Details" icon={Briefcase}>
                  <InfoRow
                    label="GST Number"
                    value={formData.business_details.gst_number || undefined}
                  />
                  <InfoRow
                    label="PAN Number"
                    value={formData.business_details.pan_number || undefined}
                  />
                </InfoSection>
              )}

            </div>

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
                    <span>Creating Sales Party...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Create Sales Party</span>
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

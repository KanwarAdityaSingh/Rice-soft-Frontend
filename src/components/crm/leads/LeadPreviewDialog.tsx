import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle2, Building2, MapPin, FileText, Briefcase, Target, UserCheck, Package } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import type { CreateLeadRequest } from '../../../types/entities';
import { brokersAPI } from '../../../services/brokers.api';
import { salesmenAPI } from '../../../services/salesmen.api';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import type { Broker, Salesman, RiceCode, RiceType } from '../../../types/entities';

interface LeadPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: CreateLeadRequest;
  onConfirm: (data: CreateLeadRequest) => Promise<void>;
}

export function LeadPreviewDialog({ open, onOpenChange, formData, onConfirm }: LeadPreviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [broker, setBroker] = useState<Broker | null>(null);
  const [salesman, setSalesman] = useState<Salesman | null>(null);
  const [riceCode, setRiceCode] = useState<RiceCode | null>(null);
  const [riceTypes, setRiceTypes] = useState<RiceType[]>([]);

  useEffect(() => {
    const fetchAdditionalData = async () => {
      if (formData.broker_id) {
        try {
          const brokerData = await brokersAPI.getBrokerById(formData.broker_id);
          setBroker(brokerData);
        } catch (error) {
          console.error('Failed to fetch broker:', error);
        }
      } else {
        setBroker(null);
      }

      if (formData.assigned_to) {
        try {
          const salesmen = await salesmenAPI.getAllSalesmen();
          const salesmanData = salesmen.find(s => s.id === formData.assigned_to);
          setSalesman(salesmanData || null);
        } catch (error) {
          console.error('Failed to fetch salesman:', error);
        }
      } else {
        setSalesman(null);
      }

      if (formData.rice_code_id) {
        try {
          const riceCodes = await riceCodesAPI.getAllRiceCodes();
          const riceCodeData = riceCodes.find(rc => rc.rice_code_id === formData.rice_code_id);
          setRiceCode(riceCodeData || null);
        } catch (error) {
          console.error('Failed to fetch rice code:', error);
        }
      } else {
        setRiceCode(null);
      }

      try {
        const types = await riceCodesAPI.getRiceTypes();
        setRiceTypes(types);
      } catch (error) {
        console.error('Failed to fetch rice types:', error);
      }
    };

    if (open) {
      fetchAdditionalData();
    }
  }, [open, formData.broker_id, formData.assigned_to, formData.rice_code_id]);

  const getRiceTypeLabel = (value: string | null | undefined): string | null => {
    if (!value) return null;
    const riceType = riceTypes.find((rt) => rt.value === value);
    return riceType ? riceType.label : null;
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(formData);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create lead:', error);
      // Re-throw error so parent component can handle it
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'Not set';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (value: number | undefined): string => {
    if (!value) return 'Not set';
    return `₹${value.toLocaleString('en-IN')}`;
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
                    Review Lead Details
                  </Dialog.Title>
                  <Dialog.Description className="text-sm text-muted-foreground mt-1">
                    Please review all the details before creating the lead
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
                <InfoRow label="Business Name" value={formData.company_name} />
                {formData.contact_persons && formData.contact_persons.length > 0 && (
                  <div className="flex justify-between items-start">
                    <span className="text-muted-foreground min-w-[120px]">Contact Persons:</span>
                    <div className="text-foreground font-medium text-right flex-1 space-y-1">
                      {formData.contact_persons.map((cp, idx) => (
                        <div key={idx}>
                          {cp.name}
                          {cp.phones && cp.phones.length > 0 && cp.phones.filter(p => p && p.trim()).length > 0 && (
                            <span className="text-muted-foreground"> - {cp.phones.filter(p => p && p.trim()).join(', ')}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <InfoRow label="Email" value={formData.email} />
                <InfoRow label="Phone" value={formData.phone || undefined} />
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
              {formData.business_details && Object.keys(formData.business_details).length > 0 && (
                <InfoSection title="Business Details" icon={Briefcase}>
                  <InfoRow 
                    label="GST Number" 
                    value={formData.business_details.gst_number || undefined} 
                  />
                  <InfoRow 
                    label="PAN Number" 
                    value={formData.business_details.pan_number || undefined} 
                  />
                  <InfoRow 
                    label="Industry" 
                    value={formData.business_details.industry || undefined} 
                  />
                  <InfoRow 
                    label="Business Keyword" 
                    value={formData.business_details.business_keyword || undefined} 
                  />
                </InfoSection>
              )}

              {/* Lead Details */}
              <InfoSection title="Lead Details" icon={Target}>
                <InfoRow 
                  label="Status" 
                  value={formData.lead_status ? formData.lead_status.charAt(0).toUpperCase() + formData.lead_status.slice(1) : undefined} 
                />
                <InfoRow 
                  label="Priority" 
                  value={formData.priority ? formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1) : undefined} 
                />
                <InfoRow label="Source" value={formData.source || undefined} />
                <InfoRow 
                  label="Estimated Value" 
                  value={formData.estimated_value ? formatCurrency(formData.estimated_value) : undefined} 
                />
                <InfoRow 
                  label="Expected Close Date" 
                  value={formData.expected_close_date ? formatDate(formData.expected_close_date) : undefined} 
                />
              </InfoSection>

              {/* Rice Information */}
              {(formData.rice_code_id || formData.rice_type) && (
                <InfoSection title="Rice Information" icon={Package}>
                  <InfoRow label="Rice Code" value={riceCode?.rice_code_name || undefined} />
                  <InfoRow 
                    label="Rice Type" 
                    value={getRiceTypeLabel(formData.rice_type) || undefined} 
                  />
                </InfoSection>
              )}

              {/* Assignment */}
              {(formData.assigned_to || formData.broker_id) && (
                <InfoSection title="Assignment" icon={UserCheck}>
                  <InfoRow label="Assigned Salesperson" value={salesman?.name || undefined} />
                  <InfoRow 
                    label="Broker" 
                    value={broker ? `${broker.business_name}${broker.contact_person ? ` (${broker.contact_person})` : ''}` : undefined} 
                  />
                </InfoSection>
              )}

              {/* Location */}
              {(formData.salesman_latitude && formData.salesman_longitude) && (
                <InfoSection title="Location" icon={MapPin}>
                  <div className="flex justify-between items-start">
                    <span className="text-muted-foreground min-w-[120px]">Coordinates:</span>
                    <span className="text-foreground font-medium text-right flex-1">
                      {Number(formData.salesman_latitude).toFixed(6)}, {Number(formData.salesman_longitude).toFixed(6)}
                    </span>
                  </div>
                </InfoSection>
              )}

              {/* Notes */}
              {formData.notes && (
                <InfoSection title="Notes" icon={FileText}>
                  <div className="bg-muted/30 rounded-lg p-3 text-sm text-foreground">
                    {formData.notes}
                  </div>
                </InfoSection>
              )}
            </div>

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
                    <span>Creating Lead...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Create Lead</span>
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


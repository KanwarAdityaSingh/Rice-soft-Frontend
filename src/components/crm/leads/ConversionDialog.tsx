import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { leadsAPI } from '../../../services/leads.api';
import { vendorsAPI } from '../../../services/vendors.api';
import type { Lead } from '../../../types/entities';
import { useVendors } from '../../../hooks/useVendors';
import { CustomSelect } from '../../shared/CustomSelect';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { AlertDialog } from '../../shared/AlertDialog';

interface ConversionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  onSuccess: () => void;
}

export function ConversionDialog({ open, onOpenChange, lead, onSuccess }: ConversionDialogProps) {
  const [mode, setMode] = useState<'automatic' | 'manual'>('automatic');
  const [loading, setLoading] = useState(false);
  const { vendors, loading: vendorsLoading } = useVendors();
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [checkingVendor, setCheckingVendor] = useState(false);
  const [vendorCheckResult, setVendorCheckResult] = useState<{
    exists: boolean;
    vendorId: string | null;
    vendorName: string | null;
  } | null>(null);
  const [formData, setFormData] = useState({
    vendor_id: '',
    broker_id: '',
    conversion_value: 0,
    commission_rate: 0,
    notes: '',
  });

  const checkExistingVendor = useCallback(async () => {
    const { gst_number, pan_number } = lead?.business_details || {};
    
    if (!gst_number && !pan_number) {
      console.log('No GST or PAN to check');
      return;
    }

    console.log('Calling checkVendorExists API with:', { gst_number, pan_number });
    setCheckingVendor(true);
    try {
      const response = await vendorsAPI.checkVendorExists({
        gst_number: gst_number || undefined,
        pan_number: pan_number || undefined,
      });

      console.log('Vendor check response:', response);

      if (response.exists && response.vendor) {
        // Vendor exists - pre-select it and suggest manual mode
        setVendorCheckResult({
          exists: true,
          vendorId: response.vendor.id,
          vendorName: response.vendor.business_name,
        });
        setFormData(prev => ({
          ...prev,
          vendor_id: response.vendor!.id,
        }));
        setMode('manual');
      } else {
        // Vendor doesn't exist
        setVendorCheckResult({
          exists: false,
          vendorId: null,
          vendorName: null,
        });
      }
    } catch (error: any) {
      // Log error for debugging
      console.error('Error checking vendor:', error);
      setVendorCheckResult(null);
    } finally {
      setCheckingVendor(false);
    }
  }, [lead]);

  // Check for existing vendor when dialog opens
  useEffect(() => {
    if (open && lead?.business_details) {
      const { gst_number, pan_number } = lead.business_details;
      
      // Only check if we have at least one identifier
      if (gst_number || pan_number) {
        console.log('Checking vendor with:', { gst_number, pan_number });
        checkExistingVendor();
      } else {
        console.log('No GST or PAN found in lead business_details:', lead.business_details);
      }
    } else if (!open) {
      // Reset state when dialog closes
      setVendorCheckResult(null);
      setCheckingVendor(false);
      setFormData({
        vendor_id: '',
        broker_id: '',
        conversion_value: 0,
        commission_rate: 0,
        notes: '',
      });
      setMode('automatic');
    }
  }, [open, lead, checkExistingVendor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (mode === 'automatic') {
        await leadsAPI.convertLeadToVendor({
          lead_id: lead.id,
          broker_id: formData.broker_id || null,
          conversion_value: formData.conversion_value || undefined,
          commission_rate: formData.commission_rate || undefined,
          notes: formData.notes || undefined,
        });
      } else {
        if (!formData.vendor_id) {
          alert('Please select a vendor');
          return;
        }
        await leadsAPI.convertLead({
          lead_id: lead.id,
          vendor_id: formData.vendor_id,
          broker_id: formData.broker_id || null,
          conversion_value: formData.conversion_value || undefined,
          commission_rate: formData.commission_rate || undefined,
          notes: formData.notes || undefined,
        });
      }
      
      // On success, close the dialog and call onSuccess callback
      // No need to show alert - the parent component can handle success feedback
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      // Show error alert with API response
      setAlertType('error');
      setAlertTitle('Failed to Convert Lead');
      const errorMessage = 
        error?.message || 
        error?.data?.message || 
        error?.response?.data?.message || 
        'An error occurred while converting the lead. Please try again.';
      setAlertMessage(errorMessage);
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-w-2xl w-[calc(100%-2rem)] sm:w-full translate-x-[-50%] translate-y-[-50%] max-h-[90vh] overflow-y-auto mx-4 sm:mx-0">
            <div className="glass rounded-2xl p-4 sm:p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <Dialog.Title className="text-lg sm:text-xl font-semibold pr-2">Convert Lead to Vendor</Dialog.Title>
                <button onClick={() => onOpenChange(false)} className="rounded-lg p-1 hover:bg-muted/50 flex-shrink-0">
                  <X className="h-5 w-5" />
                </button>
              </div>

            {/* Vendor Check Status */}
            {checkingVendor && (
              <div className="mb-4 bg-info/10 border border-info/20 rounded-lg p-3 text-sm flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span className="text-muted-foreground">Checking for existing vendor...</span>
              </div>
            )}

            {vendorCheckResult && !checkingVendor && (
              <div className={`mb-4 rounded-lg p-3 text-sm ${
                vendorCheckResult.exists 
                  ? 'bg-success/10 border border-success/20' 
                  : 'bg-warning/10 border border-warning/20'
              }`}>
                {vendorCheckResult.exists ? (
                  <div>
                    <p className="font-medium text-success mb-1">Vendor Found!</p>
                    <p className="text-muted-foreground break-words">
                      A vendor with matching details already exists: <strong className="break-words">{vendorCheckResult.vendorName}</strong>
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">
                      The vendor has been pre-selected. You can change it if needed.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-warning mb-1">No Existing Vendor Found</p>
                    <p className="text-muted-foreground break-words">
                      No vendor found with the provided GST/PAN details. You can create a new vendor or select an existing one.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Mode Selection */}
            <div className="mb-4 sm:mb-6">
              <label className="text-sm font-medium mb-2 block">Conversion Mode</label>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="automatic"
                    checked={mode === 'automatic'}
                    onChange={(e) => setMode(e.target.value as any)}
                    className="rounded border-border"
                  />
                  <span className="text-sm sm:text-base">Create New Vendor</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="manual"
                    checked={mode === 'manual'}
                    onChange={(e) => setMode(e.target.value as any)}
                    className="rounded border-border"
                  />
                  <span className="text-sm sm:text-base">Link to Existing Vendor</span>
                </label>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'automatic' && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-sm mb-4 break-words">
                  This will create a new vendor account with default password: defaultPassword123
                </div>
              )}

              {mode === 'manual' && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Select Vendor *</label>
                  {vendorsLoading ? (
                    <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      <span className="text-muted-foreground">Loading vendors...</span>
                    </div>
                  ) : (
                    <CustomSelect
                      value={formData.vendor_id || null}
                      onChange={(value) => setFormData({ ...formData, vendor_id: value || '' })}
                      options={vendors.map((vendor) => ({
                        value: vendor.id,
                        label: `${vendor.business_name}${vendor.contact_person ? ` (${vendor.contact_person})` : ''}`
                      }))}
                      placeholder="Select a vendor"
                    />
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Conversion Value (₹)</label>
                  <input
                    type="number"
                    value={formData.conversion_value}
                    onChange={(e) => setFormData({ ...formData, conversion_value: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Commission Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.commission_rate}
                    onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                  rows={3}
                  placeholder="Add conversion notes..."
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="btn-secondary flex-1 order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 order-1 sm:order-2"
                >
                  {loading ? 'Converting...' : 'Convert Lead'}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
      </Dialog.Root>

      {/* Alert Dialog for API Response - Outside parent Dialog.Root to prevent conflicts */}
      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        buttonText="OK"
      />
    </>
  );
}


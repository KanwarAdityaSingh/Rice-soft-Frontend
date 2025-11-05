import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { X } from 'lucide-react';
import { leadsAPI } from '../../../services/leads.api';
import type { Lead } from '../../../types/entities';
import { useVendors } from '../../../hooks/useVendors';
import { CustomSelect } from '../../shared/CustomSelect';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';

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
  const [formData, setFormData] = useState({
    vendor_id: '',
    broker_id: '',
    conversion_value: 0,
    commission_rate: 0,
    notes: '',
  });

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
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Conversion failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-w-2xl w-full translate-x-[-50%] translate-y-[-50%]">
          <div className="glass rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-semibold">Convert Lead to Vendor</Dialog.Title>
              <button onClick={() => onOpenChange(false)} className="rounded-lg p-1 hover:bg-muted/50">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mode Selection */}
            <div className="mb-6">
              <label className="text-sm font-medium mb-2 block">Conversion Mode</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="automatic"
                    checked={mode === 'automatic'}
                    onChange={(e) => setMode(e.target.value as any)}
                    className="rounded border-border"
                  />
                  <span>Create New Vendor</span>
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
                  <span>Link to Existing Vendor</span>
                </label>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'automatic' && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-sm mb-4 whitespace-nowrap">
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

              <div className="grid grid-cols-2 gap-4">
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

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1"
                >
                  {loading ? 'Converting...' : 'Convert Lead'}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}


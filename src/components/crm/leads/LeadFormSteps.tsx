import { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Search } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { salesmenAPI } from '../../../services/salesmen.api';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { validateEmail } from '../../../utils/validation';
import type { CreateLeadRequest, UpdateLeadRequest, Salesman, RiceCode, RiceType } from '../../../types/entities';

interface LeadFormStepsProps {
  formData: CreateLeadRequest;
  setFormData: (data: CreateLeadRequest) => void;
  errors: Record<string, string>;
  setErrors: (errors: Record<string, string>) => void;
  step: number;
  setStep: (step: number) => void;
  isEdit?: boolean;
}

export function LeadFormSteps({
  formData,
  setFormData,
  errors,
  setErrors,
  step,
  setStep,
  isEdit
}: LeadFormStepsProps) {
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [riceCodes, setRiceCodes] = useState<RiceCode[]>([]);
  const [riceTypes, setRiceTypes] = useState<RiceType[]>([]);
  const [loadingRiceCodes, setLoadingRiceCodes] = useState(false);
  const [loadingRiceTypes, setLoadingRiceTypes] = useState(false);

  useEffect(() => {
    const fetchSalesmen = async () => {
      try {
        const data = await salesmenAPI.getAllSalesmen();
        setSalesmen(data);
      } catch (error) {
        console.error('Failed to fetch salesmen:', error);
      }
    };
    fetchSalesmen();
  }, []);

  useEffect(() => {
    const fetchRiceCodes = async () => {
      setLoadingRiceCodes(true);
      try {
        const data = await riceCodesAPI.getAllRiceCodes();
        setRiceCodes(data);
      } catch (error) {
        console.error('Failed to fetch rice codes:', error);
      } finally {
        setLoadingRiceCodes(false);
      }
    };
    fetchRiceCodes();
  }, []);

  useEffect(() => {
    const fetchRiceTypes = async () => {
      setLoadingRiceTypes(true);
      try {
        const data = await riceCodesAPI.getRiceTypes();
        setRiceTypes(data);
      } catch (error) {
        console.error('Failed to fetch rice types:', error);
      } finally {
        setLoadingRiceTypes(false);
      }
    };
    fetchRiceTypes();
  }, []);

  const updateAddressField = (field: string, value: string) => {
    setFormData({
      ...formData,
      address: { ...(formData.address || {}), [field]: value, country: formData.address?.country || 'India' }
    });
  };

  const updateBusinessField = (field: string, value: any) => {
    setFormData({
      ...formData,
      business_details: { ...(formData.business_details || {}), [field]: value }
    });
  };

  return (
    <>
      {/* Step 1: Basic Information */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Business Name *</label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
            />
            {errors.company_name && <p className="mt-1 text-xs text-red-600">{errors.company_name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Contact Person *</label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
              />
              {errors.contact_person && <p className="mt-1 text-xs text-red-600">{errors.contact_person}</p>}
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Phone</label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Status</label>
              <select
                value={formData.lead_status}
                onChange={(e) => setFormData({ ...formData, lead_status: e.target.value as any })}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="engaged">Engaged</option>
                <option value="converted">Converted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Source</label>
            <input
              type="text"
              value={formData.source || ''}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
              placeholder="website, referral, etc."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Rice Code</label>
              {loadingRiceCodes ? (
                <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  <span className="text-muted-foreground">Loading rice codes...</span>
                </div>
              ) : (
                <select
                  value={formData.rice_code_id || ''}
                  onChange={(e) => setFormData({ ...formData, rice_code_id: e.target.value || null })}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                >
                  <option value="">Select Rice Code</option>
                  {riceCodes.map((riceCode) => (
                    <option key={riceCode.rice_code_id} value={riceCode.rice_code_id}>
                      {riceCode.rice_code_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Rice Type</label>
              {loadingRiceTypes ? (
                <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  <span className="text-muted-foreground">Loading rice types...</span>
                </div>
              ) : (
                <select
                  value={formData.rice_type || ''}
                  onChange={(e) => setFormData({ ...formData, rice_type: e.target.value || null })}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                >
                  <option value="">Select Rice Type</option>
                  {riceTypes.map((riceType) => (
                    <option key={riceType.value} value={riceType.value}>
                      {riceType.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="existing-customer"
              checked={formData.is_existing_customer}
              onChange={(e) => setFormData({ ...formData, is_existing_customer: e.target.checked })}
              className="rounded border-border"
            />
            <label htmlFor="existing-customer" className="text-sm">Is Existing Customer</label>
          </div>

          <button type="button" onClick={() => setStep(2)} className="btn-primary w-full flex items-center justify-center gap-2">
            Next: Address & Business <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step 2: Address & Business Details */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold mb-4">Address Information</h3>
          
          <div>
            <label className="text-sm font-medium mb-1.5 block">Street</label>
            <input
              type="text"
              value={formData.address?.street || ''}
              onChange={(e) => updateAddressField('street', e.target.value)}
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">City</label>
              <input
                type="text"
                value={formData.address?.city || ''}
                onChange={(e) => updateAddressField('city', e.target.value)}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">State</label>
              <input
                type="text"
                value={formData.address?.state || ''}
                onChange={(e) => updateAddressField('state', e.target.value)}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Pincode</label>
              <input
                type="text"
                value={formData.address?.pincode || ''}
                onChange={(e) => updateAddressField('pincode', e.target.value)}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Country</label>
              <input
                type="text"
                value={formData.address?.country || 'India'}
                onChange={(e) => updateAddressField('country', e.target.value)}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
              />
            </div>
          </div>

          <h3 className="text-lg font-semibold mb-4 mt-6">Business Details</h3>

          <div>
            <label className="text-sm font-medium mb-1.5 block">GST Number</label>
            <input
              type="text"
              value={formData.business_details?.gst_number || ''}
              onChange={(e) => updateBusinessField('gst_number', e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
              placeholder="27ABCDE1234F1Z5"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">PAN Number</label>
              <input
                type="text"
                value={formData.business_details?.pan_number || ''}
                onChange={(e) => updateBusinessField('pan_number', e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                placeholder="ABCDE1234F"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Industry</label>
              <input
                type="text"
                value={formData.business_details?.industry || ''}
                onChange={(e) => updateBusinessField('industry', e.target.value)}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                placeholder="Manufacturing, Retail, etc."
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Business Keyword</label>
            <input
              type="text"
              value={formData.business_details?.business_keyword || ''}
              onChange={(e) => updateBusinessField('business_keyword', e.target.value)}
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
              placeholder="rice, wheat, pulses, etc."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1 flex items-center justify-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button type="button" onClick={() => setStep(3)} className="btn-primary flex-1 flex items-center justify-center gap-2">
              Next: Lead Details <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Lead Details */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold mb-4">Assignment & Value</h3>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Assigned Salesman</label>
            <select
              value={formData.assigned_to || ''}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value || null })}
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
            >
              <option value="">No Assignment</option>
              {salesmen.map((salesman) => (
                <option key={salesman.id} value={salesman.id}>
                  {salesman.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Estimated Value (₹)</label>
              <input
                type="number"
                value={formData.estimated_value || ''}
                onChange={(e) => setFormData({ ...formData, estimated_value: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Expected Close Date</label>
              <input
                type="date"
                value={formData.expected_close_date ? new Date(formData.expected_close_date).toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
              rows={4}
              placeholder="Add any additional notes about this lead..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1 flex items-center justify-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button type="submit" disabled={false} className="btn-primary flex-1">
              {isEdit ? 'Update Lead' : 'Create Lead'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

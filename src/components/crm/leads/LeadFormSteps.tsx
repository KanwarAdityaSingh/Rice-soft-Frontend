import { useState, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { ArrowRight, ArrowLeft, Search } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { CustomSelect } from '../../shared/CustomSelect';
import { salesmenAPI } from '../../../services/salesmen.api';
import { useBrokers } from '../../../hooks/useBrokers';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import type { CreateLeadRequest, Salesman, RiceCode, RiceType } from '../../../types/entities';

interface LeadFormStepsProps {
  formData: CreateLeadRequest;
  setFormData: Dispatch<SetStateAction<CreateLeadRequest>>;
  errors: Record<string, string>;
  setErrors: (errors: Record<string, string>) => void;
  step: number;
  setStep: (step: number) => void;
  isEdit?: boolean;
  mode?: 'create' | 'edit' | 'pre-conversion';
  onPreviewClick?: () => void;
}

export function LeadFormSteps({
  formData,
  setFormData,
  errors,
  setErrors,
  step,
  setStep,
  isEdit,
  mode = 'edit',
  onPreviewClick
}: LeadFormStepsProps) {
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const { brokers: allBrokers, loading: loadingBrokers } = useBrokers();
  const [riceCodes, setRiceCodes] = useState<RiceCode[]>([]);
  const [riceTypes, setRiceTypes] = useState<RiceType[]>([]);
  const [loadingRiceCodes, setLoadingRiceCodes] = useState(false);
  const [loadingRiceTypes, setLoadingRiceTypes] = useState(false);
  
  // Filter to only active brokers for dropdown
  const brokers = allBrokers.filter(b => b.is_active);

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
      {/* CREATE MODE - Step 1: Essential Info Only */}
      {mode === 'create' && step === 1 && (
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
              <label className="text-sm font-medium mb-1.5 block">Phone *</label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
              />
            </div>
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

          <div>
            <label className="text-sm font-medium mb-1.5 block">Broker</label>
            {loadingBrokers ? (
              <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span className="text-muted-foreground">Loading brokers...</span>
              </div>
            ) : (
              <CustomSelect
                value={formData.broker_id || null}
                onChange={(value) => setFormData({ ...formData, broker_id: value || null })}
                options={brokers.map((broker) => ({
                  value: broker.id,
                  label: `${broker.business_name}${broker.contact_person ? ` (${broker.contact_person})` : ''}`
                }))}
                placeholder="No Broker Assigned"
              />
            )}
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
                <CustomSelect
                  value={formData.rice_code_id || null}
                  onChange={(value) => setFormData({ ...formData, rice_code_id: value || null })}
                  options={riceCodes.map((riceCode) => ({
                    value: riceCode.rice_code_id,
                    label: riceCode.rice_code_name
                  }))}
                  placeholder="Select Rice Code"
                  openUpward={true}
                />
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
                <CustomSelect
                  value={formData.rice_type || null}
                  onChange={(value) => setFormData({ ...formData, rice_type: value || null })}
                  options={riceTypes.map((riceType) => ({
                    value: riceType.value,
                    label: riceType.label
                  }))}
                  placeholder="Select Rice Type"
                  openUpward={true}
                />
              )}
            </div>
          </div>

          <button type="button" onClick={() => setStep(2)} className="btn-primary w-full flex items-center justify-center gap-2">
            Next: Address & Location <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* CREATE MODE - Step 2: Address & Location */}
      {mode === 'create' && step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold mb-4">Address Information</h3>
          
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Street <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.address?.street || ''}
              onChange={(e) => updateAddressField('street', e.target.value)}
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
              required
            />
            {errors.street && <p className="mt-1 text-xs text-red-600">{errors.street}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.address?.city || ''}
                onChange={(e) => updateAddressField('city', e.target.value)}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                required
              />
              {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">
                State <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.address?.state || ''}
                onChange={(e) => updateAddressField('state', e.target.value)}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                required
              />
              {errors.state && <p className="mt-1 text-xs text-red-600">{errors.state}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Pincode <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.address?.pincode || ''}
                onChange={(e) => updateAddressField('pincode', e.target.value)}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                required
              />
              {errors.pincode && <p className="mt-1 text-xs text-red-600">{errors.pincode}</p>}
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Country <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.address?.country || 'India'}
                onChange={(e) => updateAddressField('country', e.target.value)}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                required
              />
              {errors.country && <p className="mt-1 text-xs text-red-600">{errors.country}</p>}
            </div>
          </div>

          <h3 className="text-lg font-semibold mb-4 mt-6">Capture Location</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Tap the button below to automatically capture your location and fill in the address fields above.
          </p>

          <LocationCapture
            latitude={formData.salesman_latitude}
            longitude={formData.salesman_longitude}
            onLocationChange={(lat, lng) => {
              setFormData((prev) => ({
                ...prev,
                salesman_latitude: lat != null ? Number(lat) : null,
                salesman_longitude: lng != null ? Number(lng) : null
              }));
            }}
            onAddressChange={(address) => {
              setFormData((prev) => ({
                ...prev,
                address: {
                  street: address.street,
                  city: address.city,
                  state: address.state,
                  pincode: address.pincode,
                  country: address.country
                }
              }));
              // Clear any address-related errors
              setErrors({
                ...errors,
                street: '',
                city: '',
                state: '',
                pincode: '',
                country: ''
              });
            }}
          />

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1 flex items-center justify-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button 
              type="button" 
              onClick={onPreviewClick}
              disabled={!onPreviewClick}
              className="btn-primary flex-1"
            >
              Create Lead
            </button>
          </div>
        </div>
      )}

      {/* EDIT/PRE-CONVERSION MODE - Step 1: Basic Information */}
      {(mode === 'edit' || mode === 'pre-conversion') && step === 1 && (
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
              <CustomSelect
                value={formData.lead_status}
                onChange={(value) => setFormData({ ...formData, lead_status: value as any })}
                options={[
                  { value: 'new', label: 'New' },
                  { value: 'contacted', label: 'Contacted' },
                  { value: 'engaged', label: 'Engaged' },
                  { value: 'converted', label: 'Converted' },
                  { value: 'rejected', label: 'Rejected' }
                ]}
                placeholder="Select Status"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Priority</label>
              <CustomSelect
                value={formData.priority}
                onChange={(value) => setFormData({ ...formData, priority: value as any })}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'urgent', label: 'Urgent' }
                ]}
                placeholder="Select Priority"
              />
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
                <CustomSelect
                  value={formData.rice_code_id || null}
                  onChange={(value) => setFormData({ ...formData, rice_code_id: value || null })}
                  options={riceCodes.map((riceCode) => ({
                    value: riceCode.rice_code_id,
                    label: riceCode.rice_code_name
                  }))}
                  placeholder="Select Rice Code"
                  openUpward={true}
                />
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
                <CustomSelect
                  value={formData.rice_type || null}
                  onChange={(value) => setFormData({ ...formData, rice_type: value || null })}
                  options={riceTypes.map((riceType) => ({
                    value: riceType.value,
                    label: riceType.label
                  }))}
                  placeholder="Select Rice Type"
                  openUpward={true}
                />
              )}
            </div>
          </div>

          <button type="button" onClick={() => setStep(2)} className="btn-primary w-full flex items-center justify-center gap-2">
            Next: Address & Business <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* EDIT/PRE-CONVERSION MODE - Step 2: Address & Business Details */}
      {(mode === 'edit' || mode === 'pre-conversion') && step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold mb-4">Address Information</h3>
          
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Street <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.address?.street || ''}
              onChange={(e) => updateAddressField('street', e.target.value)}
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
              required
            />
            {errors.street && <p className="mt-1 text-xs text-red-600">{errors.street}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.address?.city || ''}
                onChange={(e) => updateAddressField('city', e.target.value)}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                required
              />
              {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">
                State <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.address?.state || ''}
                onChange={(e) => updateAddressField('state', e.target.value)}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                required
              />
              {errors.state && <p className="mt-1 text-xs text-red-600">{errors.state}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Pincode <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.address?.pincode || ''}
                onChange={(e) => updateAddressField('pincode', e.target.value)}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                required
              />
              {errors.pincode && <p className="mt-1 text-xs text-red-600">{errors.pincode}</p>}
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Country <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.address?.country || 'India'}
                onChange={(e) => updateAddressField('country', e.target.value)}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                required
              />
              {errors.country && <p className="mt-1 text-xs text-red-600">{errors.country}</p>}
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
            <button 
              type="button" 
              onClick={() => {
                // Validate address fields before proceeding
                const newErrors: Record<string, string> = {};
                if (!formData.address?.street?.trim()) newErrors.street = 'Street is required';
                if (!formData.address?.city?.trim()) newErrors.city = 'City is required';
                if (!formData.address?.state?.trim()) newErrors.state = 'State is required';
                if (!formData.address?.pincode?.trim()) newErrors.pincode = 'Pincode is required';
                if (!formData.address?.country?.trim()) newErrors.country = 'Country is required';
                
                if (Object.keys(newErrors).length > 0) {
                  setErrors(newErrors);
                  return;
                }
                setErrors({});
                setStep(3);
              }}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              Next: Lead Details <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* EDIT/PRE-CONVERSION MODE - Step 3: Lead Details */}
      {(mode === 'edit' || mode === 'pre-conversion') && step === 3 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold mb-4">Assignment & Value</h3>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Assigned Salesperson</label>
            <CustomSelect
              value={formData.assigned_to || null}
              onChange={(value) => setFormData({ ...formData, assigned_to: value || null })}
              options={salesmen.map((salesman) => ({
                value: salesman.id,
                label: salesman.name
              }))}
              placeholder="No Assignment"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Broker</label>
            {loadingBrokers ? (
              <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span className="text-muted-foreground">Loading brokers...</span>
              </div>
            ) : (
              <CustomSelect
                value={formData.broker_id || null}
                onChange={(value) => setFormData({ ...formData, broker_id: value || null })}
                options={brokers.map((broker) => ({
                  value: broker.id,
                  label: `${broker.business_name}${broker.contact_person ? ` (${broker.contact_person})` : ''}`
                }))}
                placeholder="No Broker Assigned"
              />
            )}
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
            <button type="button" onClick={() => setStep(4)} className="btn-primary flex-1 flex items-center justify-center gap-2">
              Next: Location <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* EDIT/PRE-CONVERSION MODE - Step 4: Salesperson Location */}
      {(mode === 'edit' || mode === 'pre-conversion') && step === 4 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold mb-4">Update Location & Address</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Capture your current GPS location to automatically update the address in Step 2.
          </p>

          <LocationCapture
            latitude={formData.salesman_latitude}
            longitude={formData.salesman_longitude}
            onLocationChange={(lat, lng) => {
              setFormData((prev) => ({
                ...prev,
                salesman_latitude: lat != null ? Number(lat) : null,
                salesman_longitude: lng != null ? Number(lng) : null
              }));
            }}
            onAddressChange={(address) => {
              setFormData((prev) => ({
                ...prev,
                address: {
                  street: address.street,
                  city: address.city,
                  state: address.state,
                  pincode: address.pincode,
                  country: address.country
                }
              }));
              // Clear any address-related errors
              setErrors({
                ...errors,
                street: '',
                city: '',
                state: '',
                pincode: '',
                country: ''
              });
            }}
          />

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setStep(3)} className="btn-secondary flex-1 flex items-center justify-center gap-2">
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

// Location Capture Component
interface LocationCaptureProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  onLocationChange: (lat: number | null, lng: number | null) => void;
  onAddressChange?: (address: { street: string; city: string; state: string; pincode: string; country: string }) => void;
}

function LocationCapture({ latitude, longitude, onLocationChange, onAddressChange }: LocationCaptureProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);

  const reverseGeocode = async (lat: number, lng: number) => {
    setAddressLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'RiceSoftCRM/1.0'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch address');
      }

      const data = await response.json();
      const address = data.address;

      if (address && onAddressChange) {
        // Extract address components
        const street = address.road || address.neighbourhood || address.suburb || '';
        const city = address.city || address.town || address.village || address.municipality || '';
        const state = address.state || address.region || '';
        const pincode = address.postcode || '';
        const country = address.country || 'India';

        onAddressChange({
          street,
          city,
          state,
          pincode,
          country
        });
      }
    } catch (err) {
      console.error('Reverse geocoding failed:', err);
      setError('Could not fetch address from location. Please enter manually.');
    } finally {
      setAddressLoading(false);
    }
  };

  const captureLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        onLocationChange(lat, lng);
        
        // Fetch address from coordinates
        await reverseGeocode(lat, lng);
        
        setLoading(false);
      },
      (error) => {
        let errorMessage = 'Unable to retrieve location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access in your browser.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        setError(errorMessage);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const clearLocation = () => {
    onLocationChange(null, null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      {!latitude && !longitude ? (
        <button
          type="button"
          onClick={captureLocation}
          disabled={loading}
          className="w-full btn-primary flex items-center justify-center gap-2 py-3"
        >
          {loading ? (
            <>
              <LoadingSpinner size="sm" />
              <span>Capturing Location & Address...</span>
            </>
          ) : (
            <>
              <Search className="h-5 w-5" />
              <span>Capture My Location</span>
            </>
          )}
        </button>
      ) : (
        <div className="glass rounded-xl p-4 border border-border/50">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <h4 className="font-semibold text-sm">Location Captured</h4>
            </div>
            <button
              type="button"
              onClick={clearLocation}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground min-w-[80px]">Latitude:</span>
              <code className="bg-muted/50 px-2 py-1 rounded text-xs">
                {latitude != null ? Number(latitude).toFixed(6) : '-'}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground min-w-[80px]">Longitude:</span>
              <code className="bg-muted/50 px-2 py-1 rounded text-xs">
                {longitude != null ? Number(longitude).toFixed(6) : '-'}
              </code>
            </div>
          </div>
          <button
            type="button"
            onClick={captureLocation}
            disabled={loading}
            className="mt-3 w-full text-sm btn-secondary flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Updating Location & Address...</span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                <span>Recapture Location</span>
              </>
            )}
          </button>
        </div>
      )}

      {addressLoading && (
        <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2">
            <LoadingSpinner size="sm" />
            <p className="text-sm text-primary">Fetching address from location...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="p-3 bg-muted/30 rounded-lg">
        <p className="text-xs text-muted-foreground">
          <strong>Note:</strong> Capturing location will automatically fill in your address details. You can edit them manually if needed.
        </p>
      </div>
    </div>
  );
}

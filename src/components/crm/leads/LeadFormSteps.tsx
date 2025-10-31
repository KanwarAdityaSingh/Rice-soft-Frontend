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
            <button type="button" onClick={() => setStep(4)} className="btn-primary flex-1 flex items-center justify-center gap-2">
              Next: Location <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Salesman Location */}
      {step === 4 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold mb-4">Salesman Location</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Capture your current GPS location to help track field activity and optimize route planning.
          </p>

          <LocationCapture
            latitude={formData.salesman_latitude}
            longitude={formData.salesman_longitude}
            onLocationChange={(lat, lng) => {
              setFormData({
                ...formData,
                salesman_latitude: lat,
                salesman_longitude: lng
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
}

function LocationCapture({ latitude, longitude, onLocationChange }: LocationCaptureProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captureLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLocationChange(position.coords.latitude, position.coords.longitude);
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
              <span>Capturing Location...</span>
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
              <code className="bg-muted/50 px-2 py-1 rounded text-xs">{latitude?.toFixed(6)}</code>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground min-w-[80px]">Longitude:</span>
              <code className="bg-muted/50 px-2 py-1 rounded text-xs">{longitude?.toFixed(6)}</code>
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
                <span>Updating...</span>
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

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="p-3 bg-muted/30 rounded-lg">
        <p className="text-xs text-muted-foreground">
          <strong>Note:</strong> Location capture is optional. This helps track where leads are being created and can assist with route optimization for field sales teams.
        </p>
      </div>
    </div>
  );
}

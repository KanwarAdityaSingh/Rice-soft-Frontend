import { useState, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { ArrowRight, ArrowLeft, Search, Plus, X } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { CustomSelect } from '../../shared/CustomSelect';
import { DateInputWithSteppers } from '../../shared/DateInputWithSteppers';
import { salesmenAPI } from '../../../services/salesmen.api';
import { useBrokers } from '../../../hooks/useBrokers';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { pincodeAPI } from '../../../services/pincode.api';
import { validatePhone, validateGoogleLocationLink, getGstValidationError, getPanValidationError, getPhoneValidationError, GST_EXAMPLE, PAN_EXAMPLE, GST_MAX_LENGTH, PAN_MAX_LENGTH } from '../../../utils/validation';
import { EmailVerifyButton } from '../../shared/EmailVerifyButton';
import { GoogleMapsLinkFieldLabel } from '../../shared/GoogleMapsLinkGuide';
import { PhoneInput } from '../../shared/PhoneInput';
import { verifyAutofilledEmails, isVerifiedEmailInput, rememberVerifiedEmail, VERIFIED_EMAIL_INPUT_CLASS } from '../../../utils/emailVerification';
import {
  applyAutofillAddress,
  buildPanLookupAutofill,
  mergePanContactIntoContactPersons,
  runEnrichedPanLookup,
} from '../../../utils/panLookupEnrichment';
import {
  buildEnrichedGstLookupAutofill,
  mergeGstContactPersons,
  runEnrichedGstLookup,
} from '../../../utils/gstLookupAutofill';
import { assertEntityNotDuplicateBeforeVerification } from '../../../utils/entityDuplicateCheck';
import { applyGstOcrToLead, applyPanOcrToLead } from '../../../utils/documentOcrPrefill';
import { KycDocumentOcrSection } from '../../shared/KycDocumentOcrSection';
import type { CreateLeadRequest, Salesman, RiceCode, RiceType } from '../../../types/entities';

// Utility function to convert string to title case
const toTitleCase = (str: string | undefined | null): string => {
  if (!str) return '';
  // Check if the string is mostly uppercase (more than 60% uppercase letters)
  const uppercaseCount = (str.match(/[A-Z]/g) || []).length;
  const letterCount = (str.match(/[a-zA-Z]/g) || []).length;
  const isAllCaps = letterCount > 0 && uppercaseCount / letterCount > 0.6;
  
  if (isAllCaps) {
    // Convert all caps to title case
    return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  }
  
  // If already in mixed case, return as is
  return str;
};

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
  excludeLeadId?: string | null;
  originalGstNumber?: string;
  originalPanNumber?: string;
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
  onPreviewClick,
  excludeLeadId,
  originalGstNumber = '',
  originalPanNumber = '',
}: LeadFormStepsProps) {
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const { brokers: allBrokers, loading: loadingBrokers } = useBrokers();
  const [riceCodes, setRiceCodes] = useState<RiceCode[]>([]);
  const [riceTypes, setRiceTypes] = useState<RiceType[]>([]);
  const [loadingRiceCodes, setLoadingRiceCodes] = useState(false);
  const [loadingRiceTypes, setLoadingRiceTypes] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [verifiedAutofillEmails, setVerifiedAutofillEmails] = useState<Set<string>>(new Set());
  const [ocrNotice, setOcrNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
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

  const parseCoordsFromLink = (link?: string): { lat?: number; lng?: number } => {
    if (!link) return {};
    const trimmed = link.trim();
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://maps.google.com/?q=${encodeURIComponent(trimmed)}`);
      const q = url.searchParams.get('q');
      if (q) {
        const parts = q.split(',');
        if (parts.length >= 2) {
          const lat = Number(parts[0]);
          const lng = Number(parts[1]);
          if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
        }
      }
      const atMatch = url.href.match(/@(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/);
      if (atMatch) {
        const lat = Number(atMatch[1]);
        const lng = Number(atMatch[3]);
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
      }
    } catch {
      // ignore
    }
    return {};
  };

  const duplicateCheckOptions = () => ({
    excludeId: excludeLeadId,
    unchangedFrom: {
      gst_number: originalGstNumber,
      pan_number: originalPanNumber,
    },
  });

  const handleGSTLookup = async () => {
    const gstNumber = formData.business_details?.gst_number || '';
    if (!gstNumber) {
      setErrors({ ...errors, gst_number: 'Please enter a GST number' });
      return;
    }
    
    const gstError = getGstValidationError(gstNumber);
    if (gstError) {
      setErrors({ ...errors, gst_number: gstError });
      return;
    }

    setLookupLoading(true);
    setErrors({ ...errors, gst_number: '' });
    
    try {
      await assertEntityNotDuplicateBeforeVerification(
        'lead',
        { gst_number: gstNumber },
        'gst',
        duplicateCheckOptions(),
      );
      const result = await runEnrichedGstLookup(gstNumber);
      const autofill = buildEnrichedGstLookupAutofill(result);
      const autoFilledFieldsSet = new Set<string>();

      if (autofill.gstNumber) autoFilledFieldsSet.add('gst_number');
      if (autofill.panNumber) autoFilledFieldsSet.add('pan_number');

      const updatedContactPersons = mergeGstContactPersons(formData.contact_persons || [], autofill);
      const emailVerification = await verifyAutofilledEmails(
        autofill.emails,
        updatedContactPersons,
        undefined,
      );

      setFormData({
        ...formData,
        company_name: autofill.businessName ?? formData.company_name,
        contact_persons: updatedContactPersons,
        address: applyAutofillAddress(formData.address || {
          street: '',
          city: '',
          state: '',
          pincode: '',
          country: 'India',
        }, autofill.address),
        business_details: {
          ...(formData.business_details || {}),
          ...(autofill.panNumber ? { pan_number: autofill.panNumber } : {}),
          ...(autofill.gstNumber ? { gst_number: autofill.gstNumber } : {}),
          ...(autofill.businessType ? { business_type: autofill.businessType } : {}),
        },
      });

      setAutoFilledFields(autoFilledFieldsSet);
      setErrors({ ...errors, gst_number: '', ...emailVerification.fieldErrors });
    } catch (error: any) {
      console.error('GST lookup error:', error);
      setErrors({ ...errors, gst_number: error?.message || 'Failed to lookup GST details' });
    } finally {
      setLookupLoading(false);
    }
  };

  const handlePANLookup = async () => {
    const panNumber = formData.business_details?.pan_number || '';
    if (!panNumber) {
      setErrors({ ...errors, pan_number: 'Please enter a PAN number' });
      return;
    }
    
    const panError = getPanValidationError(panNumber);
    if (panError) {
      setErrors({ ...errors, pan_number: panError });
      return;
    }

    setLookupLoading(true);
    setErrors({ ...errors, pan_number: '' });
    
    try {
      await assertEntityNotDuplicateBeforeVerification(
        'lead',
        { pan_number: panNumber },
        'pan',
        duplicateCheckOptions(),
      );
      const result = await runEnrichedPanLookup(panNumber);
      const autofill = buildPanLookupAutofill(result);
      const autoFilledFieldsSet = new Set<string>();
      autofill.lockedFields.forEach((field) => {
        if (field === 'business_name') return;
        autoFilledFieldsSet.add(field);
      });

      const updatedContactPersons = mergePanContactIntoContactPersons(formData.contact_persons || [], autofill);
      const emailVerification = await verifyAutofilledEmails(
        autofill.emails,
        updatedContactPersons,
        undefined,
      );

      setFormData({
        ...formData,
        company_name: autofill.businessName ?? formData.company_name,
        contact_persons: updatedContactPersons,
        address: applyAutofillAddress(formData.address || {
          street: '',
          city: '',
          state: '',
          pincode: '',
          country: 'India',
        }, autofill.address),
        business_details: {
          ...(formData.business_details || {}),
          ...(autofill.panNumber ? { pan_number: autofill.panNumber } : {}),
          ...(autofill.gstNumber ? { gst_number: autofill.gstNumber } : {}),
          ...(autofill.businessType ? { business_type: autofill.businessType } : {}),
        },
      });

      setAutoFilledFields(autoFilledFieldsSet);
      setVerifiedAutofillEmails(new Set(emailVerification.verifiedEmails));
      setErrors({ ...errors, pan_number: '', ...emailVerification.fieldErrors });
    } catch (error: any) {
      console.error('PAN lookup error:', error);
      setErrors({ ...errors, pan_number: error?.message || 'Failed to lookup PAN details' });
    } finally {
      setLookupLoading(false);
    }
  };

  const handlePincodeLookup = async (pincode: string) => {
    // Only lookup if pincode is exactly 6 digits
    if (!/^\d{6}$/.test(pincode)) {
      return;
    }

    setPincodeLoading(true);
    const errorKey = 'pincode';
    setErrors({ ...errors, [errorKey]: '' });

    try {
      const response = await pincodeAPI.lookupPincode(pincode);
      
      // Extract post office data from response
      const postOffice = response.postOffices?.[0];
      
      if (!postOffice) {
        console.warn('No post office data found in pincode lookup response');
        return;
      }

      // Update address fields from pincode lookup response
      const updates: CreateLeadRequest = {
        ...formData,
        address: {
          ...(formData.address || {}),
          pincode: postOffice.Pincode || pincode,
          // Use Block as city, fallback to District, then Name
          city: postOffice.Block || postOffice.District || postOffice.Name || formData.address?.city || '',
          state: postOffice.State || formData.address?.state || '',
          country: postOffice.Country || formData.address?.country || 'India',
          // Keep existing street if present, otherwise leave empty
          street: formData.address?.street || '',
        },
      };

      setFormData(updates);
      setErrors({ ...errors, [errorKey]: '' });
    } catch (error: any) {
      console.error('Pincode lookup error:', error);
      // Don't show error if pincode is invalid - user might still be typing
      // Only show error on blur or if it's a clear API error
    } finally {
      setPincodeLoading(false);
    }
  };

  const renderLeadDocumentOcr = () => (
    <div className="space-y-2">
      {ocrNotice && (
        <p
          className={`text-xs ${
            ocrNotice.type === 'success'
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-red-600'
          }`}
        >
          {ocrNotice.message}
        </p>
      )}
      <KycDocumentOcrSection
        docs={['gst', 'pan']}
        disabled={lookupLoading}
        onGstResult={(result) => {
          setFormData((prev) => ({
            ...prev,
            ...applyGstOcrToLead(
              {
                company_name: prev.company_name,
                business_details: prev.business_details,
                address: prev.address,
                contact_persons: prev.contact_persons,
              },
              result,
            ),
          }));
          setErrors({ ...errors, gst_number: '', pan_number: '' });
        }}
        onPanResult={(result) => {
          setFormData((prev) => ({
            ...prev,
            ...applyPanOcrToLead(
              {
                company_name: prev.company_name,
                business_details: prev.business_details,
                address: prev.address,
                contact_persons: prev.contact_persons,
              },
              result,
            ),
          }));
          setErrors({ ...errors, pan_number: '' });
        }}
        onSuccess={(_title, message) => {
          setOcrNotice({ type: 'success', message });
        }}
        onError={(_title, message) => {
          setOcrNotice({ type: 'error', message });
        }}
      />
    </div>
  );

  return (
    <>
      {/* CREATE MODE - Step 1: Essential Info Only */}
      {mode === 'create' && step === 1 && (
        <div className="space-y-4">
          <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 mb-2">
            <p className="text-sm text-primary/90">
              <span className="font-medium">Note:</span> GST Number and PAN Number are optional. You can use the lookup feature to automatically fill in business details.
            </p>
          </div>

          {renderLeadDocumentOcr()}

          <div>
            <label className="text-sm font-medium mb-1.5 block">GST Number</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.business_details?.gst_number || ''}
                onChange={(e) => updateBusinessField('gst_number', e.target.value.toUpperCase())}
                readOnly={autoFilledFields.has('gst_number')}
                className={`flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary ${
                  autoFilledFields.has('gst_number') ? 'read-only:cursor-not-allowed opacity-75' : ''
                }`}
                placeholder={GST_EXAMPLE}
                maxLength={GST_MAX_LENGTH}
              />
              <button type="button" onClick={handleGSTLookup} disabled={lookupLoading} className="btn-secondary flex items-center gap-2">
                {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
              </button>
            </div>
            {errors.gst_number && <p className="mt-1 text-xs text-red-600">{errors.gst_number}</p>}
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">PAN Number</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.business_details?.pan_number || ''}
                onChange={(e) => updateBusinessField('pan_number', e.target.value.toUpperCase())}
                readOnly={autoFilledFields.has('pan_number')}
                className={`flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary ${
                  autoFilledFields.has('pan_number') ? 'read-only:cursor-not-allowed opacity-75' : ''
                }`}
                placeholder={PAN_EXAMPLE}
                maxLength={PAN_MAX_LENGTH}
              />
              <button type="button" onClick={handlePANLookup} disabled={lookupLoading} className="btn-secondary flex items-center gap-2">
                {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
              </button>
            </div>
            {errors.pan_number && <p className="mt-1 text-xs text-red-600">{errors.pan_number}</p>}
          </div>

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

          <div>
            <label className="text-sm font-medium mb-1.5 block">Contact Persons *</label>
            <div className="space-y-3">
              {(formData.contact_persons || []).map((contact, index) => (
                <div key={index} className="space-y-2 p-3 border border-border rounded-lg">
                  <div className="flex gap-2 items-start">
                    <input
                      type="text"
                      placeholder="Name"
                      value={contact.name}
                      onChange={(e) => {
                        const updated = [...(formData.contact_persons || [])];
                        updated[index] = { ...updated[index], name: e.target.value };
                        setFormData({ ...formData, contact_persons: updated });
                      }}
                      className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    />
                    {(formData.contact_persons || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (formData.contact_persons || []).filter((_, i) => i !== index);
                          setFormData({ ...formData, contact_persons: updated });
                        }}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Remove contact person"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 pl-0">
                    <label className="text-xs text-muted-foreground">Phone Numbers *</label>
                    {(contact.phones || ['']).map((phone, phoneIndex) => (
                      <div key={phoneIndex} className="space-y-1">
                        <div className="flex gap-2 items-center">
                          <PhoneInput
                            value={phone}
                            onChange={(value) => {
                              const updated = [...(formData.contact_persons || [])];
                              const updatedPhones = [...(updated[index].phones || [''])];
                              updatedPhones[phoneIndex] = value;
                              updated[index] = { ...updated[index], phones: updatedPhones };
                              setFormData({ ...formData, contact_persons: updated });
                              const errorKey = `contact_person_${index}_phone_${phoneIndex}`;
                              const phoneError = value ? getPhoneValidationError(value) : null;
                              if (phoneError) {
                                setErrors({ ...errors, [errorKey]: phoneError });
                              } else {
                                const newErrors = { ...errors };
                                delete newErrors[errorKey];
                                setErrors(newErrors);
                              }
                            }}
                          />
                          {(contact.phones || ['']).length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...(formData.contact_persons || [])];
                                const updatedPhones = updated[index].phones.filter((_, i) => i !== phoneIndex);
                                updated[index] = { ...updated[index], phones: updatedPhones.length > 0 ? updatedPhones : [''] };
                                setFormData({ ...formData, contact_persons: updated });
                              }}
                              className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                              title="Remove phone number"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        {errors[`contact_person_${index}_phone_${phoneIndex}`] && (
                          <p className="text-xs text-red-600 ml-0.5">{errors[`contact_person_${index}_phone_${phoneIndex}`]}</p>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...(formData.contact_persons || [])];
                        updated[index] = { ...updated[index], phones: [...(updated[index].phones || ['']), ''] };
                        setFormData({ ...formData, contact_persons: updated });
                      }}
                      className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add Phone Number
                    </button>
                  </div>
                  <div className="space-y-2 pl-0">
                    <label className="text-xs text-muted-foreground">Email Addresses</label>
                    {(contact.emails || ['']).map((email, emailIndex) => (
                      <div key={emailIndex} className="space-y-1">
                        <div className="flex gap-2 items-center">
                          <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => {
                              if (isVerifiedEmailInput(email, { verifiedEmails: verifiedAutofillEmails })) return;
                              const value = e.target.value;
                              const updated = [...(formData.contact_persons || [])];
                              const updatedEmails = [...(updated[index].emails || [''])];
                              updatedEmails[emailIndex] = value;
                              updated[index] = { ...updated[index], emails: updatedEmails };
                              setFormData({ ...formData, contact_persons: updated });
                              // Validate email format
                              const errorKey = `contact_person_${index}_email_${emailIndex}`;
                              if (value.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                                setErrors({ ...errors, [errorKey]: 'Invalid email format' });
                              } else {
                                const newErrors = { ...errors };
                                delete newErrors[errorKey];
                                setErrors(newErrors);
                              }
                            }}
                            onBlur={(e) => {
                              const value = e.target.value.trim();
                              const errorKey = `contact_person_${index}_email_${emailIndex}`;
                              if (value.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                                setErrors({ ...errors, [errorKey]: 'Invalid email format' });
                              }
                            }}
                            readOnly={isVerifiedEmailInput(email, { verifiedEmails: verifiedAutofillEmails })}
                            className={`flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary ${
                              isVerifiedEmailInput(email, { verifiedEmails: verifiedAutofillEmails })
                                ? VERIFIED_EMAIL_INPUT_CLASS
                                : ''
                            }`}
                          />
                          <EmailVerifyButton
                            email={email}
                            verifiedFromSnapshot={verifiedAutofillEmails.has(email.trim().toLowerCase())}
                            onError={(message) => {
                              setErrors({
                                ...errors,
                                [`contact_person_${index}_email_${emailIndex}`]: message,
                              });
                            }}
                            onVerified={() => {
                              const errorKey = `contact_person_${index}_email_${emailIndex}`;
                              const nextErrors = { ...errors };
                              delete nextErrors[errorKey];
                              setErrors(nextErrors);
                              setVerifiedAutofillEmails((prev) => rememberVerifiedEmail(prev, email));
                            }}
                          />
                          {(contact.emails || ['']).length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...(formData.contact_persons || [])];
                                const updatedEmails = updated[index].emails?.filter((_, i) => i !== emailIndex) || [];
                                updated[index] = { ...updated[index], emails: updatedEmails.length > 0 ? updatedEmails : [''] };
                                setFormData({ ...formData, contact_persons: updated });
                              }}
                              className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                              title="Remove email"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        {errors[`contact_person_${index}_email_${emailIndex}`] && (
                          <p className="text-xs text-red-600 ml-0.5">{errors[`contact_person_${index}_email_${emailIndex}`]}</p>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...(formData.contact_persons || [])];
                        updated[index] = { ...updated[index], emails: [...(updated[index].emails || ['']), ''] };
                        setFormData({ ...formData, contact_persons: updated });
                      }}
                      className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add Email
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    contact_persons: [...(formData.contact_persons || []), { name: '', phones: [''], emails: [''] }]
                  });
                }}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg border border-dashed border-primary/50 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Contact Person
              </button>
            </div>
            {errors.contact_persons && <p className="mt-1 text-xs text-red-600">{errors.contact_persons}</p>}
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
                  label: `${broker.business_name || ''}${broker.contact_persons?.[0]?.name ? ` (${broker.contact_persons[0].name})` : ''}`
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
              <div className="relative">
                <input
                  type="text"
                  value={formData.address?.pincode || ''}
                  onChange={(e) => {
                    // Only allow digits and limit to 6 digits
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    updateAddressField('pincode', value);
                    // Auto-lookup when 6 digits are entered
                    if (value.length === 6) {
                      handlePincodeLookup(value);
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value.length === 6) {
                      handlePincodeLookup(value);
                    }
                  }}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                  placeholder="6 digits"
                  maxLength={6}
                  required
                />
                {pincodeLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <LoadingSpinner size="sm" />
                  </div>
                )}
              </div>
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

          {/* Google Maps Location Link */}
          <div>
            <GoogleMapsLinkFieldLabel />
            <input
              type="text"
              value={formData.google_location_link || ''}
              onChange={(e) => {
                setFormData({ ...formData, google_location_link: e.target.value });
                if (errors.google_location_link) setErrors({ ...errors, google_location_link: '' });
              }}
              onBlur={() => {
                const val = (formData.google_location_link || '').trim();
                if (val) {
                  if (!validateGoogleLocationLink(val)) {
                    setErrors({ ...errors, google_location_link: 'Invalid Google Maps link format' });
                  } else {
                    setErrors({ ...errors, google_location_link: '' });
                  }
                }
              }}
              placeholder="Paste Google Maps link or Plus Code"
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
              maxLength={500}
            />
            {formData.google_location_link && (
              <p className="mt-1 text-xs text-muted-foreground">
                Coordinates will be automatically extracted from the link.{' '}
                {(() => {
                  const p = parseCoordsFromLink(formData.google_location_link || '');
                  return p.lat != null && p.lng != null
                    ? `Detected coordinates: ${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`
                    : '';
                })()}
                {formData.salesman_latitude != null && formData.salesman_longitude != null && (
                  <>. Manual coordinates will take priority.</>
                )}
              </p>
            )}
            {errors.google_location_link && <p className="mt-1 text-xs text-red-600">{errors.google_location_link}</p>}
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
          <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 mb-2">
            <p className="text-sm text-primary/90">
              <span className="font-medium">Note:</span> GST Number and PAN Number are optional. You can use the lookup feature to automatically fill in business details.
            </p>
          </div>

          {renderLeadDocumentOcr()}

          <div>
            <label className="text-sm font-medium mb-1.5 block">GST Number</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.business_details?.gst_number || ''}
                onChange={(e) => updateBusinessField('gst_number', e.target.value.toUpperCase())}
                readOnly={autoFilledFields.has('gst_number')}
                className={`flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary ${
                  autoFilledFields.has('gst_number') ? 'read-only:cursor-not-allowed opacity-75' : ''
                }`}
                placeholder={GST_EXAMPLE}
                maxLength={GST_MAX_LENGTH}
              />
              <button type="button" onClick={handleGSTLookup} disabled={lookupLoading} className="btn-secondary flex items-center gap-2">
                {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
              </button>
            </div>
            {errors.gst_number && <p className="mt-1 text-xs text-red-600">{errors.gst_number}</p>}
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">PAN Number</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.business_details?.pan_number || ''}
                onChange={(e) => updateBusinessField('pan_number', e.target.value.toUpperCase())}
                readOnly={autoFilledFields.has('pan_number')}
                className={`flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary ${
                  autoFilledFields.has('pan_number') ? 'read-only:cursor-not-allowed opacity-75' : ''
                }`}
                placeholder={PAN_EXAMPLE}
                maxLength={PAN_MAX_LENGTH}
              />
              <button type="button" onClick={handlePANLookup} disabled={lookupLoading} className="btn-secondary flex items-center gap-2">
                {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
              </button>
            </div>
            {errors.pan_number && <p className="mt-1 text-xs text-red-600">{errors.pan_number}</p>}
          </div>

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

          <div>
            <label className="text-sm font-medium mb-1.5 block">Contact Persons *</label>
            <div className="space-y-3">
              {(formData.contact_persons || []).map((contact, index) => (
                <div key={index} className="space-y-2 p-3 border border-border rounded-lg">
                  <div className="flex gap-2 items-start">
                    <input
                      type="text"
                      placeholder="Name"
                      value={contact.name}
                      onChange={(e) => {
                        const updated = [...(formData.contact_persons || [])];
                        updated[index] = { ...updated[index], name: e.target.value };
                        setFormData({ ...formData, contact_persons: updated });
                      }}
                      className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    />
                    {(formData.contact_persons || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (formData.contact_persons || []).filter((_, i) => i !== index);
                          setFormData({ ...formData, contact_persons: updated });
                        }}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Remove contact person"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 pl-0">
                    <label className="text-xs text-muted-foreground">Phone Numbers *</label>
                    {(contact.phones || ['']).map((phone, phoneIndex) => (
                      <div key={phoneIndex} className="space-y-1">
                        <div className="flex gap-2 items-center">
                          <PhoneInput
                            value={phone}
                            onChange={(value) => {
                              const updated = [...(formData.contact_persons || [])];
                              const updatedPhones = [...(updated[index].phones || [''])];
                              updatedPhones[phoneIndex] = value;
                              updated[index] = { ...updated[index], phones: updatedPhones };
                              setFormData({ ...formData, contact_persons: updated });
                              const errorKey = `contact_person_${index}_phone_${phoneIndex}`;
                              const phoneError = value ? getPhoneValidationError(value) : null;
                              if (phoneError) {
                                setErrors({ ...errors, [errorKey]: phoneError });
                              } else {
                                const newErrors = { ...errors };
                                delete newErrors[errorKey];
                                setErrors(newErrors);
                              }
                            }}
                          />
                          {(contact.phones || ['']).length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...(formData.contact_persons || [])];
                                const updatedPhones = updated[index].phones.filter((_, i) => i !== phoneIndex);
                                updated[index] = { ...updated[index], phones: updatedPhones.length > 0 ? updatedPhones : [''] };
                                setFormData({ ...formData, contact_persons: updated });
                              }}
                              className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                              title="Remove phone number"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        {errors[`contact_person_${index}_phone_${phoneIndex}`] && (
                          <p className="text-xs text-red-600 ml-0.5">{errors[`contact_person_${index}_phone_${phoneIndex}`]}</p>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...(formData.contact_persons || [])];
                        updated[index] = { ...updated[index], phones: [...(updated[index].phones || ['']), ''] };
                        setFormData({ ...formData, contact_persons: updated });
                      }}
                      className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add Phone Number
                    </button>
                  </div>
                  <div className="space-y-2 pl-0">
                    <label className="text-xs text-muted-foreground">Email Addresses</label>
                    {(contact.emails || ['']).map((email, emailIndex) => (
                      <div key={emailIndex} className="space-y-1">
                        <div className="flex gap-2 items-center">
                          <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => {
                              if (isVerifiedEmailInput(email, { verifiedEmails: verifiedAutofillEmails })) return;
                              const value = e.target.value;
                              const updated = [...(formData.contact_persons || [])];
                              const updatedEmails = [...(updated[index].emails || [''])];
                              updatedEmails[emailIndex] = value;
                              updated[index] = { ...updated[index], emails: updatedEmails };
                              setFormData({ ...formData, contact_persons: updated });
                              // Validate email format
                              const errorKey = `contact_person_${index}_email_${emailIndex}`;
                              if (value.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                                setErrors({ ...errors, [errorKey]: 'Invalid email format' });
                              } else {
                                const newErrors = { ...errors };
                                delete newErrors[errorKey];
                                setErrors(newErrors);
                              }
                            }}
                            onBlur={(e) => {
                              const value = e.target.value.trim();
                              const errorKey = `contact_person_${index}_email_${emailIndex}`;
                              if (value.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                                setErrors({ ...errors, [errorKey]: 'Invalid email format' });
                              }
                            }}
                            readOnly={isVerifiedEmailInput(email, { verifiedEmails: verifiedAutofillEmails })}
                            className={`flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary ${
                              isVerifiedEmailInput(email, { verifiedEmails: verifiedAutofillEmails })
                                ? VERIFIED_EMAIL_INPUT_CLASS
                                : ''
                            }`}
                          />
                          <EmailVerifyButton
                            email={email}
                            verifiedFromSnapshot={verifiedAutofillEmails.has(email.trim().toLowerCase())}
                            onError={(message) => {
                              setErrors({
                                ...errors,
                                [`contact_person_${index}_email_${emailIndex}`]: message,
                              });
                            }}
                            onVerified={() => {
                              const errorKey = `contact_person_${index}_email_${emailIndex}`;
                              const nextErrors = { ...errors };
                              delete nextErrors[errorKey];
                              setErrors(nextErrors);
                              setVerifiedAutofillEmails((prev) => rememberVerifiedEmail(prev, email));
                            }}
                          />
                          {(contact.emails || ['']).length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...(formData.contact_persons || [])];
                                const updatedEmails = updated[index].emails?.filter((_, i) => i !== emailIndex) || [];
                                updated[index] = { ...updated[index], emails: updatedEmails.length > 0 ? updatedEmails : [''] };
                                setFormData({ ...formData, contact_persons: updated });
                              }}
                              className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                              title="Remove email"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        {errors[`contact_person_${index}_email_${emailIndex}`] && (
                          <p className="text-xs text-red-600 ml-0.5">{errors[`contact_person_${index}_email_${emailIndex}`]}</p>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...(formData.contact_persons || [])];
                        updated[index] = { ...updated[index], emails: [...(updated[index].emails || ['']), ''] };
                        setFormData({ ...formData, contact_persons: updated });
                      }}
                      className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add Email
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    contact_persons: [...(formData.contact_persons || []), { name: '', phones: [''], emails: [''] }]
                  });
                }}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg border border-dashed border-primary/50 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Contact Person
              </button>
            </div>
            {errors.contact_persons && <p className="mt-1 text-xs text-red-600">{errors.contact_persons}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <div className="relative">
                <input
                  type="text"
                  value={formData.address?.pincode || ''}
                  onChange={(e) => {
                    // Only allow digits and limit to 6 digits
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    updateAddressField('pincode', value);
                    // Auto-lookup when 6 digits are entered
                    if (value.length === 6) {
                      handlePincodeLookup(value);
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value.length === 6) {
                      handlePincodeLookup(value);
                    }
                  }}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                  placeholder="6 digits"
                  maxLength={6}
                  required
                />
                {pincodeLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <LoadingSpinner size="sm" />
                  </div>
                )}
              </div>
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

          <div className="grid grid-cols-2 gap-4">
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
                  label: `${broker.business_name || ''}${broker.contact_persons?.[0]?.name ? ` (${broker.contact_persons[0].name})` : ''}`
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
                min="0"
                value={formData.estimated_value || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (value < 0) {
                    setErrors({ ...errors, estimated_value: 'Negative values not allowed' });
                    setFormData({ ...formData, estimated_value: 0 });
                  } else {
                    setFormData({ ...formData, estimated_value: (value >= 0 && !isNaN(value)) ? value : 0 });
                    if (errors.estimated_value === 'Negative values not allowed') {
                      setErrors({ ...errors, estimated_value: '' });
                    }
                  }
                }}
                className={`w-full rounded-lg border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary ${
                  errors.estimated_value ? 'border-red-500' : 'border-border'
                }`}
              />
              {errors.estimated_value && (
                <p className="text-xs text-red-500 mt-1">{errors.estimated_value}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Expected Close Date</label>
              <DateInputWithSteppers
                className="w-full"
                inputClassName="py-2 text-sm"
                value={formData.expected_close_date ? new Date(formData.expected_close_date).toISOString().split('T')[0] : ''}
                onChange={(v) =>
                  setFormData({
                    ...formData,
                    expected_close_date: v ? new Date(v + 'T12:00:00').toISOString() : undefined,
                  })
                }
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

          {/* Google Maps Location Link */}
          <div>
            <GoogleMapsLinkFieldLabel />
            <input
              type="text"
              value={formData.google_location_link || ''}
              onChange={(e) => {
                setFormData({ ...formData, google_location_link: e.target.value });
                if (errors.google_location_link) setErrors({ ...errors, google_location_link: '' });
              }}
              onBlur={() => {
                const val = (formData.google_location_link || '').trim();
                if (val) {
                  if (!validateGoogleLocationLink(val)) {
                    setErrors({ ...errors, google_location_link: 'Invalid Google Maps link format' });
                  } else {
                    setErrors({ ...errors, google_location_link: '' });
                  }
                }
              }}
              placeholder="Paste Google Maps link or Plus Code"
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
              maxLength={500}
            />
            {formData.google_location_link && (
              <p className="mt-1 text-xs text-muted-foreground">
                Coordinates will be automatically extracted from the link.{' '}
                {(() => {
                  const p = parseCoordsFromLink(formData.google_location_link || '');
                  return p.lat != null && p.lng != null
                    ? `Detected coordinates: ${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`
                    : '';
                })()}
                {formData.salesman_latitude != null && formData.salesman_longitude != null && (
                  <>. Manual coordinates will take priority.</>
                )}
              </p>
            )}
            {errors.google_location_link && <p className="mt-1 text-xs text-red-600">{errors.google_location_link}</p>}
          </div>

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


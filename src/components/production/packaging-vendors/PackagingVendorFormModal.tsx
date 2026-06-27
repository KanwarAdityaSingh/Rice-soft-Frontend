import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Mail, Phone } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { AlertDialog } from '../../shared/AlertDialog';
import { usePackagingVendors } from '../../../hooks/usePackagingVendors';
import { pincodeAPI } from '../../../services/pincode.api';
import { packagingVendorsAPI } from '../../../services/packagingVendors.api';
import { validateEmail, getGstValidationError, GST_EXAMPLE, GST_MAX_LENGTH } from '../../../utils/validation';
import { applyAutofillAddress } from '../../../utils/panLookupEnrichment';
import {
  buildEnrichedGstLookupAutofill,
  mergeGstContactPersons,
  runEnrichedGstLookup,
} from '../../../utils/gstLookupAutofill';
import { verifyAutofilledEmails, isVerifiedEmailInput, rememberVerifiedEmail, VERIFIED_EMAIL_INPUT_CLASS } from '../../../utils/emailVerification';
import { assertEntityNotDuplicateBeforeVerification } from '../../../utils/entityDuplicateCheck';
import { applyGstOcrToSimpleEntity } from '../../../utils/documentOcrPrefill';
import { KycDocumentOcrSection } from '../../shared/KycDocumentOcrSection';
import { EmailVerifyButton } from '../../shared/EmailVerifyButton';
import { PhoneInput } from '../../shared/PhoneInput';
import type {
  CreatePackagingVendorRequest,
  UpdatePackagingVendorRequest,
  ContactPerson,
  PackagingVendor,
} from '../../../types/entities';

interface PackagingVendorFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId?: string | null;
  /** Called after a new vendor is created successfully (e.g. to select it in a parent form). */
  onVendorCreated?: (vendor: PackagingVendor) => void;
}

// Helper function to convert ALL CAPS text to Title Case
const toTitleCase = (text: string): string => {
  if (!text) return '';
  return text
    .split(/\s+/)
    .map(word => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

export function PackagingVendorFormModal({ open, onOpenChange, vendorId, onVendorCreated }: PackagingVendorFormModalProps) {
  const { createPackagingVendor, updatePackagingVendor, packagingVendors } = usePackagingVendors();
  const isEditMode = !!vendorId;
  const [formData, setFormData] = useState<CreatePackagingVendorRequest>({
    name: '',
    contact_persons: [{ name: '', phones: [''], emails: [''] }],
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    },
    gst_number: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingVendor, setLoadingVendor] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [verifiedEmails, setVerifiedEmails] = useState<Set<string>>(new Set());
  const [originalGstNumber, setOriginalGstNumber] = useState('');

  useEffect(() => {
    if (open && vendorId && isEditMode) {
      loadVendorData();
    } else if (open && !vendorId) {
      resetForm();
    }
  }, [open, vendorId]);

  const loadVendorData = async () => {
    if (!vendorId) return;
    
    setLoadingVendor(true);
    try {
      const vendor = packagingVendors.find((v) => v.id === vendorId);
      if (vendor) {
        setFormData({
          name: vendor.name || '',
          contact_persons: vendor.contact_persons && vendor.contact_persons.length > 0 
            ? vendor.contact_persons.map(cp => ({
                name: cp.name || '',
                phones: cp.phones?.length > 0 ? cp.phones : [''],
                emails: (cp.emails?.length ?? 0) > 0 ? cp.emails : [''],
              }))
            : [{ name: '', phones: [''], emails: [''] }],
          address: vendor.address ? {
            street: vendor.address.street || '',
            city: vendor.address.city || '',
            state: vendor.address.state || '',
            pincode: vendor.address.pincode || '',
            country: vendor.address.country || 'India',
          } : {
            street: '',
            city: '',
            state: '',
            pincode: '',
            country: 'India',
          },
          gst_number: vendor.gst_number || null,
        });
        setOriginalGstNumber((vendor.gst_number ?? '').trim().toUpperCase());
        setErrors({});
        setVerifiedEmails(new Set());
      }
    } catch (error: any) {
      console.error('Failed to load vendor:', error);
      setAlertType('error');
      setAlertTitle('Failed to Load Vendor');
      setAlertMessage(error?.message || 'Could not load vendor data. Please try again.');
      setAlertOpen(true);
      onOpenChange(false);
    } finally {
      setLoadingVendor(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact_persons: [{ name: '', phones: [''], emails: [''] }],
      address: {
        street: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
      },
      gst_number: null,
    });
    setErrors({});
    setVerifiedEmails(new Set());
    setOriginalGstNumber('');
  };

  // Contact persons management functions
  const addContactPerson = () => {
    setFormData({
      ...formData,
      contact_persons: [...formData.contact_persons, { name: '', phones: [''], emails: [''] }]
    });
  };

  const removeContactPerson = (index: number) => {
    if (formData.contact_persons.length > 1) {
      setFormData({
        ...formData,
        contact_persons: formData.contact_persons.filter((_, i) => i !== index)
      });
    }
  };

  const updateContactPerson = (index: number, field: keyof ContactPerson, value: any) => {
    const updated = [...formData.contact_persons];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, contact_persons: updated });
  };

  const addPhone = (cpIndex: number) => {
    const updated = [...formData.contact_persons];
    updated[cpIndex] = {
      ...updated[cpIndex],
      phones: [...(updated[cpIndex].phones || []), '']
    };
    setFormData({ ...formData, contact_persons: updated });
  };

  const removePhone = (cpIndex: number, phoneIndex: number) => {
    const updated = [...formData.contact_persons];
    if (updated[cpIndex].phones && updated[cpIndex].phones.length > 1) {
      updated[cpIndex] = {
        ...updated[cpIndex],
        phones: updated[cpIndex].phones.filter((_, i) => i !== phoneIndex)
      };
      setFormData({ ...formData, contact_persons: updated });
    }
  };

  const updatePhone = (cpIndex: number, phoneIndex: number, value: string) => {
    const updated = [...formData.contact_persons];
    if (updated[cpIndex].phones) {
      updated[cpIndex].phones[phoneIndex] = value;
      setFormData({ ...formData, contact_persons: updated });
    }
  };

  const addEmail = (cpIndex: number) => {
    const updated = [...formData.contact_persons];
    updated[cpIndex] = {
      ...updated[cpIndex],
      emails: [...(updated[cpIndex].emails || []), '']
    };
    setFormData({ ...formData, contact_persons: updated });
  };

  const removeEmail = (cpIndex: number, emailIndex: number) => {
    const updated = [...formData.contact_persons];
    if (updated[cpIndex].emails && updated[cpIndex].emails.length > 1) {
      updated[cpIndex] = {
        ...updated[cpIndex],
        emails: updated[cpIndex].emails.filter((_, i) => i !== emailIndex)
      };
      setFormData({ ...formData, contact_persons: updated });
    }
  };

  const updateEmail = (cpIndex: number, emailIndex: number, value: string) => {
    const updated = [...formData.contact_persons];
    if (updated[cpIndex].emails) {
      updated[cpIndex].emails[emailIndex] = value;
      setFormData({ ...formData, contact_persons: updated });
    }
  };

  const handleGSTLookup = async () => {
    const gstRaw = formData.gst_number?.trim() ?? '';
    if (!gstRaw) {
      setErrors((prev) => ({ ...prev, gst_number: 'Please enter a GST number' }));
      return;
    }

    const gstError = getGstValidationError(gstRaw);
    if (gstError) {
      setErrors((prev) => ({ ...prev, gst_number: gstError }));
      return;
    }

    setLookupLoading(true);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.gst_number;
      return next;
    });

    try {
      await assertEntityNotDuplicateBeforeVerification(
        'packaging_vendor',
        { gst_number: gstRaw },
        'gst',
        {
          excludeId: vendorId,
          unchangedFrom: { gst_number: originalGstNumber },
        },
        packagingVendors.map((v) => ({
          id: v.id,
          displayName: v.name?.trim() || 'Unknown',
          gst_number: v.gst_number,
        })),
      );
      const result = await runEnrichedGstLookup(gstRaw);
      const autofill = buildEnrichedGstLookupAutofill(result);
      const updatedContactPersons = mergeGstContactPersons(formData.contact_persons, autofill);
      const emailVerification = await verifyAutofilledEmails(
        autofill.emails,
        updatedContactPersons,
        undefined,
      );

      setFormData((prev) => ({
        ...prev,
        name: autofill.businessName ?? prev.name,
        gst_number: autofill.gstNumber ?? gstRaw,
        address: {
          ...prev.address,
          ...applyAutofillAddress(
            {
              street: prev.address.street ?? '',
              city: prev.address.city ?? '',
              state: prev.address.state ?? '',
              pincode: prev.address.pincode ?? '',
              country: prev.address.country ?? 'India',
            },
            autofill.address,
          ),
        },
        contact_persons: updatedContactPersons,
      }));

      setErrors((prev) => ({
        ...prev,
        gst_number: '',
        ...emailVerification.fieldErrors,
      }));
      setVerifiedEmails((prev) => {
        let next = prev;
        for (const verified of emailVerification.verifiedEmails) {
          next = rememberVerifiedEmail(next, verified);
        }
        return next;
      });
    } catch (error: any) {
      console.error('GST lookup error:', error);
      setErrors((prev) => ({
        ...prev,
        gst_number: error?.message || 'Failed to lookup GST details',
      }));
    } finally {
      setLookupLoading(false);
    }
  };

  const handlePincodeLookup = async (pincode: string) => {
    if (!/^\d{6}$/.test(pincode)) {
      return;
    }

    setPincodeLoading(true);
    const errorKey = 'pincode';
    setErrors({ ...errors, [errorKey]: '' });

    try {
      const response = await pincodeAPI.lookupPincode(pincode);
      const postOffice = response.postOffices?.[0];

      if (!postOffice) {
        console.warn('No post office data found in pincode lookup response');
        return;
      }

      setFormData({
        ...formData,
        address: {
          ...formData.address,
          pincode: postOffice.Pincode || pincode,
          city: toTitleCase(postOffice.Block || postOffice.District || postOffice.Name) || formData.address?.city || '',
          state: toTitleCase(postOffice.State) || formData.address?.state || '',
          country: toTitleCase(postOffice.Country) || formData.address?.country || 'India',
        },
      });

      setErrors({ ...errors, [errorKey]: '' });
    } catch (error: any) {
      console.error('Pincode lookup error:', error);
    } finally {
      setPincodeLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Purchase party is required';
    }

    // Validate contact persons
    if (!formData.contact_persons || formData.contact_persons.length === 0) {
      newErrors.contact_persons = 'At least one contact person is required';
    } else {
      formData.contact_persons.forEach((cp, idx) => {
        if (!cp.name || cp.name.trim().length < 2) {
          newErrors[`contact_person_${idx}_name`] = 'Name required (min 2 chars)';
        }
        if (!cp.phones || cp.phones.length === 0 || !cp.phones[0]?.trim()) {
          newErrors[`contact_person_${idx}_phone`] = 'At least one phone required';
        }
        // Validate emails if provided
        cp.emails?.forEach((email, emailIdx) => {
          if (email && !validateEmail(email)) {
            newErrors[`contact_person_${idx}_email_${emailIdx}`] = 'Valid email required';
          }
        });
      });
    }

    // Validate address
    if (!formData.address.street) newErrors.street = 'Street required';
    if (!formData.address.city) newErrors.city = 'City required';
    if (!formData.address.state) newErrors.state = 'State required';
    if (!formData.address.pincode) newErrors.pincode = 'Pincode required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (vendorId) {
        await updatePackagingVendor(vendorId, formData as UpdatePackagingVendorRequest);
        setAlertType('success');
        setAlertTitle('Packaging Vendor Updated');
        setAlertMessage('Packaging vendor has been updated successfully.');
      } else {
        const created = await createPackagingVendor(formData);
        onVendorCreated?.(created);
        setAlertType('success');
        setAlertTitle('Packaging Vendor Created');
        setAlertMessage('Packaging vendor has been created successfully.');
      }
      setAlertOpen(true);
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 1500);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error?.message || 'Failed to save packaging vendor. Please try again.');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-[101] w-full max-w-3xl translate-x-[-50%] translate-y-[-50%]">
            <div className="glass rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-xl font-semibold">
                  {isEditMode ? 'Update Packaging Vendor' : 'Create Packaging Vendor'}
                </Dialog.Title>
                <button onClick={() => onOpenChange(false)} className="rounded-lg p-1 hover:bg-muted/50 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {loadingVendor && (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner />
                  <span className="ml-2 text-sm text-muted-foreground">Loading vendor data...</span>
                </div>
              )}

              {!loadingVendor && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <KycDocumentOcrSection
                    docs={['gst']}
                    disabled={lookupLoading || loading}
                    onGstResult={(result) => {
                      setFormData((prev) => ({
                        ...prev,
                        ...applyGstOcrToSimpleEntity(
                          {
                            name: prev.name,
                            gst_number: prev.gst_number,
                            address: prev.address,
                            contact_persons: prev.contact_persons,
                          },
                          result,
                        ),
                      }));
                      if (errors.gst_number) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.gst_number;
                          return next;
                        });
                      }
                    }}
                    onSuccess={(title, message) => {
                      setAlertType('success');
                      setAlertTitle(title);
                      setAlertMessage(message);
                      setAlertOpen(true);
                    }}
                    onError={(title, message) => {
                      setAlertType('error');
                      setAlertTitle(title);
                      setAlertMessage(message);
                      setAlertOpen(true);
                    }}
                  />

                  {/* GST Number */}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">GST Number</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.gst_number || ''}
                        onChange={(e) => {
                          const gstValue = e.target.value.toUpperCase();
                          setFormData({ ...formData, gst_number: gstValue || null });
                          if (errors.gst_number) setErrors({ ...errors, gst_number: '' });
                        }}
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                        placeholder="15-character GST number (optional)"
                        maxLength={15}
                      />
                      <button
                        type="button"
                        onClick={handleGSTLookup}
                        disabled={lookupLoading || !formData.gst_number}
                        className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        {lookupLoading ? <LoadingSpinner size="sm" /> : 'Lookup'}
                      </button>
                    </div>
                    {errors.gst_number && <p className="mt-1 text-xs text-destructive">{errors.gst_number}</p>}
                  </div>

                  {/* Purchase Party */}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Purchase Party *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (errors.name) setErrors({ ...errors, name: '' });
                      }}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                      placeholder="e.g., ABC Packaging Suppliers"
                    />
                    {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
                  </div>

                  {/* Contact Persons */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Contact Persons *</label>
                      <button
                        type="button"
                        onClick={addContactPerson}
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Add Contact
                      </button>
                    </div>
                    {formData.contact_persons.map((cp, cpIndex) => (
                      <div key={cpIndex} className="mb-4 p-4 rounded-lg border border-border bg-muted/20">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-xs font-medium text-muted-foreground">Contact Person {cpIndex + 1}</span>
                          {formData.contact_persons.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeContactPerson(cpIndex)}
                              className="text-xs text-destructive hover:underline inline-flex items-center gap-1"
                            >
                              <Trash2 className="h-3 w-3" />
                              Remove
                            </button>
                          )}
                        </div>

                        {/* Name */}
                        <div className="mb-3">
                          <label className="text-xs font-medium mb-1 block">Name *</label>
                          <input
                            type="text"
                            value={cp.name}
                            onChange={(e) => updateContactPerson(cpIndex, 'name', e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                            placeholder="Contact person name"
                          />
                          {errors[`contact_person_${cpIndex}_name`] && (
                            <p className="mt-1 text-xs text-destructive">{errors[`contact_person_${cpIndex}_name`]}</p>
                          )}
                        </div>

                        {/* Phones */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium">Phone Numbers *</label>
                            <button
                              type="button"
                              onClick={() => addPhone(cpIndex)}
                              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                            >
                              <Plus className="h-3 w-3" />
                              Add
                            </button>
                          </div>
                          {cp.phones?.map((phone, phoneIndex) => (
                            <div key={phoneIndex} className="flex gap-2 mb-2">
                              <div className="flex-1 flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <PhoneInput
                                  value={phone}
                                  onChange={(value) => updatePhone(cpIndex, phoneIndex, value)}
                                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                                />
                              </div>
                              {cp.phones && cp.phones.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removePhone(cpIndex, phoneIndex)}
                                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ))}
                          {errors[`contact_person_${cpIndex}_phone`] && (
                            <p className="mt-1 text-xs text-destructive">{errors[`contact_person_${cpIndex}_phone`]}</p>
                          )}
                        </div>

                        {/* Emails */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium">Email Addresses</label>
                            <button
                              type="button"
                              onClick={() => addEmail(cpIndex)}
                              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                            >
                              <Plus className="h-3 w-3" />
                              Add
                            </button>
                          </div>
                          {cp.emails?.map((email, emailIndex) => (
                            <div key={emailIndex} className="flex gap-2 mb-2">
                              <div className="flex-1 flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <input
                                  type="email"
                                  value={email}
                                  onChange={(e) => {
                                    if (isVerifiedEmailInput(email, { verifiedEmails })) return;
                                    updateEmail(cpIndex, emailIndex, e.target.value);
                                  }}
                                  readOnly={isVerifiedEmailInput(email, { verifiedEmails })}
                                  className={`flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary ${
                                    isVerifiedEmailInput(email, { verifiedEmails })
                                      ? VERIFIED_EMAIL_INPUT_CLASS
                                      : ''
                                  }`}
                                  placeholder="Email address"
                                />
                                <EmailVerifyButton
                                  email={email}
                                  verifiedFromSnapshot={verifiedEmails.has(email.trim().toLowerCase())}
                                  onError={(message) => {
                                    setErrors({
                                      ...errors,
                                      [`contact_person_${cpIndex}_email_${emailIndex}`]: message,
                                    });
                                  }}
                                  onVerified={() => {
                                    const errorKey = `contact_person_${cpIndex}_email_${emailIndex}`;
                                    const nextErrors = { ...errors };
                                    delete nextErrors[errorKey];
                                    setErrors(nextErrors);
                                    setVerifiedEmails((prev) => rememberVerifiedEmail(prev, email));
                                  }}
                                />
                              </div>
                              {cp.emails && cp.emails.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeEmail(cpIndex, emailIndex)}
                                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ))}
                          {errors[`contact_person_${cpIndex}_email_0`] && (
                            <p className="mt-1 text-xs text-destructive">{errors[`contact_person_${cpIndex}_email_0`]}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {errors.contact_persons && <p className="mt-1 text-xs text-destructive">{errors.contact_persons}</p>}
                  </div>

                  {/* Address */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Address *</label>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium mb-1 block">Street *</label>
                        <input
                          type="text"
                          value={formData.address.street}
                          onChange={(e) => {
                            setFormData({ ...formData, address: { ...formData.address, street: e.target.value } });
                            if (errors.street) setErrors({ ...errors, street: '' });
                          }}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                          placeholder="Street address"
                        />
                        {errors.street && <p className="mt-1 text-xs text-destructive">{errors.street}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium mb-1 block">City *</label>
                          <input
                            type="text"
                            value={formData.address.city}
                            onChange={(e) => {
                              setFormData({ ...formData, address: { ...formData.address, city: e.target.value } });
                              if (errors.city) setErrors({ ...errors, city: '' });
                            }}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                            placeholder="City"
                          />
                          {errors.city && <p className="mt-1 text-xs text-destructive">{errors.city}</p>}
                        </div>

                        <div>
                          <label className="text-xs font-medium mb-1 block">State *</label>
                          <input
                            type="text"
                            value={formData.address.state}
                            onChange={(e) => {
                              setFormData({ ...formData, address: { ...formData.address, state: e.target.value } });
                              if (errors.state) setErrors({ ...errors, state: '' });
                            }}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                            placeholder="State"
                          />
                          {errors.state && <p className="mt-1 text-xs text-destructive">{errors.state}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium mb-1 block">Pincode *</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={formData.address.pincode}
                              onChange={(e) => {
                                const pincode = e.target.value;
                                setFormData({ ...formData, address: { ...formData.address, pincode } });
                                if (errors.pincode) setErrors({ ...errors, pincode: '' });
                                if (pincode.length === 6) {
                                  handlePincodeLookup(pincode);
                                }
                              }}
                              maxLength={6}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                              placeholder="6-digit pincode"
                            />
                            {pincodeLoading && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <LoadingSpinner size="sm" />
                              </div>
                            )}
                          </div>
                          {errors.pincode && <p className="mt-1 text-xs text-destructive">{errors.pincode}</p>}
                        </div>

                        <div>
                          <label className="text-xs font-medium mb-1 block">Country *</label>
                          <input
                            type="text"
                            value={formData.address.country}
                            onChange={(e) => setFormData({ ...formData, address: { ...formData.address, country: e.target.value } })}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                            placeholder="Country"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? <LoadingSpinner /> : isEditMode ? 'Update Vendor' : 'Create Vendor'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
      />
    </>
  );
}

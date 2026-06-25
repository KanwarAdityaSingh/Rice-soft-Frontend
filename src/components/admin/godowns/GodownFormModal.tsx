import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X, Plus, Search } from 'lucide-react';
import { godownsAPI } from '../../../services/godowns.api';
import { AlertDialog } from '../../shared/AlertDialog';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { EmailVerifyButton } from '../../shared/EmailVerifyButton';
import { GoogleMapsLinkFieldLabel } from '../../shared/GoogleMapsLinkGuide';
import { PhoneInput } from '../../shared/PhoneInput';
import { getGstValidationError, GST_EXAMPLE, GST_MAX_LENGTH } from '../../../utils/validation';
import { applyAutofillAddress } from '../../../utils/panLookupEnrichment';
import {
  buildEnrichedGstLookupAutofill,
  mergeGstContactPersons,
  runEnrichedGstLookup,
} from '../../../utils/gstLookupAutofill';
import { verifyAutofilledEmails, isVerifiedEmailInput, rememberVerifiedEmail, VERIFIED_EMAIL_INPUT_CLASS } from '../../../utils/emailVerification';
import { assertEntityNotDuplicateBeforeVerification } from '../../../utils/entityDuplicateCheck';
import { sanitizePhoneList } from '../../../utils/phoneFormatting';

function isValidGoogleMapsLink(value: string | null | undefined): boolean {
  const t = (value ?? '').trim();
  if (!t) return true;
  if (t.length > 2048) return false;
  try {
    const u = new URL(t);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
import type { ContactPerson, CreateGodownRequest, Godown, GodownAddress, UpdateGodownRequest } from '../../../types/entities';

const emptyAddress = (): GodownAddress => ({
  street: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
});

const defaultContacts = (): ContactPerson[] => [{ name: '', phones: [''], emails: [''] }];

function mapGodownContacts(g: Godown): ContactPerson[] {
  if (g.contact_persons && g.contact_persons.length > 0) {
    return g.contact_persons.map((cp) => ({
      name: cp.name,
      phones: cp.phones?.length ? [...cp.phones] : [''],
      emails: cp.emails?.length ? [...cp.emails] : [''],
    }));
  }
  return defaultContacts();
}

/** Keep only contacts with name + ≥1 phone (aligned with vendor / API). */
function normalizeContactPersonsForApi(cps: ContactPerson[]): ContactPerson[] {
  return cps
    .map((cp) => ({
      name: cp.name.trim(),
      phones: sanitizePhoneList(cp.phones ?? []),
      emails: (cp.emails ?? []).map((e) => String(e).trim()).filter(Boolean),
    }))
    .filter((cp) => cp.name.length >= 2 && cp.phones.length > 0);
}

interface GodownFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  godownId?: string | null;
}

export function GodownFormModal({ open, onOpenChange, godownId }: GodownFormModalProps) {
  const isEdit = !!godownId;
  const [form, setForm] = useState<CreateGodownRequest>({
    name: '',
    contact_persons: defaultContacts(),
    gst_number: null,
    address: emptyAddress(),
    google_maps_link: null,
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [loadingEntity, setLoadingEntity] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('error');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [verifiedEmails, setVerifiedEmails] = useState<Set<string>>(new Set());
  const [originalGstNumber, setOriginalGstNumber] = useState('');

  useEffect(() => {
    if (open && godownId) {
      loadGodown(godownId);
    } else if (open && !godownId) {
      setForm({
        name: '',
        contact_persons: defaultContacts(),
        gst_number: null,
        address: emptyAddress(),
        google_maps_link: null,
        is_active: true,
      });
      setErrors({});
      setVerifiedEmails(new Set());
      setOriginalGstNumber('');
    }
  }, [open, godownId]);

  const loadGodown = async (id: string) => {
    setLoadingEntity(true);
    try {
      const g: Godown = await godownsAPI.getById(id);
      setForm({
        name: g.name,
        contact_persons: mapGodownContacts(g),
        gst_number: g.gst_number ?? null,
        address: g.address ?? emptyAddress(),
        google_maps_link: g.google_maps_link ?? null,
        is_active: g.is_active,
      });
      setOriginalGstNumber((g.gst_number ?? '').trim().toUpperCase());
      setErrors({});
      setVerifiedEmails(new Set());
    } catch (e: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(e?.message || 'Failed to load godown');
      setAlertOpen(true);
    } finally {
      setLoadingEntity(false);
    }
  };

  const handleGSTLookup = async () => {
    const gstRaw = form.gst_number?.trim() ?? '';
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
        'godown',
        { gst_number: gstRaw },
        'gst',
        {
          excludeId: godownId,
          unchangedFrom: { gst_number: originalGstNumber },
        },
      );
      const result = await runEnrichedGstLookup(gstRaw);
      const autofill = buildEnrichedGstLookupAutofill(result);
      const updatedContactPersons = mergeGstContactPersons(form.contact_persons, autofill);
      const emailVerification = await verifyAutofilledEmails(
        autofill.emails,
        updatedContactPersons,
        undefined,
      );

      setForm((prev) => ({
        ...prev,
        name: autofill.businessName ?? prev.name,
        gst_number: autofill.gstNumber ?? gstRaw,
        address: applyAutofillAddress(prev.address ?? emptyAddress(), autofill.address),
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
    } catch (e: any) {
      console.error('GST lookup error:', e);
      setErrors((prev) => ({
        ...prev,
        gst_number: e?.message || 'Failed to lookup GST details',
      }));
    } finally {
      setLookupLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!form.contact_persons || form.contact_persons.length === 0) {
      newErrors.contact_persons = 'At least one contact person is required';
    } else {
      form.contact_persons.forEach((cp, idx) => {
        if (!cp.name || cp.name.trim().length < 2) {
          newErrors[`contact_person_${idx}_name`] = 'Name required (min 2 chars)';
        }
        if (!cp.phones || cp.phones.length === 0 || !String(cp.phones[0] ?? '').trim()) {
          newErrors[`contact_person_${idx}_phone`] = 'At least one phone required';
        }
        cp.emails?.forEach((email, emailIdx) => {
          if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors[`contact_person_${idx}_email_${emailIdx}`] = 'Valid email required';
          }
        });
      });
    }

    const mapsLink = form.google_maps_link?.trim() ?? '';
    if (mapsLink && !isValidGoogleMapsLink(mapsLink)) {
      newErrors.google_maps_link =
        mapsLink.length > 2048
          ? 'Link must be at most 2048 characters'
          : 'Enter a valid http(s) Google Maps URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const contacts = normalizeContactPersonsForApi(form.contact_persons);
    if (contacts.length === 0) {
      setAlertType('warning');
      setAlertTitle('Validation');
      setAlertMessage('Add at least one contact person with name and phone');
      setAlertOpen(true);
      return;
    }

    setLoading(true);
    try {
      const base = {
        name: form.name.trim(),
        contact_persons: contacts,
        gst_number: form.gst_number?.trim() || null,
        address: form.address?.street?.trim()
          ? {
              ...form.address!,
              street: form.address!.street.trim(),
              city: form.address!.city.trim(),
              state: form.address!.state.trim(),
              pincode: form.address!.pincode.trim(),
              country: form.address!.country.trim() || 'India',
            }
          : null,
        google_maps_link: form.google_maps_link?.trim() || null,
        is_active: form.is_active !== false,
      };

      if (isEdit && godownId) {
        await godownsAPI.update(godownId, base as UpdateGodownRequest);
      } else {
        await godownsAPI.create(base as CreateGodownRequest);
      }
      setAlertType('success');
      setAlertTitle('Saved');
      setAlertMessage(isEdit ? 'Godown updated' : 'Godown created');
      setAlertOpen(true);
      onOpenChange(false);
    } catch (e: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(e?.message || 'Save failed');
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
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[90vh] w-[95vw] max-w-2xl translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-xl border bg-background p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold">
                {isEdit ? 'Edit Godown' : 'New Godown'}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" className="rounded-lg p-2 hover:bg-muted" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            {loadingEntity ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Name *</label>
                  <input
                    className={`w-full rounded-lg border bg-background px-3 py-2 text-sm ${errors.name ? 'border-destructive' : 'border-border'}`}
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    required
                  />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">GST</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className={`flex-1 rounded-lg border bg-background px-3 py-2 text-sm ${errors.gst_number ? 'border-destructive' : 'border-border'}`}
                      value={form.gst_number ?? ''}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          gst_number: e.target.value ? e.target.value.toUpperCase() : null,
                        }))
                      }
                      placeholder={GST_EXAMPLE}
                      maxLength={GST_MAX_LENGTH}
                    />
                    <button
                      type="button"
                      onClick={handleGSTLookup}
                      disabled={lookupLoading}
                      className="btn-secondary flex shrink-0 items-center gap-2 rounded-lg px-3"
                      title="Fetch details from GSTIN"
                    >
                      {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.gst_number && (
                    <p className="text-xs text-destructive mt-1">{errors.gst_number}</p>
                  )}
                </div>

                {/* Contact persons — required on create; optional on update (API) */}
                <div>
                  <label className="block text-xs font-medium mb-2">
                    Contact persons <span className="text-destructive">*</span>
                  </label>
                  <div className="space-y-3">
                    {form.contact_persons.map((contact, index) => (
                      <div key={index} className="space-y-2 p-3 border border-border rounded-lg bg-muted/30">
                        <div className="flex gap-2 items-start">
                          <input
                            type="text"
                            placeholder="Name"
                            value={contact.name}
                            onChange={(e) => {
                              const updated = [...form.contact_persons];
                              updated[index] = { ...updated[index], name: e.target.value };
                              setForm((p) => ({ ...p, contact_persons: updated }));
                            }}
                            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                          />
                          {form.contact_persons.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setForm((p) => ({
                                  ...p,
                                  contact_persons: p.contact_persons.filter((_, i) => i !== index),
                                }));
                              }}
                              className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
                              title="Remove"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        {errors[`contact_person_${index}_name`] && (
                          <p className="text-xs text-destructive">{errors[`contact_person_${index}_name`]}</p>
                        )}

                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Phone *</label>
                          {(contact.phones || ['']).map((phone, phoneIndex) => (
                            <div key={phoneIndex} className="flex gap-2">
                              <PhoneInput
                                value={phone}
                                onChange={(value) => {
                                  const updated = [...form.contact_persons];
                                  const phones = [...(updated[index].phones || [''])];
                                  phones[phoneIndex] = value;
                                  updated[index] = { ...updated[index], phones };
                                  setForm((p) => ({ ...p, contact_persons: updated }));
                                }}
                                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                              />
                              {(contact.phones || ['']).length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...form.contact_persons];
                                    const phones = updated[index].phones?.filter((_, i) => i !== phoneIndex) || [];
                                    updated[index] = {
                                      ...updated[index],
                                      phones: phones.length ? phones : [''],
                                    };
                                    setForm((p) => ({ ...p, contact_persons: updated }));
                                  }}
                                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ))}
                          {errors[`contact_person_${index}_phone`] && (
                            <p className="text-xs text-destructive">{errors[`contact_person_${index}_phone`]}</p>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...form.contact_persons];
                              updated[index] = {
                                ...updated[index],
                                phones: [...(updated[index].phones || ['']), ''],
                              };
                              setForm((p) => ({ ...p, contact_persons: updated }));
                            }}
                            className="text-xs text-primary"
                          >
                            + Add phone
                          </button>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Email</label>
                          {(contact.emails || ['']).map((email, emailIndex) => (
                            <div key={emailIndex}>
                              <div className="flex gap-2">
                                <input
                                  type="email"
                                  placeholder="Email"
                                  value={email}
                                  onChange={(e) => {
                                    if (isVerifiedEmailInput(email, { verifiedEmails })) return;
                                    const updated = [...form.contact_persons];
                                    const emails = [...(updated[index].emails || [''])];
                                    emails[emailIndex] = e.target.value;
                                    updated[index] = { ...updated[index], emails };
                                    setForm((p) => ({ ...p, contact_persons: updated }));
                                  }}
                                  readOnly={isVerifiedEmailInput(email, { verifiedEmails })}
                                  className={`flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm ${
                                    isVerifiedEmailInput(email, { verifiedEmails })
                                      ? VERIFIED_EMAIL_INPUT_CLASS
                                      : ''
                                  }`}
                                />
                                <EmailVerifyButton
                                  email={email}
                                  verifiedFromSnapshot={verifiedEmails.has(email.trim().toLowerCase())}
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
                                    setVerifiedEmails((prev) => rememberVerifiedEmail(prev, email));
                                  }}
                                />
                                {(contact.emails || ['']).length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...form.contact_persons];
                                      const emails = updated[index].emails?.filter((_, i) => i !== emailIndex) || [];
                                      updated[index] = {
                                        ...updated[index],
                                        emails: emails.length ? emails : [''],
                                      };
                                      setForm((p) => ({ ...p, contact_persons: updated }));
                                    }}
                                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                              {errors[`contact_person_${index}_email_${emailIndex}`] && (
                                <p className="text-xs text-destructive mt-0.5">
                                  {errors[`contact_person_${index}_email_${emailIndex}`]}
                                </p>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...form.contact_persons];
                              updated[index] = {
                                ...updated[index],
                                emails: [...(updated[index].emails || ['']), ''],
                              };
                              setForm((p) => ({ ...p, contact_persons: updated }));
                            }}
                            className="text-xs text-primary"
                          >
                            + Add email
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          contact_persons: [...p.contact_persons, { name: '', phones: [''], emails: [''] }],
                        }))
                      }
                      className="w-full flex items-center justify-center gap-2 py-2 text-sm text-primary border border-dashed border-primary/50 rounded-lg"
                    >
                      <Plus className="h-4 w-4" />
                      Add contact person
                    </button>
                    {errors.contact_persons && <p className="text-xs text-destructive">{errors.contact_persons}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Street</label>
                  <input
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    value={form.address?.street ?? ''}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        address: { ...(p.address ?? emptyAddress()), street: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium mb-1">City</label>
                    <input
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      value={form.address?.city ?? ''}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          address: { ...(p.address ?? emptyAddress()), city: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">State</label>
                    <input
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      value={form.address?.state ?? ''}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          address: { ...(p.address ?? emptyAddress()), state: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium mb-1">Pincode</label>
                    <input
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      value={form.address?.pincode ?? ''}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          address: { ...(p.address ?? emptyAddress()), pincode: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Country</label>
                    <input
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      value={form.address?.country ?? ''}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          address: { ...(p.address ?? emptyAddress()), country: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <GoogleMapsLinkFieldLabel
                    label="Google Maps link"
                    className="block text-xs font-medium mb-1"
                  />
                  <input
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    placeholder="https://maps.app.goo.gl/... or https://www.google.com/maps?q=..."
                    maxLength={2048}
                    className={`w-full rounded-lg border bg-background px-3 py-2 text-sm ${errors.google_maps_link ? 'border-destructive' : 'border-border'}`}
                    value={form.google_maps_link ?? ''}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        google_maps_link: e.target.value.trim() === '' ? null : e.target.value,
                      }))
                    }
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Optional. Paste a share link or maps URL (max 2048 characters).
                  </p>
                  {errors.google_maps_link && (
                    <p className="text-xs text-destructive mt-1">{errors.google_maps_link}</p>
                  )}
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_active !== false}
                    onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                  />
                  Active
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" className="btn-secondary rounded-lg px-4 py-2" onClick={() => onOpenChange(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary rounded-lg px-4 py-2" disabled={loading}>
                    {loading ? 'Saving…' : isEdit ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            )}
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

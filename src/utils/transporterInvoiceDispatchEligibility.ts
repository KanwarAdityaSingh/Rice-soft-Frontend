import type { Transporter } from '../types/entities';

/** Reasons a transporter cannot be used on an invoice dispatch (empty = OK). */
export function getTransporterInvoiceDispatchBlockers(t: Transporter): string[] {
  const issues: string[] = [];
  if (t.transport_type !== 'registered') {
    issues.push('Only registered transporters can be selected');
  }
  if (!t.business_name?.trim()) {
    issues.push('Business name is required');
  }
  const hasGst = Boolean(t.gst_number?.trim());
  const hasPan = Boolean(t.pan_number?.trim());
  if (!hasGst && !hasPan) {
    issues.push('GST or PAN must be on file');
  }
  const hasValidContact = t.contact_persons?.some(
    (c) =>
      Boolean(c.name?.trim()) &&
      (c.phones ?? []).some((p) => String(p).trim().length > 0)
  );
  if (!hasValidContact) {
    issues.push('At least one contact person with name and mobile number is required');
  }
  return issues;
}

export function isTransporterEligibleForInvoiceDispatch(t: Transporter): boolean {
  return getTransporterInvoiceDispatchBlockers(t).length === 0;
}

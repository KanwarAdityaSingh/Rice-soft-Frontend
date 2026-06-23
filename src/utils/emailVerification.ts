import { kycAPI } from '../services/kyc.api';
import type {
  ContactPerson,
  EmailVerificationResult,
  EntityKycVerificationDetails,
  KycPersistContext,
} from '../types/entities';
import { getUserFacingApiErrorMessage } from './errorHandler';
import {
  buildSurepassSnapshot,
  isEmailVerifiedInKyc,
  mergeEntityKycSnapshot,
} from './kycVerification';
import { validateEmail } from './validation';

export function getEmailVerificationFailureMessage(result: EmailVerificationResult): string {
  if (!result.valid_syntax) return 'Invalid email format';
  if (result.disabled) return 'This email address is disabled';
  if (result.is_temporary) return 'Temporary/disposable email address';
  if (result.accepts_mail) return 'Email could not be fully verified';
  return 'Email could not be verified';
}

/**
 * Surepass may return `valid: false` while the mailbox is reachable (`accepts_mail`, `smtp_connected`, status `safe`).
 * When the backend responds with a successful verification, treat those as verified.
 */
export function isEmailDeliverable(result: EmailVerificationResult): boolean {
  if (result.disabled || !result.valid_syntax) return false;

  if (result.valid && result.accepts_mail) return true;

  if (result.accepts_mail && result.smtp_connected) {
    const status = (result.status ?? '').toLowerCase();
    if (status === 'safe' || status === 'valid') return true;
  }

  return false;
}

export function findEmailFieldKeys(contactPersons: ContactPerson[], email: string): string[] {
  const normalized = email.trim().toLowerCase();
  const keys: string[] = [];

  contactPersons.forEach((cp, personIdx) => {
    (cp.emails ?? []).forEach((value, emailIdx) => {
      if (value.trim().toLowerCase() === normalized) {
        keys.push(`contact_person_${personIdx}_email_${emailIdx}`);
      }
    });
  });

  return keys;
}

export interface AutofillEmailVerificationResult {
  kycDetails: EntityKycVerificationDetails;
  fieldErrors: Record<string, string>;
  verifiedEmails: string[];
}

/** Verify emails returned from PAN/GST autofill as soon as they are added. */
export async function verifyAutofilledEmails(
  emails: string[],
  contactPersons: ContactPerson[],
  existingKyc: EntityKycVerificationDetails | undefined,
  persist?: KycPersistContext,
): Promise<AutofillEmailVerificationResult> {
  let kycDetails = existingKyc ?? {};
  const fieldErrors: Record<string, string> = {};
  const verifiedEmails: string[] = [];

  const uniqueEmails = [...new Set(emails.map((email) => email.trim()).filter(Boolean))];

  await Promise.all(
    uniqueEmails.map(async (email) => {
      if (!validateEmail(email)) return;
      if (isEmailVerifiedInKyc(kycDetails, email)) {
        verifiedEmails.push(email.trim().toLowerCase());
        return;
      }

      try {
        const result = await kycAPI.verifyEmail(email, persist);
        if (isEmailDeliverable(result)) {
          verifiedEmails.push(email.trim().toLowerCase());
          if (result.surepass_response) {
            kycDetails = mergeEntityKycSnapshot(
              kycDetails,
              'emails',
              buildSurepassSnapshot(result.surepass_response, result),
              email,
            );
          }
          return;
        }

        const message = getEmailVerificationFailureMessage(result);
        for (const key of findEmailFieldKeys(contactPersons, email)) {
          fieldErrors[key] = message;
        }
      } catch (error: unknown) {
        const message = getUserFacingApiErrorMessage(error, 'Email verification failed');
        for (const key of findEmailFieldKeys(contactPersons, email)) {
          fieldErrors[key] = message;
        }
      }
    }),
  );

  return { kycDetails, fieldErrors, verifiedEmails };
}

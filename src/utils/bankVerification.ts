import type { BankVerificationResult, VendorBankDetails } from '../types/entities';
import { toTitleCase } from './panLookupEnrichment';

/** Account number + 11-char IFSC — minimum for Surepass bank verify lookup. */
export function canVerifyBankAccountLookup(
  accountNumber?: string | null,
  ifscCode?: string | null,
): boolean {
  const account = accountNumber?.trim();
  const ifsc = ifscCode?.trim().toUpperCase();
  return Boolean(account && ifsc && ifsc.length === 11);
}

const HOLDER_SUFFIX_PATTERN =
  /\b(pvt|ltd|limited|llp|private|co|company|enterprises|enterprise|corp|corporation|llc)\b/g;

/** Normalize business / account holder names for lenient comparison. */
export function normalizeBankHolderName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(HOLDER_SUFFIX_PATTERN, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when form holder and Surepass bank holder refer to the same entity. */
export function bankAccountHolderNamesMatch(formName: string, bankName: string): boolean {
  const a = normalizeBankHolderName(formName);
  const b = normalizeBankHolderName(bankName);
  if (!a || !b) return true;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  const aTokens = a.split(' ').filter(Boolean);
  const bTokens = b.split(' ').filter(Boolean);
  if (aTokens.length === 0 || bTokens.length === 0) return true;

  const bSet = new Set(bTokens);
  const overlap = aTokens.filter((token) => bSet.has(token)).length;
  const minSize = Math.min(aTokens.length, bTokens.length);
  return overlap / minSize >= 0.8;
}

/** Returns a user-facing error when the bank-record holder differs from the form value. */
export function getBankAccountHolderNameMismatchError(
  formHolderName: string | null | undefined,
  verifiedHolderName: string | null | undefined,
): string | null {
  const form = formHolderName?.trim();
  const verified = verifiedHolderName?.trim();
  if (!form || !verified) return null;
  if (bankAccountHolderNamesMatch(form, verified)) return null;
  return `Account holder name "${form}" does not match bank records ("${verified}")`;
}

export function mapBankVerifyToBankDetails<T extends VendorBankDetails>(
  result: BankVerificationResult,
  current?: T | null,
): T {
  return {
    ...current,
    account_number: result.account_number?.trim() || current?.account_number,
    ifsc_code: result.ifsc_code?.trim().toUpperCase() || current?.ifsc_code,
    bank_name:
      toTitleCase(result.bank_name ?? result.ifsc_details?.bank_name ?? '') || current?.bank_name,
    branch: toTitleCase(result.branch ?? result.ifsc_details?.branch ?? '') || current?.branch,
  } as T;
}

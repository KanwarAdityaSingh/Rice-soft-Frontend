import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { kycAPI } from '../../services/kyc.api';
import {
  getEmailVerificationFailureMessage,
  isEmailDeliverable,
} from '../../utils/emailVerification';
import { getUserFacingApiErrorMessage } from '../../utils/errorHandler';
import { validateEmail } from '../../utils/validation';
import type { EmailVerificationResult, KycPersistContext } from '../../types/entities';

interface EmailVerifyButtonProps {
  email: string;
  persist?: KycPersistContext;
  onVerified?: (result: EmailVerificationResult) => void;
  onSnapshotSaved?: (snapshot: EmailVerificationResult & { surepass_response?: unknown }) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  className?: string;
  /** When true, shows verified state from a prior KYC snapshot or autofill verification. */
  verifiedFromSnapshot?: boolean;
  /** When true, verifies automatically once when the email becomes valid (e.g. after autofill). */
  autoVerify?: boolean;
}

export function EmailVerifyButton({
  email,
  persist,
  onVerified,
  onSnapshotSaved,
  onError,
  disabled = false,
  className = '',
  verifiedFromSnapshot = false,
  autoVerify = false,
}: EmailVerifyButtonProps) {
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const lastAutoVerifiedEmail = useRef<string | null>(null);

  const trimmed = email.trim();
  const canVerify = Boolean(trimmed) && validateEmail(trimmed) && !disabled;
  const showVerified = verified || verifiedFromSnapshot;

  useEffect(() => {
    setVerified(false);
    setInvalid(false);
    if (verifiedFromSnapshot) return;
    lastAutoVerifiedEmail.current = null;
  }, [trimmed, verifiedFromSnapshot]);

  const runVerify = async () => {
    if (!canVerify || loading) return;

    setLoading(true);
    setVerified(false);
    setInvalid(false);

    try {
      const result = await kycAPI.verifyEmail(trimmed, persist);
      if (isEmailDeliverable(result)) {
        setVerified(true);
        onVerified?.(result);
        onSnapshotSaved?.(result);
        return;
      }

      const message = getEmailVerificationFailureMessage(result);
      setInvalid(true);
      onError?.(message);
    } catch (error: unknown) {
      const message = getUserFacingApiErrorMessage(error, 'Email verification failed');
      setInvalid(true);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!autoVerify || !canVerify || verifiedFromSnapshot || showVerified) return;
    if (lastAutoVerifiedEmail.current === trimmed.toLowerCase()) return;
    lastAutoVerifiedEmail.current = trimmed.toLowerCase();
    void runVerify();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when autofill sets a new valid email
  }, [autoVerify, canVerify, trimmed, verifiedFromSnapshot, showVerified]);

  return (
    <button
      type="button"
      onClick={() => void runVerify()}
      disabled={!canVerify || loading}
      title={
        showVerified
          ? 'Email verified'
          : invalid
            ? 'Verification failed — click to retry'
            : 'Verify email via Surepass'
      }
      className={`shrink-0 rounded-lg border border-border px-2 py-2 text-sm transition hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : showVerified ? (
        <Check className="h-4 w-4 text-emerald-600" />
      ) : invalid ? (
        <ShieldAlert className="h-4 w-4 text-amber-600" />
      ) : (
        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );
}

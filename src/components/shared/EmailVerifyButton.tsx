import { useState } from 'react';
import { Check, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { kycAPI } from '../../services/kyc.api';
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
}

export function EmailVerifyButton({
  email,
  persist,
  onVerified,
  onSnapshotSaved,
  onError,
  disabled = false,
  className = '',
}: EmailVerifyButtonProps) {
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [invalid, setInvalid] = useState(false);

  const trimmed = email.trim();
  const canVerify = Boolean(trimmed) && validateEmail(trimmed) && !disabled;

  const handleVerify = async () => {
    if (!canVerify || loading) return;

    setLoading(true);
    setVerified(false);
    setInvalid(false);

    try {
      const result = await kycAPI.verifyEmail(trimmed, persist);
      if (result.valid && result.accepts_mail) {
        setVerified(true);
        onVerified?.(result);
        onSnapshotSaved?.(result);
        return;
      }

      const message =
        result.is_temporary
          ? 'Temporary/disposable email address'
          : result.valid_syntax
            ? 'Email exists but may not accept mail'
            : 'Email could not be verified';
      setInvalid(true);
      onError?.(message);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Email verification failed';
      setInvalid(true);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleVerify()}
      disabled={!canVerify || loading}
      title={
        verified
          ? 'Email verified'
          : invalid
            ? 'Verification failed — click to retry'
            : 'Verify email via Surepass'
      }
      className={`shrink-0 rounded-lg border border-border px-2 py-2 text-sm transition hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : verified ? (
        <Check className="h-4 w-4 text-emerald-600" />
      ) : invalid ? (
        <ShieldAlert className="h-4 w-4 text-amber-600" />
      ) : (
        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );
}

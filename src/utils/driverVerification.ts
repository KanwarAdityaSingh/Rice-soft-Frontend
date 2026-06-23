/** Format driver identity verification timestamp for list/detail views. */
export function formatDriverVerifiedAt(date: string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** True when driver has a Surepass DL snapshot in verification_details. */
export function computeDriverVerifiedFromDetails(
  verificationDetails?: Record<string, unknown> | null,
): boolean {
  if (!verificationDetails || typeof verificationDetails !== 'object') return false;
  const snapshot = verificationDetails as { provider?: string; verified_at?: string };
  return snapshot.provider === 'surepass' && Boolean(snapshot.verified_at);
}

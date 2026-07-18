/** Helpers for Masters India e-invoice / e-way bill responses from the sales API. */

export const MASTERS_INDIA_PROVIDER = 'masters_india';

export function isMastersIndiaMockPayload(payload: unknown): boolean {
  if (payload == null || typeof payload !== 'object') return false;
  const p = payload as { mock?: boolean; provider?: string };
  if (p.mock === true) return true;
  return p.provider === 'mock';
}

export function getComplianceProviderLabel(payload: unknown): string {
  if (isMastersIndiaMockPayload(payload)) return 'Mock';
  if (payload != null && typeof payload === 'object') {
    const provider = (payload as { provider?: string }).provider;
    if (provider === MASTERS_INDIA_PROVIDER || provider === 'masters-india') {
      return 'Masters India';
    }
  }
  return 'Masters India';
}

/** Pull a human-readable error from Masters India / API error payloads. */
export function extractMastersIndiaErrorMessage(data: unknown, fallback = 'Request failed'): string {
  if (data == null) return fallback;
  if (typeof data === 'string' && data.trim()) return data.trim();
  if (typeof data !== 'object') return fallback;

  const obj = data as Record<string, unknown>;
  const candidates = [
    obj.message,
    obj.error,
    obj.error_message,
    obj.ErrorMessage,
    obj.errorMessage,
    (obj.data as Record<string, unknown> | undefined)?.message,
    (obj.data as Record<string, unknown> | undefined)?.error,
    (obj.results as Record<string, unknown> | undefined)?.message,
  ];

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }

  if (Array.isArray(obj.errors) && obj.errors.length > 0) {
    const first = obj.errors[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && typeof (first as { message?: string }).message === 'string') {
      return (first as { message: string }).message;
    }
  }

  return fallback;
}

export function extractApiErrorMessage(error: unknown, fallback = 'Request failed'): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: unknown; message?: string }).data;
    const base =
      typeof (error as { message?: string }).message === 'string'
        ? (error as { message: string }).message
        : fallback;
    if (data) return extractMastersIndiaErrorMessage(data, base);
  }
  if (error instanceof Error && error.message) return error.message;
  return extractMastersIndiaErrorMessage(error, fallback);
}

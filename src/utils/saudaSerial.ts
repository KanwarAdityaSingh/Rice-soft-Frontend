import type { Sauda } from '../types/entities';

/**
 * 1-based serial for a sauda in the canonical list order returned by `GET /saudas`
 * (same ordering as `useSaudas()` with no filters). Use this everywhere we show "S. No."
 * so the Saudas page and ISP dropdown stay aligned.
 */
export function getSaudaSerialNumber(saudaId: string, orderedSaudas: Sauda[]): number | null {
  const i = orderedSaudas.findIndex((s) => s.id === saudaId);
  return i >= 0 ? i + 1 : null;
}

/** Short UUID for tables and cards (first 4 chars); use `title={fullId}` for hover / copy context. */
export function formatSaudaIdShort(id: string): string {
  if (!id) return '—';
  return id.length > 4 ? `${id.slice(0, 4)}...` : id;
}

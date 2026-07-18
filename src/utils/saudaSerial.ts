import type { Sauda } from '../types/entities';

/** Date used for table sort — prefers sauda_date, falls back to created_at. */
export function getSaudaSortDate(sauda: Sauda): number {
  const iso = sauda.sauda_date?.trim() || sauda.created_at?.slice(0, 10) || '';
  if (!iso) return 0;
  const t = new Date(`${iso}T00:00:00`).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** Oldest sauda date first; same date → earliest created_at first. */
export function sortSaudasByDateAsc(saudas: Sauda[]): Sauda[] {
  return [...saudas].sort((a, b) => {
    const dateDiff = getSaudaSortDate(a) - getSaudaSortDate(b);
    if (dateDiff !== 0) return dateDiff;
    const createdA = new Date(a.created_at).getTime();
    const createdB = new Date(b.created_at).getTime();
    if (!Number.isNaN(createdA) && !Number.isNaN(createdB) && createdA !== createdB) {
      return createdA - createdB;
    }
    return a.id.localeCompare(b.id);
  });
}

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

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ProductRateHistoryPoint } from '../types/entities';

export interface ProductRateHistoryPdfMeta {
  productName: string;
  filtersSummary: string[];
  generatedAtLabel: string;
}

function safeFilenamePart(name: string): string {
  return (
    name
      .trim()
      .replace(/[/\\?%*:|"<>]/g, '-')
      .replace(/\s+/g, '_')
      .slice(0, 72) || 'product'
  );
}

/**
 * Rate text for PDF: ASCII-only prefix. Built-in PDF fonts omit U+20B9 (Rs),
 * which corrupted headers and amounts.
 */
function formatRateInrPlain(rate: number): string {
  const n = Number(rate);
  if (!Number.isFinite(n)) return '';
  return `Rs. ${n.toFixed(2)}`;
}

/** Effective date (YYYY-MM-DD) for PDF. */
function formatEffectiveDateForPdf(iso: string | null | undefined): string {
  if (!iso) return '-';
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toISOString().slice(0, 10);
  } catch {
    return iso;
  }
}

/** Saved-at timestamp suited to Helvetica / Western encoding. */
function formatWhenForPdf(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return iso;
  }
}

/** Build and trigger download of rate history as PDF (A4, table). */
export function downloadProductRateHistoryPdf(
  points: ProductRateHistoryPoint[],
  meta: ProductRateHistoryPdfMeta
): void {
  if (points.length === 0) return;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 14;
  const pageInnerW = doc.internal.pageSize.getWidth() - margin * 2;
  let y = 16;

  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('Product rate history', margin, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(meta.productName, margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setTextColor(80);
  for (const line of meta.filtersSummary) {
    const plain = line.replace(/\u2014/g, '-').replace(/\u2013/g, '-');
    doc.text(plain, margin, y);
    y += 4.5;
  }
  doc.text(meta.generatedAtLabel.replace(/\u2014/g, '-'), margin, y);
  y += 8;
  doc.setTextColor(0);

  const sorted = [...points].sort((a, b) => {
    const da = a.effective_date || '';
    const db = b.effective_date || '';
    if (da !== db) return da < db ? -1 : 1;
    return (a.created_at || '').localeCompare(b.created_at || '');
  });

  const head = [['Effective date', 'Bag (kg)', 'Rate (INR)', 'Saved at']];
  const body = sorted.map((row) => [
    formatEffectiveDateForPdf(row.effective_date),
    String(row.holding_capacity),
    formatRateInrPlain(Number(row.rate)),
    formatWhenForPdf(row.created_at),
  ]);

  autoTable(doc, {
    head,
    body,
    startY: y,
    tableWidth: pageInnerW,
    margin: { left: margin, right: margin },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 2.5,
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [66, 66, 66],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: pageInnerW * 0.24, halign: 'left' },
      1: { cellWidth: pageInnerW * 0.16, halign: 'right' },
      2: { cellWidth: pageInnerW * 0.24, halign: 'right' },
      3: { cellWidth: pageInnerW * 0.36, halign: 'left' },
    },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  const fname = `rate-history_${safeFilenamePart(meta.productName)}_${stamp}.pdf`;
  doc.save(fname);
}

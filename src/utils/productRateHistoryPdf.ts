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

/** Timestamp suited to Helvetica / Western encoding. */
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

  const head = [['When (local)', 'Bag (kg)', 'Rate (INR)']];
  const body = points.map((row) => [
    formatWhenForPdf(row.created_at),
    String(row.holding_capacity),
    formatRateInrPlain(Number(row.rate)),
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
      0: { cellWidth: pageInnerW * 0.46, halign: 'left' },
      1: { cellWidth: pageInnerW * 0.18, halign: 'right' },
      2: { cellWidth: pageInnerW * 0.36, halign: 'right' },
    },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  const fname = `rate-history_${safeFilenamePart(meta.productName)}_${stamp}.pdf`;
  doc.save(fname);
}

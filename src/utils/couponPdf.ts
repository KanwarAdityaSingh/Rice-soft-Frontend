import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { ExportCouponRow } from '../types/coupons';
import { formatRupeesPlain, formatIstDate } from './couponFormat';

export interface CouponPrintMeta {
  batchName: string;
  expiresAt?: string | null;
  redeemInstructions?: string;
}

const STICKER_W_MM = 85;
const STICKER_H_MM = 54;
const COLS = 2;
const ROWS = 5;
const PAGE_MARGIN = 10;
const GAP = 4;

async function qrDataUrl(text: string, sizePx = 120): Promise<string> {
  return QRCode.toDataURL(text, {
    width: sizePx,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
}

function drawCouponSticker(
  doc: jsPDF,
  x: number,
  y: number,
  row: ExportCouponRow,
  meta: CouponPrintMeta,
  qrImage: string
) {
  const w = STICKER_W_MM;
  const h = STICKER_H_MM;

  // Outer ticket border with scalloped feel
  doc.setDrawColor(124, 58, 237);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, 3, 3, 'S');

  // Gradient header band (simulated with two rects)
  doc.setFillColor(124, 58, 237);
  doc.rect(x, y, w, 12, 'F');
  doc.setFillColor(255, 107, 53);
  doc.rect(x + w * 0.6, y, w * 0.4, 12, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('RICE SOFT', x + 3, y + 5);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  const batchLabel =
    meta.batchName.length > 22
      ? meta.batchName.slice(0, 20) + '…'
      : meta.batchName;
  doc.text(batchLabel, x + 3, y + 9.5);

  // Cashback badge
  doc.setFillColor(255, 237, 213);
  doc.roundedRect(x + w - 28, y + 14, 25, 8, 2, 2, 'F');
  doc.setTextColor(194, 65, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(
    formatRupeesPlain(row.face_value_paise).replace('Rs. ', 'Rs '),
    x + w - 26,
    y + 19.5
  );

  // QR code
  doc.addImage(qrImage, 'PNG', x + 4, y + 14, 22, 22);

  // Coupon code — large monospace style
  doc.setTextColor(30, 27, 75);
  doc.setFontSize(14);
  doc.setFont('courier', 'bold');
  doc.text(row.code, x + 30, y + 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 120);
  doc.text('CASHBACK COUPON', x + 30, y + 18);

  // Instructions
  doc.setFontSize(5.5);
  doc.setTextColor(80, 80, 100);
  const instructions =
    meta.redeemInstructions ?? 'Scan QR or visit link to redeem';
  doc.text(instructions, x + 30, y + 30, { maxWidth: w - 34 });

  // Expiry
  const expiryText = meta.expiresAt
    ? `Valid till ${formatIstDate(meta.expiresAt)}`
    : 'No expiry';
  doc.setFontSize(5);
  doc.text(expiryText, x + 30, y + 36);

  // Perforated edge dots (decorative)
  doc.setFillColor(200, 200, 220);
  for (let i = 0; i < 8; i++) {
    doc.circle(x + 4 + i * 10, y + h - 3, 0.8, 'F');
  }

  // Small URL
  doc.setFontSize(4);
  doc.setTextColor(140, 140, 160);
  const urlShort =
    row.redeem_url.length > 48
      ? row.redeem_url.slice(0, 46) + '…'
      : row.redeem_url;
  doc.text(urlShort, x + 4, y + h - 5, { maxWidth: w - 8 });
}

/**
 * Generate A4 sheet PDF with 2×5 coupon stickers per page.
 */
export async function downloadCouponsPdf(
  coupons: ExportCouponRow[],
  meta: CouponPrintMeta,
  filename = 'coupons.pdf'
): Promise<void> {
  if (coupons.length === 0) return;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const perPage = COLS * ROWS;
  const cellW = STICKER_W_MM;
  const cellH = STICKER_H_MM;

  for (let i = 0; i < coupons.length; i++) {
    const indexOnPage = i % perPage;

    if (i > 0 && indexOnPage === 0) {
      doc.addPage();
    }

    const col = indexOnPage % COLS;
    const row = Math.floor(indexOnPage / COLS);
    const x = PAGE_MARGIN + col * (cellW + GAP);
    const y = PAGE_MARGIN + row * (cellH + GAP);

    const qr = await qrDataUrl(coupons[i].redeem_url, 140);
    drawCouponSticker(doc, x, y, coupons[i], meta, qr);
  }

  doc.save(filename);
}

/** Build export row from coupon + batch redeem base URL */
export function buildExportRow(
  code: string,
  faceValuePaise: number,
  redeemBaseUrl?: string | null
): ExportCouponRow {
  const base = (redeemBaseUrl ?? '').replace(/\/$/, '');
  const redeem_url = base
    ? `${base}?code=${encodeURIComponent(code)}`
    : code;
  return {
    code,
    redeem_url,
    face_value_paise: faceValuePaise,
    face_value_rupees: faceValuePaise / 100,
  };
}

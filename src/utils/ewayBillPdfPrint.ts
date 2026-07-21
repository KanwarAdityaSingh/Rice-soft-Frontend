import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import {
  BillOfSupplyDocument,
  BILL_OF_SUPPLY_GOOGLE_FONTS,
  BILL_OF_SUPPLY_STYLES,
} from '../components/sales/invoice-dispatches/pdf/BillOfSupplyDocument';
import type { BillOfSupplyViewModel } from './ewayBillPreviewData';

/** A4 at 96dpi — must match `.bos-page` width in BILL_OF_SUPPLY_STYLES */
const PDF_PAGE_WIDTH_PX = 794;
const PDF_PAGE_HEIGHT_PX = 1123;

function getAssetBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}

export function renderBillOfSupplyMarkup(
  data: BillOfSupplyViewModel,
  assetBaseUrl = getAssetBaseUrl(),
): string {
  return renderToStaticMarkup(
    createElement(BillOfSupplyDocument, { data, assetBaseUrl }),
  );
}

export function buildBillOfSupplyHtmlDocument(data: BillOfSupplyViewModel): string {
  const body = renderBillOfSupplyMarkup(data);
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="${BILL_OF_SUPPLY_GOOGLE_FONTS}" rel="stylesheet" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: #FAF9F7;
        width: ${PDF_PAGE_WIDTH_PX}px;
      }
      ${BILL_OF_SUPPLY_STYLES}
    </style>
  </head>
  <body>${body}</body>
</html>`;
}

async function waitForStylesheets(doc: Document): Promise<void> {
  const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
  await Promise.all(
    links.map(
      (link) =>
        new Promise<void>((resolve) => {
          const el = link as HTMLLinkElement;
          if (el.sheet) {
            resolve();
            return;
          }
          el.addEventListener('load', () => resolve(), { once: true });
          el.addEventListener('error', () => resolve(), { once: true });
          // Already cached
          setTimeout(() => resolve(), 2000);
        }),
    ),
  );
}

async function waitForFonts(doc: Document): Promise<void> {
  try {
    await doc.fonts?.ready;
    await Promise.all([
      doc.fonts.load('700 16px "Playfair Display"'),
      doc.fonts.load('700 12px "Playfair Display"'),
      doc.fonts.load('600 9px Montserrat'),
      doc.fonts.load('700 10px Montserrat'),
      doc.fonts.load('400 10px Montserrat'),
    ]);
  } catch {
    /* fall back to system fonts */
  }
}

async function waitForIframeReady(iframe: HTMLIFrameElement): Promise<HTMLElement> {
  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  if (!win || !doc) throw new Error('Failed to prepare PDF document');

  await new Promise<void>((resolve) => {
    if (doc.readyState === 'complete') resolve();
    else win.addEventListener('load', () => resolve(), { once: true });
  });

  await waitForStylesheets(doc);
  await waitForFonts(doc);

  await Promise.all(
    Array.from(doc.images).map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          }),
    ),
  );

  // Allow layout to settle after webfonts swap in
  await new Promise((resolve) => setTimeout(resolve, 700));

  const page = doc.querySelector('.bos-page');
  if (!page) throw new Error('Bill of Supply template not found');
  return page as HTMLElement;
}

function ensurePdfFilename(filename: string): string {
  const trimmed = filename.trim();
  if (!trimmed) return 'Bill-of-Supply.pdf';
  return trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
}

/** Renders Bill of Supply and downloads a multi-page A4 PDF when needed. */
export async function downloadBillOfSupplyPdf(
  data: BillOfSupplyViewModel,
  filename: string,
): Promise<void> {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  // Keep off-screen but renderable (visibility:hidden breaks some captures)
  iframe.style.position = 'fixed';
  iframe.style.left = '0';
  iframe.style.top = '0';
  iframe.style.width = `${PDF_PAGE_WIDTH_PX}px`;
  iframe.style.height = `${PDF_PAGE_HEIGHT_PX}px`;
  iframe.style.border = 'none';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-1';
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error('Failed to prepare PDF document');

    doc.open();
    doc.write(buildBillOfSupplyHtmlDocument(data));
    doc.close();

    const pageEl = await waitForIframeReady(iframe);
    // Re-measure after fonts so height matches painted layout
    const height = Math.ceil(
      Math.max(pageEl.scrollHeight, pageEl.offsetHeight, PDF_PAGE_HEIGHT_PX),
    );
    iframe.style.height = `${height}px`;
    await new Promise((resolve) => setTimeout(resolve, 100));

    const dataUrl = await toPng(pageEl, {
      pixelRatio: 2,
      cacheBust: true,
      width: PDF_PAGE_WIDTH_PX,
      height,
      backgroundColor: '#FAF9F7',
      style: {
        // Ensure capture uses the laid-out size, not compressed mm remnants
        width: `${PDF_PAGE_WIDTH_PX}px`,
        height: `${height}px`,
        margin: '0',
        transform: 'none',
      },
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidthMm = pdf.internal.pageSize.getWidth();
    const pageHeightMm = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(dataUrl);

    // Fit width to A4; slice vertically across pages (don't shrink the whole doc)
    const renderWidth = pageWidthMm;
    const renderHeight = (imgProps.height * renderWidth) / imgProps.width;
    const pages = Math.max(1, Math.ceil(renderHeight / pageHeightMm));

    for (let i = 0; i < pages; i++) {
      if (i > 0) pdf.addPage();
      const offsetY = -i * pageHeightMm;
      pdf.addImage(dataUrl, 'PNG', 0, offsetY, renderWidth, renderHeight);
    }

    pdf.save(ensurePdfFilename(filename));
  } finally {
    document.body.removeChild(iframe);
  }
}

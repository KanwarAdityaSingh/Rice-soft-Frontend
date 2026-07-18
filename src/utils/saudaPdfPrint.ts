import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { SaudaPurchaseOrderDocument, SAUDA_PDF_STYLES } from '../components/purchases/saudas/pdf/SaudaPurchaseOrderDocument';
import type { SaudaPdfViewModel } from './saudaPdfData';

const GOOGLE_FONTS =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Montserrat:wght@400;500;600&display=swap';

const PDF_PAGE_WIDTH_PX = 794;

function getAssetBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}

export function renderSaudaPurchaseOrderMarkup(data: SaudaPdfViewModel, assetBaseUrl = getAssetBaseUrl()): string {
  return renderToStaticMarkup(
    createElement(SaudaPurchaseOrderDocument, { data, assetBaseUrl }),
  );
}

export function buildSaudaPurchaseOrderHtmlDocument(data: SaudaPdfViewModel): string {
  const body = renderSaudaPurchaseOrderMarkup(data);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="${GOOGLE_FONTS}" rel="stylesheet" />
    <style>${SAUDA_PDF_STYLES}</style>
  </head>
  <body>${body}</body>
</html>`;
}

async function waitForIframeReady(iframe: HTMLIFrameElement): Promise<HTMLElement> {
  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  if (!win || !doc) {
    throw new Error('Failed to prepare PDF document');
  }

  await new Promise<void>((resolve) => {
    if (doc.readyState === 'complete') resolve();
    else win.addEventListener('load', () => resolve(), { once: true });
  });

  try {
    await doc.fonts?.ready;
  } catch {
    /* ignore font load errors — fall back to system fonts */
  }

  await Promise.all(
    Array.from(doc.images).map(
      (img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener('load', () => resolve(), { once: true });
              img.addEventListener('error', () => resolve(), { once: true });
            }),
    ),
  );

  // Brief pause so layout/fonts settle after load
  await new Promise((resolve) => setTimeout(resolve, 400));

  const page = doc.querySelector('.sauda-po-page');
  if (!page) {
    throw new Error('PDF template not found');
  }
  return page as HTMLElement;
}

function ensurePdfFilename(filename: string): string {
  const trimmed = filename.trim();
  if (!trimmed) return 'Sauda.pdf';
  return trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
}

/** Renders the purchase order and triggers a direct browser file download (no print dialog). */
export async function downloadSaudaPurchaseOrderPdf(
  data: SaudaPdfViewModel,
  filename: string,
): Promise<void> {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = `${PDF_PAGE_WIDTH_PX}px`;
  iframe.style.height = '1400px';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error('Failed to prepare PDF document');

    doc.open();
    doc.write(buildSaudaPurchaseOrderHtmlDocument(data));
    doc.close();

    const pageEl = await waitForIframeReady(iframe);
    const height = Math.max(pageEl.scrollHeight, pageEl.offsetHeight);

    const dataUrl = await toPng(pageEl, {
      pixelRatio: 2,
      cacheBust: true,
      width: PDF_PAGE_WIDTH_PX,
      height,
      backgroundColor: '#FBF9F5',
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidthMm = pdf.internal.pageSize.getWidth();
    const pageHeightMm = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(dataUrl);
    const scale = Math.min(pageWidthMm / imgProps.width, pageHeightMm / imgProps.height);
    const renderWidth = imgProps.width * scale;
    const renderHeight = imgProps.height * scale;

    pdf.addImage(dataUrl, 'PNG', 0, 0, renderWidth, renderHeight);
    pdf.save(ensurePdfFilename(filename));
  } finally {
    document.body.removeChild(iframe);
  }
}

/** @deprecated Use downloadSaudaPurchaseOrderPdf — kept as alias for any external callers */
export const printSaudaPurchaseOrderPdf = downloadSaudaPurchaseOrderPdf;

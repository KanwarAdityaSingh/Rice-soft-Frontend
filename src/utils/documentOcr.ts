export const DOCUMENT_OCR_ACCEPT = 'image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf';
export const DOCUMENT_OCR_IMAGE_TYPES = ['image/jpeg', 'image/png'];
export const DOCUMENT_OCR_MAX_BYTES = 10 * 1024 * 1024;
/** Shown in OCR upload UI — matches backend accepted types and size limit. */
export const DOCUMENT_OCR_FILE_HINT = 'JPEG, PNG, or PDF · 10 MB max';
/** Surepass GST OCR upload guidance — flat, legible certificate with GSTIN visible. */
export const GST_OCR_UPLOAD_HINT =
  'Use a clear, flat scan or photo of the full GST registration certificate (GSTIN fully visible).';

export function validateDocumentOcrFile(file: File): string | null {
  const isImage = DOCUMENT_OCR_IMAGE_TYPES.includes(file.type);
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isImage && !isPdf) {
    return 'Upload a JPEG, PNG, or PDF file.';
  }
  if (file.size > DOCUMENT_OCR_MAX_BYTES) {
    return 'File must be 10 MB or smaller.';
  }
  return null;
}

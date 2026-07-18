export const DOCUMENT_OCR_ACCEPT = 'image/jpeg,image/png,.jpg,.jpeg,.png';
export const DOCUMENT_OCR_IMAGE_TYPES = ['image/jpeg', 'image/png'];
export const DOCUMENT_OCR_MAX_BYTES = 10 * 1024 * 1024;
/** Shown in OCR upload UI — matches backend accepted types and size limit. */
export const DOCUMENT_OCR_FILE_HINT = 'JPEG or PNG · 10 MB max';
/** Surepass GST OCR upload guidance — flat, legible certificate with GSTIN visible. */
export const GST_OCR_UPLOAD_HINT =
  'Use a clear, flat scan or photo of the full GST registration certificate (GSTIN fully visible).';

export function validateDocumentOcrFile(file: File): string | null {
  const isImage =
    DOCUMENT_OCR_IMAGE_TYPES.includes(file.type) ||
    /\.(jpe?g|png)$/i.test(file.name);
  if (!isImage) {
    return 'Upload a JPEG or PNG image.';
  }
  if (file.size > DOCUMENT_OCR_MAX_BYTES) {
    return 'File must be 10 MB or smaller.';
  }
  return null;
}

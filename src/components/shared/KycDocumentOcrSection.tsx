import { useState } from 'react';
import { kycAPI } from '../../services/kyc.api';
import { DOCUMENT_OCR_FILE_HINT, GST_OCR_UPLOAD_HINT } from '../../utils/documentOcr';
import {
  buildGstOcrQualityWarnings,
  resolveBusinessNameFromGstOcr,
  resolveGstNumberFromOcr,
} from '../../utils/documentOcrFields';
import type { AadhaarOcrResponse, GstOcrResponse, PanOcrResponse } from '../../types/entities';
import { DocumentOcrUpload } from './DocumentOcrUpload';

export type KycOcrDocumentType = 'gst' | 'pan' | 'aadhaar';

const OCR_COPY: Record<
  KycOcrDocumentType,
  { title: string; hint: string; success: string; failure: string }
> = {
  gst: {
    title: 'Scan GST certificate (OCR)',
    hint: `${GST_OCR_UPLOAD_HINT} Prefills GSTIN — use Verify for full validation. ${DOCUMENT_OCR_FILE_HINT}.`,
    success: 'GST certificate scanned',
    failure: 'Could not read GST certificate',
  },
  pan: {
    title: 'Scan PAN card (OCR)',
    hint: `Upload the PAN card image or PDF. Prefills PAN and name — use Verify for full validation. ${DOCUMENT_OCR_FILE_HINT}.`,
    success: 'PAN card scanned',
    failure: 'Could not read PAN card',
  },
  aadhaar: {
    title: 'Scan Aadhaar card (OCR)',
    hint: `Upload the Aadhaar card image or PDF. Prefills Aadhaar number and name — use Verify for full validation. ${DOCUMENT_OCR_FILE_HINT}.`,
    success: 'Aadhaar card scanned',
    failure: 'Could not read Aadhaar card',
  },
};

interface KycDocumentOcrSectionProps {
  docs: KycOcrDocumentType[];
  disabled?: boolean;
  onGstResult?: (result: GstOcrResponse) => void;
  onPanResult?: (result: PanOcrResponse) => void;
  onAadhaarResult?: (result: AadhaarOcrResponse) => void;
  onSuccess: (title: string, message: string) => void;
  onError: (title: string, message: string) => void;
}

export function KycDocumentOcrSection({
  docs,
  disabled = false,
  onGstResult,
  onPanResult,
  onAadhaarResult,
  onSuccess,
  onError,
}: KycDocumentOcrSectionProps) {
  const [scanning, setScanning] = useState<KycOcrDocumentType | null>(null);

  const runScan = async (doc: KycOcrDocumentType, file: File) => {
    const copy = OCR_COPY[doc];
    const usePdf = file.type === 'application/pdf';

    setScanning(doc);
    try {
      if (doc === 'gst') {
        const result = await kycAPI.ocrGstin(file);
        onGstResult?.(result);
        onSuccess(copy.success, buildGstMessage(result));
        return;
      }
      if (doc === 'pan') {
        const result = await kycAPI.ocrPan(file, { usePdf });
        onPanResult?.(result);
        onSuccess(copy.success, buildPanMessage(result));
        return;
      }
      const result = await kycAPI.ocrAadhaar(file);
      onAadhaarResult?.(result);
      onSuccess(copy.success, buildAadhaarMessage(result));
    } catch (error: unknown) {
      onError(
        copy.failure,
        error instanceof Error ? error.message : 'Try again or enter details manually.',
      );
    } finally {
      setScanning(null);
    }
  };

  if (docs.length === 0) return null;

  return (
    <div className="space-y-3">
      {docs.map((doc) => (
        <DocumentOcrUpload
          key={doc}
          title={OCR_COPY[doc].title}
          hint={OCR_COPY[doc].hint}
          scanning={scanning === doc}
          disabled={disabled || (scanning !== null && scanning !== doc)}
          onScan={(file) => void runScan(doc, file)}
        />
      ))}
    </div>
  );
}

function buildGstMessage(result: GstOcrResponse): string {
  const gst = resolveGstNumberFromOcr(result);
  const name = resolveBusinessNameFromGstOcr(result);
  const parts = [name, gst].filter(Boolean);
  const base =
    parts.length > 0
      ? `${parts.join(' · ')} — review prefilled fields.`
      : 'Review prefilled fields, then Verify for full validation.';

  const warnings = buildGstOcrQualityWarnings(result);
  return warnings.length > 0 ? `${base} ${warnings.join(' ')}` : base;
}

function buildPanMessage(result: PanOcrResponse): string {
  const name = (result.full_name ?? result.name)?.trim();
  const pan = result.pan_number?.trim();
  const parts = [name, pan].filter(Boolean);
  return parts.length > 0
    ? `${parts.join(' · ')} — review prefilled fields.`
    : 'Review prefilled fields, then Verify for full validation.';
}

function buildAadhaarMessage(result: AadhaarOcrResponse): string {
  const name = (result.full_name ?? result.name)?.trim();
  const aadhaar = (result.aadhaar_number ?? result.aadhar_number ?? result.uid)?.replace(/\s/g, '');
  const masked = aadhaar && aadhaar.length >= 4 ? `XXXX XXXX ${aadhaar.slice(-4)}` : null;
  const parts = [name, masked].filter(Boolean);
  return parts.length > 0
    ? `${parts.join(' · ')} — review prefilled fields.`
    : 'Review prefilled fields, then Verify for full validation.';
}

// Error handling utilities
export interface AppError {
  message: string;
  code?: string;
  status?: number;
}

const KNOWN_API_ERROR_MESSAGES: Array<{ match: RegExp; message: string }> = [
  {
    match: /vehicle number already exists/i,
    message:
      'This vehicle number is already registered. Use a different number or edit the existing vehicle from the list.',
  },
  {
    match: /pan number already exists|pan already exists/i,
    message: 'This PAN number is already registered to another record.',
  },
  {
    match: /gst number already exists|gst already exists/i,
    message: 'This GST number is already registered to another record.',
  },
  {
    match: /aadhaar number already exists|aadhar number already exists|aadhaar already exists|aadhar already exists/i,
    message: 'This Aadhaar number is already registered to another record.',
  },
  {
    match: /transporter.*(already exists|duplicate)|already.*transporter/i,
    message: 'This transporter is already registered. Use a different GST/PAN/Aadhaar or edit the existing transporter.',
  },
  {
    match: /violates foreign key constraint.*vehicle|vehicle.*violates foreign key|inward_slip_pass.*vehicle_id|vehicle_id.*inward_slip_pass/i,
    message:
      'This vehicle cannot be deleted because it is linked to inward slip passes or other records. Remove those links first.',
  },
];

function extractErrorDetail(raw: unknown): string {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  const prefixed = trimmed.match(/^Error:\s*([^\n]+)/);
  if (prefixed?.[1]) return prefixed[1].trim();
  return trimmed.split('\n')[0]?.trim() ?? '';
}

function collectApiErrorTexts(error: any): string[] {
  const values = [
    error?.data?.error,
    error?.error,
    error?.data?.message,
    error?.message,
    error?.response?.data?.error,
    error?.response?.data?.message,
  ];

  return values
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .flatMap((value) => [value, extractErrorDetail(value)])
    .filter((value, index, array) => value && array.indexOf(value) === index);
}

/** Prefer a specific backend/DAO message over generic API wrappers. */
export function getUserFacingApiErrorMessage(error: any, fallback = 'An unexpected error occurred'): string {
  const texts = collectApiErrorTexts(error);
  const combined = texts.join(' ');

  for (const { match, message } of KNOWN_API_ERROR_MESSAGES) {
    if (match.test(combined)) return message;
  }

  for (const text of texts) {
    const detail = extractErrorDetail(text);
    if (detail && detail !== 'An unexpected error occurred') {
      return detail;
    }
  }

  return texts[0] || fallback;
}

function isVehicleDeleteBlockedError(error: unknown): boolean {
  const combined = collectApiErrorTexts(error).join(' ');
  return /foreign key constraint|inward_slip_pass|vehicle_id|cannot delete vehicle|vehicle.*(in use|linked|referenced)/i.test(
    combined,
  );
}

/** Build a user-facing delete error, optionally including linked ISP lines already loaded in the UI. */
export function getVehicleDeleteErrorMessage(
  error: unknown,
  options?: {
    linkedIspLines?: string[];
    fallback?: string;
  },
): string {
  const ispLines = options?.linkedIspLines?.filter(Boolean) ?? [];
  if (ispLines.length > 0) {
    const ispCount = ispLines.length;
    const ispText = ispCount === 1 ? 'inward slip pass' : 'inward slip passes';
    return `This vehicle cannot be deleted because it is used in ${ispCount} ${ispText}:\n\n${ispLines.join('\n')}\n\nPlease remove the vehicle from all inward slip passes before deleting.`;
  }

  if (isVehicleDeleteBlockedError(error)) {
    return getUserFacingApiErrorMessage(
      error,
      'This vehicle cannot be deleted because it is linked to other records. Remove those links first.',
    );
  }

  return getUserFacingApiErrorMessage(error, options?.fallback ?? 'Failed to delete vehicle. Please try again.');
}

export class ErrorHandler {
  static handleApiError(error: any): AppError {
    if (error.status && error.message) {
      // This is an ApiError from our service
      return {
        message: error.message,
        code: error.data?.code,
        status: error.status,
      };
    }

    if (error.response) {
      // Axios-like error
      return {
        message: error.response.data?.message || 'An error occurred',
        code: error.response.data?.code,
        status: error.response.status,
      };
    }

    if (error.request) {
      // Network error
      return {
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
        status: 0,
      };
    }

    // Generic error
    return {
      message: error.message || 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    };
  }

  static getErrorMessage(error: any): string {
    return getUserFacingApiErrorMessage(error);
  }

  static isNetworkError(error: any): boolean {
    return error.status === 0 || error.code === 'NETWORK_ERROR';
  }

  static isAuthError(error: any): boolean {
    return error.status === 401 || error.status === 403;
  }
}

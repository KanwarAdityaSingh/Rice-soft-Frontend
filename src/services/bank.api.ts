import { apiService } from './api';

export interface IFSCLookupResponse {
  ifsc_details: {
    ifsc_code: string;
    bank_name: string;
    branch: string;
    address?: string;
    city?: string;
    district?: string;
    state?: string;
    contact?: string;
    micr_code?: string;
    swift_code?: string;
    supports?: {
      imps?: boolean;
      rtgs?: boolean;
      neft?: boolean;
      upi?: boolean;
    };
  };
  bank_details: {
    bank_name: string;
    branch: string;
    ifsc_code: string;
  };
}

export interface IFSCValidationResponse {
  ifsc_code: string;
  is_valid: boolean;
  message: string;
}

export const bankAPI = {
  // Lookup IFSC code to get bank details
  lookupIFSC: (ifscCode: string) => {
    return apiService.get<IFSCLookupResponse>(`/bank/lookupIFSC?ifsc=${ifscCode}`);
  },

  // Validate IFSC format
  validateIFSC: (ifscCode: string) => {
    return apiService.get<IFSCValidationResponse>(`/bank/validateIFSC?ifsc=${ifscCode}`);
  },
};


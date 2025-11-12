import { apiService } from './api';
import type { PincodeLookupData } from '../types/entities';

export const pincodeAPI = {
  /**
   * Lookup pincode and get post office details
   * @param pincode - 6 digit pincode string
   * @returns Pincode lookup data with address details
   */
  lookupPincode: (pincode: string): Promise<PincodeLookupData> => {
    if (!/^\d{6}$/.test(pincode)) {
      return Promise.reject(new Error('Pincode must be exactly 6 digits'));
    }
    return apiService.get<PincodeLookupData>(`/pincode/lookup?pincode=${pincode}`);
  },
};


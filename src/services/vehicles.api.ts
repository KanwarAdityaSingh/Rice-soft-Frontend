import { apiService } from './api';
import { kycAPI } from './kyc.api';
import type {
  Vehicle,
  CreateVehicleRequest,
  UpdateVehicleRequest,
  RcChallanDetailsRequest,
  VehicleVerificationResponse,
  KycPersistContext,
} from '../types/entities';

export interface GetAllVehiclesOptions {
  transporterId?: string;
  /** When true, returns active + inactive. Default list is active only. */
  includeInactive?: boolean;
  /** When false, returns inactive only. Ignored if includeInactive is true. */
  isActive?: boolean;
  excludeVerificationDetails?: boolean;
}

export const vehiclesAPI = {
  // Get all vehicles — active only by default (same pattern as transporters)
  getAllVehicles: (options?: GetAllVehiclesOptions) => {
    const params = new URLSearchParams();
    if (options?.transporterId) params.append('transporter_id', options.transporterId);
    if (options?.includeInactive) {
      params.append('include_inactive', 'true');
    } else if (options?.isActive === false) {
      params.append('is_active', 'false');
    }
    if (options?.excludeVerificationDetails) {
      params.append('exclude_verification_details', 'true');
    }
    const query = params.toString();
    const url = query ? `/vehicles?${query}` : '/vehicles';
    return apiService.get<Vehicle[]>(url);
  },

  // Get vehicle by ID
  getVehicleById: (id: string) => {
    return apiService.get<Vehicle>(`/vehicles/${id}`);
  },

  // Get vehicle by vehicle number
  getVehicleByNumber: (vehicleNumber: string) => {
    return apiService.get<Vehicle>(`/vehicles/byNumber/${encodeURIComponent(vehicleNumber)}`);
  },

  // Verify vehicle via Surepass (persists snapshot when vehicle_id is sent or record exists)
  verifyVehicle: (vehicleNumber: string, vehicleId?: string) => {
    return apiService.post<VehicleVerificationResponse & { surepass_response?: unknown }>(
      '/vehicles/verify',
      {
        vehicle_number: vehicleNumber,
        ...(vehicleId ? { vehicle_id: vehicleId } : {}),
      },
    );
  },

  /** Fetch RC challan details via Surepass (/kyc/rc/challan-details) */
  fetchRcChallanDetails: (payload: RcChallanDetailsRequest, persist?: KycPersistContext) =>
    kycAPI.lookupRcChallanDetails(payload, persist),

  /** RC full lookup via Surepass (/kyc/rc/full) */
  lookupRcFull: (idNumber: string, persist?: KycPersistContext) =>
    kycAPI.lookupRcFull(idNumber, persist),

  // Create vehicle
  createVehicle: (data: CreateVehicleRequest) => {
    return apiService.post<Vehicle>('/vehicles', data);
  },

  // Update vehicle
  updateVehicle: (id: string, data: UpdateVehicleRequest) => {
    return apiService.put<Vehicle>(`/vehicles/${id}`, data);
  },

  // Hard delete vehicle (blocked when linked to inward slip passes)
  deleteVehicle: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/vehicles/${id}`);
  },
};

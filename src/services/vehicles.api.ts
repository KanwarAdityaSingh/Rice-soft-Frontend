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

export const vehiclesAPI = {
  // Get all vehicles with optional filters
  getAllVehicles: (transporterId?: string, isActive?: boolean) => {
    let url = '/vehicles';
    const params = new URLSearchParams();
    if (transporterId) params.append('transporter_id', transporterId);
    if (isActive !== undefined) params.append('is_active', String(isActive));
    if (params.toString()) url += `?${params.toString()}`;
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

  // Create vehicle
  createVehicle: (data: CreateVehicleRequest) => {
    return apiService.post<Vehicle>('/vehicles', data);
  },

  // Update vehicle
  updateVehicle: (id: string, data: UpdateVehicleRequest) => {
    return apiService.put<Vehicle>(`/vehicles/${id}`, data);
  },

  // Delete vehicle (soft delete)
  deleteVehicle: (id: string) => {
    return apiService.delete<{ success: boolean; message: string }>(`/vehicles/${id}`);
  },
};


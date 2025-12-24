import { useState, useEffect, useCallback } from 'react';
import { vehiclesAPI } from '../services/vehicles.api';
import type { Vehicle } from '../types/entities';

export function useVehicles(transporterId?: string, isActive?: boolean) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await vehiclesAPI.getAllVehicles(transporterId, isActive);
      setVehicles(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch vehicles');
    } finally {
      setLoading(false);
    }
  }, [transporterId, isActive]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  return { vehicles, loading, error, refetch: fetchVehicles };
}

// Hook to get a single vehicle by ID
export function useVehicle(vehicleId: string | null | undefined) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicle = useCallback(async () => {
    if (!vehicleId) {
      setVehicle(null);
      return;
    }
    try {
      setLoading(true);
      const data = await vehiclesAPI.getVehicleById(vehicleId);
      setVehicle(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch vehicle');
      setVehicle(null);
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    fetchVehicle();
  }, [fetchVehicle]);

  return { vehicle, loading, error, refetch: fetchVehicle };
}

// Utility hook for vehicle lookup map
export function useVehicleMap() {
  const { vehicles, loading, error, refetch } = useVehicles(undefined, true);
  
  const vehicleMap = vehicles.reduce((acc, vehicle) => {
    acc[vehicle.id] = vehicle;
    return acc;
  }, {} as Record<string, Vehicle>);

  const getVehicleNumber = (vehicleId: string | null | undefined): string => {
    if (!vehicleId) return '-';
    return vehicleMap[vehicleId]?.vehicle_number || '-';
  };

  const getVehicle = (vehicleId: string | null | undefined): Vehicle | null => {
    if (!vehicleId) return null;
    return vehicleMap[vehicleId] || null;
  };

  return { 
    vehicles, 
    vehicleMap, 
    getVehicleNumber, 
    getVehicle,
    loading, 
    error, 
    refetch 
  };
}


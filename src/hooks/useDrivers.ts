import { useState, useEffect, useCallback } from 'react';
import { driversAPI, type GetAllDriversOptions } from '../services/drivers.api';
import type { Driver } from '../types/entities';

export function useDrivers(options?: boolean | GetAllDriversOptions) {
  const includeInactive = typeof options === 'boolean' ? options : options?.includeInactive ?? false;
  const isVerified = typeof options === 'boolean' ? undefined : options?.isVerified;
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await driversAPI.getAllDrivers({ includeInactive, isVerified });
      setDrivers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch drivers');
    } finally {
      setLoading(false);
    }
  }, [includeInactive, isVerified]);

  useEffect(() => {
    void fetchDrivers();
  }, [fetchDrivers]);

  return { drivers, loading, error, refetch: fetchDrivers };
}

export function useDriver(driverId: string | null | undefined) {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDriver = useCallback(async () => {
    if (!driverId) {
      setDriver(null);
      return;
    }
    try {
      setLoading(true);
      const data = await driversAPI.getDriverById(driverId);
      setDriver(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch driver');
      setDriver(null);
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    void fetchDriver();
  }, [fetchDriver]);

  return { driver, loading, error, refetch: fetchDriver };
}

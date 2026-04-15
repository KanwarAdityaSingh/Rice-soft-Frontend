import { useState, useEffect, useCallback } from 'react';
import { driversAPI } from '../services/drivers.api';
import type { Driver } from '../types/entities';

export function useDrivers(includeInactive?: boolean) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await driversAPI.getAllDrivers(includeInactive);
      setDrivers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch drivers');
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

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

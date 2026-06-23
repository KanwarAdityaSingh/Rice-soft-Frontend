import { useCallback, useEffect, useState } from 'react';
import { inwardSlipPassesAPI } from '../services/inwardSlipPasses.api';
import { riceCodesAPI } from '../services/riceCodes.api';
import { saudasAPI } from '../services/saudas.api';
import type { InwardSlipPass, RiceCode, RiceType, Sauda } from '../types/entities';

interface UseVehicleIspReferenceDataOptions {
  /** When false, skips fetching until enabled (e.g. after vehicles list loads). */
  enabled?: boolean;
}

/**
 * ISP / sauda / rice reference data for vehicle linked-ISP UI.
 * Loaded lazily so the vehicles list request is not competing with 4 other large GETs.
 */
export function useVehicleIspReferenceData(options: UseVehicleIspReferenceDataOptions = {}) {
  const { enabled = true } = options;
  const [inwardSlipPasses, setInwardSlipPasses] = useState<InwardSlipPass[]>([]);
  const [saudas, setSaudas] = useState<Sauda[]>([]);
  const [riceCodes, setRiceCodes] = useState<RiceCode[]>([]);
  const [riceTypes, setRiceTypes] = useState<RiceType[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReferenceData = useCallback(async () => {
    if (loaded || loading) return;
    setLoading(true);
    setError(null);
    try {
      const [isps, saudaList, codes, types] = await Promise.all([
        inwardSlipPassesAPI.getAllInwardSlipPasses(),
        saudasAPI.getAllSaudas(),
        riceCodesAPI.getAllRiceCodes(),
        riceCodesAPI.getRiceTypes(),
      ]);
      setInwardSlipPasses(isps);
      setSaudas(saudaList);
      setRiceCodes(codes);
      setRiceTypes(types);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ISP reference data');
    } finally {
      setLoading(false);
    }
  }, [loaded, loading]);

  useEffect(() => {
    if (!enabled) return;
    void fetchReferenceData();
  }, [enabled, fetchReferenceData]);

  return {
    inwardSlipPasses,
    saudas,
    riceCodes,
    riceTypes,
    loading,
    loaded,
    error,
    refetch: fetchReferenceData,
  };
}

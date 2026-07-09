import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Vehicle } from '../api/types';

const BACKGROUND_REFRESH_MS = 5 * 60 * 1000;

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.vehicles.list();
      setVehicles(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Hält die Ansicht aktuell, falls z.B. übers Handy gebucht/eingetragen wurde,
  // ohne bei jedem Tick den "lädt…"-Zustand aufflackern zu lassen.
  useEffect(() => {
    const id = setInterval(() => reload(true), BACKGROUND_REFRESH_MS);
    return () => clearInterval(id);
  }, [reload]);

  return { vehicles, loading, error, reload };
}

import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Workshop } from '../api/types';

export function useWorkshops() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await api.workshops.list();
    setWorkshops(data);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { workshops, loading, reload };
}

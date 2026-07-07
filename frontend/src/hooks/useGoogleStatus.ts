import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { GoogleStatus } from '../api/types';

export function useGoogleStatus() {
  const [status, setStatus] = useState<GoogleStatus>({ configured: false, connected: false });

  const reload = useCallback(async () => {
    try {
      setStatus(await api.google.status());
    } catch {
      setStatus({ configured: false, connected: false });
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { status, reload };
}

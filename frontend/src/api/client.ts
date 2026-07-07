import type { CostsResponse, GoogleStatus, Vehicle, Workshop } from './types';

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`${options?.method ?? 'GET'} ${path} failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  vehicles: {
    list: () => req<Vehicle[]>('/vehicles'),
    get: (id: number) => req<Vehicle>(`/vehicles/${id}`),
    create: (body: Partial<Vehicle>) => req<Vehicle>('/vehicles', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: Partial<Vehicle>) =>
      req<Vehicle>(`/vehicles/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    remove: (id: number) => req<void>(`/vehicles/${id}`, { method: 'DELETE' }),
  },
  maintenance: {
    create: (vehicleId: number, body: Record<string, unknown>) =>
      req(`/vehicles/${vehicleId}/maintenance`, { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: Record<string, unknown>) =>
      req(`/maintenance/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    remove: (id: number) => req<void>(`/maintenance/${id}`, { method: 'DELETE' }),
  },
  odometer: {
    add: (vehicleId: number, value: number) =>
      req(`/vehicles/${vehicleId}/odometer`, { method: 'POST', body: JSON.stringify({ value }) }),
  },
  workshops: {
    list: () => req<Workshop[]>('/workshops'),
    create: (body: Partial<Workshop>) => req<Workshop>('/workshops', { method: 'POST', body: JSON.stringify(body) }),
  },
  documents: {
    upload: async (vehicleId: number, file: File) => {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/vehicles/${vehicleId}/documents`, { method: 'POST', body: form });
      if (!res.ok) throw new Error('upload failed');
      return res.json();
    },
    remove: (id: number) => req<void>(`/documents/${id}`, { method: 'DELETE' }),
    fileUrl: (id: number) => `/api/documents/${id}/file`,
  },
  costs: {
    get: (year: number) => req<CostsResponse>(`/costs?year=${year}`),
  },
  google: {
    status: () => req<GoogleStatus>('/auth/google/status'),
    disconnect: () => req<void>('/auth/google/disconnect', { method: 'POST' }),
    startUrl: '/api/auth/google/start',
  },
  push: {
    publicKey: () => req<{ publicKey: string }>('/push/public-key'),
    subscribe: (sub: PushSubscriptionJSON) => req('/push/subscribe', { method: 'POST', body: JSON.stringify(sub) }),
    test: () => req('/push/test', { method: 'POST' }),
  },
};

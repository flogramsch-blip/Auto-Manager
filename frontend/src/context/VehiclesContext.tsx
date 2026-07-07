import React, { createContext, useContext } from 'react';
import { useVehicles } from '../hooks/useVehicles';

type VehiclesContextValue = ReturnType<typeof useVehicles>;

const VehiclesContext = createContext<VehiclesContextValue | null>(null);

export function VehiclesProvider({ children }: { children: React.ReactNode }) {
  const value = useVehicles();
  return <VehiclesContext.Provider value={value}>{children}</VehiclesContext.Provider>;
}

export function useVehiclesContext(): VehiclesContextValue {
  const ctx = useContext(VehiclesContext);
  if (!ctx) throw new Error('useVehiclesContext must be used within VehiclesProvider');
  return ctx;
}

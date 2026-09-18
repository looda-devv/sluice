import { createContext, useContext } from 'react';
import type { Assumptions, Repair } from '../types';
import type { NetworkState } from './types';

export interface NetworkContextValue extends NetworkState {
  assumptions: Assumptions;
  setAssumptions: (next: Assumptions) => void;
  resetAssumptions: () => void;
  addRepair: (repair: Omit<Repair, 'id'>) => void;
  removeRepair: (id: string) => void;
  getZone: (dmaId: string) => NetworkState['zones'][number] | undefined;
}

export const NetworkContext = createContext<NetworkContextValue | null>(null);

export function useNetwork(): NetworkContextValue {
  const value = useContext(NetworkContext);
  if (!value) {
    throw new Error('useNetwork must be used inside a NetworkProvider');
  }
  return value;
}

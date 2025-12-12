/**
 * TwinOverlayContext - Single source of truth for overlay state
 * Controls all visual layers of the 3D Digital Twin
 * 
 * ARCHITECTURAL DECISION: Only ONE overlay control bar exists
 * It lives inside the 3D Digital Twin panel and controls all visual layers
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

/**
 * Canonical overlay types - unified across the entire system
 * NO duplicates, NO aliases, NO context-specific variants
 */
export type TwinOverlay =
  | 'none'
  | 'thermal'
  | 'power'
  | 'cooling'
  | 'gpu'
  | 'network'
  | 'workload'
  | 'sovereignty'
  | 'carbon';

// Map legacy aliases to canonical types
const overlayAliases: Record<string, TwinOverlay> = {
  'pue': 'power',
};

export interface TwinOverlayState {
  activeOverlay: TwinOverlay;
  setOverlay: (overlay: TwinOverlay) => void;
  toggleOverlay: (overlay: TwinOverlay) => void;
}

const TwinOverlayContext = createContext<TwinOverlayState | null>(null);

interface TwinOverlayProviderProps {
  children: ReactNode;
  defaultOverlay?: TwinOverlay;
}

export function TwinOverlayProvider({ 
  children, 
  defaultOverlay = 'thermal' 
}: TwinOverlayProviderProps) {
  const [activeOverlay, setActiveOverlayState] = useState<TwinOverlay>(defaultOverlay);

  const setOverlay = useCallback((overlay: TwinOverlay) => {
    // Normalize any aliases to canonical types
    const normalized = overlayAliases[overlay] || overlay;
    setActiveOverlayState(normalized);
  }, []);

  const toggleOverlay = useCallback((overlay: TwinOverlay) => {
    const normalized = overlayAliases[overlay] || overlay;
    setActiveOverlayState(prev => prev === normalized ? 'none' : normalized);
  }, []);

  return (
    <TwinOverlayContext.Provider value={{ activeOverlay, setOverlay, toggleOverlay }}>
      {children}
    </TwinOverlayContext.Provider>
  );
}

export function useTwinOverlay(): TwinOverlayState {
  const context = useContext(TwinOverlayContext);
  if (!context) {
    throw new Error('useTwinOverlay must be used within a TwinOverlayProvider');
  }
  return context;
}

/**
 * Hook for components that may be outside the provider
 * Returns safe defaults instead of throwing
 */
export function useTwinOverlaySafe(): TwinOverlayState {
  const context = useContext(TwinOverlayContext);
  return context ?? {
    activeOverlay: 'thermal',
    setOverlay: () => {},
    toggleOverlay: () => {},
  };
}

/**
 * Overlay metadata for UI rendering
 */
export const OVERLAY_CONFIG: Record<TwinOverlay, {
  label: string;
  icon: string;
  description: string;
  color: string;
}> = {
  none: {
    label: 'None',
    icon: 'eye-off',
    description: 'No overlay active',
    color: 'muted',
  },
  thermal: {
    label: 'Thermal',
    icon: 'thermometer',
    description: 'Temperature zones and hotspots',
    color: 'orange',
  },
  power: {
    label: 'Power',
    icon: 'zap',
    description: 'Power flow and load intensity',
    color: 'yellow',
  },
  cooling: {
    label: 'Cooling',
    icon: 'snowflake',
    description: 'Airflow vectors and CRAC zones',
    color: 'cyan',
  },
  gpu: {
    label: 'GPU',
    icon: 'cpu',
    description: 'Rack utilization and GPU clusters',
    color: 'purple',
  },
  network: {
    label: 'Network',
    icon: 'network',
    description: 'Topology edges and latency glow',
    color: 'blue',
  },
  workload: {
    label: 'Workload',
    icon: 'activity',
    description: 'Job density and scheduling heat',
    color: 'violet',
  },
  sovereignty: {
    label: 'Sovereignty',
    icon: 'shield',
    description: 'Region shading and boundary locks',
    color: 'green',
  },
  carbon: {
    label: 'Carbon',
    icon: 'leaf',
    description: 'Emissions gradient and cost overlay',
    color: 'emerald',
  },
};

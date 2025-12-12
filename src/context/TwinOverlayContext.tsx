/**
 * TwinOverlayContext - Single source of truth for overlay state
 * Controls all visual layers of the 3D Digital Twin
 * 
 * ARCHITECTURAL DECISION: Only ONE overlay control bar exists
 * It lives inside the 3D Digital Twin panel and controls all visual layers
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

// Storage key for overlay persistence
const OVERLAY_STORAGE_KEY = 'twin-overlay-preference';

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
  /** Optional twin ID to persist overlay preference per twin */
  twinId?: string;
}

export function TwinOverlayProvider({ 
  children, 
  defaultOverlay = 'thermal',
  twinId 
}: TwinOverlayProviderProps) {
  // Load persisted overlay preference
  const getStoredOverlay = useCallback((): TwinOverlay => {
    if (!twinId) return defaultOverlay;
    try {
      const stored = localStorage.getItem(`${OVERLAY_STORAGE_KEY}-${twinId}`);
      if (stored && isValidOverlay(stored)) {
        return stored as TwinOverlay;
      }
    } catch {
      // localStorage not available
    }
    return defaultOverlay;
  }, [twinId, defaultOverlay]);

  const [activeOverlay, setActiveOverlayState] = useState<TwinOverlay>(getStoredOverlay);

  // Update stored preference when overlay changes
  useEffect(() => {
    if (!twinId) return;
    try {
      localStorage.setItem(`${OVERLAY_STORAGE_KEY}-${twinId}`, activeOverlay);
    } catch {
      // localStorage not available
    }
  }, [activeOverlay, twinId]);

  // Reset to stored/default when twin changes
  useEffect(() => {
    setActiveOverlayState(getStoredOverlay());
  }, [twinId, getStoredOverlay]);

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

// Helper to validate overlay type
function isValidOverlay(value: string): value is TwinOverlay {
  return ['none', 'thermal', 'power', 'cooling', 'gpu', 'network', 'workload', 'sovereignty', 'carbon'].includes(value);
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
  domains: string[]; // KPI domains this overlay relates to
}> = {
  none: {
    label: 'None',
    icon: 'eye-off',
    description: 'No overlay active',
    color: 'muted',
    domains: [],
  },
  thermal: {
    label: 'Thermal',
    icon: 'thermometer',
    description: 'Temperature zones and hotspots',
    color: 'orange',
    domains: ['thermal_hardware', 'thermal'],
  },
  power: {
    label: 'Power',
    icon: 'zap',
    description: 'Power flow and load intensity',
    color: 'yellow',
    domains: ['power_ups', 'power'],
  },
  cooling: {
    label: 'Cooling',
    icon: 'snowflake',
    description: 'Airflow vectors and CRAC zones',
    color: 'cyan',
    domains: ['cooling', 'cooling_system'],
  },
  gpu: {
    label: 'GPU',
    icon: 'cpu',
    description: 'Rack utilization and GPU clusters',
    color: 'purple',
    domains: ['workload_gpu', 'gpu', 'compute'],
  },
  network: {
    label: 'Network',
    icon: 'network',
    description: 'Topology edges and latency glow',
    color: 'blue',
    domains: ['network', 'network_topology'],
  },
  workload: {
    label: 'Workload',
    icon: 'activity',
    description: 'Job density and scheduling heat',
    color: 'violet',
    domains: ['workload_gpu', 'workload', 'compute'],
  },
  sovereignty: {
    label: 'Sovereignty',
    icon: 'shield',
    description: 'Region shading and boundary locks',
    color: 'green',
    domains: ['sovereignty_compliance', 'sovereignty', 'compliance'],
  },
  carbon: {
    label: 'Carbon',
    icon: 'leaf',
    description: 'Emissions gradient and cost overlay',
    color: 'emerald',
    domains: ['financial_carbon', 'carbon', 'emissions'],
  },
};

/**
 * Get KPI domains for the active overlay
 */
export function getDomainsForOverlay(overlay: TwinOverlay): string[] {
  return OVERLAY_CONFIG[overlay]?.domains ?? [];
}

/**
 * Check if a KPI domain matches the active overlay
 */
export function isKpiDomainMatchingOverlay(kpiDomain: string, overlay: TwinOverlay): boolean {
  if (overlay === 'none') return true; // Show all when no overlay
  const domains = getDomainsForOverlay(overlay);
  return domains.length === 0 || domains.some(d => 
    kpiDomain.toLowerCase().includes(d.toLowerCase()) ||
    d.toLowerCase().includes(kpiDomain.toLowerCase())
  );
}

/**
 * Hook to get filtered KPIs based on active overlay
 */
export function useOverlayFilteredKpis<T extends { domain?: string }>(
  kpis: T[]
): T[] {
  const { activeOverlay } = useTwinOverlaySafe();
  
  if (activeOverlay === 'none') return kpis;
  
  return kpis.filter(kpi => 
    kpi.domain ? isKpiDomainMatchingOverlay(kpi.domain, activeOverlay) : true
  );
}

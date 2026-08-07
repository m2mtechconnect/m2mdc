/**
 * AURA DC front-end capability registry (Stage 5).
 *
 * Single source of truth for what the platform can actually do today.
 * Components MUST read capability truth from here — never hardcode it.
 *
 * Authoritative capability state (2026-08-07):
 *   AURA DC simulated demo: CONTROLLED_DEMO_READY
 *   Operating mode: SIMULATED
 *   NVIDIA components proven (static/runtime): 0 / 0
 *   OpenUSD stages: 0 · SimReady-validated assets: 0
 *   Live telemetry sources: 0 · DSX Exchange: not deployed
 *   NVIDIA vertical slice: BLOCKED_BY_INFRASTRUCTURE
 *   Pilot readiness: 24% · Production: NO-GO
 */

export type CapabilityKey =
  | 'simulatedMode'
  | 'replayedMode'
  | 'liveTelemetry'
  | 'openUsdStage'
  | 'simReadyAssets'
  | 'nvidiaRuntime'
  | 'dsxExchange'
  | 'telemetryPrimMapping'
  | 'calibratedSimulation'
  | 'humanReview';

export interface CapabilityDescriptor {
  key: CapabilityKey;
  label: string;
  enabled: boolean;
  /** Why the capability is unavailable. Empty when enabled. */
  requirement: string;
  /** Short status noun rendered in integration surfaces. */
  status:
    | 'Enabled'
    | 'Not connected'
    | 'Not configured'
    | 'Not deployed'
    | 'None validated'
    | 'Access required'
    | 'Not available'
    | 'Blocked by infrastructure';
}

export const CAPABILITIES: Record<CapabilityKey, CapabilityDescriptor> = {
  simulatedMode: {
    key: 'simulatedMode',
    label: 'Deterministic simulation',
    enabled: true,
    requirement: '',
    status: 'Enabled',
  },
  replayedMode: {
    key: 'replayedMode',
    label: 'Replayed datasets',
    enabled: false,
    requirement: 'A validated recorded dataset with provenance has not been supplied.',
    status: 'Not configured',
  },
  liveTelemetry: {
    key: 'liveTelemetry',
    label: 'Live facility telemetry',
    enabled: false,
    requirement: 'No facility telemetry source has been connected or verified.',
    status: 'Not connected',
  },
  openUsdStage: {
    key: 'openUsdStage',
    label: 'OpenUSD stage',
    enabled: false,
    requirement: 'No OpenUSD stage has been authored, validated or mounted.',
    status: 'Not configured',
  },
  simReadyAssets: {
    key: 'simReadyAssets',
    label: 'SimReady assets',
    enabled: false,
    requirement: 'No asset has passed SimReady validation.',
    status: 'None validated',
  },
  nvidiaRuntime: {
    key: 'nvidiaRuntime',
    label: 'NVIDIA GPU runtime',
    enabled: false,
    requirement:
      'A GPU runner with the NVIDIA driver and container toolkit is required, plus NVIDIA entitlements.',
    status: 'Not connected',
  },
  dsxExchange: {
    key: 'dsxExchange',
    label: 'DSX Exchange',
    enabled: false,
    requirement: 'The official DSX Exchange distribution has not been deployed.',
    status: 'Not deployed',
  },
  telemetryPrimMapping: {
    key: 'telemetryPrimMapping',
    label: 'Telemetry-to-prim mapping',
    enabled: false,
    requirement: 'Mapping requires an OpenUSD stage and a verified telemetry source.',
    status: 'Not configured',
  },
  calibratedSimulation: {
    key: 'calibratedSimulation',
    label: 'Calibrated simulation',
    enabled: false,
    requirement: 'No calibration dataset or validated model has been supplied.',
    status: 'Not configured',
  },
  humanReview: {
    key: 'humanReview',
    label: 'Human review workflow',
    enabled: true,
    requirement: '',
    status: 'Enabled',
  },
};

export function hasCapability(key: CapabilityKey): boolean {
  return CAPABILITIES[key].enabled;
}

export function capabilityRequirement(key: CapabilityKey): string {
  return CAPABILITIES[key].requirement;
}

export function useCapability(key: CapabilityKey): CapabilityDescriptor {
  return CAPABILITIES[key];
}

export function useCapabilities(): Record<CapabilityKey, CapabilityDescriptor> {
  return CAPABILITIES;
}

/** Readiness facts surfaced in the NVIDIA DSX readiness page. */
export const NVIDIA_READINESS = {
  staticallyProvenComponents: 0,
  runtimeProvenComponents: 0,
  openUsdStages: 0,
  simReadyValidatedAssets: 0,
  liveTelemetrySources: 0,
  verticalSlice: 'BLOCKED_BY_INFRASTRUCTURE' as const,
  pilotReadinessPercent: 24,
  productionVerdict: 'NO-GO' as const,
  demoVerdict: 'CONTROLLED_DEMO_READY' as const,
} as const;

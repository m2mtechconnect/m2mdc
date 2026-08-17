/**
 * AURA DC front-end capability gates.
 *
 * AURA_ARCHITECTURE_CONSOLIDATION_AND_NVIDIA_ALIGNMENT (Phase 1):
 * this module is NO LONGER a second source of truth. Every NVIDIA, OpenUSD,
 * SimReady, DSX Exchange and live-telemetry fact below is DERIVED from the
 * canonical registry in `src/config/dsxCapabilityRegistry.ts`. This file only
 * translates that registry into the coarse UI gates (`CapabilityGuard`) that
 * components consume.
 *
 * Rules enforced here:
 *   - A capability can only be enabled when the canonical registry carries
 *     runtime evidence for it. No hardcoded `enabled: true` for an NVIDIA,
 *     OpenUSD, SimReady or live-data claim.
 *   - Reference, simulated, replayed and fixture data are never "live".
 */

import { DSX_CAPABILITIES } from '@/config/dsxCapabilityRegistry';

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

/* ------------------------------------------------------------------ *
 * Derivations from the canonical DSX capability registry.
 * ------------------------------------------------------------------ */

/** OpenUSD stages actually mounted by an NVIDIA runtime (never AURA-authored masters). */
const openUsdStagesMountedByNvidia = DSX_CAPABILITIES.filter(
  (c) => c.dsxArea === 'USD storage' && c.nvidiaCodeOrServiceIntegrated,
).length;

/** Capabilities whose canonical geometry source is an OpenUSD master authored in AURA. */
const openUsdCanonicalCapabilities = DSX_CAPABILITIES.filter((c) => c.openUsdCanonical).length;

const simReadyValidatedAssets = DSX_CAPABILITIES.filter((c) => c.simReadyValidated).length;

const nvidiaIntegratedCapabilities = DSX_CAPABILITIES.filter(
  (c) => c.nvidiaCodeOrServiceIntegrated,
).length;

const nvidiaRuntimeConnected = DSX_CAPABILITIES.some(
  (c) => c.dsxArea === 'Runtime and execution environment' && c.nvidiaCodeOrServiceIntegrated,
);

const dsxExchangeDeployed = DSX_CAPABILITIES.some(
  (c) => c.dsxArea === 'DSX Exchange integration boundary' && c.status === 'NVIDIA_INTEGRATED',
);

/** A telemetry source only counts as live when the delegate capability proves it. */
const liveTelemetrySources = DSX_CAPABILITIES.filter(
  (c) => c.dsxArea === 'Simulation Data Delegate' && c.status === 'NVIDIA_INTEGRATED',
).length;

const calibratedSimulation = DSX_CAPABILITIES.some(
  (c) =>
    c.dsxArea === 'Simulation layer' &&
    (c.status === 'NVIDIA_INTEGRATED' || c.status === 'SIMREADY_VALIDATED'),
);

const evidencedCapabilities = DSX_CAPABILITIES.filter(
  (c) => c.lastValidatedAt !== null && c.validationMethod !== 'none',
).length;

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
    enabled: liveTelemetrySources > 0,
    requirement: 'No facility telemetry source has been connected or verified.',
    status: 'Not connected',
  },
  openUsdStage: {
    key: 'openUsdStage',
    label: 'OpenUSD stage mounted by an NVIDIA runtime',
    enabled: openUsdStagesMountedByNvidia > 0,
    requirement:
      'AURA authors canonical OpenUSD masters, but no stage is mounted or resolved by an NVIDIA runtime.',
    status: 'Not configured',
  },
  simReadyAssets: {
    key: 'simReadyAssets',
    label: 'SimReady assets',
    enabled: simReadyValidatedAssets > 0,
    requirement:
      'No asset version and checksum carries an NVIDIA-compatible SimReady validation result.',
    status: 'None validated',
  },
  nvidiaRuntime: {
    key: 'nvidiaRuntime',
    label: 'NVIDIA GPU runtime',
    enabled: nvidiaRuntimeConnected,
    requirement:
      'A GPU runner with the NVIDIA driver and container toolkit is required, plus NVIDIA entitlements.',
    status: 'Not connected',
  },
  dsxExchange: {
    key: 'dsxExchange',
    label: 'DSX Exchange',
    enabled: dsxExchangeDeployed,
    requirement:
      'The official DSX Exchange distribution has not been deployed. Generic MQTT or messaging transports are not DSX Exchange.',
    status: 'Not deployed',
  },
  telemetryPrimMapping: {
    key: 'telemetryPrimMapping',
    label: 'Telemetry-to-prim mapping',
    enabled: openUsdStagesMountedByNvidia > 0 && liveTelemetrySources > 0,
    requirement: 'Mapping requires an OpenUSD stage and a verified telemetry source.',
    status: 'Not configured',
  },
  calibratedSimulation: {
    key: 'calibratedSimulation',
    label: 'Calibrated simulation',
    enabled: calibratedSimulation,
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

/**
 * Readiness facts surfaced in the NVIDIA DSX readiness surfaces.
 * Every number is computed from the canonical registry, so a claim can only
 * move by editing an evidence-gated registry record.
 */
export const NVIDIA_READINESS: {
  staticallyProvenComponents: number;
  runtimeProvenComponents: number;
  openUsdStages: number;
  openUsdCanonicalCapabilities: number;
  simReadyValidatedAssets: number;
  liveTelemetrySources: number;
  verticalSlice: 'BLOCKED_BY_INFRASTRUCTURE' | 'VALIDATED';
  pilotReadinessPercent: number;
  productionVerdict: 'NO-GO' | 'GO';
  demoVerdict: 'CONTROLLED_DEMO_READY';
} = {
  staticallyProvenComponents: nvidiaIntegratedCapabilities,
  runtimeProvenComponents: nvidiaIntegratedCapabilities,
  openUsdStages: openUsdStagesMountedByNvidia,
  openUsdCanonicalCapabilities,
  simReadyValidatedAssets,
  liveTelemetrySources,
  verticalSlice:
    nvidiaIntegratedCapabilities > 0 && simReadyValidatedAssets > 0
      ? 'VALIDATED'
      : 'BLOCKED_BY_INFRASTRUCTURE',
  pilotReadinessPercent: Math.round((evidencedCapabilities / DSX_CAPABILITIES.length) * 100),
  productionVerdict:
    nvidiaIntegratedCapabilities > 0 && simReadyValidatedAssets > 0 && liveTelemetrySources > 0
      ? 'GO'
      : 'NO-GO',
  demoVerdict: 'CONTROLLED_DEMO_READY',
};

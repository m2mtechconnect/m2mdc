/**
 * Omniverse Kit REST API Client
 * Connects to the DDN Data Center Digital Twin running on NVIDIA Kit 109
 * Polls /demo/status for real-time rack health, simulation, and telemetry data
 *
 * Phase 1A hardening: the client no longer carries a hard-coded IP fallback.
 * Configuration is read via `readKitConfig()` which validates
 * `VITE_OMNIVERSE_KIT_URL`. When the env is missing or invalid, every fetch
 * fails closed with a `KitDisabledError` — callers must treat this as
 * `unavailable` / `demo` and MUST NOT synthesize a "connected" state.
 */

import { readKitConfig } from './config';
import {
  validateKitStatus,
  type KitStatusValidated,
  type KitValidationIssue,
} from './schema';

export class KitDisabledError extends Error {
  constructor(reason: string) {
    super(`Omniverse Kit disabled: ${reason}`);
    this.name = 'KitDisabledError';
  }
}

function currentBaseUrl(): string {
  const cfg = readKitConfig();
  if (!cfg.enabled || !cfg.restBaseUrl) {
    throw new KitDisabledError(cfg.reason ?? 'no VITE_OMNIVERSE_KIT_URL configured');
  }
  return cfg.restBaseUrl;
}

// ============================================================================
// API RESPONSE TYPES (match factory_demo_nucleus.py api_status output)
// ============================================================================

export interface KitRackHealth {
  path: string;
  type: 'compute' | 'ddn_a3i' | 'ddn_exascaler';
  temp: number;
  status: 'normal' | 'warning' | 'critical' | 'offline';
  // DDN storage fields (only present on DDN racks)
  iops?: number;
  throughput_gbps?: number;
  latency_us?: number;
  io_active?: boolean;
}

export interface KitStatusResponse {
  ok: boolean;
  stage_ready: boolean;
  tick: number;
  phase: 'steady' | 'anomaly' | 'cascade' | 'dispatch' | 'resolution' | 'cooldown' | null;
  scenario: 'thermal' | 'power_failure' | 'cdu_failure';
  rack_count: number;
  anomaly_count: number;
  use_nvidia_assets: boolean;
  nucleus_server: string;
  asset_source: 'nucleus' | 'procedural';
  rack_health: KitRackHealth[];
  sim_paused: boolean;
  sim_speed: number;
  bot_paused: boolean;
  active_light_preset: string;
  highlighted_rack: string | null;
  camera_tour_active: boolean;
  // DSX Max-Q power metrics
  total_power_kw: number;
  gpu_utilization_pct: number;
  cooling_efficiency: number;
  tokens_per_watt: number;
  pue: number;
  // DSX storage telemetry
  storage_total_iops_k: number;
  storage_total_throughput_gbps: number;
  storage_avg_latency_us: number;
}

export interface KitSimState {
  phase: string;
  paused: boolean;
  speed: number;
  anomaly_rack: string | null;
  cascade_racks: string[];
  scenario_type: string;
  phase_timer: number;
  phase_duration: number;
}

export interface KitLightsStatus {
  preset: string;
  groups: Record<string, boolean>;
  total_lights: number;
}

// ============================================================================
// API CLIENT
// ============================================================================

async function kitFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${currentBaseUrl()}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`Kit API ${path}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function fetchStatus(): Promise<KitStatusResponse> {
  return kitFetch<KitStatusResponse>('/demo/status');
}

// ============================================================================
// VALIDATED FETCH (Phase 1A.1)
// ----------------------------------------------------------------------------
// `fetchStatusValidated()` is the ONLY entry point that runtime callers
// (hooks, adapters, UI) should use. It:
//   1. Fails closed to `disabled` when Kit env is not configured.
//   2. Fails closed to `unavailable` on network / non-2xx / non-JSON errors.
//   3. Runs the payload through `validateKitStatus()` — an invalid payload
//      never produces `connected` or `live` provenance downstream.
//   4. Never surfaces the raw payload, headers, or server-provided error
//      text on the failure path; only a compact issue summary is returned.
// ============================================================================

export type KitFetchOutcome =
  | { ok: true; data: KitStatusValidated; at: Date }
  | { ok: false; reason: 'disabled'; message: string }
  | { ok: false; reason: 'unavailable'; message: string }
  | { ok: false; reason: 'invalid'; issues: KitValidationIssue[] };

/** Redact any payload-derived text before it leaves this module. */
function safeNetworkMessage(err: unknown): string {
  if (err instanceof KitDisabledError) return err.message;
  if (err instanceof Error) {
    // Strip anything that looks like a URL, IP, or token from the message so
    // we cannot leak internal Kit hostnames into console/telemetry.
    return err.name === 'AbortError'
      ? 'Kit request aborted'
      : 'Kit endpoint unreachable';
  }
  return 'Kit endpoint unreachable';
}

export async function fetchStatusValidated(
  signal?: AbortSignal,
): Promise<KitFetchOutcome> {
  // (1) Config gate — never attempt a fetch when disabled.
  let baseUrl: string;
  try {
    baseUrl = currentBaseUrl();
  } catch (err) {
    return {
      ok: false,
      reason: 'disabled',
      message: err instanceof KitDisabledError
        ? err.message
        : 'Omniverse Kit disabled',
    };
  }

  // (2) Network — any failure collapses to `unavailable` without leaking the
  //     raw response body or Kit hostname.
  let payload: unknown;
  try {
    const response = await fetch(`${baseUrl}/demo/status`, {
      signal,
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      return { ok: false, reason: 'unavailable', message: `Kit responded ${response.status}` };
    }
    payload = await response.json();
  } catch (err) {
    return { ok: false, reason: 'unavailable', message: safeNetworkMessage(err) };
  }

  // (3) Validation — a schema-mismatched payload MUST NOT reach the adapter.
  const outcome = validateKitStatus(payload);
  if (outcome.ok) {
    return { ok: true, data: outcome.data, at: new Date() };
  }
  if (outcome.reason === 'invalid') {
    return { ok: false, reason: 'invalid', issues: outcome.issues };
  }
  return { ok: false, reason: 'unavailable', message: outcome.message };
}

export async function fetchSimState(): Promise<KitSimState> {
  return kitFetch<KitSimState>('/demo/sim/state');
}

export async function fetchLightsStatus(): Promise<KitLightsStatus> {
  return kitFetch<KitLightsStatus>('/demo/lights/status');
}

// ============================================================================
// ACTIONS (POST endpoints)
// ============================================================================

export async function triggerScenario(
  scenario: 'thermal' | 'power_failure' | 'cdu_failure',
  rack?: string
): Promise<{ ok: boolean }> {
  const params = new URLSearchParams({ scenario });
  if (rack) params.set('rack', rack);
  return kitFetch(`/demo/sim/trigger?${params}`, { method: 'POST' });
}

export async function resetSimulation(): Promise<{ ok: boolean }> {
  return kitFetch('/demo/sim/trigger?phase=reset', { method: 'POST' });
}

export async function pauseSimulation(): Promise<{ ok: boolean }> {
  return kitFetch('/demo/sim/pause', { method: 'POST' });
}

export async function resumeSimulation(): Promise<{ ok: boolean }> {
  return kitFetch('/demo/sim/resume', { method: 'POST' });
}

export async function setSimSpeed(multiplier: number): Promise<{ ok: boolean }> {
  return kitFetch(`/demo/sim/speed?multiplier=${multiplier}`, { method: 'POST' });
}

export async function setCameraPreset(view: string): Promise<{ ok: boolean }> {
  return kitFetch(`/demo/camera/preset?view=${view}`, { method: 'POST' });
}

export async function focusRack(rack: string, distance?: number): Promise<{ ok: boolean }> {
  const params = new URLSearchParams({ rack });
  if (distance) params.set('distance', String(distance));
  return kitFetch(`/demo/camera/focus_rack?${params}`, { method: 'POST' });
}

export async function sendBotToRack(rack: string): Promise<{ ok: boolean }> {
  return kitFetch(`/demo/bot/goto_rack?rack=${rack}`, { method: 'POST' });
}

export async function startDroneTour(speed?: number): Promise<{ ok: boolean }> {
  const params = new URLSearchParams({ action: 'start' });
  if (speed) params.set('speed', String(speed));
  return kitFetch(`/demo/tour/drone?${params}`, { method: 'POST' });
}

export async function stopDroneTour(): Promise<{ ok: boolean }> {
  return kitFetch('/demo/tour/drone?action=stop', { method: 'POST' });
}

export async function toggleBotPov(): Promise<{ ok: boolean }> {
  return kitFetch('/demo/bot/pov?action=toggle', { method: 'POST' });
}

export async function setLightPreset(preset: string): Promise<{ ok: boolean }> {
  return kitFetch(`/demo/lights/preset?preset=${preset}`, { method: 'POST' });
}

export async function highlightRack(rack: string, clear?: boolean): Promise<{ ok: boolean }> {
  const params = new URLSearchParams({ rack });
  if (clear) params.set('clear', 'true');
  return kitFetch(`/demo/rack/highlight?${params}`, { method: 'POST' });
}

export async function toggleSceneElement(element: string): Promise<{ ok: boolean }> {
  return kitFetch(`/demo/scene/toggle?element=${element}`, { method: 'POST' });
}

/**
 * Runtime-read base URL. Prefer this over the removed `KIT_BASE_URL` constant;
 * throws `KitDisabledError` when the env is missing so callers cannot silently
 * ship a hard-coded target.
 */
export function getKitBaseUrl(): string {
  return currentBaseUrl();
}

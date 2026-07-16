/**
 * Integration tests for the full runtime path:
 *   fetch response -> validation -> adapter -> provenance -> connection state
 *
 * These tests exercise the boundary contract that Phase 1A.1 requires:
 *   - A valid Kit response yields `connected` + `live` provenance.
 *   - An invalid response NEVER yields `connected` or `live` provenance.
 *   - An unreachable endpoint yields `unavailable`.
 *   - A disabled config yields `disabled` and never reaches `fetch`.
 *   - No raw payload text is exposed on the failure path.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchStatusValidated, type KitFetchOutcome } from '@/integrations/omniverseKit/client';
import * as configModule from '@/integrations/omniverseKit/config';
import {
  kitStatusToFacilityWithProvenance,
  demoFacilityProvenance,
} from '@/twins/dataCenter/omniverseAdapter';

// `strict` is off in tsconfig.app.json, so control-flow narrowing on
// discriminated unions across early `return` statements is unreliable.
// Use explicit `Extract` casts, matching the pattern in the schema tests.
type Invalid     = Extract<KitFetchOutcome, { reason: 'invalid' }>;
type Unavailable = Extract<KitFetchOutcome, { reason: 'unavailable' }>;
type Disabled    = Extract<KitFetchOutcome, { reason: 'disabled' }>;

// Shape helper — mirrors the schema; kept in-file so a schema drift breaks
// this test rather than being silently absorbed.
function validPayload() {
  return {
    ok: true, stage_ready: true, tick: 42, phase: 'steady', scenario: 'thermal',
    rack_count: 2, anomaly_count: 0, use_nvidia_assets: false,
    nucleus_server: 'demo', asset_source: 'procedural',
    rack_health: [
      { path: '/r1', type: 'compute',    temp: 24, status: 'normal' },
      { path: '/r2', type: 'ddn_a3i',    temp: 26, status: 'normal', iops: 1000, throughput_gbps: 10, latency_us: 120, io_active: true },
    ],
    sim_paused: false, sim_speed: 1, bot_paused: false,
    active_light_preset: 'day', highlighted_rack: null, camera_tour_active: false,
    total_power_kw: 320, gpu_utilization_pct: 62, cooling_efficiency: 0.87,
    tokens_per_watt: 3.1, pue: 1.28, storage_total_iops_k: 12,
    storage_total_throughput_gbps: 8, storage_avg_latency_us: 140,
  };
}

const KIT_URL_ENV = 'VITE_OMNIVERSE_KIT_URL';

describe('fetchStatusValidated — end-to-end runtime path', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // Force `readKitConfig()` into an ENABLED state so the fetch path runs.
    // Stubbing the config module directly is more reliable than mutating
    // `import.meta.env`, which Vite may have inlined at compile time.
    vi.spyOn(configModule, 'readKitConfig').mockReturnValue({
      enabled: true,
      restBaseUrl: 'http://kit.test:8011',
      streamEnabled: false,
      signalingHost: 'kit.test',
      signalingPort: 49100,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('valid payload → ok, adapter produces live provenance for Kit-passthrough KPIs', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(validPayload()), { status: 200 }),
    );

    const outcome = await fetchStatusValidated();
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    // Adapter accepts the validated payload and emits provenance.
    const { facility, provenance } = kitStatusToFacilityWithProvenance(
      outcome.data as never,
    );
    expect(facility.currentPowerDrawKw ?? facility.totalCapacityMw).toBeDefined();
    expect(provenance.pue.provenance).toBe('live');
    expect(provenance.pue.connection).toBe('connected');
    expect(provenance.totalPower.provenance).toBe('live');
    expect(provenance.gpuUtilization.provenance).toBe('live');
  });

  it('invalid payload → NEVER produces `connected` or `live` provenance', async () => {
    // Wrong types for numeric fields; schema must reject.
    const bad = { ...validPayload(), pue: 'not-a-number', total_power_kw: null };
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(bad), { status: 200 }),
    );

    const outcome = await fetchStatusValidated();
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect((outcome as Invalid).reason).toBe('invalid');

    // The demo-provenance fallback used by the hook when validation fails
    // must never surface `live` on any Kit-sourced KPI.
    const provenance = demoFacilityProvenance('schema mismatch');
    for (const meta of Object.values(provenance)) {
      expect(meta.provenance).not.toBe('live');
      expect(meta.connection).not.toBe('connected');
    }
  });

  it('invalid payload → issue list contains no raw payload values', async () => {
    const bad = { secret_token: 'super-secret-abc123', pue: 'x' };
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(bad), { status: 200 }),
    );
    const outcome = await fetchStatusValidated();
    expect(outcome.ok).toBe(false);
    const failure = outcome as Invalid;
    if (outcome.ok || failure.reason !== 'invalid') return;
    const flat = JSON.stringify(failure.issues);
    expect(flat).not.toContain('super-secret-abc123');
  });

  it('non-2xx response → unavailable (no payload leak in message)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('internal server error dump with hostname kit.internal', { status: 502 }),
    );
    const outcome = await fetchStatusValidated();
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    const failure = outcome as Unavailable;
    expect(failure.reason).toBe('unavailable');
    expect(failure.message).not.toContain('kit.internal');
  });

  it('network error → unavailable', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('failed to fetch http://kit.internal:8011'));
    const outcome = await fetchStatusValidated();
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    const failure = outcome as Unavailable;
    expect(failure.reason).toBe('unavailable');
    expect(failure.message).not.toContain('kit.internal');
  });

  it('disabled config → disabled reason, fetch is never called', async () => {
    (configModule.readKitConfig as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      enabled: false,
      restBaseUrl: null,
      streamEnabled: false,
      signalingHost: null,
      signalingPort: 49100,
      reason: 'VITE_OMNIVERSE_KIT_URL is not set — Kit disabled.',
    });
    const spy = vi.fn();
    globalThis.fetch = spy;
    const outcome = await fetchStatusValidated();
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect((outcome as Disabled).reason).toBe('disabled');
    expect(spy).not.toHaveBeenCalled();
  });
});
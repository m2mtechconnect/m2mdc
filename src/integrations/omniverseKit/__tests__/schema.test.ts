import { describe, it, expect } from 'vitest';
import { validateKitStatus, unavailableOutcome } from '@/integrations/omniverseKit/schema';

function validPayload() {
  return {
    ok: true, stage_ready: true, tick: 1, phase: 'steady', scenario: 'thermal',
    rack_count: 1, anomaly_count: 0, use_nvidia_assets: false,
    nucleus_server: 'demo', asset_source: 'procedural',
    rack_health: [{ path: '/r', type: 'compute', temp: 22, status: 'normal' }],
    sim_paused: false, sim_speed: 1, bot_paused: false,
    active_light_preset: 'day', highlighted_rack: null, camera_tour_active: false,
    total_power_kw: 100, gpu_utilization_pct: 50, cooling_efficiency: 0.9,
    tokens_per_watt: 2, pue: 1.3, storage_total_iops_k: 10,
    storage_total_throughput_gbps: 5, storage_avg_latency_us: 100,
  };
}

describe('validateKitStatus', () => {
  it('accepts a valid payload', () => {
    const r = validateKitStatus(validPayload());
    expect(r.ok).toBe(true);
  });

  it('rejects an invalid enum without throwing, returning compact issues', () => {
    const bad = { ...validPayload(), scenario: 'not-a-scenario' };
    const r = validateKitStatus(bad);
    expect(r.ok).toBe(false);
    if (!r.ok && r.reason === 'invalid') {
      expect(r.issues.length).toBeGreaterThan(0);
      expect(r.issues[0].path).toBe('scenario');
    }
  });

  it('rejects a payload missing required top-level fields', () => {
    const r = validateKitStatus({});
    expect(r.ok).toBe(false);
  });

  it('rejects a partial payload without silently populating live values', () => {
    const { pue: _pue, ...partial } = validPayload();
    const r = validateKitStatus(partial);
    expect(r.ok).toBe(false);
  });

  it('does not throw when given null / non-object input', () => {
    expect(validateKitStatus(null).ok).toBe(false);
    expect(validateKitStatus('nope').ok).toBe(false);
    expect(validateKitStatus(undefined).ok).toBe(false);
  });

  it('does not include raw payload data in the issue list', () => {
    const secretish = { ...validPayload(), nucleus_server: 'nucleus.internal:secret-token' };
    // Inject a bad field to trigger validation failure.
    const r = validateKitStatus({ ...secretish, pue: 'oops' });
    if (!r.ok && r.reason === 'invalid') {
      const joined = JSON.stringify(r.issues);
      expect(joined).not.toContain('secret-token');
    }
  });
});

describe('unavailableOutcome', () => {
  it('produces an unavailable outcome that callers can pattern-match', () => {
    const r = unavailableOutcome('fetch timeout');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('unavailable');
  });
});
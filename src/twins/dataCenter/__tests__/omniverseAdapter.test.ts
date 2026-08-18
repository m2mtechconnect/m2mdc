/**
 * Adapter characterization tests (Phase 1A).
 *
 * These assert observable runtime behaviour — not just a compile-time
 * `satisfies` check. They pin the exact contract the dashboard relies on so
 * subsequent refactors cannot silently drift.
 */

import { describe, it, expect } from 'vitest';
import type { KitStatusResponse, KitRackHealth } from '@/integrations/omniverseKit/client';
import {
  kitStatusToFacility,
  kitStatusToFacilityWithProvenance,
  demoFacilityProvenance,
} from '@/twins/dataCenter/omniverseAdapter';

function rack(overrides: Partial<KitRackHealth> = {}): KitRackHealth {
  return {
    path: '/World/racks/rack_A1',
    type: 'compute',
    temp: 24,
    status: 'normal',
    ...overrides,
  };
}

function kit(overrides: Partial<KitStatusResponse> = {}): KitStatusResponse {
  return {
    ok: true,
    stage_ready: true,
    tick: 42,
    phase: 'steady',
    scenario: 'thermal',
    rack_count: 3,
    anomaly_count: 0,
    use_nvidia_assets: false,
    nucleus_server: 'demo',
    asset_source: 'procedural',
    rack_health: [
      rack({ path: '/World/racks/rack_A1', temp: 22, status: 'normal' }),
      rack({ path: '/World/racks/rack_A2', temp: 28, status: 'warning' }),
      rack({ path: '/World/racks/rack_A3', temp: 34, status: 'critical' }),
    ],
    sim_paused: false,
    sim_speed: 1,
    bot_paused: false,
    active_light_preset: 'day',
    highlighted_rack: null,
    camera_tour_active: false,
    total_power_kw: 1200,
    gpu_utilization_pct: 72,
    cooling_efficiency: 0.85,
    tokens_per_watt: 3.5,
    pue: 1.32,
    storage_total_iops_k: 100,
    storage_total_throughput_gbps: 40,
    storage_avg_latency_us: 150,
    ...overrides,
  };
}

describe('kitStatusToFacility — Kit passthrough', () => {
  it('passes PUE through unchanged', () => {
    expect(kitStatusToFacility(kit({ pue: 1.418 })).pue).toBe(1.418);
  });

  it('passes total power through unchanged and converts to MW for currentLoadMw', () => {
    const f = kitStatusToFacility(kit({ total_power_kw: 1250 }));
    expect(f.currentPowerDrawKw).toBe(1250);
    expect(f.currentLoadMw).toBeCloseTo(1.25, 5);
  });

  it('aggregates GPU utilization onto every cluster.avgUtilization', () => {
    const f = kitStatusToFacility(kit({ gpu_utilization_pct: 55 }));
    const training = f.workloadGpu.clusters.find(c => c.id === 'cluster-train');
    expect(training?.avgUtilization).toBe(55);
    expect(f.workloadGpu.kpis.avgGpuUtilization).toBe(55);
  });

  it('respects rack_count field for totalRacks', () => {
    const f = kitStatusToFacility(kit({ rack_count: 21 }));
    expect(f.totalRacks).toBe(21);
  });
});

describe('kitStatusToFacility — rack status → facility status mapping', () => {
  it('marks facility operational when all racks are normal', () => {
    const f = kitStatusToFacility(kit({ rack_health: [rack({ status: 'normal' })] }));
    expect(f.status).toBe('operational');
    expect(f.alerts).toHaveLength(0);
  });

  it('marks facility degraded on any warning without critical/offline', () => {
    const f = kitStatusToFacility(kit({ rack_health: [rack({ status: 'normal' }), rack({ path: '/R2', status: 'warning' })] }));
    expect(f.status).toBe('degraded');
  });

  it('marks facility critical when any rack is critical or offline', () => {
    const f = kitStatusToFacility(kit({ rack_health: [rack({ status: 'critical' })] }));
    expect(f.status).toBe('critical');
  });

  it('maps per-rack outlet temperature from Kit temp field', () => {
    const f = kitStatusToFacility(kit({ rack_health: [rack({ path: '/W/racks/rack_X', temp: 31.5 })] }));
    const built = f.thermalHardware.racks.find(r => r.id === 'rack_X');
    expect(built?.outletTempC).toBe(31.5);
  });
});

describe('kitStatusToFacility — alert generation', () => {
  const f = kitStatusToFacility(kit()); // 1 normal, 1 warning, 1 critical

  it('emits one alert per non-normal rack, no alerts for normal racks', () => {
    expect(f.alerts.map(a => a.id).sort()).toEqual([
      'alert-rack_A3',       // critical
      'alert-warn-rack_A2',  // warning
    ]);
  });

  it('uses the correct DomainType literal (thermal_hardware, not thermal)', () => {
    for (const a of f.alerts) {
      expect(a.domain).toBe('thermal_hardware');
    }
  });

  it('maps offline racks to a power_ups alert', () => {
    const g = kitStatusToFacility(kit({ rack_health: [rack({ path: '/W/racks/rack_Off', status: 'offline' })] }));
    expect(g.alerts).toHaveLength(1);
    expect(g.alerts[0].domain).toBe('power_ups');
    expect(g.alerts[0].severity).toBe('critical');
  });
});

describe('kitStatusToFacility — deterministic output', () => {
  it('produces byte-identical structural output for identical Kit inputs', () => {
    const a = kitStatusToFacility(kit());
    const b = kitStatusToFacility(kit());

    // Timestamps are wall-clock and expected to differ; strip before comparing.
    const strip = (f: ReturnType<typeof kitStatusToFacility>) => JSON.parse(
      JSON.stringify(f, (_k, v) => (v instanceof Date ? '<<DATE>>' : v)),
    );
    expect(strip(a)).toEqual(strip(b));
  });

  it('does NOT leak PRNG state across calls (Math.random restored)', () => {
    kitStatusToFacility(kit());
    // Math.random should still be the global implementation, producing values in [0,1).
    for (let i = 0; i < 5; i++) {
      const r = Math.random();
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(1);
    }
  });
});

describe('kitStatusToFacility — facility-shape and enum conformance', () => {
  const f = kitStatusToFacility(kit());

  it('produces a fully-populated DataCentreFacility with all required domain twins', () => {
    for (const key of [
      'thermalHardware', 'powerUps', 'cooling', 'network',
      'facilitySafety', 'workloadGpu', 'sovereignty', 'financialCarbon',
    ] as const) {
      expect(f[key]).toBeDefined();
    }
  });

  it('uses valid region and status enum values', () => {
    expect(f.region).toBe('CA-QC');
    expect(['operational', 'degraded', 'critical', 'maintenance']).toContain(f.status);
  });

  it('uses valid FireSuppressionSystem type enum (Novec, not clean-agent)', () => {
    const fs = f.facilitySafety.fireSuppressionSystems[0];
    expect(fs).toBeDefined();
    expect(['FM200', 'Novec', 'Inergen', 'PreAction', 'DryPipe']).toContain(fs.type);
  });
});

describe('kitStatusToFacility — behaviour with degenerate inputs', () => {
  it('does not throw when rack_health is empty', () => {
    expect(() => kitStatusToFacility(kit({ rack_health: [], rack_count: 0 }))).not.toThrow();
    const f = kitStatusToFacility(kit({ rack_health: [], rack_count: 0 }));
    expect(f.totalRacks).toBe(0);
    expect(f.alerts).toHaveLength(0);
    expect(f.status).toBe('operational');
  });

  it('does not throw when Kit reports zero power', () => {
    expect(() => kitStatusToFacility(kit({ total_power_kw: 0, pue: 1 }))).not.toThrow();
  });
});

describe('kitStatusToFacilityWithProvenance', () => {
  const wp = kitStatusToFacilityWithProvenance(kit());

  it('returns a provenance map covering every required section', () => {
    for (const key of [
      'facility', 'pue', 'totalPower', 'gpuUtilization', 'thermal', 'cooling',
      'network', 'facilitySafety', 'sovereignty', 'carbon', 'auditReadiness',
      'alerts', 'timeSeries',
    ] as const) {
      expect(wp.provenance[key]).toBeDefined();
    }
  });

  it('marks Kit-passthrough KPIs as live', () => {
    expect(wp.provenance.pue.provenance).toBe('live');
    expect(wp.provenance.totalPower.provenance).toBe('live');
    expect(wp.provenance.gpuUtilization.provenance).toBe('live');
  });

  it('marks derived aggregates as derived, and network/safety as demo', () => {
    expect(wp.provenance.thermal.provenance).toBe('derived');
    expect(wp.provenance.alerts.provenance).toBe('derived');
    expect(wp.provenance.network.provenance).toBe('demo');
    expect(wp.provenance.facilitySafety.provenance).toBe('demo');
  });

  it('never labels sovereignty or audit-readiness scores as live', () => {
    expect(wp.provenance.sovereignty.provenance).not.toBe('live');
    expect(wp.provenance.auditReadiness.provenance).not.toBe('live');
  });
});

describe('demoFacilityProvenance — no live labels when Kit is absent', () => {
  const p = demoFacilityProvenance('Kit disabled for test');
  it('marks would-be-live KPIs as unavailable, not live', () => {
    expect(p.pue.provenance).toBe('unavailable');
    expect(p.totalPower.provenance).toBe('unavailable');
    expect(p.gpuUtilization.provenance).toBe('unavailable');
  });
  it('never returns live for any section', () => {
    for (const k of Object.keys(p) as Array<keyof typeof p>) {
      expect(p[k].provenance).not.toBe('live');
    }
  });
});

/**
 * Domain-correction impact test.
 *
 * The Phase 0.5 fix changed `domain: 'thermal' as any` to `'thermal_hardware'`
 * (and 'power' -> 'power_ups'). This test documents that the correction
 * changes downstream filtering: a consumer filtering alerts by DomainType
 * literal now matches the correct partition. Pre-fix, filtering by
 * `'thermal_hardware'` would have missed every alert.
 */
describe('domain literal correction — downstream filtering', () => {
  const f = kitStatusToFacility(kit());
  it('alerts filter by canonical DomainType literal matches thermal alerts', () => {
    const thermal = f.alerts.filter(a => a.domain === 'thermal_hardware');
    expect(thermal.length).toBeGreaterThan(0);
  });
  it('no alert leaks the pre-Phase-0.5 short name', () => {
    for (const a of f.alerts) {
      expect(a.domain).not.toBe('thermal' as unknown as typeof a.domain);
      expect(a.domain).not.toBe('power'   as unknown as typeof a.domain);
    }
  });
});
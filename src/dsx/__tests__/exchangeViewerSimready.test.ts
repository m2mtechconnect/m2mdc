import { describe, it, expect } from 'vitest';
import {
  assessEndpoint,
  createMemoryTransport,
  type TransportEndpoint,
} from '../exchange/transport';
import { createDsxExchangeAdapter, subjectToSourceAsset } from '../exchange/dsxExchangeAdapter';
import {
  createStaticViewerProvider,
  createUnavailableViewerProvider,
  syncSelection,
  assetIdForPrim,
} from '../viewer/viewerBoundary';
import { assessAsset, assessFleet } from '../simready/onboarding';
import { stableUuid } from '../fixtures/determinism';
import {
  EVIDENCE_BETA_ASSETS,
  EVIDENCE_BETA_CONNECTION_ID,
  EVIDENCE_BETA_MAPPINGS,
  EVIDENCE_BETA_ORG_ID,
  EVIDENCE_BETA_RACKS,
  EVIDENCE_BETA_SITE_ID,
  EVIDENCE_BETA_SOURCE_SYSTEM,
  assetBySourceId,
} from '../fixtures/evidenceBetaFacility';

const LOCAL: TransportEndpoint = {
  url: 'mqtt://127.0.0.1:1883',
  protocol: 'mqtt',
  subjects: ['dsx/evidence-beta/#'],
};

const OBSERVED = '2026-03-02T08:00:00.000Z';

function event(id: string, sourceAsset: string, value: number) {
  const asset = assetBySourceId(sourceAsset);
  return JSON.stringify({
    schema_version: 1,
    event_id: id,
    tenant_id: EVIDENCE_BETA_ORG_ID,
    site_id: EVIDENCE_BETA_SITE_ID,
    asset_id: asset ? asset.aura_asset_id : null,
    connection_id: EVIDENCE_BETA_CONNECTION_ID,
    source_system: 'dsx_cooling',
    source_subject: `${EVIDENCE_BETA_SOURCE_SYSTEM}/${sourceAsset}/inlet_temp_c`,
    event_type: 'telemetry',
    observed_at: OBSERVED,
    received_at: OBSERVED,
    value,
    unit: 'degC',
    quality: 'validated',
    validation_state: 'accepted',
    mapping_state: asset ? 'mapped' : 'unmapped',
    ingestion_version: 'exchange-test/1.0.0',
  });
}

describe('DSX Exchange adapter — safety boundary', () => {
  it('permits localhost endpoints', () => {
    expect(assessEndpoint(LOCAL).allowed).toBe(true);
  });

  it('refuses the production project ref', () => {
    const v = assessEndpoint({ ...LOCAL, url: 'mqtt://psfvrskpnwcshvajzeix.supabase.co:1883' });
    expect(v.allowed).toBe(false);
  });

  it('refuses arbitrary remote hosts without a disposable declaration', () => {
    expect(assessEndpoint({ ...LOCAL, url: 'mqtt://broker.example.net:1883' }).allowed).toBe(false);
    expect(
      assessEndpoint({ ...LOCAL, url: 'mqtt://broker.example.net:1883' }, {
        allowDisposableHost: 'broker.example.net',
      }).allowed,
    ).toBe(true);
  });

  it('never connects when the endpoint is refused and stays UNAVAILABLE', async () => {
    const transport = createMemoryTransport({ ...LOCAL, url: 'mqtt://broker.example.net:1883' });
    const adapter = createDsxExchangeAdapter({ transport, runId: 'run-1' });
    await adapter.start();
    expect(transport.state()).toBe('disconnected');
    const snap = adapter.snapshot(Date.parse(OBSERVED));
    expect(snap.data_mode).toBe('UNAVAILABLE');
    expect(snap.health.refused_reason).not.toBeNull();
  });
});

describe('DSX Exchange adapter — ingestion', () => {
  it('routes broker traffic through the shared pipeline and reports health separately from freshness', async () => {
    const transport = createMemoryTransport(LOCAL);
    const adapter = createDsxExchangeAdapter({ transport, runId: 'run-1' });
    await adapter.start();

    // Connected but no data yet: UNAVAILABLE, freshness unknown.
    let snap = adapter.snapshot(Date.parse(OBSERVED));
    expect(snap.health.transport_state).toBe('connected');
    expect(snap.data_mode).toBe('UNAVAILABLE');
    expect(snap.freshness).toBe('unknown');

    const rack = EVIDENCE_BETA_RACKS[0].source_asset_id;
    transport.emit({
      subject: `dsx/evidence-beta/${rack}/inlet_temp_c`,
      payload: event(stableUuid('exchange-test:evt-1'), rack, 27.4),
      received_at: OBSERVED,
    });

    snap = adapter.snapshot(Date.parse(OBSERVED));
    expect(snap.accepted).toHaveLength(1);
    expect(snap.data_mode).toBe('REPLAYED');
    expect(snap.run_id).toBe('run-1');
    expect(snap.freshness).toBe('fresh');

    // Stale by observation age even though transport is still connected.
    const later = Date.parse(OBSERVED) + 20 * 60_000;
    expect(adapter.snapshot(later).freshness).toBe('stale');
    expect(adapter.snapshot(later).health.transport_state).toBe('connected');
  });

  it('suppresses redelivered event ids across a reconnect', async () => {
    const transport = createMemoryTransport(LOCAL);
    const adapter = createDsxExchangeAdapter({ transport, runId: 'run-1' });
    await adapter.start();
    const rack = EVIDENCE_BETA_RACKS[1].source_asset_id;
    const msg = {
      subject: `dsx/evidence-beta/${rack}/inlet_temp_c`,
      payload: event(stableUuid('exchange-test:evt-dup'), rack, 26.1),
      received_at: OBSERVED,
    };
    transport.emit(msg);
    await transport.disconnect();
    await transport.connect();
    transport.emit(msg);

    const snap = adapter.snapshot(Date.parse(OBSERVED));
    expect(snap.accepted).toHaveLength(1);
    expect(snap.health.duplicate_suppressed).toBe(1);
    expect(snap.health.connect_count).toBe(2);
  });

  it('quarantines malformed broker payloads instead of coercing them', async () => {
    const transport = createMemoryTransport(LOCAL);
    const adapter = createDsxExchangeAdapter({ transport, runId: 'run-1' });
    await adapter.start();
    transport.emit({ subject: 'dsx/evidence-beta/RACK-01/x', payload: 'not json', received_at: OBSERVED });
    const snap = adapter.snapshot(Date.parse(OBSERVED));
    expect(snap.accepted).toHaveLength(0);
    expect(snap.rejected[0].reason).toBe('schema_invalid');
    expect(snap.data_mode).toBe('UNAVAILABLE');
  });

  it('derives the source asset from the subject when absent', () => {
    expect(subjectToSourceAsset('dsx/evidence-beta/RACK-03/inlet_temp_c')).toBe('RACK-03');
  });
});

describe('OpenUSD viewer boundary', () => {
  const rack = EVIDENCE_BETA_RACKS[0];

  it('reports unavailable when no provider is attached and never fabricates a stage', () => {
    const provider = createUnavailableViewerProvider('No OpenUSD runtime attached in this build.');
    const r = syncSelection(provider, rack, EVIDENCE_BETA_MAPPINGS, EVIDENCE_BETA_SOURCE_SYSTEM, OBSERVED);
    expect(r.viewer_state).toBe('unavailable');
    expect(r.highlighted).toBe(false);
    expect(r.notice).toContain('unavailable');
    expect(provider.stage()).toBeNull();
  });

  it('resolves selection through the approved mapping only', () => {
    const provider = createStaticViewerProvider({
      stage_id: 'evidence-beta',
      stage_version: '1.0.0',
      prim_paths: EVIDENCE_BETA_MAPPINGS.map((m) => m.usd_prim_path),
    });
    const r = syncSelection(provider, rack, EVIDENCE_BETA_MAPPINGS, EVIDENCE_BETA_SOURCE_SYSTEM, OBSERVED);
    expect(r.resolution?.status).toBe('resolved');
    expect(r.highlighted).toBe(true);
    expect(provider.selected()).toBe(rack.usd_prim_path);
  });

  it('reports absent_in_stage rather than highlighting a guessed prim', () => {
    const provider = createStaticViewerProvider({
      stage_id: 'partial',
      stage_version: '1.0.0',
      prim_paths: [],
    });
    const r = syncSelection(provider, rack, EVIDENCE_BETA_MAPPINGS, EVIDENCE_BETA_SOURCE_SYSTEM, OBSERVED);
    expect(r.resolution?.status).toBe('absent_in_stage');
    expect(r.highlighted).toBe(false);
  });

  it('reports unmapped for assets without an approved mapping', () => {
    const pending = EVIDENCE_BETA_RACKS.find((r) => r.approval_status !== 'approved');
    expect(pending).toBeDefined();
    const provider = createStaticViewerProvider({
      stage_id: 'evidence-beta',
      stage_version: '1.0.0',
      prim_paths: EVIDENCE_BETA_MAPPINGS.map((m) => m.usd_prim_path),
    });
    const r = syncSelection(provider, pending!, EVIDENCE_BETA_MAPPINGS, EVIDENCE_BETA_SOURCE_SYSTEM, OBSERVED);
    expect(r.resolution?.status).toBe('unmapped');
    expect(r.highlighted).toBe(false);
  });

  it('maps a prim click back to a stable aura asset id', () => {
    expect(assetIdForPrim(rack.usd_prim_path, EVIDENCE_BETA_MAPPINGS)).toBe(rack.aura_asset_id);
    expect(assetIdForPrim('/World/Nope', EVIDENCE_BETA_MAPPINGS)).toBeNull();
  });
});

describe('SimReady onboarding boundary', () => {
  it('marks a complete approved rack as SimReady', () => {
    const rack = EVIDENCE_BETA_RACKS[0];
    const a = assessAsset(rack);
    expect(a.state).toBe('simready');
    expect(a.simulation_eligible).toBe(true);
    expect(a.gaps.filter((g) => g.severity === 'blocker')).toHaveLength(0);
  });

  it('blocks racks without SimReady geometry and reports the gap', () => {
    const incomplete = EVIDENCE_BETA_RACKS.find((r) => r.simready === false);
    expect(incomplete).toBeDefined();
    const a = assessAsset(incomplete!);
    expect(a.simulation_eligible).toBe(false);
    expect(a.gaps.some((g) => g.field === 'simready' && g.severity === 'blocker')).toBe(true);
  });

  it('never substitutes a default for a missing rating', () => {
    const rack = { ...EVIDENCE_BETA_RACKS[0], rated_kw: null };
    const a = assessAsset(rack);
    expect(a.simulation_eligible).toBe(false);
    expect(a.completeness).toBeLessThan(1);
    expect(a.gaps.some((g) => g.field === 'rated_kw')).toBe(true);
  });

  it('summarises the fleet with an explicit blocked list', () => {
    const s = assessFleet(EVIDENCE_BETA_ASSETS);
    expect(s.total).toBe(EVIDENCE_BETA_ASSETS.length);
    expect(s.simulation_eligible).toBeLessThan(s.total);
    expect(s.blocked.length).toBe(s.total - s.simulation_eligible);
  });
});
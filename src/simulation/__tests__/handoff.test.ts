import { describe, expect, it } from 'vitest';
import { SIMULATION_ROUTE, buildSimulationHandoffUrl, parseSimulationHandoff } from '../handoff';

describe('simulation handoff', () => {
  it('targets the canonical simulation route', () => {
    expect(SIMULATION_ROUTE).toBe('/simulation');
  });

  it('carries the route-authoritative blueprint id and selected version', () => {
    const url = buildSimulationHandoffUrl({ blueprintId: 'bp-9', versionId: 4, twinId: 'twin-1', returnTab: 'kpis' });
    const params = new URLSearchParams(url.split('?')[1]);
    expect(url.startsWith('/simulation?')).toBe(true);
    expect(params.get('blueprintId')).toBe('bp-9');
    expect(params.get('versionId')).toBe('4');
    expect(params.get('twin')).toBe('twin-1');
    expect(params.get('from')).toBe('blueprint:kpis');
    expect(params.get('state')).toBe('draft');
  });

  it('omits an unavailable version rather than fabricating one', () => {
    const url = buildSimulationHandoffUrl({ blueprintId: 'bp-9', versionId: null });
    expect(url).not.toContain('versionId');
  });

  it('round-trips through parseSimulationHandoff', () => {
    const url = buildSimulationHandoffUrl({ blueprintId: 'bp-9', versionId: '2', twinId: 't-2' });
    const parsed = parseSimulationHandoff(new URLSearchParams(url.split('?')[1]));
    expect(parsed).toEqual({ blueprintId: 'bp-9', versionId: '2', twinId: 't-2' });
  });

  it('returns null when no blueprint was handed over', () => {
    expect(parseSimulationHandoff(new URLSearchParams('state=draft'))).toBeNull();
  });

  it('exports no mutation surface', async () => {
    const mod = await import('../handoff');
    for (const key of Object.keys(mod)) {
      expect(key).not.toMatch(/^(run|start|create|execute|queue|cancel)/i);
    }
  });
});

/**
 * Contract: navigation into the neutral /evidence family carries facility
 * context, and the shared investigation context surfaces it as a scope chip.
 * Nothing here asserts measured telemetry; an unresolved id stays unavailable.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildContextChips, EMPTY_CONTEXT, parseContext } from '@/dsx/runtime/investigationContext';
import { evidenceHrefForKpi } from '@/workspace/kpiDrilldown';
import { buildSimulationHandoffUrl } from '@/simulation/handoff';

describe('evidence facility context', () => {
  it('parses the facility parameter from an inbound deep link', () => {
    const ctx = parseContext('facility=fac-123&kpi=pue');
    expect(ctx.facility_id).toBe('fac-123');
  });

  it('emits a facility scope chip that is not removable', () => {
    const chips = buildContextChips({ ...EMPTY_CONTEXT, facility_id: 'fac-123' }, () => null);
    const facility = chips.find((c) => c.field === 'facility_id');
    expect(facility).toBeDefined();
    expect(facility?.label).toBe('Facility');
    expect(facility?.removable).toBe(false);
  });

  it('reports an unresolved facility as unavailable rather than inventing one', () => {
    const chips = buildContextChips({ ...EMPTY_CONTEXT, facility_id: 'missing' }, () => null);
    expect(chips[0]?.value).toBe('Unavailable (record not found)');
  });

  it('carries the facility id on KPI evidence deep links', () => {
    const href = evidenceHrefForKpi('pue', 'fac-123');
    expect(href.startsWith('/evidence/')).toBe(true);
    expect(new URLSearchParams(href.split('?')[1]).get('facility')).toBe('fac-123');
  });

  it('omits the facility parameter when no facility is known', () => {
    const href = evidenceHrefForKpi('pue');
    expect(href).not.toContain('facility=');
  });

  it('states the active facility in the Evidence shell header', () => {
    const shell = readFileSync('src/pages/dsx/EvidenceBetaShell.tsx', 'utf8');
    expect(shell).toContain('dsx-active-facility');
    expect(shell).toContain('Facility: not selected');
    expect(shell).toContain('activeTwin?.id === facilityId');
  });

  it('carries the active facility through the global Evidence footer', () => {
    const layout = readFileSync('src/components/Layout.tsx', 'utf8');
    expect(layout).toContain('?facility=${encodeURIComponent(activeTwin.id)}');
  });
});

describe('builder hand-off preserves the active twin', () => {
  it('serialises the twin id into the simulation hand-off URL', () => {
    const url = buildSimulationHandoffUrl({
      blueprintId: 'bp-1',
      twinId: 'twin-9',
      returnTab: 'simulation',
    });
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('twin')).toBe('twin-9');
    expect(params.get('state')).toBe('draft');
  });

  it('passes the active twin through from Builder step 5', () => {
    const step5 = readFileSync('src/components/builder/steps/Step5Deploy.tsx', 'utf8');
    expect(step5).toContain('twinId: activeTwin?.id ?? null');
    expect(step5).toContain('handleOpenBlueprint');
    expect(step5).toContain('navigate(`/blueprint/${activeTwin.id}`)');
    expect(step5).not.toContain('window.open(');
  });
});

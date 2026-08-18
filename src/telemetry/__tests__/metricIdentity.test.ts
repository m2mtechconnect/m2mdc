/**
 * Phase 11 - metric identity consolidation guard.
 *
 * Canonical observed telemetry: `twin_property_values` (provenance-bearing).
 * Canonical KPI source: the `simulation_runs` envelope.
 * The legacy `twin_telemetry` and `twin_kpi_snapshots` generations are
 * deprecated and must not be read or written by any client module.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const LEGACY_TABLES = ['twin_telemetry', 'twin_kpi_snapshots'];
const ALLOWED = ['src/integrations/supabase/types.ts'];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

describe('Phase 11 metric identity', () => {
  it('no client module queries the retired metric tables', () => {
    const offenders: string[] = [];
    for (const file of walk('src')) {
      if (ALLOWED.some((a) => file.endsWith(a))) continue;
      const source = readFileSync(file, 'utf8');
      for (const table of LEGACY_TABLES) {
        if (source.includes(`from('${table}')`) || source.includes(`from("${table}")`)) {
          offenders.push(`${file}:${table}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the pilot adapter reads KPIs from the canonical run table', () => {
    const source = readFileSync('src/pilot/pilotReadAdapter.ts', 'utf8');
    expect(source).toContain('from("simulation_runs")');
    expect(source).not.toContain('twin_kpi_snapshots"');
  });

  it('the twin data hooks expose no retired telemetry or KPI hook', () => {
    const source = readFileSync('src/hooks/useTwinData.ts', 'utf8');
    for (const name of ['useTwinTelemetry', 'useTwinKPIs(', 'useInsertTelemetry', 'useInsertKPI']) {
      expect(source).not.toContain(`export function ${name}`);
    }
  });
});

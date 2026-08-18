import { describe, it, expect } from 'vitest';
import {
  SEARCH_SOURCES,
  SEARCH_KINDS,
  buildOrFilter,
  labelForKind,
  sanitizeSearchTerm,
  searchPlatformRecords,
  type SearchClient,
} from '../platformSearchApi';

/** Records every query issued so the request shape can be asserted. */
function fakeClient(
  rowsByTable: Record<string, unknown[]>,
  errorsByTable: Record<string, string> = {},
) {
  const calls: Array<{ table: string; columns: string; or: string; order: string; limit: number }> = [];
  const client: SearchClient = {
    from(table: string) {
      const call = { table, columns: '', or: '', order: '', limit: 0 };
      const builder: any = {
        select(columns: string) {
          call.columns = columns;
          return builder;
        },
        or(expression: string) {
          call.or = expression;
          return builder;
        },
        order(column: string) {
          call.order = column;
          return builder;
        },
        limit(value: number) {
          call.limit = value;
          calls.push(call);
          const message = errorsByTable[table];
          if (message) return Promise.resolve({ data: null, error: new Error(message) });
          return Promise.resolve({ data: rowsByTable[table] ?? [], error: null });
        },
      };
      return builder;
    },
  };
  return { client, calls };
}

describe('sanitizeSearchTerm', () => {
  it('strips the characters that would break or corrupt a PostgREST or= filter', () => {
    // A comma separates conditions and a parenthesis groups them: leaving
    // either in place would change which rows the database returns.
    expect(sanitizeSearchTerm('montreal, tier(3)')).toBe('montreal tier 3');
  });

  it('strips the LIKE wildcard so a query cannot widen its own filter', () => {
    expect(sanitizeSearchTerm('%')).toBe('');
    expect(sanitizeSearchTerm('a%b')).toBe('a b');
  });

  it('collapses whitespace and caps length', () => {
    expect(sanitizeSearchTerm('  a   b  ')).toBe('a b');
    expect(sanitizeSearchTerm('x'.repeat(500))).toHaveLength(120);
  });
});

describe('buildOrFilter', () => {
  it('produces one case-insensitive substring condition per column', () => {
    expect(buildOrFilter(['name', 'city'], 'mtl')).toBe('name.ilike.%mtl%,city.ilike.%mtl%');
  });
});

describe('search source declarations', () => {
  it('declares a unique kind per source and a label for each', () => {
    expect(new Set(SEARCH_KINDS).size).toBe(SEARCH_KINDS.length);
    for (const kind of SEARCH_KINDS) expect(labelForKind(kind)).not.toBe(kind);
  });

  it('only searches columns it also selects', () => {
    for (const source of SEARCH_SOURCES) {
      const selected = source.columns.split(',');
      for (const column of source.searchColumns) expect(selected).toContain(column);
      expect(selected).toContain('id');
      expect(selected).toContain(source.orderColumn);
    }
  });

  it('routes every result to an in-app path, never an external URL', () => {
    for (const source of SEARCH_SOURCES) {
      const result = source.toResult({ id: 'abc', slug: 'demo' });
      expect(result.route.startsWith('/')).toBe(true);
      expect(result.recordTable).toBe(source.table);
      expect(result.recordId).toBe('abc');
    }
  });
});

describe('searchPlatformRecords', () => {
  it('returns nothing and issues no request for an empty query', async () => {
    const { client, calls } = fakeClient({});
    const response = await searchPlatformRecords('   ', { client });
    expect(response.results).toEqual([]);
    expect(response.kindsQueried).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it('queries every declared source and maps rows to cited results', async () => {
    const { client, calls } = fakeClient({
      data_centre_twins: [
        { id: 'f1', name: 'Montreal Sovereign', city: 'Montreal', region_code: 'ca-qc', tier: 'III', capacity_kw: 5000, updated_at: '2026-01-01T00:00:00Z' },
      ],
      agent_definitions: [{ id: 'a1', name: 'Cooling Agent', slug: 'cooling', domain: 'thermal', updated_at: null }],
      connection_instances: [],
      simulation_runs: [{ id: 'r1', run_label: 'Heatwave', status: 'completed', started_at: '2026-01-02T00:00:00Z' }],
    });

    const response = await searchPlatformRecords('mont', { client, limitPerSource: 5 });

    expect(calls.map((c) => c.table).sort()).toEqual([
      'agent_definitions',
      'connection_instances',
      'data_centre_twins',
      'simulation_runs',
    ]);
    expect(calls.every((c) => c.limit === 5)).toBe(true);
    expect(response.failures).toEqual([]);

    const facility = response.results.find((r) => r.kind === 'facility');
    expect(facility?.route).toBe('/blueprint/f1');
    expect(facility?.recordTable).toBe('data_centre_twins');
    expect(facility?.recordId).toBe('f1');
    expect(response.results.find((r) => r.kind === 'agent')?.route).toBe('/app/agents/cooling/detail');
    expect(response.results.find((r) => r.kind === 'run')?.route).toBe('/simulation?run=r1');
  });

  it('restricts the round trip to the requested kinds', async () => {
    const { client, calls } = fakeClient({ data_centre_twins: [] });
    const response = await searchPlatformRecords('mtl', { client, kinds: ['facility'] });
    expect(calls.map((c) => c.table)).toEqual(['data_centre_twins']);
    expect(response.kindsQueried).toEqual(['facility']);
  });

  it('reports a failing source instead of discarding the rest of the results', async () => {
    const { client } = fakeClient(
      { data_centre_twins: [{ id: 'f1', name: 'Montreal', city: 'Montreal', region_code: 'ca-qc' }] },
      { simulation_runs: 'permission denied for table simulation_runs' },
    );
    const response = await searchPlatformRecords('mont', { client });
    expect(response.results.some((r) => r.kind === 'facility')).toBe(true);
    expect(response.failures).toEqual([
      { kind: 'run', message: 'permission denied for table simulation_runs' },
    ]);
  });

  it('reports a measured duration rather than a synthesised one', async () => {
    const { client } = fakeClient({});
    let clock = 1_000;
    const response = await searchPlatformRecords('mtl', { client, now: () => (clock += 20) });
    expect(response.latencyMs).toBe(20);
  });
});

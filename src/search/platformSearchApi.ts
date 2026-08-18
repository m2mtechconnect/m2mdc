/**
 * Phase 4 - server-backed platform search.
 *
 * Before this module `/search` returned three hardcoded documents ("HIPAA
 * Compliance Guide", "Q4 Marketing Performance Report") attributed to Google
 * Drive, SharePoint and Zendesk - connectors this product does not have. The
 * capability registry meanwhile declared the page's data source as
 * "Authorized AURA records". This file makes that declaration true: every
 * result is a row the caller is authorized to read, returned by row-level
 * security, and carries the table and primary key it came from so a result
 * can be cited.
 *
 * No ranking is invented. Rows are matched with a case-insensitive substring
 * filter pushed to the database, grouped by record kind, and ordered by
 * recency inside each group. That is exactly what the UI claims it does.
 */
import { supabase } from '@/integrations/supabase/client';

/** The record families a caller can search. */
export type SearchRecordKind = 'facility' | 'agent' | 'connection' | 'run';

export interface PlatformSearchResult {
  /** `${kind}:${recordId}`, unique across sources. */
  id: string;
  kind: SearchRecordKind;
  title: string;
  subtitle: string;
  snippet: string;
  /** In-app destination for this record. Never an external URL. */
  route: string;
  /** Provenance: the table and primary key this row came from. */
  recordTable: string;
  recordId: string;
  /** ISO timestamp used for ordering, when the source has one. */
  updatedAt: string | null;
}

export interface SearchSourceFailure {
  kind: SearchRecordKind;
  message: string;
}

export interface PlatformSearchResponse {
  results: PlatformSearchResult[];
  /** Kinds actually queried on this round trip. */
  kindsQueried: SearchRecordKind[];
  /** Sources that errored. Reported, never silently dropped. */
  failures: SearchSourceFailure[];
  /** Measured round-trip duration. Not a simulated latency. */
  latencyMs: number;
}

type Row = Record<string, unknown>;

interface SearchSource {
  kind: SearchRecordKind;
  label: string;
  table: string;
  columns: string;
  /** Columns matched by the substring filter. */
  searchColumns: string[];
  /** Column used for recency ordering. */
  orderColumn: string;
  toResult: (row: Row) => PlatformSearchResult;
}

const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const num = (value: unknown): number | null => (typeof value === 'number' ? value : null);

/**
 * PostgREST `or=` uses commas to separate conditions and parentheses to group
 * them, and `%` is the LIKE wildcard. A raw user query containing any of them
 * would either break the request or widen the filter, so the term is reduced
 * to characters that can only ever be literal.
 */
export function sanitizeSearchTerm(query: string): string {
  return query
    .slice(0, 120)
    .replace(/[,()%*\\"'`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Builds the PostgREST `or` expression for one source. */
export function buildOrFilter(columns: string[], term: string): string {
  return columns.map((column) => `${column}.ilike.%${term}%`).join(',');
}

export const SEARCH_SOURCES: SearchSource[] = [
  {
    kind: 'facility',
    label: 'Facilities',
    table: 'data_centre_twins',
    columns: 'id,name,city,region_code,tier,capacity_kw,industry,updated_at',
    searchColumns: ['name', 'city', 'region_code', 'industry'],
    orderColumn: 'updated_at',
    toResult: (row) => {
      const capacity = num(row.capacity_kw);
      const facts = [
        str(row.tier) ? `Tier ${str(row.tier)}` : '',
        capacity !== null ? `${capacity.toLocaleString()} kW design capacity` : '',
        str(row.industry),
      ].filter(Boolean);
      return {
        id: `facility:${str(row.id)}`,
        kind: 'facility',
        title: str(row.name) || 'Untitled facility',
        subtitle: [str(row.city), str(row.region_code)].filter(Boolean).join(', '),
        snippet: facts.join(' · '),
        route: `/blueprint/${str(row.id)}`,
        recordTable: 'data_centre_twins',
        recordId: str(row.id),
        updatedAt: str(row.updated_at) || null,
      };
    },
  },
  {
    kind: 'agent',
    label: 'Agents',
    table: 'agent_definitions',
    columns: 'id,name,slug,domain,description,type,is_active,updated_at',
    searchColumns: ['name', 'slug', 'domain', 'description'],
    orderColumn: 'updated_at',
    toResult: (row) => ({
      id: `agent:${str(row.id)}`,
      kind: 'agent',
      title: str(row.name) || str(row.slug) || 'Untitled agent',
      subtitle: [str(row.domain), row.is_active === false ? 'inactive' : 'active']
        .filter(Boolean)
        .join(' · '),
      snippet: str(row.description),
      route: `/app/agents/${str(row.slug)}/detail`,
      recordTable: 'agent_definitions',
      recordId: str(row.id),
      updatedAt: str(row.updated_at) || null,
    }),
  },
  {
    kind: 'connection',
    label: 'Connections',
    table: 'connection_instances',
    columns: 'id,display_name,connector_id,environment,status,verification_state,updated_at',
    searchColumns: ['display_name', 'connector_id', 'environment'],
    orderColumn: 'updated_at',
    toResult: (row) => ({
      id: `connection:${str(row.id)}`,
      kind: 'connection',
      title: str(row.display_name) || str(row.connector_id) || 'Untitled connection',
      subtitle: [str(row.environment), str(row.status)].filter(Boolean).join(' · '),
      snippet: str(row.verification_state)
        ? `Verification state: ${str(row.verification_state)}`
        : '',
      route: '/manage/integrations',
      recordTable: 'connection_instances',
      recordId: str(row.id),
      updatedAt: str(row.updated_at) || null,
    }),
  },
  {
    kind: 'run',
    label: 'Simulation runs',
    table: 'simulation_runs',
    columns: 'id,run_label,scenario_name,scenario_key,status,engine_version,started_at,updated_at',
    searchColumns: ['run_label', 'scenario_name', 'scenario_key'],
    orderColumn: 'started_at',
    toResult: (row) => ({
      id: `run:${str(row.id)}`,
      kind: 'run',
      title: str(row.run_label) || str(row.scenario_name) || str(row.scenario_key) || 'Simulation run',
      subtitle: [str(row.status), str(row.engine_version)].filter(Boolean).join(' · '),
      snippet: str(row.scenario_key) ? `Scenario ${str(row.scenario_key)}` : '',
      route: `/simulation?run=${str(row.id)}`,
      recordTable: 'simulation_runs',
      recordId: str(row.id),
      updatedAt: str(row.started_at) || str(row.updated_at) || null,
    }),
  },
];

export const SEARCH_KINDS: SearchRecordKind[] = SEARCH_SOURCES.map((source) => source.kind);

export function labelForKind(kind: SearchRecordKind): string {
  return SEARCH_SOURCES.find((source) => source.kind === kind)?.label ?? kind;
}

/** Minimal shape this module needs. Injected so the query path is testable. */
export interface SearchClient {
  from: (table: string) => any;
}

export interface SearchOptions {
  kinds?: SearchRecordKind[];
  /** Rows requested per source. */
  limitPerSource?: number;
  client?: SearchClient;
  now?: () => number;
}

const DEFAULT_LIMIT = 10;

/**
 * Runs one search round trip. A source that fails is reported in `failures`
 * rather than failing the whole query, so one broken table does not hide the
 * records the caller can still see.
 */
export async function searchPlatformRecords(
  query: string,
  options: SearchOptions = {},
): Promise<PlatformSearchResponse> {
  const client = options.client ?? (supabase as unknown as SearchClient);
  const now = options.now ?? (() => Date.now());
  const limit = options.limitPerSource ?? DEFAULT_LIMIT;
  const requested = options.kinds?.length ? options.kinds : SEARCH_KINDS;
  const sources = SEARCH_SOURCES.filter((source) => requested.includes(source.kind));
  const term = sanitizeSearchTerm(query);
  const startedAt = now();

  if (!term) {
    return { results: [], kindsQueried: [], failures: [], latencyMs: 0 };
  }

  const settled = await Promise.all(
    sources.map(async (source) => {
      try {
        const { data, error } = await client
          .from(source.table)
          .select(source.columns)
          .or(buildOrFilter(source.searchColumns, term))
          .order(source.orderColumn, { ascending: false })
          .limit(limit);
        if (error) throw error;
        return { source, rows: (data ?? []) as Row[], error: null as string | null };
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        return { source, rows: [] as Row[], error: message };
      }
    }),
  );

  const results: PlatformSearchResult[] = [];
  const failures: SearchSourceFailure[] = [];
  for (const outcome of settled) {
    if (outcome.error) {
      failures.push({ kind: outcome.source.kind, message: outcome.error });
      continue;
    }
    for (const row of outcome.rows) results.push(outcome.source.toResult(row));
  }

  return {
    results,
    kindsQueried: sources.map((source) => source.kind),
    failures,
    latencyMs: Math.max(0, now() - startedAt),
  };
}

/**
 * AURA_CONNECTIONS_OPERATIONAL_UX_REDESIGN — presentation model.
 *
 * Pure, testable helpers that turn persisted control-plane records into the
 * shapes the operational workspace renders. Nothing here invents evidence:
 * every derived value is a function of records that already exist.
 */
import {
  STATUS_DESCRIPTORS,
  canAddConnection,
  type ConnectionInstance,
  type ConnectorDefinition,
  type HealthCheckRecord,
  type IngestRunRecord,
  type TwinMappingRecord,
} from './model';

/* ---------------------------------------------------------------- */
/* Connector identity                                                */
/* ---------------------------------------------------------------- */

export interface ConnectorGlyph {
  /** Two or three character protocol/vendor mark. */
  mark: string;
  /** Recognisable vendor or protocol name. */
  label: string;
  className: string;
}

const GLYPHS: Array<{ match: RegExp; glyph: ConnectorGlyph }> = [
  { match: /nvidia|dsx|omniverse/i, glyph: { mark: 'NV', label: 'NVIDIA', className: 'bg-[hsl(var(--primary))]/15 text-foreground' } },
  { match: /mqtt/i, glyph: { mark: 'MQ', label: 'MQTT', className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' } },
  { match: /opcua|opc_ua/i, glyph: { mark: 'OPC', label: 'OPC UA', className: 'bg-teal-500/15 text-teal-700 dark:text-teal-300' } },
  { match: /bacnet/i, glyph: { mark: 'BAC', label: 'BACnet', className: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300' } },
  { match: /modbus/i, glyph: { mark: 'MOD', label: 'Modbus', className: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300' } },
  { match: /snmp/i, glyph: { mark: 'SNM', label: 'SNMP', className: 'bg-slate-500/15 text-slate-700 dark:text-slate-300' } },
  { match: /prometheus|otel|opentelemetry|grafana/i, glyph: { mark: 'OBS', label: 'Observability', className: 'bg-orange-500/15 text-orange-700 dark:text-orange-300' } },
  { match: /usd|asset|manifest/i, glyph: { mark: 'USD', label: 'OpenUSD', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' } },
  { match: /supabase|platform/i, glyph: { mark: 'PLT', label: 'Platform', className: 'bg-muted text-muted-foreground' } },
  { match: /aws|s3|azure|gcp|google/i, glyph: { mark: 'CLD', label: 'Cloud', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' } },
];

export function connectorGlyph(definition?: ConnectorDefinition, fallbackId = ''): ConnectorGlyph {
  const probe = `${definition?.id ?? fallbackId} ${definition?.name ?? ''} ${definition?.provider ?? ''} ${(definition?.supported_protocols ?? []).join(' ')}`;
  const hit = GLYPHS.find((g) => g.match.test(probe));
  if (hit) return hit.glyph;
  const source = definition?.name ?? fallbackId ?? '?';
  return {
    mark: source.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() || '??',
    label: definition?.provider ?? 'Connector',
    className: 'bg-muted text-muted-foreground',
  };
}

/* ---------------------------------------------------------------- */
/* Catalogue availability                                            */
/* ---------------------------------------------------------------- */

export type Availability = 'AVAILABLE' | 'REQUIRES_GATEWAY' | 'REQUIRES_DEPLOYMENT' | 'PLANNED' | 'UNSUPPORTED';

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  AVAILABLE: 'Available',
  REQUIRES_GATEWAY: 'Requires gateway',
  REQUIRES_DEPLOYMENT: 'Requires deployment',
  PLANNED: 'Planned',
  UNSUPPORTED: 'Unsupported',
};

export function availabilityOf(definition: ConnectorDefinition): Availability {
  if (definition.implementation_status === 'UNSUPPORTED') return 'UNSUPPORTED';
  if (definition.implementation_status === 'PLANNED') return 'PLANNED';
  if (canAddConnection(definition)) return 'AVAILABLE';
  if (definition.category === 'DSX Exchange' || /gateway|exchange/i.test(definition.name)) return 'REQUIRES_GATEWAY';
  return 'REQUIRES_DEPLOYMENT';
}

export const CATALOGUE_FILTERS = [
  { id: 'available', label: 'Available now' },
  { id: 'Facility and OT', label: 'Facility and OT' },
  { id: 'DSX Exchange', label: 'NVIDIA DSX' },
  { id: 'Cloud and infrastructure', label: 'Cloud and infrastructure' },
  { id: 'Observability', label: 'Observability' },
  { id: 'Assets and engineering', label: 'Assets and engineering' },
  { id: 'Workflow and enterprise', label: 'Workflow and enterprise' },
] as const;

export type CatalogueFilterId = (typeof CATALOGUE_FILTERS)[number]['id'] | 'all';

export function matchesCatalogueFilter(definition: ConnectorDefinition, filter: CatalogueFilterId): boolean {
  if (filter === 'all') return true;
  if (filter === 'available') return availabilityOf(definition) === 'AVAILABLE';
  if (filter === 'Observability') {
    return definition.category === 'Observability' || /prometheus|otel|opentelemetry|grafana|metrics/i.test(`${definition.name} ${definition.id}`);
  }
  return definition.category === filter;
}

/* ---------------------------------------------------------------- */
/* Formatting                                                        */
/* ---------------------------------------------------------------- */

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Never';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Never' : date.toLocaleString();
}

export function formatRelative(value: string | null | undefined, now = Date.now()): string {
  if (!value) return 'No data';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return 'No data';
  const seconds = Math.max(0, Math.round((now - time) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
}

/* ---------------------------------------------------------------- */
/* Derived row and coverage model                                    */
/* ---------------------------------------------------------------- */

export interface MappingCoverage {
  total: number;
  active: number;
  valid: number;
  /** Percent of mappings that are active. Null when no mapping exists. */
  percent: number | null;
  label: string;
}

export function mappingCoverage(connectionId: string, mappings: TwinMappingRecord[]): MappingCoverage {
  const rows = mappings.filter((m) => m.connection_id === connectionId);
  const active = rows.filter((m) => m.active).length;
  const valid = rows.filter((m) => m.validation_status === 'VALID').length;
  const percent = rows.length === 0 ? null : Math.round((active / rows.length) * 100);
  return {
    total: rows.length,
    active,
    valid,
    percent,
    label: rows.length === 0 ? 'No mappings' : `${active}/${rows.length} active`,
  };
}

export interface ThroughputSummary {
  received: number;
  accepted: number;
  rejected: number;
  mappingFailures: number;
  label: string;
}

export function throughputFor(connectionId: string, runs: IngestRunRecord[]): ThroughputSummary {
  const rows = runs.filter((r) => r.connection_id === connectionId);
  const sum = (pick: (r: IngestRunRecord) => number) => rows.reduce((total, r) => total + (pick(r) || 0), 0);
  const received = sum((r) => r.records_received);
  return {
    received,
    accepted: sum((r) => r.records_accepted),
    rejected: sum((r) => r.records_rejected),
    mappingFailures: sum((r) => r.mapping_failures),
    label: rows.length === 0 ? 'No data' : `${received} received`,
  };
}

export interface ConnectionRow {
  connection: ConnectionInstance;
  definition?: ConnectorDefinition;
  glyph: ConnectorGlyph;
  lastCheck: HealthCheckRecord | null;
  coverage: MappingCoverage;
  throughput: ThroughputSummary;
  statusLabel: string;
  statusMeaning: string;
}

export function buildConnectionRows(
  connections: ConnectionInstance[],
  definitions: ConnectorDefinition[],
  healthChecks: HealthCheckRecord[],
  mappings: TwinMappingRecord[],
  runs: IngestRunRecord[],
): ConnectionRow[] {
  const byId = new Map(definitions.map((d) => [d.id, d]));
  return connections.map((connection) => {
    const definition = byId.get(connection.connector_id);
    const descriptor = STATUS_DESCRIPTORS[connection.status] ?? STATUS_DESCRIPTORS.DRAFT;
    return {
      connection,
      definition,
      glyph: connectorGlyph(definition, connection.connector_id),
      lastCheck: healthChecks.find((h) => h.connection_id === connection.id) ?? null,
      coverage: mappingCoverage(connection.id, mappings),
      throughput: throughputFor(connection.id, runs),
      statusLabel: descriptor.label,
      statusMeaning: connection.status_reason ?? descriptor.meaning,
    };
  });
}

export const ATTENTION_STATUSES = new Set([
  'DEGRADED',
  'FAILED',
  'BLOCKED',
  'CREDENTIAL_REQUIRED',
  'CONFIGURATION_REQUIRED',
]);

export interface AttentionItem {
  connectionId: string;
  name: string;
  status: string;
  reason: string;
  action: string;
}

export function attentionQueue(rows: ConnectionRow[]): AttentionItem[] {
  const ACTION: Record<string, string> = {
    CREDENTIAL_REQUIRED: 'Store a credential in the vault',
    CONFIGURATION_REQUIRED: 'Complete the connection configuration',
    FAILED: 'Re-run the server-side health check',
    DEGRADED: 'Review rejected records and mapping failures',
    BLOCKED: 'Resolve the named deployment blocker',
    CONNECTED_NO_DATA: 'Publish a signal or verify the source topic',
  };
  return rows
    .filter((r) => ATTENTION_STATUSES.has(r.connection.status) || r.connection.status === 'CONNECTED_NO_DATA')
    .map((r) => ({
      connectionId: r.connection.id,
      name: r.connection.display_name,
      status: r.statusLabel,
      reason: r.statusMeaning,
      action: ACTION[r.connection.status] ?? 'Open the connection to review evidence',
    }));
}

/* ---------------------------------------------------------------- */
/* Topology                                                          */
/* ---------------------------------------------------------------- */

export interface TopologyNode {
  id: 'sources' | 'gateway' | 'twin' | 'destinations';
  title: string;
  subtitle: string;
  count: number;
  state: 'active' | 'partial' | 'inactive';
  detail: string;
}

export interface TopologyEdge {
  from: TopologyNode['id'];
  to: TopologyNode['id'];
  label: string;
  state: 'active' | 'inactive';
}

export function buildTopology(
  rows: ConnectionRow[],
  eventCount: number,
  mappings: TwinMappingRecord[],
): { nodes: TopologyNode[]; edges: TopologyEdge[] } {
  const facility = rows.filter((r) => r.definition?.category === 'Facility and OT');
  const gateway = rows.filter((r) => r.definition?.category === 'DSX Exchange');
  const destinations = rows.filter(
    (r) => r.definition?.category === 'Assets and engineering' || r.definition?.category === 'Cloud and infrastructure',
  );
  const flowing = (list: ConnectionRow[]) => list.filter((r) => r.connection.status === 'HEALTHY' || r.connection.status === 'SYNCING').length;
  const activeMappings = mappings.filter((m) => m.active).length;

  const node = (
    id: TopologyNode['id'],
    title: string,
    subtitle: string,
    count: number,
    live: number,
    detail: string,
  ): TopologyNode => ({
    id,
    title,
    subtitle,
    count,
    state: live > 0 ? 'active' : count > 0 ? 'partial' : 'inactive',
    detail,
  });

  const nodes: TopologyNode[] = [
    node('sources', 'Facility and OT sources', 'BMS, DCIM, meters', facility.length, flowing(facility),
      facility.length === 0 ? 'No facility source is configured.' : `${flowing(facility)} of ${facility.length} supplying data.`),
    node('gateway', 'Gateway / DSX Exchange', 'Ingest and validation', gateway.length, flowing(gateway),
      eventCount > 0 ? `${eventCount} events accepted.` : 'Zero events accepted by the ingest gateway.'),
    node('twin', 'AURA twin', 'Mapped twin properties', activeMappings, activeMappings,
      activeMappings === 0 ? 'No active signal-to-twin mapping.' : `${activeMappings} active mappings.`),
    node('destinations', 'OpenUSD and cloud', 'Assets and downstream', destinations.length, flowing(destinations),
      destinations.length === 0 ? 'No downstream destination is configured.' : `${flowing(destinations)} of ${destinations.length} reachable.`),
  ];

  const edgeState = (a: TopologyNode, b: TopologyNode): 'active' | 'inactive' =>
    a.state === 'active' && b.state === 'active' ? 'active' : 'inactive';
  const [sources, gw, twin, dest] = nodes;
  const edges: TopologyEdge[] = [
    { from: 'sources', to: 'gateway', label: eventCount > 0 ? `${eventCount} events` : 'No events', state: edgeState(sources, gw) },
    { from: 'gateway', to: 'twin', label: activeMappings > 0 ? `${activeMappings} mappings` : 'No mappings', state: edgeState(gw, twin) },
    { from: 'twin', to: 'destinations', label: dest.count > 0 ? `${dest.count} destinations` : 'No destination', state: edgeState(twin, dest) },
  ];
  return { nodes, edges };
}

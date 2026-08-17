/**
 * AURA_CONNECTIONS_CONTROL_PLANE_REFACTOR — canonical domain model.
 *
 * A connector DEFINITION describes what AURA knows how to connect to.
 * A connection INSTANCE is one configured connection for a tenant, facility
 * and environment. The two are never conflated: catalogue rows are not
 * counted as connected systems anywhere in this module.
 */

export const CONNECTION_STATUSES = [
  'DRAFT',
  'CONFIGURATION_REQUIRED',
  'CREDENTIAL_REQUIRED',
  'READY_TO_TEST',
  'TESTING',
  'CONNECTED_NO_DATA',
  'HEALTHY',
  'SYNCING',
  'DEGRADED',
  'FAILED',
  'DISABLED',
  'NOT_DEPLOYED',
  'UNSUPPORTED',
  'BLOCKED',
] as const;

export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

export type StatusTone = 'positive' | 'neutral' | 'caution' | 'critical';

export interface StatusDescriptor {
  label: string;
  tone: StatusTone;
  /** What evidence the status asserts. Never a vague "available". */
  meaning: string;
}

export const STATUS_DESCRIPTORS: Record<ConnectionStatus, StatusDescriptor> = {
  DRAFT: { label: 'Draft', tone: 'neutral', meaning: 'Created but not configured.' },
  CONFIGURATION_REQUIRED: { label: 'Configuration required', tone: 'caution', meaning: 'Required configuration fields are missing.' },
  CREDENTIAL_REQUIRED: { label: 'Credential required', tone: 'caution', meaning: 'No server-side credential reference is attached.' },
  READY_TO_TEST: { label: 'Ready to test', tone: 'neutral', meaning: 'Configured. No health check has been executed yet.' },
  TESTING: { label: 'Testing', tone: 'neutral', meaning: 'A server-side health check is in progress.' },
  CONNECTED_NO_DATA: { label: 'Connected, no data', tone: 'caution', meaning: 'Endpoint reachable and authorised. Zero records or events received.' },
  HEALTHY: { label: 'Healthy', tone: 'positive', meaning: 'Last health check passed and data has been received.' },
  SYNCING: { label: 'Syncing', tone: 'positive', meaning: 'An ingest or synchronisation run is active.' },
  DEGRADED: { label: 'Degraded', tone: 'caution', meaning: 'Partially working: rejections, latency or mapping failures observed.' },
  FAILED: { label: 'Failed', tone: 'critical', meaning: 'Last health check or ingest run failed.' },
  DISABLED: { label: 'Disabled', tone: 'neutral', meaning: 'Deliberately switched off by an administrator.' },
  NOT_DEPLOYED: { label: 'Not deployed', tone: 'neutral', meaning: 'The upstream system is not deployed in this environment.' },
  UNSUPPORTED: { label: 'Unsupported', tone: 'neutral', meaning: 'No runtime adapter exists for this connector.' },
  BLOCKED: { label: 'Blocked', tone: 'caution', meaning: 'Implemented but prevented from running by a named blocker.' },
};

export type ImplementationStatus =
  | 'IMPLEMENTED'
  | 'IMPLEMENTED_NOT_WIRED'
  | 'PLANNED'
  | 'UNSUPPORTED';

export interface ConnectorDefinition {
  id: string;
  name: string;
  category: string;
  provider: string;
  version: string;
  implementation_status: ImplementationStatus;
  supported_directions: string[];
  supported_auth_methods: string[];
  supported_data_classes: string[];
  supported_protocols: string[];
  configuration_schema: Record<string, unknown>;
  mapping_required: boolean;
  documentation_url: string | null;
  validation_status: string;
  runtime_adapter: string | null;
  availability: string;
  capability_evidence: Array<{ kind?: string; note?: string }>;
}

export interface ConnectionInstance {
  id: string;
  connector_id: string;
  tenant_id: string | null;
  facility_id: string | null;
  environment: string;
  display_name: string;
  status: ConnectionStatus;
  data_direction: string;
  endpoint_reference: string | null;
  credential_reference: string | null;
  /** Non-secret provisioning metadata (auth method, data classes, origin). */
  configuration?: Record<string, unknown> | null;
  owner_id: string | null;
  is_system: boolean;
  enabled: boolean;
  status_reason: string | null;
  last_tested_at: string | null;
  last_success_at: string | null;
  last_ingest_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  /** Operator-triggered runtime verification evidence. */
  verification_state?: 'NOT_VERIFIED' | 'PARTIAL' | 'VERIFIED' | 'FAILED' | null;
  verification_reason?: string | null;
  last_verification_at?: string | null;
}

export interface HealthCheckRecord {
  id: string;
  connection_id: string;
  check_type: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  latency_ms: number | null;
  dns_result: string | null;
  network_result: string | null;
  tls_result: string | null;
  auth_result: string | null;
  schema_result: string | null;
  mapping_result: string | null;
  data_availability: string | null;
  error_code: string | null;
  safe_message: string | null;
  correlation_id: string | null;
}

export interface IngestRunRecord {
  id: string;
  connection_id: string;
  started_at: string;
  completed_at: string | null;
  records_received: number;
  records_accepted: number;
  records_rejected: number;
  mapping_failures: number;
  duplicate_events: number;
  retries: number;
  dead_letter_count: number;
  final_status: string;
}

export interface TwinMappingRecord {
  id: string;
  connection_id: string;
  source_identifier: string;
  target_facility_id: string | null;
  target_entity: string | null;
  target_prim_path: string | null;
  target_property: string | null;
  source_unit: string | null;
  target_unit: string | null;
  conversion_rule: string | null;
  data_type: string;
  direction: string;
  quality_rule: string | null;
  timestamp_rule: string | null;
  validation_status: string;
  active: boolean;
  last_mapped_value: unknown;
  last_mapped_at: string | null;
}

/**
 * Evidence-derived status. A status is never chosen to make a connection look
 * healthier: it is computed from the last health check and observed data.
 */
export interface StatusEvidence {
  enabled: boolean;
  deployed: boolean;
  runtimeAdapter: string | null;
  implementation: ImplementationStatus;
  credentialRequired: boolean;
  credentialReference: string | null;
  lastCheckStatus?: 'PASSED' | 'FAILED' | 'RUNNING' | null;
  recordsReceived?: number;
  recordsRejected?: number;
}

export function deriveConnectionStatus(evidence: StatusEvidence): ConnectionStatus {
  if (!evidence.deployed) return 'NOT_DEPLOYED';
  if (evidence.implementation === 'UNSUPPORTED' || (!evidence.runtimeAdapter && evidence.implementation === 'PLANNED')) {
    return 'UNSUPPORTED';
  }
  if (evidence.implementation === 'IMPLEMENTED_NOT_WIRED') return 'BLOCKED';
  if (!evidence.enabled) return 'DISABLED';
  if (evidence.credentialRequired && !evidence.credentialReference) return 'CREDENTIAL_REQUIRED';
  if (evidence.lastCheckStatus === 'RUNNING') return 'TESTING';
  if (evidence.lastCheckStatus === 'FAILED') return 'FAILED';
  if (!evidence.lastCheckStatus) return 'READY_TO_TEST';
  const received = evidence.recordsReceived ?? 0;
  if (received === 0) return 'CONNECTED_NO_DATA';
  if ((evidence.recordsRejected ?? 0) > 0) return 'DEGRADED';
  return 'HEALTHY';
}

/** Only connectors with a real runtime adapter may be configured. */
export function canAddConnection(definition: ConnectorDefinition): boolean {
  return definition.implementation_status === 'IMPLEMENTED' && Boolean(definition.runtime_adapter);
}

/** Health checks may only run where a server-side probe exists. */
export const SERVER_PROBE_CONNECTORS = new Set([
  'supabase_platform',
  'dsx_ingest_gateway',
  'openusd_storage',
  'asset_manifest',
]);

export function canRunHealthCheck(connection: ConnectionInstance): boolean {
  return SERVER_PROBE_CONNECTORS.has(connection.connector_id) && connection.enabled;
}

/** Operational data sources are facility/OT telemetry sources actually supplying data. */
export function isOperationalDataSource(
  connection: ConnectionInstance,
  definition: ConnectorDefinition | undefined,
): boolean {
  if (!definition) return false;
  if (definition.category !== 'Facility and OT' && definition.category !== 'DSX Exchange') return false;
  return connection.status === 'HEALTHY' || connection.status === 'SYNCING';
}

export interface ConnectionSummary {
  operationalDataSources: number;
  platformServices: number;
  healthy: number;
  degraded: number;
  needsAttention: number;
  events: number;
  lastIngestAt: string | null;
}

export function summariseConnections(
  connections: ConnectionInstance[],
  definitions: ConnectorDefinition[],
  eventCount: number,
): ConnectionSummary {
  const byId = new Map(definitions.map((d) => [d.id, d]));
  const attention: ConnectionStatus[] = ['DEGRADED', 'FAILED', 'BLOCKED', 'CREDENTIAL_REQUIRED', 'CONFIGURATION_REQUIRED'];
  const lastIngest = connections
    .map((c) => c.last_ingest_at)
    .filter((v): v is string => Boolean(v))
    .sort()
    .pop() ?? null;
  return {
    operationalDataSources: connections.filter((c) => isOperationalDataSource(c, byId.get(c.connector_id))).length,
    platformServices: connections.filter((c) => byId.get(c.connector_id)?.category === 'Platform service' && c.status === 'HEALTHY').length,
    healthy: connections.filter((c) => c.status === 'HEALTHY').length,
    degraded: connections.filter((c) => c.status === 'DEGRADED').length,
    needsAttention: connections.filter((c) => attention.includes(c.status)).length,
    events: eventCount,
    lastIngestAt: lastIngest,
  };
}

export const CATALOGUE_CATEGORIES = [
  'Platform service',
  'Facility and OT',
  'DSX Exchange',
  'Cloud and infrastructure',
  'Assets and engineering',
  'Workflow and enterprise',
] as const;
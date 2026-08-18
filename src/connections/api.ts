/**
 * Server-backed reads for the Connections control plane. Every record in the
 * UI comes from these queries — nothing is a hardcoded status object.
 *
 * Tenant isolation: row-level security scopes every table to the caller's
 * tenant (platform-scope rows have a null tenant). The client additionally
 * filters connection instances by the resolved tenant so an over-broad policy
 * change can never silently widen what the UI renders.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  ConnectionInstance,
  ConnectorDefinition,
  HealthCheckRecord,
  IngestRunRecord,
  TwinMappingRecord,
} from './model';

/** The generated types file does not yet know these tables. */
const db = supabase as unknown as {
  // Chaining on the Postgrest builder is dynamic; the concrete row shapes are
  // asserted at each call site below.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped generated tables
  from: (table: string) => any;
  functions: typeof supabase.functions;
};

export interface AuditEventRecord {
  id: string;
  actor_id: string | null;
  action: string;
  connection_id: string | null;
  previous_state: string | null;
  new_state: string | null;
  correlation_id: string | null;
  created_at: string;
}

async function selectAll<T>(table: string, order: string, ascending = false): Promise<T[]> {
  const { data, error } = await db.from(table).select('*').order(order, { ascending });
  if (error) throw error;
  return (data ?? []) as T[];
}

/** The caller's tenant, resolved from their profile. Null means no tenant. */
export async function fetchCurrentTenantId(): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;
  const { data, error } = await db
    .from('profiles')
    .select('org_id')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (error) return null;
  return (data?.org_id as string | null) ?? null;
}

export function useCurrentTenantId() {
  return useQuery({
    queryKey: ['current-tenant-id'],
    queryFn: fetchCurrentTenantId,
    staleTime: 300_000,
  });
}

export function useConnectorDefinitions() {
  return useQuery({
    queryKey: ['connector-definitions'],
    queryFn: () => selectAll<ConnectorDefinition>('connector_definitions', 'name', true),
    staleTime: 60_000,
  });
}

export function useConnectionInstances() {
  return useQuery({
    queryKey: ['connection-instances'],
    queryFn: async (): Promise<ConnectionInstance[]> => {
      const tenantId = await fetchCurrentTenantId();
      let query = db.from('connection_instances').select('*').order('created_at', { ascending: true });
      // Platform-scope rows (null tenant) plus the caller's own tenant.
      query = tenantId ? query.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`) : query.is('tenant_id', null);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ConnectionInstance[];
    },
  });
}

export function useTwinMappings() {
  return useQuery({
    queryKey: ['connection-twin-mappings'],
    queryFn: () => selectAll<TwinMappingRecord>('connection_twin_mappings', 'created_at'),
  });
}

export function useHealthChecks() {
  return useQuery({
    queryKey: ['connection-health-checks'],
    queryFn: () => selectAll<HealthCheckRecord>('connection_health_checks', 'started_at'),
  });
}

export function useIngestRuns() {
  return useQuery({
    queryKey: ['connection-ingest-runs'],
    queryFn: () => selectAll<IngestRunRecord>('connection_ingest_runs', 'started_at'),
  });
}

export function useAuditEvents() {
  return useQuery({
    queryKey: ['connection-audit-events'],
    queryFn: () => selectAll<AuditEventRecord>('connection_audit_events', 'created_at'),
  });
}

/** DSX ingest evidence: the authoritative event count for the platform. */
export function useDsxEventCount() {
  return useQuery({
    queryKey: ['dsx-event-count'],
    queryFn: async () => {
      const { count, error } = await db
        .from('dsx_events')
        .select('id', { count: 'exact', head: true });
      if (error) return 0;
      return count ?? 0;
    },
  });
}

export interface HealthCheckResult {
  status: 'PASSED' | 'FAILED';
  latency_ms?: number;
  network_result?: string;
  auth_result?: string;
  schema_result?: string;
  data_availability?: string;
  safe_message?: string;
  correlation_id?: string;
  error_code?: string;
}

/**
 * Health checks are executed server-side only. The browser never receives or
 * submits credentials; it passes a connection id and reads a sanitized result.
 */
export async function runHealthCheck(connectionId: string): Promise<HealthCheckResult> {
  const { data, error } = await supabase.functions.invoke<HealthCheckResult>('connection-health-check', {
    body: { connection_id: connectionId },
  });
  if (error) throw error;
  return data as HealthCheckResult;
}

export interface RuntimeVerificationResult {
  previous_state: string;
  verification_state: 'NOT_VERIFIED' | 'PARTIAL' | 'VERIFIED' | 'FAILED';
  reason_code: string;
  safe_message: string;
  record_count: number | null;
  latency_ms: number;
  correlation_id: string;
}

/**
 * Operator-triggered runtime verification. The server runs the managed
 * read-only probe and derives the state; the client cannot assert it.
 */
export async function runRuntimeVerification(connectionId: string): Promise<RuntimeVerificationResult> {
  const { data, error } = await supabase.functions.invoke<RuntimeVerificationResult>('managed-connector-verify', {
    body: { connection_id: connectionId },
  });
  if (error) {
    const detail = 'context' in error && error.context ? await (error.context as Response).text().catch(() => '') : '';
    let message = error.message;
    try {
      const parsed = detail ? JSON.parse(detail) : null;
      if (parsed?.safe_message || parsed?.error_code) message = parsed.safe_message ?? parsed.error_code;
    } catch {
      /* keep the transport message */
    }
    throw new Error(message);
  }
  return data as RuntimeVerificationResult;
}

export interface FacilityOption {
  id: string;
  name: string;
}

/** Facilities a mapping may target. Sourced from the twin records themselves. */
export function useFacilityOptions() {
  return useQuery({
    queryKey: ['mapping-facility-options'],
    queryFn: async (): Promise<FacilityOption[]> => {
      const { data, error } = await db
        .from('data_centre_twins')
        .select('id, name')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as FacilityOption[];
    },
    staleTime: 60_000,
  });
}

export interface TenantOption {
  id: string;
  name: string;
}

/** Tenants a connection may be scoped to. Read is RLS-scoped to the caller. */
export function useTenantOptions() {
  return useQuery({
    queryKey: ['connection-tenant-options'],
    queryFn: async (): Promise<TenantOption[]> => {
      const { data, error } = await db.from('organizations').select('id, name').order('name', { ascending: true });
      if (error) return [];
      return (data ?? []) as TenantOption[];
    },
    staleTime: 60_000,
  });
}

/**
 * Provisioning runs server-side only: role checks, connector eligibility,
 * duplicate rejection and audit writes all happen in the edge function.
 */
async function provision<T>(payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('connection-provision', { body: payload });
  if (error) {
    const details = 'context' in error && (error as { context?: { text?: () => Promise<string> } }).context?.text
      ? await (error as { context: { text: () => Promise<string> } }).context.text()
      : error.message;
    let message = details;
    try {
      const parsed = JSON.parse(details);
      message = parsed.safe_message ?? parsed.error_code ?? details;
    } catch { /* details is not JSON */ }
    throw new Error(message);
  }
  return data as T;
}

export interface CreateConnectionInput {
  connector_id: string;
  tenant_id: string | null;
  facility_id: string | null;
  environment: string;
  display_name: string;
  data_direction: string;
  data_classes: string[];
  auth_method: string;
}

export async function createConnection(input: CreateConnectionInput): Promise<ConnectionInstance> {
  const result = await provision<{ connection: ConnectionInstance }>({ action: 'create', ...input });
  return result.connection;
}

export async function activateConnection(connectionId: string): Promise<string> {
  const result = await provision<{ status: string }>({ action: 'activate', connection_id: connectionId });
  return result.status;
}

export async function deactivateConnection(connectionId: string): Promise<void> {
  await provision({ action: 'deactivate', connection_id: connectionId });
}

export async function deleteConnection(connectionId: string): Promise<void> {
  await provision({ action: 'delete', connection_id: connectionId });
}

type MappingWrite = Omit<TwinMappingRecord, 'id' | 'last_mapped_value' | 'last_mapped_at'> & {
  validation_status: string;
};

/** Writes are RLS-gated to admin and owner roles; failures surface verbatim. */
export async function saveTwinMapping(id: string | null, record: MappingWrite): Promise<string> {
  if (id) {
    const { error } = await db.from('connection_twin_mappings').update(record).eq('id', id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await db
    .from('connection_twin_mappings')
    .insert(record)
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function setTwinMappingActive(id: string, active: boolean): Promise<void> {
  const { error } = await db.from('connection_twin_mappings').update({ active }).eq('id', id);
  if (error) throw error;
}

export async function deleteTwinMapping(id: string): Promise<void> {
  const { error } = await db.from('connection_twin_mappings').delete().eq('id', id);
  if (error) throw error;
}
/* ------------------------------------------------------------------ */
/* Credential vault                                                    */
/* ------------------------------------------------------------------ */

/**
 * Credential metadata is the only credential-shaped thing that ever reaches
 * the browser. Ciphertext lives in a backend-only table, the plaintext exists
 * solely inside an edge function invocation, and no endpoint returns either.
 */
export interface CredentialMetadata {
  connection_id: string;
  auth_method: string;
  /** Short SHA-256 prefix operators can compare with the source system. */
  fingerprint: string;
  version: number;
  status: string;
  expires_at: string | null;
  last_rotated_at: string;
  created_at: string;
}

async function vault<T>(payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('connection-credential', { body: payload });
  if (error) {
    const details = 'context' in error && (error as { context?: { text?: () => Promise<string> } }).context?.text
      ? await (error as { context: { text: () => Promise<string> } }).context.text()
      : error.message;
    let message = details;
    try {
      const parsed = JSON.parse(details);
      message = parsed.safe_message ?? parsed.error_code ?? details;
    } catch { /* details is not JSON */ }
    throw new Error(message);
  }
  return data as T;
}

/** Vault metadata for every connection visible to the caller's tenant. */
export function useConnectionCredentials(enabled = true) {
  return useQuery({
    queryKey: ['connection-credentials'],
    enabled,
    queryFn: async (): Promise<CredentialMetadata[]> => {
      try {
        const result = await vault<{ credentials: CredentialMetadata[] }>({ action: 'list' });
        return result.credentials ?? [];
      } catch {
        // Non-admins are refused by design; the UI renders "not visible".
        return [];
      }
    },
    staleTime: 30_000,
  });
}

/** Stores or rotates the credential. The value leaves the browser exactly once. */
export async function storeConnectionCredential(
  connectionId: string,
  secret: string,
  options: { authMethod?: string; expiresAt?: string | null; rotate?: boolean } = {},
): Promise<CredentialMetadata> {
  const result = await vault<{ credential: CredentialMetadata }>({
    action: options.rotate ? 'rotate' : 'store',
    connection_id: connectionId,
    secret,
    auth_method: options.authMethod,
    expires_at: options.expiresAt ?? null,
  });
  return result.credential;
}

export async function getConnectionCredentialStatus(connectionId: string): Promise<CredentialMetadata | null> {
  const result = await vault<{ credential: CredentialMetadata | null }>({
    action: 'status',
    connection_id: connectionId,
  });
  return result.credential;
}

/** Destroys the stored material and disables the connection. */
export async function revokeConnectionCredential(connectionId: string): Promise<void> {
  await vault({ action: 'revoke', connection_id: connectionId });
}

/* ------------------------------------------------------------------ */
/* Data contracts                                                      */
/* ------------------------------------------------------------------ */

export interface DataContractRecord {
  id: string;
  connection_id: string;
  name: string;
  version: string | null;
  direction: string | null;
  schema_reference: string | null;
  validation_status: string | null;
  unit_rules: unknown;
  required_fields: unknown;
  created_at: string;
}

/** Contracts declare the shape a connection is allowed to exchange. */
export function useDataContracts() {
  return useQuery({
    queryKey: ['connection-data-contracts'],
    queryFn: async (): Promise<DataContractRecord[]> => {
      const { data, error } = await db
        .from('connection_data_contracts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) return [];
      return (data ?? []) as DataContractRecord[];
    },
    staleTime: 60_000,
  });
}

/**
 * Server-backed reads for the Connections control plane. Every record in the
 * UI comes from these queries, nothing is a hardcoded status object.
 *
 * Tenant isolation is fail closed. The browser resolves active_org_id() and
 * never widens a read to null-tenant platform scope. Edge functions re-check
 * the same organization authority before every privileged operation.
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

const db = supabase as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types do not yet include every connection table
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

/**
 * The caller's active organization, resolved by the server from membership
 * authority. Null means no active organization and all tenant reads fail closed.
 */
export async function fetchCurrentTenantId(): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;
  const { data, error } = await supabase.rpc('active_org_id');
  if (error) return null;
  return typeof data === 'string' && data.length > 0 ? data : null;
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
      if (!tenantId) throw new Error('An active organization is required to load connections.');
      const { data, error } = await db
        .from('connection_instances')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });
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

/** DSX ingest evidence. RLS remains authoritative for the visible event count. */
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

/** Canonical, non-placeholder facilities in the caller's active organization. */
export function useFacilityOptions() {
  return useQuery({
    queryKey: ['mapping-facility-options'],
    queryFn: async (): Promise<FacilityOption[]> => {
      const tenantId = await fetchCurrentTenantId();
      if (!tenantId) return [];
      const { data, error } = await db
        .from('data_centre_twins')
        .select('id, name, metadata, org_id')
        .eq('org_id', tenantId)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? [])
        .filter((row: { metadata?: { provisioned?: string } | null }) => row.metadata?.provisioned !== 'default_starter_twin')
        .map((row: { id: string; name: string }) => ({ id: row.id, name: row.name }));
    },
    staleTime: 60_000,
  });
}

export interface TenantOption {
  id: string;
  name: string;
}

/** Retained for non-provisioning display use only. Provisioning never trusts it. */
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
    } catch {
      /* details is not JSON */
    }
    throw new Error(message);
  }
  return data as T;
}

export interface CreateConnectionInput {
  connector_id: string;
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

export interface CredentialMetadata {
  connection_id: string;
  auth_method: string;
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
    } catch {
      /* details is not JSON */
    }
    throw new Error(message);
  }
  return data as T;
}

export function useConnectionCredentials(enabled = true) {
  return useQuery({
    queryKey: ['connection-credentials'],
    enabled,
    queryFn: async (): Promise<CredentialMetadata[]> => {
      try {
        const result = await vault<{ credentials: CredentialMetadata[] }>({ action: 'list' });
        return result.credentials ?? [];
      } catch {
        return [];
      }
    },
    staleTime: 30_000,
  });
}

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

export async function revokeConnectionCredential(connectionId: string): Promise<void> {
  await vault({ action: 'revoke', connection_id: connectionId });
}

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

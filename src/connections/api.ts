/**
 * Server-backed reads for the Connections control plane. Every record in the
 * UI comes from these queries — nothing is a hardcoded status object.
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
    queryFn: () => selectAll<ConnectionInstance>('connection_instances', 'created_at', true),
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
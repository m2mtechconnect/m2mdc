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
/**
 * Evidence writer. Every runtime fact — worker state, ingest run, per-message
 * outcome, twin property update, audit event — is written with the service
 * role, tenant-stamped, and carries a correlation ID.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AcceptedDecision, PipelineDecision } from '../../../src/runtime/mqtt/pipeline.js';

export interface RunCounters {
  received: number;
  accepted: number;
  rejected: number;
  duplicates: number;
  mappingFailures: number;
  deadLetters: number;
  retries: number;
  mappedProperties: number;
  maxLatencyMs: number;
}

export function emptyCounters(): RunCounters {
  return {
    received: 0, accepted: 0, rejected: 0, duplicates: 0,
    mappingFailures: 0, deadLetters: 0, retries: 0, mappedProperties: 0, maxLatencyMs: 0,
  };
}

export class EvidenceStore {
  readonly client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  }

  async loadConnection(connectionId: string) {
    const { data, error } = await this.client
      .from('connection_instances')
      .select('*')
      .eq('id', connectionId)
      .maybeSingle();
    if (error) throw new Error(`connection load failed: ${error.message}`);
    return data;
  }

  async loadContract(connectorId: string) {
    const { data, error } = await this.client
      .from('connection_data_contracts')
      .select('id, schema_type, schema_version, validation_status')
      .eq('connector_id', connectorId)
      .eq('direction', 'inbound')
      .order('schema_version', { ascending: false })
      .limit(1);
    if (error) throw new Error(`contract load failed: ${error.message}`);
    return data?.[0] ?? null;
  }

  async loadMappings(connectionId: string) {
    const { data, error } = await this.client
      .from('connection_twin_mappings')
      .select('*')
      .eq('connection_id', connectionId);
    if (error) throw new Error(`mapping load failed: ${error.message}`);
    return data ?? [];
  }

  /** Active credential for the connection, or null when missing/revoked. */
  async loadCredential(connectionId: string) {
    const { data, error } = await this.client
      .from('connection_credentials')
      .select('id, ciphertext, status, auth_method, version, expires_at')
      .eq('connection_id', connectionId)
      .maybeSingle();
    if (error) throw new Error(`credential load failed: ${error.message}`);
    if (!data || data.status !== 'active') return null;
    if (data.expires_at && Date.parse(data.expires_at) < Date.now()) return null;
    return data;
  }

  async registerWorker(row: Record<string, unknown>) {
    const { error } = await this.client
      .from('connection_runtime_workers')
      .upsert(row, { onConflict: 'worker_id' });
    if (error) throw new Error(`worker registration failed: ${error.message}`);
  }

  async updateWorker(workerId: string, patch: Record<string, unknown>) {
    const { error } = await this.client
      .from('connection_runtime_workers')
      .update({ ...patch, last_heartbeat_at: new Date().toISOString() })
      .eq('worker_id', workerId);
    if (error) throw new Error(`worker update failed: ${error.message}`);
  }

  async startRun(row: Record<string, unknown>): Promise<string> {
    const { data, error } = await this.client
      .from('connection_ingest_runs')
      .insert(row)
      .select('id')
      .single();
    if (error) throw new Error(`ingest run start failed: ${error.message}`);
    return data.id as string;
  }

  async updateRun(runId: string, counters: RunCounters, finalStatus: string, completed: boolean) {
    const { error } = await this.client
      .from('connection_ingest_runs')
      .update({
        records_received: counters.received,
        records_accepted: counters.accepted,
        records_rejected: counters.rejected,
        duplicate_events: counters.duplicates,
        mapping_failures: counters.mappingFailures,
        dead_letter_count: counters.deadLetters,
        retries: counters.retries,
        mapped_properties: counters.mappedProperties,
        max_latency_ms: counters.maxLatencyMs,
        final_status: finalStatus,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq('id', runId);
    if (error) throw new Error(`ingest run update failed: ${error.message}`);
  }

  async recordMessage(params: {
    decision: PipelineDecision;
    connectionId: string;
    tenantId: string | null;
    runId: string;
    workerId: string;
    evidenceClass: string;
    processingMs: number;
  }): Promise<string | null> {
    const d = params.decision;
    const row = {
      connection_id: params.connectionId,
      ingest_run_id: params.runId,
      tenant_id: params.tenantId,
      worker_id: params.workerId,
      correlation_id: d.correlation_id,
      topic: d.topic,
      qos: d.qos,
      payload_bytes: d.payload_bytes,
      payload_hash: d.payload_hash,
      event_id: d.event_id,
      observed_at: d.observed_at,
      outcome: d.outcome,
      rejection_reason: d.outcome === 'ACCEPTED' ? null : d.reason,
      detail: d.outcome === 'ACCEPTED' ? 'validated against contract and mapped' : d.detail,
      contract_id: d.contract_id,
      mapping_id: d.outcome === 'ACCEPTED' ? d.mapping.id : d.mapping_id,
      processing_latency_ms: Math.round(params.processingMs),
      transport_latency_ms: d.outcome === 'ACCEPTED' ? d.transport_latency_ms : null,
      evidence_class: params.evidenceClass,
    };
    const { data, error } = await this.client
      .from('connection_ingest_messages')
      .insert(row)
      .select('id')
      .single();
    if (error) {
      // A unique-violation here means the event was already accepted: the
      // database is the final replay guard.
      if (error.code === '23505') return null;
      throw new Error(`message evidence write failed: ${error.message}`);
    }
    return data.id as string;
  }

  /** Applies one accepted observation to its tenant-scoped twin property. */
  async applyTwinProperty(params: {
    decision: AcceptedDecision;
    connectionId: string;
    tenantId: string | null;
    messageId: string | null;
  }) {
    const d = params.decision;
    const target = d.mapping.target_entity ?? d.mapping.target_prim_path ?? 'unknown';
    const property = d.mapping.target_property ?? 'unknown';
    const now = new Date().toISOString();
    const row = {
      tenant_id: params.tenantId,
      facility_id: d.mapping.target_facility_id,
      target_entity: target,
      target_prim_path: d.mapping.target_prim_path,
      target_property: property,
      value_numeric: d.value,
      unit: d.unit,
      observed_at: d.observed_at,
      received_at: now,
      applied_at: now,
      source_connection_id: params.connectionId,
      source_contract_id: d.contract_id,
      source_mapping_id: d.mapping.id,
      source_message_id: params.messageId,
      correlation_id: d.correlation_id,
      provenance_class: d.provenance.provenance_class,
      provenance_reason: d.provenance.reason,
      updated_at: now,
    };

    // The uniqueness index is expression-based (COALESCE on tenant_id), so an
    // explicit read-then-write is used rather than an ON CONFLICT target.
    let existing = this.client
      .from('twin_property_values')
      .select('id')
      .eq('target_entity', target)
      .eq('target_property', property);
    existing = params.tenantId
      ? existing.eq('tenant_id', params.tenantId)
      : existing.is('tenant_id', null);
    const { data: found, error: findError } = await existing.maybeSingle();
    if (findError) throw new Error(`twin property lookup failed: ${findError.message}`);

    const { error } = found
      ? await this.client.from('twin_property_values').update(row).eq('id', found.id)
      : await this.client.from('twin_property_values').insert(row);
    if (error) throw new Error(`twin property write failed: ${error.message}`);

    const { error: mapError } = await this.client
      .from('connection_twin_mappings')
      .update({ last_mapped_at: new Date().toISOString(), last_mapped_value: d.value })
      .eq('id', d.mapping.id);
    if (mapError) throw new Error(`mapping stamp failed: ${mapError.message}`);
  }

  async audit(params: {
    connectionId: string;
    tenantId: string | null;
    action: string;
    previousState: string | null;
    newState: string | null;
    correlationId: string;
    detail?: Record<string, unknown>;
  }) {
    const { error } = await this.client.from('connection_audit_events').insert({
      connection_id: params.connectionId,
      actor_type: 'service',
      actor_id: null,
      action: params.action,
      previous_state: params.previousState,
      new_state: params.newState,
      correlation_id: params.correlationId,
      detail: params.detail ?? {},
    });
    if (error) throw new Error(`audit write failed: ${error.message}`);
  }

  async stampConnection(connectionId: string, patch: Record<string, unknown>) {
    const { error } = await this.client
      .from('connection_instances')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', connectionId);
    if (error) throw new Error(`connection stamp failed: ${error.message}`);
  }

  /** Event ids already accepted on this connection: the durable replay guard. */
  async loadSeenEventIds(connectionId: string, limit = 5_000): Promise<Set<string>> {
    const { data, error } = await this.client
      .from('connection_ingest_messages')
      .select('event_id')
      .eq('connection_id', connectionId)
      .eq('outcome', 'ACCEPTED')
      .not('event_id', 'is', null)
      .order('received_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(`replay guard load failed: ${error.message}`);
    return new Set((data ?? []).map((r) => r.event_id as string));
  }
}
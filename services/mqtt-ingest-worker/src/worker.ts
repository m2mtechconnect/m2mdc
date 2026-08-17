/**
 * The persistent MQTT ingestion worker.
 *
 * Lifecycle: load connection -> refuse unless enabled, wired and credentialed
 * -> resolve credential from the vault (server-side only) -> authorise the
 * subscription set -> connect -> validate every message through the shared
 * pipeline -> write evidence -> apply the twin property.
 *
 * It stops as soon as the connection is disabled or its credential is
 * revoked. It never fabricates a message.
 */
import mqtt, { type MqttClient } from 'mqtt';
import { randomUUID } from 'node:crypto';
import {
  authoriseSubscriptions,
  evaluateMessage,
  reconnectDelayMs,
  resolvePolicy,
  type MqttRuntimePolicy,
  type RuntimeMapping,
} from '../../../src/runtime/mqtt/index.js';
import { EvidenceStore, emptyCounters, type RunCounters } from './evidence.js';
import { decryptCredential, parseCredential } from './vault.js';
import type { WorkerEnv } from './env.js';

export interface WorkerReport {
  state: string;
  reason: string | null;
  counters: RunCounters;
  runId: string | null;
  brokerUrl: string | null;
  subscribedTopics: string[];
  evidenceClass: string;
}

function log(event: string, fields: Record<string, unknown> = {}): void {
  // Structured, secret-free logging. Credentials are never passed in here.
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...fields }));
}

export async function runWorker(env: WorkerEnv): Promise<WorkerReport> {
  const store = new EvidenceStore(env.supabaseUrl, env.serviceRoleKey);
  const correlationId = randomUUID();
  const counters = emptyCounters();
  const report: WorkerReport = {
    state: 'STARTING', reason: null, counters, runId: null,
    brokerUrl: null, subscribedTopics: [], evidenceClass: 'TEST_EVIDENCE',
  };

  const connection = await store.loadConnection(env.connectionId);
  if (!connection) throw new Error(`connection ${env.connectionId} does not exist`);

  const configuration = (connection.configuration ?? {}) as Record<string, unknown>;
  const policy: MqttRuntimePolicy = resolvePolicy(configuration);
  const brokerUrl = env.brokerOverride
    ?? (typeof configuration.broker_url === 'string' ? configuration.broker_url : null)
    ?? connection.endpoint_reference;
  report.brokerUrl = brokerUrl;
  const tenantId: string | null = connection.tenant_id ?? null;

  const refuse = async (state: string, reason: string): Promise<WorkerReport> => {
    report.state = state;
    report.reason = reason;
    await store.registerWorker({
      worker_id: env.workerId, runtime: env.runtime, connection_id: env.connectionId,
      tenant_id: tenantId, state, broker_url: brokerUrl, protocol: 'mqtt',
      evidence_class: report.evidenceClass, last_error: reason, stopped_at: new Date().toISOString(),
    });
    await store.audit({
      connectionId: env.connectionId, tenantId, action: 'runtime.worker.refused',
      previousState: connection.status, newState: state, correlationId, detail: { reason, worker_id: env.workerId },
    });
    log('worker.refused', { reason, state });
    return report;
  };

  if (!connection.enabled) return refuse('STOPPED', 'connection is disabled; ingestion does not start');
  if (!brokerUrl) return refuse('REFUSED', 'no broker endpoint is configured');

  const credentialRow = await store.loadCredential(env.connectionId);
  if (!credentialRow) {
    return refuse('REFUSED', 'no active credential in the vault (missing, revoked or expired); reconnection is impossible');
  }

  const subscriptions = authoriseSubscriptions(policy, tenantId);
  if (subscriptions.allowed !== true) return refuse('REFUSED', subscriptions.reason);
  report.subscribedTopics = subscriptions.filters;

  const productionAuthorised = env.productionAuthorised && configuration.production_authorised === true;
  report.evidenceClass = productionAuthorised ? 'PRODUCTION_TELEMETRY' : 'TEST_EVIDENCE';

  const contract = await store.loadContract(connection.connector_id);
  const mappings = (await store.loadMappings(env.connectionId)) as unknown as RuntimeMapping[];
  const seen = await store.loadSeenEventIds(env.connectionId);

  const credential = parseCredential(
    await decryptCredential(credentialRow.ciphertext as string, env.vaultKey),
    typeof configuration.username === 'string' ? configuration.username : null,
  );

  await store.registerWorker({
    worker_id: env.workerId, runtime: env.runtime, connection_id: env.connectionId,
    tenant_id: tenantId, state: 'CONNECTING', broker_url: brokerUrl, protocol: 'mqtt',
    evidence_class: report.evidenceClass, subscribed_topics: subscriptions.filters,
    last_error: null, stopped_at: null, started_at: new Date().toISOString(),
  });

  const runId = await store.startRun({
    connection_id: env.connectionId, tenant_id: tenantId, worker_id: env.workerId,
    correlation_id: correlationId, source_endpoint: brokerUrl,
    evidence_class: report.evidenceClass, final_status: 'RUNNING',
  });
  report.runId = runId;

  await store.audit({
    connectionId: env.connectionId, tenantId, action: 'runtime.worker.started',
    previousState: connection.status, newState: 'CONNECTING', correlationId,
    detail: {
      worker_id: env.workerId, runtime: env.runtime, broker_url: brokerUrl,
      topics: subscriptions.filters, qos: policy.qos, credential_version: credentialRow.version,
      evidence_class: report.evidenceClass,
    },
  });

  const client: MqttClient = mqtt.connect(brokerUrl, {
    protocolVersion: 4, // MQTT 3.1.1
    clean: true,
    reconnectPeriod: 0, // backoff is driven explicitly below
    connectTimeout: policy.connect_timeout_ms,
    username: credential.username,
    password: credential.password,
    cert: credential.clientCert,
    key: credential.clientKey,
    ca: credential.ca,
    rejectUnauthorized: brokerUrl.startsWith('mqtts://'),
  });

  let stopping = false;
  let attempts = 0;
  const queue: Promise<void>[] = [];

  const handle = async (topic: string, payload: Buffer, packet: { qos: number }) => {
    const startedAt = performance.now();
    counters.received += 1;
    const decision = evaluateMessage(
      { topic, qos: packet.qos, payload: new Uint8Array(payload), received_at: new Date().toISOString() },
      {
        connection_id: env.connectionId, tenant_id: tenantId, policy,
        contract: contract ? { id: contract.id, schema_type: contract.schema_type, schema_version: contract.schema_version } : null,
        mappings, brokerUrl, productionAuthorised, seenEventIds: seen,
        nowMs: Date.now(), correlationId: randomUUID(),
      },
    );

    if (decision.outcome === 'DUPLICATE') counters.duplicates += 1;
    else if (decision.outcome === 'REJECTED') {
      counters.rejected += 1;
      if (decision.reason === 'unknown_mapping' || decision.reason === 'mapping_not_active' || decision.reason === 'unit_incompatible') {
        counters.mappingFailures += 1;
      }
    }

    const messageId = await store.recordMessage({
      decision, connectionId: env.connectionId, tenantId, runId,
      workerId: env.workerId, evidenceClass: report.evidenceClass,
      processingMs: performance.now() - startedAt,
    });

    if (decision.outcome === 'ACCEPTED') {
      if (messageId === null) {
        counters.duplicates += 1; // database-level replay guard fired
        return;
      }
      seen.add(decision.event_id);
      counters.accepted += 1;
      counters.mappedProperties += 1;
      counters.maxLatencyMs = Math.max(counters.maxLatencyMs, decision.transport_latency_ms);
      await store.applyTwinProperty({ decision, connectionId: env.connectionId, tenantId, messageId });
      log('message.accepted', {
        topic, event_id: decision.event_id, mapping_id: decision.mapping.id,
        property: decision.mapping.target_property, provenance: decision.provenance.provenance_class,
      });
    } else {
      log('message.rejected', { topic, reason: decision.reason, detail: decision.detail });
    }

    await store.updateRun(runId, counters, 'RUNNING', false);
    await store.stampConnection(env.connectionId, {
      last_ingest_at: new Date().toISOString(),
      ...(decision.outcome === 'ACCEPTED' ? { last_success_at: new Date().toISOString(), last_error: null } : {}),
    });
  };

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('broker connect timed out')), policy.connect_timeout_ms + 2_000);
    client.on('connect', () => {
      clearTimeout(timer);
      client.subscribe(subscriptions.filters, { qos: policy.qos }, (err) => {
        if (err) return reject(err);
        report.state = 'CONNECTED';
        void store.updateWorker(env.workerId, { state: 'CONNECTED', connect_count: 1, last_error: null });
        log('worker.connected', { broker: brokerUrl, topics: subscriptions.filters, qos: policy.qos });
        resolve();
      });
    });
    client.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  }).catch(async (err: Error) => {
    client.end(true);
    await store.updateRun(runId, counters, 'FAILED', true);
    await store.updateWorker(env.workerId, { state: 'FAILED', last_error: err.message, stopped_at: new Date().toISOString() });
    await store.stampConnection(env.connectionId, { last_error: err.message });
    throw err;
  });

  client.on('message', (topic, payload, packet) => {
    const task = handle(topic, payload, { qos: packet.qos }).catch((err: Error) => {
      counters.deadLetters += 1;
      log('message.dead_letter', { topic, error: err.message });
    });
    queue.push(task);
  });

  client.on('close', async () => {
    if (stopping) return;
    attempts += 1;
    counters.retries += 1;
    if (attempts > policy.max_reconnect_attempts) {
      await store.updateWorker(env.workerId, { state: 'FAILED', last_error: 'reconnect attempts exhausted' });
      return;
    }
    const delay = reconnectDelayMs(attempts, policy);
    await store.updateWorker(env.workerId, { state: 'RECONNECTING', reconnect_count: attempts });
    log('worker.reconnecting', { attempt: attempts, delay_ms: delay });
    setTimeout(() => { if (!stopping) client.reconnect(); }, delay);
  });

  const heartbeat = setInterval(() => {
    void (async () => {
      const current = await store.loadConnection(env.connectionId);
      const credential = await store.loadCredential(env.connectionId);
      if (!current?.enabled || !credential) {
        log('worker.stopping', { reason: !current?.enabled ? 'connection disabled' : 'credential revoked' });
        report.reason = !current?.enabled ? 'connection disabled' : 'credential revoked';
        stopping = true;
        client.end(true);
        return;
      }
      await store.updateWorker(env.workerId, { state: report.state });
    })();
  }, env.heartbeatMs);

  if (env.runOnceMs !== null) {
    await new Promise((resolve) => setTimeout(resolve, env.runOnceMs as number));
    stopping = true;
  } else {
    await new Promise<void>((resolve) => {
      const stop = () => { stopping = true; resolve(); };
      process.once('SIGTERM', stop);
      process.once('SIGINT', stop);
      client.once('end', stop);
    });
  }

  clearInterval(heartbeat);
  await Promise.allSettled(queue);
  client.end(true);

  const finalStatus = counters.rejected > 0 ? 'DEGRADED' : counters.accepted > 0 ? 'SUCCEEDED' : 'NO_DATA';
  await store.updateRun(runId, counters, finalStatus, true);
  await store.updateWorker(env.workerId, { state: 'STOPPED', stopped_at: new Date().toISOString() });
  await store.audit({
    connectionId: env.connectionId, tenantId, action: 'runtime.worker.stopped',
    previousState: 'CONNECTED', newState: 'STOPPED', correlationId,
    detail: { ...counters, reason: report.reason, evidence_class: report.evidenceClass },
  });

  report.state = 'STOPPED';
  return report;
}
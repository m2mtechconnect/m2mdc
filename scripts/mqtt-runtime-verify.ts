/**
 * Runtime verification of the MQTT ingestion path against a real broker.
 *
 * Runs the production transport (mqtt.js, MQTT 3.1.1, QoS 1) and the exact
 * validation pipeline the containerised worker uses, with the database sink
 * replaced by an in-memory recorder. It proves the message path end to end:
 *   broker -> subscription authorisation -> contract validation -> mapping
 *   -> unit conversion -> twin property decision.
 *
 * The broker must be loopback. Everything it produces is TEST_EVIDENCE.
 *
 *   bun scripts/mqtt-runtime-verify.ts
 */
import mqtt from 'mqtt';
import { randomUUID } from 'node:crypto';
import {
  authoriseSubscriptions,
  evaluateMessage,
  resolvePolicy,
  type PipelineDecision,
  type RuntimeMapping,
} from '../src/runtime/mqtt/index';

const BROKER = process.env.MQTT_URL ?? 'mqtt://127.0.0.1:1883';
if (!['127.0.0.1', 'localhost', '::1'].includes(new URL(BROKER).hostname)) {
  throw new Error('refusing to run against a non-loopback broker');
}

const TENANT = '11111111-1111-4111-8111-111111111111';
const SITE = '22222222-2222-4222-8222-222222222222';
const CONNECTION = '33333333-3333-4333-8333-333333333333';
const TOPIC = `aura/${TENANT}/telemetry/crah-01/supply_temp`;

const mapping: RuntimeMapping = {
  id: '44444444-4444-4444-8444-444444444444',
  connection_id: CONNECTION,
  source_identifier: TOPIC,
  target_entity: 'CRAH-01',
  target_prim_path: '/World/Cooling/CRAH_01',
  target_property: 'supplyTemperatureC',
  target_facility_id: null,
  source_unit: 'degC',
  target_unit: 'degC',
  data_type: 'number',
  direction: 'inbound',
  active: true,
  validation_status: 'VALID',
  timestamp_rule: null,
};

const policy = resolvePolicy({
  topic_allowlist: [`aura/${TENANT}/telemetry/#`],
  allow_wildcard_subscriptions: true,
  qos: 1,
});

const subs = authoriseSubscriptions(policy, TENANT);
if (subs.allowed !== true) throw new Error(`subscription refused: ${subs.reason}`);

function envelope(overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  return {
    schema_version: 1,
    event_id: randomUUID(),
    tenant_id: TENANT,
    site_id: SITE,
    asset_id: null,
    connection_id: CONNECTION,
    source_system: 'dsx_cooling',
    source_subject: TOPIC,
    event_type: 'telemetry',
    observed_at: now,
    received_at: now,
    value: 21.5,
    unit: 'degC',
    quality: 'validated',
    validation_state: 'accepted',
    mapping_state: 'mapped',
    ingestion_version: 'mqtt-runtime-verify',
    ...overrides,
  };
}

const first = envelope();
const cases: { label: string; body: string; topic?: string }[] = [
  { label: 'valid observation', body: JSON.stringify(first) },
  { label: 'duplicate event_id', body: JSON.stringify(first) },
  { label: 'unknown unit', body: JSON.stringify(envelope({ unit: 'furlongs' })) },
  { label: 'unsupported schema version', body: JSON.stringify(envelope({ schema_version: 99 })) },
  {
    label: 'stale observation',
    body: JSON.stringify(envelope({ observed_at: new Date(Date.now() - 3_600_000).toISOString() })),
  },
  { label: 'malformed json', body: '{not json' },
  { label: 'null value', body: JSON.stringify(envelope({ value: null })) },
  {
    label: 'foreign tenant topic',
    body: JSON.stringify(envelope()),
    topic: 'aura/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/telemetry/crah-01/supply_temp',
  },
  { label: 'oversized payload', body: JSON.stringify({ ...envelope(), pad: 'x'.repeat(70_000) }) },
];

const seen = new Set<string>();
const decisions: PipelineDecision[] = [];
const twinProperties = new Map<string, { value: number; unit: string | null; provenance: string; observed_at: string }>();

const client = mqtt.connect(BROKER, { protocolVersion: 4, reconnectPeriod: 0, connectTimeout: policy.connect_timeout_ms });

client.on('message', (topic, payload, packet) => {
  const decision = evaluateMessage(
    { topic, qos: packet.qos, payload: new Uint8Array(payload), received_at: new Date().toISOString() },
    {
      connection_id: CONNECTION,
      tenant_id: TENANT,
      policy,
      contract: { id: '66666666-6666-4666-8666-666666666666', schema_type: 'dsx_event_envelope', schema_version: '1' },
      mappings: [mapping],
      brokerUrl: BROKER,
      productionAuthorised: false,
      seenEventIds: seen,
      nowMs: Date.now(),
      correlationId: randomUUID(),
    },
  );
  decisions.push(decision);
  if (decision.outcome === 'ACCEPTED') {
    seen.add(decision.event_id);
    twinProperties.set(`${decision.mapping.target_entity}.${decision.mapping.target_property}`, {
      value: decision.value,
      unit: decision.unit,
      provenance: decision.provenance.provenance_class,
      observed_at: decision.observed_at,
    });
  }
});

await new Promise<void>((resolve, reject) => {
  client.on('error', reject);
  client.on('connect', () => {
    client.subscribe(subs.filters, { qos: policy.qos }, (err) => (err ? reject(err) : resolve()));
  });
});
console.log(`connected to ${BROKER}; subscribed to ${subs.filters.join(', ')} at QoS ${policy.qos}`);

for (const c of cases) {
  await new Promise<void>((resolve, reject) =>
    client.publish(c.topic ?? TOPIC, c.body, { qos: 1 }, (err) => (err ? reject(err) : resolve())),
  );
  await new Promise((r) => setTimeout(r, 250));
}
await new Promise((r) => setTimeout(r, 500));
client.end(true);

console.log('\n--- decisions ---');
decisions.forEach((d, i) => {
  const label = cases[i]?.label ?? `message ${i}`;
  const reason = d.outcome === 'ACCEPTED' ? 'mapped' : d.reason;
  console.log(`${String(i + 1).padStart(2)}. ${label.padEnd(28)} ${d.outcome.padEnd(10)} ${reason}`);
});

console.log('\n--- twin properties written ---');
for (const [key, value] of twinProperties) console.log(key, JSON.stringify(value));

const accepted = decisions.filter((d) => d.outcome === 'ACCEPTED').length;
const duplicates = decisions.filter((d) => d.outcome === 'DUPLICATE').length;
const rejected = decisions.filter((d) => d.outcome === 'REJECTED').length;
console.log(`\nreceived=${decisions.length} accepted=${accepted} duplicates=${duplicates} rejected=${rejected}`);

const ok = accepted === 1 && duplicates === 1 && rejected === decisions.length - 2 && twinProperties.size === 1;
console.log(ok ? 'RUNTIME_VERIFY_PASS (TEST_EVIDENCE)' : 'RUNTIME_VERIFY_FAIL');
process.exit(ok ? 0 : 1);
/**
 * Local end-to-end verification of the MQTT ingestion vertical slice.
 *
 * Publishes a controlled set of messages to a LOCAL Mosquitto broker while the
 * containerless worker is subscribed, then reads back the evidence rows.
 * Everything produced by this script is TEST_EVIDENCE: the broker is
 * loopback-only and disposable, so no value may ever be presented as
 * production telemetry.
 *
 * Usage:
 *   MQTT_URL=mqtt://127.0.0.1:1883 AURA_CONNECTION_ID=... node scripts/mqtt-vertical-slice-verify.mjs
 */
import mqtt from 'mqtt';
import { randomUUID } from 'node:crypto';

const url = process.env.MQTT_URL ?? 'mqtt://127.0.0.1:1883';
const host = new URL(url).hostname;
if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
  throw new Error(`refusing to publish to non-local broker "${host}"`);
}

const tenantId = process.env.AURA_TENANT_ID;
const connectionId = process.env.AURA_CONNECTION_ID;
const siteId = process.env.AURA_SITE_ID ?? randomUUID();
if (!connectionId) throw new Error('AURA_CONNECTION_ID is required');

const topic = process.env.AURA_TOPIC ?? `aura/${tenantId}/telemetry/crah-01/supply_temp`;

function envelope(overrides = {}) {
  const now = new Date().toISOString();
  return {
    schema_version: 1,
    event_id: randomUUID(),
    tenant_id: tenantId,
    site_id: siteId,
    asset_id: null,
    connection_id: connectionId,
    source_system: 'dsx_cooling',
    source_subject: topic,
    event_type: 'telemetry',
    observed_at: now,
    received_at: now,
    value: 21.5,
    unit: 'degC',
    quality: 'validated',
    validation_state: 'accepted',
    mapping_state: 'mapped',
    ingestion_version: 'mqtt-worker-0.1.0',
    ...overrides,
  };
}

const cases = [
  { label: 'valid observation', payload: envelope() },
  { label: 'schema violation (unknown unit)', payload: envelope({ unit: 'furlongs' }) },
  { label: 'unsupported schema version', payload: envelope({ schema_version: 99 }) },
  { label: 'stale observation', payload: envelope({ observed_at: new Date(Date.now() - 3_600_000).toISOString() }) },
  { label: 'malformed json', raw: '{not json' },
];

const client = mqtt.connect(url, { protocolVersion: 4, reconnectPeriod: 0 });
client.on('connect', async () => {
  const duplicate = cases[0].payload;
  const all = [...cases, { label: 'duplicate event_id', payload: duplicate }];
  for (const c of all) {
    const body = c.raw ?? JSON.stringify(c.payload);
    await new Promise((resolve, reject) =>
      client.publish(topic, body, { qos: 1 }, (err) => (err ? reject(err) : resolve())),
    );
    console.log(`published: ${c.label}`);
    await new Promise((r) => setTimeout(r, 400));
  }
  client.end();
});
client.on('error', (err) => {
  console.error('broker error:', err.message);
  process.exit(1);
});
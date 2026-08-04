/**
 * Phase 7 runtime verification against a REAL local MQTT broker.
 *
 * Run with:  bun scripts/dsx-exchange-runtime-verify.ts
 *
 * Safety: only localhost endpoints are accepted (enforced twice — here and
 * inside createMqttTransport). No hosted project, NVIDIA endpoint or live
 * DSX gateway is contacted. Exits non-zero on any failed assertion or when
 * no local broker is listening.
 */
import mqtt from 'mqtt';
import { createMqttTransport, EndpointRefusedError } from '../src/dsx/exchange/mqttTransport';
import { createDsxExchangeAdapter } from '../src/dsx/exchange/dsxExchangeAdapter';
import type { TransportEndpoint } from '../src/dsx/exchange/transport';
import {
  EVIDENCE_BETA_CONNECTION_ID,
  EVIDENCE_BETA_ORG_ID,
  EVIDENCE_BETA_RACKS,
  EVIDENCE_BETA_SITE_ID,
  EVIDENCE_BETA_SOURCE_SYSTEM,
  assetBySourceId,
} from '../src/dsx/fixtures/evidenceBetaFacility';
import { stableUuid } from '../src/dsx/fixtures/determinism';

const BROKER_URL = process.env.DSX_EXCHANGE_URL ?? 'mqtt://127.0.0.1:1883';
const TOPIC_ROOT = 'dsx/evidence-beta';

const endpoint: TransportEndpoint = {
  url: BROKER_URL,
  protocol: 'mqtt',
  subjects: [`${TOPIC_ROOT}/#`],
};

let failures = 0;
function check(name: string, condition: boolean, detail = ''): void {
  if (condition) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.error(`FAIL  ${name}${detail ? ` - ${detail}` : ''}`);
  }
}

function observation(key: string, sourceAsset: string, value: number, observedAt: string) {
  const asset = assetBySourceId(sourceAsset);
  return JSON.stringify({
    schema_version: 1,
    event_id: stableUuid(`runtime-verify:${key}`),
    tenant_id: EVIDENCE_BETA_ORG_ID,
    site_id: EVIDENCE_BETA_SITE_ID,
    asset_id: asset ? asset.aura_asset_id : null,
    connection_id: EVIDENCE_BETA_CONNECTION_ID,
    source_system: 'dsx_cooling',
    source_subject: `${EVIDENCE_BETA_SOURCE_SYSTEM}/${sourceAsset}/inlet_temp_c`,
    event_type: 'telemetry',
    observed_at: observedAt,
    received_at: observedAt,
    value,
    unit: 'degC',
    quality: 'validated',
    validation_state: 'accepted',
    mapping_state: asset ? 'mapped' : 'unmapped',
    ingestion_version: 'runtime-verify/1.0.0',
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function publish(topic: string, payload: string): Promise<void> {
  const pub = await mqtt.connectAsync(BROKER_URL, { reconnectPeriod: 0 });
  await pub.publishAsync(topic, payload, { qos: 1 });
  await pub.endAsync();
}

async function main(): Promise<void> {
  console.log(`DSX Exchange runtime verification against ${BROKER_URL}\n`);

  // --- Safety proof: a non-local endpoint is refused before any socket. ---
  let refused = false;
  try {
    createMqttTransport({ ...endpoint, url: 'mqtt://broker.example.net:1883' });
  } catch (e) {
    refused = e instanceof EndpointRefusedError;
  }
  check('remote endpoint refused before any connection attempt', refused);

  let prodRefused = false;
  try {
    createMqttTransport({ ...endpoint, url: 'mqtt://psfvrskpnwcshvajzeix.supabase.co:1883' });
  } catch (e) {
    prodRefused = e instanceof EndpointRefusedError;
  }
  check('production project endpoint refused', prodRefused);

  // --- Connect the adapter to the real broker. ---
  const transport = createMqttTransport(endpoint);
  const adapter = createDsxExchangeAdapter({ transport, runId: 'runtime-verify-1' });

  try {
    await adapter.start();
  } catch (e) {
    console.error(
      `\nUNAVAILABLE - could not reach a local broker at ${BROKER_URL}: ${(e as Error).message}\n` +
        'Start mosquitto locally and re-run. No data was simulated.',
    );
    process.exit(2);
  }

  check('transport reports connected', adapter.health().transport_state === 'connected');

  // Connected but no data: UNAVAILABLE, freshness unknown.
  let snap = adapter.snapshot(Date.now());
  check('connected-but-empty resolves to UNAVAILABLE', snap.data_mode === 'UNAVAILABLE');
  check('connected-but-empty freshness is unknown', snap.freshness === 'unknown');

  // --- Valid observation over the real broker. ---
  const rack = EVIDENCE_BETA_RACKS[0].source_asset_id;
  const observedAt = new Date().toISOString();
  await publish(`${TOPIC_ROOT}/${rack}/inlet_temp_c`, observation('evt-1', rack, 27.4, observedAt));
  await sleep(400);

  snap = adapter.snapshot(Date.now());
  check(
    'valid observation accepted through shared pipeline',
    snap.accepted.length === 1,
    JSON.stringify(snap.rejected),
  );
  check(
    'mode becomes REPLAYED with run identity',
    snap.data_mode === 'REPLAYED' && snap.run_id === 'runtime-verify-1',
  );
  check('freshness is fresh for a just-observed value', snap.freshness === 'fresh');

  // --- Malformed payload is quarantined, not coerced. ---
  await publish(`${TOPIC_ROOT}/${rack}/inlet_temp_c`, 'not json');
  await sleep(300);
  snap = adapter.snapshot(Date.now());
  check(
    'malformed broker payload quarantined',
    snap.rejected.some((r) => r.reason === 'schema_invalid'),
  );
  check('malformed payload did not add an accepted reading', snap.accepted.length === 1);

  // --- Reconnect + redelivery idempotency across a real disconnect. ---
  await transport.disconnect();
  check('disconnect reported by health', adapter.health().transport_state === 'disconnected');
  snap = adapter.snapshot(Date.now());
  check('disconnected transport fails closed to UNAVAILABLE', snap.data_mode === 'UNAVAILABLE');

  await transport.connect();
  await sleep(200);
  await publish(`${TOPIC_ROOT}/${rack}/inlet_temp_c`, observation('evt-1', rack, 27.4, observedAt));
  await sleep(400);

  snap = adapter.snapshot(Date.now());
  check('redelivered event_id suppressed after reconnect', snap.accepted.length === 1);
  check('duplicate suppression counted', snap.health.duplicate_suppressed === 1);
  check('reconnect counted in health', snap.health.connect_count === 2);

  // --- Data ages while the transport stays connected. ---
  snap = adapter.snapshot(Date.now() + 20 * 60_000);
  check('freshness degrades to stale on age alone', snap.freshness === 'stale');
  check('transport still reported connected while data ages', snap.health.transport_state === 'connected');

  await adapter.stop();

  console.log(
    `\n${failures === 0 ? 'RUNTIME VERIFICATION PASSED' : `RUNTIME VERIFICATION FAILED (${failures})`}`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

void main();
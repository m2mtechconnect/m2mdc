# MQTT ingestion vertical slice

## Execution environment

Supabase Edge Functions cannot hold a long-lived broker subscription (short
invocation lifetime, no persistent sockets), so the subscriber runs as a
container: `services/mqtt-ingest-worker` (Dockerfile, Node 22, mqtt.js,
MQTT 3.1.1, QoS 0/1). Provisioning, credentials, audit and UI stay in the
existing control plane. Deploy target: Brev or AWS ECS/Fargate.

## Path proven

broker -> subscription authorisation -> contract validation -> ingest evidence
-> twin mapping -> twin property update, all through one shared pipeline
(`src/runtime/mqtt/pipeline.ts`) used identically by the worker and the tests.

## Controls implemented

- Credentials read server-side only, AES-GCM decrypted in-process from
  `connection_credentials`; never logged, never returned.
- Topic allowlist plus tenant topic namespace (`aura/<tenant>/`); wildcards
  require explicit authorisation; whole-broker subscriptions always refused.
- Payload ceiling, connect timeout, full-jitter reconnect backoff, capped
  attempts, single-connection limit.
- Every message validated against the selected data contract; unknown units,
  unsupported versions, stale, malformed, duplicate and unmapped messages are
  rejected with a machine-readable reason.
- Evidence: `connection_ingest_messages`, `connection_ingest_runs`,
  `connection_runtime_workers`, `connection_audit_events`, all with correlation
  IDs and tenant stamps.
- Unit conversion only within a family, via an explicit factor table.
- Disabling the connection or revoking the credential stops ingestion at the
  next heartbeat, and a worker refuses to start without an active credential.

## Verification (TEST_EVIDENCE)

Local Mosquitto 2.0.22 on `127.0.0.1:1883`, `bun scripts/mqtt-runtime-verify.ts`:

```
received=8 accepted=1 duplicates=1 rejected=6
CRAH-01.supplyTemperatureC {"value":21.5,"unit":"degC","provenance":"TEST_EVIDENCE"}
RUNTIME_VERIFY_PASS
```

Rejections observed: schema_invalid, unsupported_version, stale,
malformed_json, missing_value, payload_too_large. The foreign-tenant topic was
never delivered because the authorised subscription set excludes it, which is
the intended outcome (the console labels shift by one for that reason).

Unit suite: `src/runtime/mqtt/__tests__/pipeline.test.ts`, 15 passing.

## Limitations

- The broker is local and disposable, so every value is classified
  `TEST_EVIDENCE`; nothing is presented as production telemetry.
- The worker's database writes were not exercised in this sandbox: no service
  role key is available here. Schema conformance of every evidence row was
  checked against the live column definitions.
- TLS/mTLS material is wired through the vault parser but has only been
  exercised against a plaintext loopback listener.

## Verdict

AURA_MQTT_RUNTIME_VERTICAL_SLICE_VERIFIED_WITH_LIMITATIONS — PARTIAL, because
verification used a local broker rather than an authorised production source.
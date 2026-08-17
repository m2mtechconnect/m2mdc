# Security results

Reviewed statically; no cloud enforcement could be observed because nothing was deployed.

Verified in code:
- Credentials are read server-side only and AES-GCM decrypted in-process (services/mqtt-ingest-worker/src/vault.ts). They are never logged, never written to an evidence row and never returned over HTTP.
- No secret is baked into the container image; the Dockerfile copies source only and expects runtime injection.
- Topic allowlist plus tenant topic namespace enforcement and refusal of whole-broker subscriptions (src/runtime/mqtt/policy.ts, authoriseSubscriptions).
- Payload ceiling, connect timeout, capped full-jitter reconnect backoff, single-connection limit (DEFAULT_MQTT_POLICY).
- connection_credentials / connection_credential_events are service_role only with RLS USING (false) for signed-in users.

Not verified (requires deployment): least-privilege IAM, IoT Core topic-scoped policy, Secrets Manager injection, KMS key policy, CloudWatch log isolation, TLS/mTLS against a real remote broker.

No credential value was requested, printed, logged or committed during this phase.

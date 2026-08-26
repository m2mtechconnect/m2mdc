# Observability evidence

Artifacts in this directory are produced by `scripts/verify-observability-e2e.mjs`.
Each artifact records a single synthetic probe (`ObservabilitySyntheticProbe`)
sent through the governed `observability-capture` relay against a specific
release SHA.

Truth rules:

- An artifact with `result: "verified"` is the only acceptable evidence for
  upgrading the supervisor `runtime-monitoring-client` / `monitoring-backend`
  signals to `verified`.
- `delivered_to_relay` alone is NOT end-to-end evidence; it means the relay
  accepted the event but provider read-back credentials were absent.
- Artifacts never contain credentials, tenant ids, user ids, or raw error
  content. Synthetic probe ids are random and carry no tenant meaning.
- Synthetic probe events are demonstration/verification traffic and must never
  be presented as production telemetry.

# Security model

- Health checks run only in the `connection-health-check` edge function. The browser can pass a
  connection ID; it can never pass a URL, host or port.
- The function resolves a fixed server-owned probe allowlist (application platform query, DSX
  ingest endpoint, managed storage). Arbitrary targets are rejected, so SSRF, loopback,
  link-local, cloud-metadata, DNS-rebinding and redirect abuse have no reachable surface.
- Bounded timeouts, no retries beyond the bound, response bodies not echoed to the client.
- Errors are mapped to safe, non-reflecting messages plus an error code and correlation ID.
- No credential ever leaves the server: no secret is returned by any query, and credential
  submission in the wizard is disabled with "Credential vault required" until an approved vault
  exists. No fake browser-decryptable encryption field was created.
- Every state change writes a `connection_audit_events` row with actor, previous state, new state
  and correlation ID.

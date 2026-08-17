# Security model

- Health checks run only in the `connection-health-check` edge function. The browser can pass a
  connection ID; it can never pass a URL, host or port.
- The function resolves a fixed server-owned probe allowlist (application platform query, DSX
  ingest endpoint, managed storage). Arbitrary targets are rejected, so SSRF, loopback,
  link-local, cloud-metadata, DNS-rebinding and redirect abuse have no reachable surface.
- Bounded timeouts, no retries beyond the bound, response bodies not echoed to the client.
- Errors are mapped to safe, non-reflecting messages plus an error code and correlation ID.
- Credentials travel one way. The wizard and the vault dialog submit the value once to the
  `connection-credential` edge function, which AES-GCM encrypts it with a key derived from the
  backend-only `CONNECTION_CREDENTIAL_KEY` secret before the insert. `connection_credentials` and
  `connection_credential_events` grant to `service_role` only and carry an RLS policy of
  `USING (false)` for signed-in users, so no client query can reach the ciphertext. No endpoint
  returns plaintext, there is no reveal affordance, and the UI shows a truncated SHA-256
  fingerprint, version, rotation date and expiry. Rotation replaces the material in place and
  refuses an identical value; revocation destroys it and disables the connection.
- Every state change writes a `connection_audit_events` row with actor, previous state, new state
  and correlation ID.

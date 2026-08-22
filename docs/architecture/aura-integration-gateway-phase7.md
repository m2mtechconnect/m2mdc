# ADR — AURA Integration Gateway boundary

## Decision

AURA keeps Lovable/native connector acceleration behind a server-side white-label boundary. Customer applications never call a connector-vendor gateway directly. The public integration origin is an M2M-owned HTTPS domain and all runtime calls are authorized, allowlisted, audited and fail closed.

## Phase 7A

- Deployable gateway service under `gateway/aura-integration-gateway`.
- Managed shared connectors only.
- Exact connector/method/path allowlist.
- No caller-supplied upstream host or credential.
- No upstream redirect passthrough.
- No response body or location header containing Lovable hostnames.
- Per-user OAuth disabled until M2M owns provider OAuth applications and callback paths.

## Phase 7B

Register M2M/AURA OAuth clients for selected providers, terminate callbacks at the AURA gateway, encrypt refresh/access material server-side, and expose only opaque connection state to AURA. Do not enable this phase by merely reverse-proxying a vendor callback.

## Phase 7C

Add webhook ingress, signed-event verification, tenant/facility routing, idempotency, durable retry and connector health evidence. Preserve `configured != connected`, `reachable != data flowing`, and `planned != available`.

## Deployment boundary

Code in this ADR does not authorize production deployment. DNS, secrets, environment configuration, independent security review and exact-origin verification remain separate human-controlled gates.

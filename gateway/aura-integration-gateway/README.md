# AURA Integration Gateway — Phase 7

This service is the strict white-label network boundary for AURA-managed business/data connectors.

## Scope in this phase

- customer-visible origin must be HTTPS under `m2mtechconnect.com`;
- all non-health requests require the AURA gateway ingress token;
- connector IDs, methods and paths are allowlisted in code;
- upstream host and upstream credential are server-owned environment values and can never be supplied by a caller;
- upstream redirects are blocked;
- responses containing `lovable.dev` or `lovable.app` are blocked rather than forwarded;
- correlation IDs are preserved without logging credentials;
- per-user OAuth is deliberately disabled until AURA owns the provider callback/client registration.

This first implementation supports the already verified shared Search Analytics binding only. Adding a connector requires a reviewed allowlist entry and corresponding AURA authorization policy.

## Required server configuration

- `AURA_GATEWAY_PUBLIC_ORIGIN=https://gateway.auradc.m2mtechconnect.com`
- `AURA_GATEWAY_INGRESS_TOKEN=<random server-only token>`
- `AURA_CONNECTOR_UPSTREAM_URL=<server-only HTTPS upstream>`
- `AURA_CONNECTOR_UPSTREAM_TOKEN=<server-only upstream credential>`

The application-side Phase 6 settings then point to this service:

- `AURA_STRICT_WHITE_LABEL=true`
- `AURA_MANAGED_CONNECTOR_GATEWAY_URL=https://gateway.auradc.m2mtechconnect.com`
- `AURA_MANAGED_GATEWAY_TOKEN=<same ingress token>`

## Local verification

From this directory:

- `deno task check`
- `deno task test`

No production deployment, DNS change or credential provisioning is performed by this branch.

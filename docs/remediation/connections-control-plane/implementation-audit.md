# Implementation audit (post-refactor)

Date: 2026-08-17. Scope: everything shipped in AURA_CONNECTIONS_CONTROL_PLANE_REFACTOR.

## Verified as claimed
- Canonical route, alias route and platform-readiness route resolve; navigation label renamed.
- Seven control-plane tables exist with RLS enabled and 25 connector definitions / 5 connection
  instances stored as real rows (no hardcoded UI objects).
- Health checks execute only in the `connection-health-check` edge function against a fixed
  four-entry, server-owned probe map. No caller-supplied URL is ever fetched, so the SSRF surface
  is closed. Bounded 5s timeout, 32 KB response cap, safe error codes, correlation IDs.
- Three real checks executed, persisted and audited; ingest history stays empty and renders an
  empty state rather than a trend.
- Health checks, ingest runs and audit events have no client write path.
- No credential is stored, returned or rendered anywhere.
- Status derivation is evidence-driven and unit-tested (10 tests).

## Defects found and fixed in this audit
1. **Over-broad Data API privileges.** `authenticated` held full `arwdDxtm` on all seven tables.
   RLS still blocked writes on the five evidence tables, but the grants exceeded the policy set.
   Fixed by a migration that revokes write privileges and leaves `SELECT` only on
   `connector_definitions`, `connection_data_contracts`, `connection_health_checks`,
   `connection_ingest_runs` and `connection_audit_events`.
2. **Overstated documentation.** The workflow, mapping, RBAC and claims documents described a
   setup wizard, mapping editor, engineer-level testing and tenant isolation that do not exist.
   All four documents corrected; counts corrected.

## Open gaps (unchanged by this audit)
- No connection setup wizard; instances are provisioned by migration only.
- Mappings tab is read-only; no create, validate, activate, export or import.
- No tenant or facility scoping in SELECT policies.
- No credential vault, so no credential-bearing connector can be configured.
- MQTT unwired, DSX Exchange not deployed, MCP not implemented.
- Engineer-role and anonymous verification on the published host not executed.

## Verdict after audit
AURA_CONNECTIONS_CONTROL_PLANE_REFACTOR_PARTIAL

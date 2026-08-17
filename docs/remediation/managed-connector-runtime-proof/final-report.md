# Final report - AURA_MANAGED_CONNECTOR_RUNTIME_PROOF_AND_OAUTH_AUDIT

Date: 2026-08-17 (UTC)

## Verdict

AURA_MANAGED_CONNECTOR_RUNTIME_BLOCKED_CONNECTOR_NOT_LINKED

## Why

Phase 1 passed: AURA authorizes and exchanges exclusively through the official managed connector gateway, derives identity from the verified JWT, stores only the opaque gateway handle under AES-GCM, and keeps every provider call server-side. There is no parallel Google token exchange in the managed path and no provider token is stored by it, so AURA_MANAGED_CONNECTOR_RUNTIME_REJECTED_PARALLEL_OAUTH_IMPLEMENTATION does not apply.

One critical adjacent defect was found outside the managed path: the legacy rag-oauth-google edge function still performs its own Google OAuth and token exchange and would write raw access and refresh tokens unencrypted into public.rag_tokens. That table currently has row level security enabled, no client grants and zero rows, so there is no active credential exposure and the security rejection verdict is not triggered; the function must nonetheless be removed or migrated onto the managed connector before pilot.

Phase 2 failed: no Google Drive App User Connector client exists in the workspace, the project has no linked client, and GOOGLE_DRIVE_APP_USER_CONNECTOR_CLIENT_API_KEY plus APP_USER_CONNECTION_KEY_SECRET are absent from the edge environment. Authorization therefore fails closed with managed_client_not_configured, and Phases 3 to 6 cannot execute.

## Acceptance criteria status

| Criterion | Status |
|---|---|
| Official managed connector linked | FAIL |
| AURA-owned OAuth application configured | FAIL |
| Read-only authorization completed | NOT EXECUTED |
| No parallel Google token exchange | PASS |
| No provider token stored by AURA | PASS (code path) |
| Real synthetic Drive records returned | FAIL |
| Tenant and user authorization enforced | BLOCKED_UNVERIFIED |
| Revocation fails closed | BLOCKED_UNVERIFIED |
| Audit evidence persisted | PASS for design, no runtime rows |
| No credential exposure | PASS (static, no live rows) - with critical open defect rag-oauth-google |
| No customer-facing prohibited provider branding | PASS |
| Zero unexplained console errors / failed requests | NOT EXERCISED |

## Single required owner action

Configure and link a Google Drive App User Connector client for this project, using an AURA-owned Google OAuth web application whose authorized redirect URI is exactly:

https://connector-gateway.lovable.dev/api/v1/app-users/oauth2/callback

with offline access enabled and the read-only Drive scope allowed. No credential may be pasted into chat, source, frontend env vars or evidence files - the connector card collects it.

Once linked, this phase resumes at Phase 3 with the dedicated acceptance account and no further code changes are expected before the runtime proof attempt.

# AURA White-Label Integration Implementation Audit

**Audit date:** 2026-08-22  
**Repository:** `m2mtechconnect/m2mdc`  
**Source of truth:** original AURA repository/project only  
**Audit hardening base:** `demo-aura-interactive-connections` @ `68c1c3c1bfd0ce88459bb719001fd8256412dd1c`

## Executive status

**CODE_HARDENED / CI_PENDING / NOT READY FOR DEMO DEPLOYMENT**

The Builder, Connections, managed connector gateway, demo integration surface, demo build profile and interactive Google authorization stack were audited end to end. The audit found deterministic implementation defects and hardening gaps. They are remediated on the audit branch, but the result is not considered qualified until the dedicated exact-head audit workflow executes successfully and the required non-production runtime acceptance cycle is completed.

No production data was accessed. No deployment, DNS change, secret provisioning, merge, Ready-for-Review transition, visual-baseline acceptance or production release mutation was performed.

## Audited stack

| Layer | PR / exact audited head | Purpose |
| --- | --- | --- |
| Current release boundary | PR #4 @ `ce5f7e5cf97c9352bbd417a035a12af73912e258` | Frozen release candidate; not modified by this audit |
| White-label application modernization | PR #6 @ `edf28c53ea72ff7ff870d7ff80237bdb0bb217bf` | Builder, AURA Intelligence, Connections, managed capability contracts |
| AURA Integration Gateway | PR #7 @ `7e01648db00c2e0a6b94510c6396a0e29db38cd4` | Server-to-server white-label network boundary |
| Demo integrations | PR #9 @ `69f65c534d74e273bd9e23902f424cc0f29b934e` | Truth-labeled demo integration surface |
| Demo build profile | PR #10 @ `df8d5873c62237036d0fa61df97384883e72855e` | Reproducible production-mode demo artifact |
| Interactive Google authorization | PR #11 @ `68c1c3c1bfd0ce88459bb719001fd8256412dd1c` | Demo-only Google Drive read-only authorization |

Across PRs #6/#7/#9/#10/#11, the modernization/demo changes do not add database migrations or modify the OpenUSD/NVIDIA asset inventory. AURA-native OT/Physical-AI architecture remains separate from the managed SaaS connector path.

## Audit scope

The audit covered:

- stack/branch isolation and release-control separation;
- Builder and Connections white-label boundaries;
- managed connector capability truth semantics;
- browser-to-Edge Function contracts;
- managed shared connector authorization and operation routing;
- AURA Integration Gateway allowlists and response-disclosure controls;
- per-user Google OAuth start/return/exchange/disconnect flow;
- CORS/return-origin binding;
- credential/token exposure boundaries;
- demo-vs-live status semantics;
- demo build/release fingerprint and static artifact verification;
- CI trigger/test-path correctness;
- correlation/audit evidence continuity.

## Findings and remediation

### A-01 — HIGH — Client-controlled managed connector route

**Finding:** `managed-connector-invoke` accepted a caller-provided connector `path`. That contradicted the server-owned routing invariant and allowed operation identity and transport route to be selected independently.

**Remediation:** Added `managedConnectorTransport.ts`. Each approved AURA operation now resolves server-side to one connector key, HTTP method, path and payload rule. The browser sends only `connection_id`, `operation_id`, optional facility context and business payload.

**Status:** CODE_FIXED. Dedicated transport-contract tests require every runtime managed-shared operation to map to an allowlisted gateway route.

### A-02 — HIGH — Read-only Search Analytics query incorrectly forced to GET

**Finding:** transport method was derived from authorization classification (`READ => GET`, `WRITE => POST`). Google Search Analytics query is a read operation but uses HTTP POST, so the operation could not match the gateway's approved POST route.

**Remediation:** Authorization classification and transport method are now independent. `search_analytics.query` remains `READ` for policy purposes while resolving to POST `/webmasters/v3/searchanalytics/query` with a payload.

**Status:** CODE_FIXED / CI_PENDING.

### A-03 — HIGH — OAuth return origin trusted request body

**Finding:** OAuth start accepted an arbitrary `body.origin` and used it to construct the return URL.

**Remediation:** OAuth start now requires the actual request `Origin`, evaluates it against AURA's CORS allowlist, requires `body.origin` to equal the canonical approved request origin, rejects mismatches, and constructs the return URL only from the approved origin.

**Status:** CODE_FIXED. Demo deployment must explicitly place the approved demo origin in `CORS_ALLOWED_ORIGINS`.

### A-04 — HIGH — Popup connector identity could be lost

**Finding:** the popup was opened before the pending connector identifier was written to session storage. A newly opened browsing context receives its initial session-storage copy at creation, so the return window could lack the connector identity required to complete the exchange.

**Remediation:** the connector identifier is written before opening the popup, copied into the same-origin popup on a best-effort basis, cleaned up when the popup is blocked, and removed from the opener after completion/failure.

**Status:** CODE_FIXED / MANUAL OAUTH ACCEPTANCE STILL REQUIRED.

### A-05 — MEDIUM — Demo CI referenced nonexistent test paths

**Finding:** the Phase D4 and D5 workflows referenced the demo truth-policy test at paths that do not exist. The real test is `src/connections/__tests__/demoIntegrationPolicy.test.ts`.

**Remediation:** both workflow paths are corrected. The new audit workflow also uses the canonical path.

**Status:** CODE_FIXED / CI_PENDING.

### A-06 — MEDIUM — Correlation chain stopped at the application edge

**Finding:** application invocation/verification generated AURA correlation IDs but did not propagate them to the gateway request.

**Remediation:** managed invoke and runtime verification now send `X-AURA-Correlation-Id`, allowing the application, gateway and downstream evidence chain to share the same request identifier.

**Status:** CODE_FIXED / RUNTIME EVIDENCE PENDING.

### A-07 — MEDIUM — Raw upstream error content could reach customer UI

**Finding:** provider failures from managed invoke included up to 2,000 characters of raw upstream response text.

**Remediation:** customer responses now contain AURA-safe error codes/messages and HTTP status only. Raw upstream response bodies are not reflected to the browser.

**Status:** CODE_FIXED.

### A-08 — MEDIUM — Demo artifact verifier did not scan compiled JavaScript for implementation hostnames

**Finding:** static HTML/CSS/JSON/etc. were scanned for implementation hostnames, but compiled JS was checked only for the development tagger.

**Remediation:** compiled demo JavaScript is now also rejected if it contains `lovable.app` or `lovable.dev`. Bare package/vendor words are not blanket-banned in arbitrary internals to avoid false positives; the customer-source regression separately forbids implementation terms on the defined customer surfaces.

**Status:** CODE_FIXED / BUILD EVIDENCE PENDING.

### A-09 — MEDIUM — Demo OAuth readiness was labeled as generic AURA runtime readiness

**Finding:** Managed User entries using the explicit demo provider-OAuth exception could receive the same `AURA_RUNTIME_READY` reason as AURA-owned runtime paths.

**Remediation:** the capability response now reports `DEMO_PROVIDER_OAUTH_READY` for that case. This preserves the distinction between a working demo authorization transport and the future production AURA-owned OAuth boundary.

**Status:** CODE_FIXED.

## Controls verified as structurally sound

- PR #4 remains isolated from all post-release modernization work.
- Builder/Connections customer surfaces are protected by a vendor/protocol terminology regression test.
- AURA Integration Gateway requires an AURA-owned HTTPS public origin for the production shared-connector path.
- Gateway connector/method/path routes are exact allowlists.
- Gateway blocks redirects and responses that disclose prohibited implementation hostnames.
- Managed shared authorization is tenant/facility/role/operation/approval/rate-limit gated server-side.
- Google Drive demo OAuth requests only the read-only Drive scope.
- Top-level demo authorization destination is restricted to the registered Google authorization host.
- Provider token, refresh token and opaque connection handle are not placed in normal browser application state.
- OAuth exchange validates the returned connector identity against the registered AURA binding.
- Disconnect does not claim revocation if upstream revocation fails.
- Google Drive authorization truth (`Connected · read only`) remains distinct from document retrieval truth (`Demo data` until separately verified).
- Search Analytics live state remains evidence-derived; catalogue availability alone is insufficient.
- Demo integration UI is opt-in and disabled in normal builds.
- Demo OAuth additionally requires independent server-side demo gates; a VITE flag alone cannot activate it.
- Production-mode demo builds retain exact-SHA release fingerprints and prohibit source maps.

## Deliberate demo disclosure limitation

Phase D5 is a demo accommodation, not the final sovereign OAuth architecture. The top-level browser authorization destination is Google, but a technical user inspecting the complete provider authorization URL may discover the underlying managed callback in nested OAuth parameters.

This is accepted only for the demo path. Production Phase 7B must replace it with M2M/AURA-owned provider OAuth registrations and callbacks under an approved AURA/M2M domain.

## Dedicated audit qualification gate

`.github/workflows/aura-integration-audit.yml` validates the audit-hardening head with:

1. application TypeScript typecheck;
2. customer white-label, runtime-catalog and demo-truth tests;
3. demo OAuth server-policy tests;
4. managed operation-to-transport/gateway contract tests;
5. Deno checks for capability, invoke, verify and OAuth functions;
6. AURA Integration Gateway check + tests;
7. production-mode demo build;
8. exact-SHA demo artifact verification including compiled-JS implementation-hostname scanning;
9. upload of the exact-head qualified artifact only after all earlier gates pass.

No CI result is claimed until this workflow actually executes on the final audit-hardening SHA.

## External/runtime gates still required

The following cannot be proven by code review alone and remain mandatory before a demo deployment is called operational:

- exact-head audit CI success;
- usable parent PR #7 gateway CI evidence and parent-stack qualification;
- approved non-production/demo Supabase/runtime configuration;
- approved demo origin included in `CORS_ALLOWED_ORIGINS`;
- `GOOGLE_DRIVE_APP_USER_CONNECTOR_CLIENT_API_KEY` provisioned server-side;
- demo managed connector transport credential provisioned server-side;
- non-production Google account acceptance cycle: Connect Google → Google consent → AURA return → `Connected · read only` → Disconnect;
- separate read-only Google Drive retrieval probe before any document content is labeled live;
- non-production Search Console property verification before Search Analytics is labeled live;
- no Slack/Microsoft/Salesforce interactive binding until each has explicit scopes, provider-host allowlists, runtime binding and separate qualification;
- Phase 7B M2M/AURA-owned OAuth applications/callbacks for production;
- full PR #6 application qualification (QA/Test/Truth/DSX/Visual) before modernization is eligible for release;
- independent security review and existing production governance gates before production release.

## Promotion rule

Do not provision demo secrets or deploy the demo merely because the code audit is complete.

The next promotion state is **AUDIT QUALIFIED FOR NON-PRODUCTION DEMO ACTIVATION** only after the exact-head audit workflow passes and parent-stack evidence is usable. A real Connect Google acceptance cycle must then pass before the demo can claim that interactive Google authorization is operational.

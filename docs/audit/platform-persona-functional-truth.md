# AURA Platform Persona and Functional-Truth Acceptance

## Scope

This audit starts from the frozen, accepted PR #13 head:

`17291245e9836aff6958878db69fdef85bbf975c`

The platform acceptance work is intentionally stacked on top of PR #13 so Builder and Connections remain frozen while the wider product is tested independently.

## Personas

1. Platform Admin
2. Tenant Admin / Owner
3. Operations Engineer
4. Builder Manager
5. Executive
6. Compliance Officer
7. Viewer

## Functional-truth classification

Every tested feature is classified as one of:

- `REAL_BACKEND`: a user action causes a real API, Edge Function, RPC or persisted data operation.
- `REAL_LOCAL_STATE`: the action is intentionally browser-local and the UI explicitly says so.
- `DEMO_EXPLICITLY_LABELLED`: data or behavior is demonstrative and clearly labelled before the user can mistake it for live evidence.
- `NOT_IMPLEMENTED`: the feature is visibly unavailable and cannot present a fake success state.
- `DEFECT`: the UI looks operational but is static, simulated, misleading, unauthorized, unreachable, or not connected to the action it claims to perform.

Absence of an error is not proof of functionality. A feature must have evidence for its classification.

## Automated route coverage

The browser lane exercises canonical routes for platform and tenant roles, including direct URL entry and authorization boundaries.

Priority surfaces:

- Dashboard
- Analytics and export
- Account Profile
- Workspace Settings
- Teams and access control
- Admin Platform Readiness
- Connections
- Facilities
- Marketplace
- Systems
- Builder
- AI Settings
- Blueprint and Infrastructure alias
- Simulation
- DSX Evidence workspaces

The route scanner fails on:

- fatal route or recovery states
- unexpected application/backend egress
- customer-facing implementation vendor/protocol terminology
- operational-looking placeholder language
- unauthorized direct access

## Functional journeys

### Workspace Settings

Expected classification: `REAL_BACKEND`

- Platform Admin and Tenant Owner can edit and save.
- Executive and read-only roles cannot mutate.
- Save must issue a persisted organization write.

### Team Invitation

Expected classification: `REAL_BACKEND`

- Authorized member administrators can send an invitation through the server capability.
- Viewer must not receive an active invitation control.

### AI Settings

Expected classifications:

- Save Configuration: `REAL_LOCAL_STATE`, with the browser-only limitation visible in the UI.
- Health Check: `REAL_BACKEND`, backed by the server health capability.
- Customer UI must remain AURA white-label.

### Analytics Export

Expected classification: `REAL_LOCAL_STATE` generated from governed application data.

- Export control must create a real download.
- Per-metric provenance must remain embedded in the export path.

### System Management

- Run and Edit must navigate to real product workflows.
- Archive must persist a backend status change.
- Clone must either be implemented with real persistence or be explicitly unavailable and non-interactive.
- No vendor/protocol plumbing or fabricated intelligence defaults may appear as customer facts.

### Blueprint Preview

Expected classification: `DEMO_EXPLICITLY_LABELLED` or recommendation-derived truth.

- Preview mode must be explicit.
- Counts and KPIs presented as recommendation facts must be derived from recommendation data, not fixed literals.

### Simulation Preview

Expected classification: `DEMO_EXPLICITLY_LABELLED`.

- Preview scenarios must be clearly presented as preview material.
- Preview values must not be represented as live telemetry or measured outcomes.

## Release severity

- `P0`: security, tenant isolation, destructive data, auth bypass, production perimeter breach.
- `P1`: core journey broken, fake success, misleading live claim, active placeholder, authorization mismatch, customer-visible implementation plumbing.
- `P2`: non-blocking UX, accessibility or consistency defect.
- `P3`: polish or deferred enhancement.

## Scorecard

| Area | Persona evidence | Functional truth | Status |
| --- | --- | --- | --- |
| Builder | PR #13 manager success/failure | REAL_BACKEND deployment | PASS at frozen PR #13 SHA |
| Connections | Engineer + read-only roles | REAL_BACKEND / governed state | PASS at frozen PR #13 SHA |
| Workspace Settings | Admin / Owner / Executive | REAL_BACKEND | PENDING |
| Teams | Admin / Owner / Viewer | REAL_BACKEND | PENDING |
| AI Settings | Manager | REAL_LOCAL_STATE + REAL_BACKEND health | PENDING |
| Analytics Export | Manager | REAL download with provenance | PENDING |
| System Management | Engineer | REAL or explicitly unavailable actions | PENDING |
| Blueprint Preview | Manager | DEMO_EXPLICITLY_LABELLED / derived | PENDING |
| Simulation Preview | Manager | DEMO_EXPLICITLY_LABELLED | PENDING |
| Admin Direct URL | Admin / Owner / non-admin roles | Canonical permission gate | PENDING |
| Platform route matrix | 7 personas | Route commit + white-label + egress | PENDING |

## Guardrails

- PR #13 stays frozen, draft and unmerged.
- This audit branch does not modify PR #4.
- No production deployment or production data access.
- No DNS or secrets changes.
- No database migration or production asset change.
- No automatic visual-baseline acceptance.
- Exact-head evidence is invalidated whenever this audit branch head moves.

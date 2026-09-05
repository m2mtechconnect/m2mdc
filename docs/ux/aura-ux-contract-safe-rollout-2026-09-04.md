# AURA DC UX contract and safe rollout plan

Status: reviewable proposal; documentation only. No application, database,
authentication, permission, deployment, or production changes are included.

Reviewed branch: `fix/post-publish-smoke-binding`
Reviewed commit: `8758bfb1c2a310504098cd9f7e5a4f06912205a4`
Prepared: 2026-09-04

## Evidence boundary

ServiceNow Core UI documentation was used for transferable interaction patterns:
unified navigation, search, favorites/history, lists and forms, reporting, and
landing-page organization. Its accessibility guidance was used for keyboard
focus, non-color chart cues, chart data tables, reduced motion, persistent
alerts, visible controls without hover, focusable truncated text, zoom/reflow,
and high-contrast behavior.

Sources:

- [ServiceNow Core UI](https://www.servicenow.com/docs/r/de-DE/platform-user-interface/c_UI16.html)
- [ServiceNow accessibility preferences](https://www.servicenow.com/docs/r/de-DE/platform-user-interface/next-experience-accessibility-preferences.html?contentId=98rPHgF__DcjjO4js1WTQw)
- [Supplied YouTube reference](https://www.youtube.com/watch?v=hDZuW-XfXCs)

The supplied YouTube page did not expose a reliable transcript or metadata in
the research pass. No video-specific behavior is treated as verified evidence.

### Transfer to AURA

- Keep one AURA shell with role-prioritized landing content and contextual
  navigation.
- Use search, history, and favorites to reduce permanent navigation depth.
- Preserve readable density for expert workflows while allowing a user choice
  of density after the default is established.
- Make accessibility and recovery states part of the component contract.

### Explicitly rejected

Do not copy ServiceNow taxonomy, product terminology, chrome, proprietary
components, administrative model, or vendor assets. AURA retains its own
facility-to-decision-to-evidence workflow and its existing authorization model.

## 1. Page-purpose and navigation contract

The current five-workspace shell remains the navigation truth. Existing routes
are retained; this document does not authorize adding, renaming, regrouping, or
removing menu destinations.

| Workspace | Primary user outcome | Representative routes | Canonical authority to verify |
| --- | --- | --- | --- |
| Command Center | See current work and the next permitted action | `/dashboard` | Resolved identity, organization, facility, persona, and current work |
| Design & Build | Inspect or configure the governed twin | `/blueprint/default`, `/builder` | Builder state and facility configuration contracts |
| Operations | Monitor facilities, connections, analytics, and deployments | `/manage/facilities`, `/manage/integrations`, `/connect/monitor`, `/analytics`, `/deployments` | Organization-scoped operational and connection authorities |
| Simulation | Inspect, configure, simulate, compare, decide, and verify | `/simulation` | Trusted run lifecycle and decision evidence |
| Evidence | Trace and export bounded claims and decisions | `/dsx/evidence-beta/overview` | Provenance, source, timestamp, run, and export contracts |

Navigation acceptance criteria:

- Each destination has one owner, one primary outcome, one canonical data
  authority, and one disposition: keep, embed, redirect, admin-only, or retire.
- Role and permission filtering changes visibility only; it never grants access.
- A proposed navigation change requires a before/after map and explicit review.
- Facility, tenant, persona, mode, run, source, and timestamp context appears
  only when the route consumes the same authoritative context.

## 2. Component and state contract

Critical AURA components must be tested in every applicable state, not only in
their default screenshot.

| Component family | Required states | Required behavior |
| --- | --- | --- |
| Shell and context bar | default, narrow, unauthorized, stale | Shows the current scope and mode without implying authority or live data |
| Status/provenance badge | simulated, connected, verified, stale, unavailable, failed | Keeps source, method, timestamp, run, confidence, and limitation visible |
| Table and chart | loading, empty, partial, failed, read-only, large data | Supports pagination/filtering; charts do not rely on color alone and expose data tables |
| Dialog, drawer, and inspector | open, close, Escape, focus return, narrow | One control per action, bounded focus, accessible name, and focus restoration |
| Primary actions and forms | disabled, submitting, validation error, cancelled, success | Visible labels, idempotent retry, unsaved-change semantics, and no hover-only critical action |
| Loading and recovery | slow, timeout, offline, permission change, recovered | Meaningful progress, timeout guidance, preserved input, and an explicit retry path |
| Alerts and notices | warning, error, success, persistent | Remain until acknowledged when material and are announced to assistive technology |

Accessibility qualification must include keyboard-only use, visible focus,
focus restoration, reduced motion, high contrast, screen-reader announcements,
200% and 400% zoom/reflow, narrow layouts, and focused access to truncated
labels or tooltip text.

## 3. Persona × route × API journey contract

The five presentation families remain separate from identity and authorization.
Each family requires one golden job journey and one negative case.

| Persona family | Golden journey | Backend/data boundary to prove | Negative case |
| --- | --- | --- | --- |
| Owner / Administrator | Enter scoped context, resolve readiness, validate connections, assign least privilege, hand off workspace | Organization membership, readiness, connection, audit, and reload contracts | Organization authority cannot perform a platform-only action; platform authority without membership cannot silently gain tenant access |
| Facility Engineer / Operator | Inspect, configure, simulate, compare, decide, verify | `run-lifecycle`, tenant-scoped `simulation_runs`, trusted decision evidence, reload/resume | Failed or unverified preview cannot become approved, measured, deployed, or production-ready |
| Executive / Manager | Review decision queue, inspect provenance, compare alternatives, decide, verify handoff | Read-only run/decision access, decision record, accountable owner, and reload | Read-only user cannot deploy or mutate the twin |
| Compliance / Analyst | Trace claim to source and controls, record authorized result, export bounded evidence | Provenance, control, audit, export, and tenant-safe filtering | Missing, stale, simulated, or unverified evidence cannot be labelled compliant, healthy, measured, or approved |
| Viewer / Pilot | Orient, review permitted evidence, encounter an explained boundary, request access, return to stable status | Read-only route guard and access-request persistence | Direct URL or client-side persona change cannot bypass approval or permissions |

For every row, capture initial state, primary action, resulting state, durable
write or read-only outcome, reload/resume, handoff where applicable, failure or
denial, viewport, fixture classification, and exact commit.

## 4. Safe implementation sequence

### Phase 0: baseline and containment

- Record the exact branch and commit, production fingerprint, current test
  results, and representative visual baselines.
- Leave existing untracked reports and user work untouched.
- Do not change routes, schema, migrations, RLS, authentication, CORS, or
  generated contracts.

### Phase 1: UI-only foundation

- Reuse AURA tokens and existing primitives before creating variants.
- Implement the state and accessibility contract on one route only.
- Keep the change additive, atomic, and behind a reversible flag when practical.
- Do not mix visual changes with backend or information-architecture changes.

### Phase 2: one wired vertical slice

- Qualify `dashboard -> facility -> simulation -> evidence` through the existing
  API and authorization boundaries.
- Verify persistence, reload, tenant isolation, truth labels, denial, timeout,
  cancellation, and idempotent retry.
- Add regression tests for the shared mechanism and one analogous consumer.

### Phase 3: independent qualification

- Expand the route/persona/state matrix only after Phase 2 passes.
- Run keyboard, zoom, reduced-motion, screen-reader, responsive, scale, and
  failure-injection checks.
- Bind all visual and release artifacts to the exact commit; older or blocked
  evidence remains unverified.

## 5. No-break guardrails and acceptance criteria

- One concern per commit; every commit has a straightforward revert path.
- Existing deep links, API contracts, permissions, RLS, provenance, and release
  controls remain unchanged unless a separately reviewed change requires them.
- No destructive cleanup from static search results alone.
- No critical route is accepted without loading, empty, failed, unauthorized,
  stale, and recovered behavior.
- No critical icon action is unnamed or hover-only.
- Every chart has a non-color distinction and accessible data alternative.
- Every supported persona has one complete job journey and one denied/failed
  journey.
- No UI claim contradicts its source, mode, freshness, confidence, or release
  state.
- Merge and publish remain separate, explicit release decisions after exact-head
  qualification.

This document is a reviewable contract, not production authority. The next
implementation should be a single UI-only vertical slice after this contract
and its route/persona ownership are reviewed.

# AURA DC persona and journey map

Status: approved presentation contract; persona-prioritized Command Center implemented without an authorization, route or navigation change

Baseline: `cde1d9050d81795e8afce43d28f9b9e680afc939`

Prepared: 2026-09-01

## Current evidence

| Layer | Current contract | Finding |
| --- | --- | --- |
| Platform authorization | 11 platform roles plus the explicit global owner bootstrap | This is an authorization surface, not a customer-facing persona list. |
| Organization authorization | 11 organization membership roles | Active-organization membership remains authoritative for tenant actions. |
| Enterprise QA fixture | 9 tenant personas | It covers required access paths but previously lacked a stable presentation-family contract. |
| Workflow role view | engineer, operator, executive, compliance | These are presentation lenses only and must never grant access. |
| Permanent workspace shell | Command Center, Design & Build, Operations, Simulation, Evidence | This five-workspace shell is the current navigation truth. |
| Simulation workflow | inspect, configure, simulate, decide, verify | This is the strongest existing end-to-end job flow and should remain the product spine. |

## Proposed five presentation families

| Family | Primary outcome | First three actions |
| --- | --- | --- |
| Owner / Administrator | Establish a governed workspace ready for other personas. | Resolve readiness; manage connections and access; hand off a ready workspace. |
| Facility Engineer / Operator | Evaluate a facility change safely and carry an approved decision into operation. | Inspect state; simulate and compare; verify the approved outcome. |
| Executive / Manager | Make an accountable decision using traceable operational and business evidence. | Review decisions; compare risk and value; approve or request evidence. |
| Compliance / Analyst | Determine whether a claim or decision is supported, traceable and exportable. | Trace source; review controls and contradictions; export bounded evidence. |
| Viewer / Pilot | Understand AURA safely and reach a clear next step without privileged access. | Review permitted context; complete a guided evaluation; request access. |

Marketing, sales and support remain specialist platform entitlements. They are not additional marketed product personas. Global owner, operator and viewer labels also remain separate from organization membership and cannot be used to infer tenant authority.

## Coverage assessment

| Family | Permission and route tests | Complete job test | Live evidence |
| --- | --- | --- | --- |
| Owner / Administrator | Implemented | Partial | Owner/admin access paths observed; complete workspace handoff not yet qualified. |
| Facility Engineer / Operator | Implemented | Partial | Landing, simulation route, reload and platform denial pass; persisted run-to-operation handoff is incomplete. |
| Executive / Manager | Implemented | Partial | Landing, evidence route, reload and twin-mutation denial pass; durable decision handoff is incomplete. |
| Compliance / Analyst | Implemented | Partial | Landing, evidence route, reload and connection-edit denial pass; claim-to-export persistence is incomplete. |
| Viewer / Pilot | Implemented | Partial | Organization viewer and sealed pilot landing, reload, recovery and direct-route denial pass; live access-request persistence is incomplete. |

The Command Center browser matrix now exercises each family with authoritative
organization or platform grants, a persona-prioritized landing state, a primary
read-only or operational route, reload/resume, and a direct-URL denial. These
are browser and authorization fixtures, not proof of production persistence or
live tenant data; the complete-job column remains unchanged until the durable
backend handoffs below are qualified.

Grant-less approved users remain in the sealed Pilot shell. That shell now
states the authoritative read-only access condition, names organization
membership as the required next step, offers an access refresh, and proves that
direct product URLs return to the same stable status. A tenant-only global
viewer label remains an evaluation scope and is never described as platform
authority.

Permission/route coverage must not be reported as golden-journey coverage. A golden journey must complete a real persona job, exercise persisted state, prove the outcome and include a negative case.

## Golden journeys to qualify

1. Owner / Administrator: enter scoped context, review readiness, validate connections, assign access, verify persistence and hand off.
2. Facility Engineer / Operator: inspect, configure, review assumptions, simulate, compare, decide and verify.
3. Executive / Manager: review the decision queue, inspect provenance, compare outcomes, decide and verify handoff.
4. Compliance / Analyst: open a claim, trace authority, review controls, record the authorized outcome and export evidence.
5. Viewer / Pilot: orient, review permitted evidence, encounter an explained boundary, request access and return to stable status.

Each journey has a required negative case in `src/config/personaJourneyModel.ts`.

## Information-architecture boundary

This branch establishes the presentation contract, annotates the QA fixture, makes the browser test click the actual five-workspace navigation and prioritizes Command Center current work and permitted actions for the resolved family. It does not reorder, hide or rename navigation; change permissions; introduce a second role source; or publish a deployment.

The presentation family is resolved from the active organization role first, then the platform role, with pilot as an explicit viewer/pilot state. The resolved family never creates permissions; every displayed action is filtered through the existing canonical permission set and remains protected by route and backend authorization.

## Qualification coverage appendix

| Category | Covered in this gate | Still required |
| --- | --- | --- |
| Personas | Owner/admin, engineer/operator, executive/manager, compliance/analyst, organization viewer, tenant-only global viewer and sealed pilot | Production-representative named test accounts |
| Routes | Command Center, Simulation, Evidence, Account Settings and Pilot Overview; direct denial for platform admin, Builder, Connections and Simulation | Durable write/handoff routes for each job |
| Viewport | Desktop Chrome at 1280 × 900 | Narrow-screen, zoom/reflow and assistive-technology pass |
| Interaction states | Landing context, prioritized action, meaningful route content, reload/resume, empty pilot state, recovery and denial | Slow, failed, cancelled and backend-conflict states |
| Backend boundaries | Mocked verified identity, platform grants, organization membership, active organization and fail-closed route guards | Live RLS, RPC/Edge Function, persistence, audit record and tenant-isolation evidence |
| Release evidence | Exact isolated branch qualified before atomic commit | Push/PR, deployed fingerprint and post-publish production observation |

# AURA DC persona and journey map

Status: proposed presentation contract; no authorization, route or navigation change

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
| Facility Engineer / Operator | Implemented | Partial | Inspect and simulation surfaces observed; approved operational handoff is incomplete. |
| Executive / Manager | Implemented | Missing | No complete evidence-to-decision-to-handoff golden journey. |
| Compliance / Analyst | Implemented | Missing | No complete claim-to-export golden journey. |
| Viewer / Pilot | Implemented | Partial | Pilot isolation exists; approval, denial and return path need full qualification. |

Permission/route coverage must not be reported as golden-journey coverage. A golden journey must complete a real persona job, exercise persisted state, prove the outcome and include a negative case.

## Golden journeys to qualify

1. Owner / Administrator: enter scoped context, review readiness, validate connections, assign access, verify persistence and hand off.
2. Facility Engineer / Operator: inspect, configure, review assumptions, simulate, compare, decide and verify.
3. Executive / Manager: review the decision queue, inspect provenance, compare outcomes, decide and verify handoff.
4. Compliance / Analyst: open a claim, trace authority, review controls, record the authorized outcome and export evidence.
5. Viewer / Pilot: orient, review permitted evidence, encounter an explained boundary, request access and return to stable status.

Each journey has a required negative case in `src/config/personaJourneyModel.ts`.

## Information-architecture boundary

This branch only establishes the presentation contract, annotates the QA fixture and makes the browser test click the actual five-workspace navigation. It does not reorder, hide or rename navigation; change permissions; introduce a second role source; or publish a deployment.

The next visible change should be a persona-prioritized Command Center within the existing five-workspace shell. That change requires explicit approval of the proposed presentation map before implementation.

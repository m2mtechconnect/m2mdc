# AURA External Blockers — Phase 0

Work items that **cannot be resolved inside the repository** and therefore gate specific remediation phases. Every blocker names the phase it gates and the decision M2M must make (or the party M2M must engage). No blocker on this list is assumed resolved; do not begin the gated phase until the "Resolution required" column is signed off.

---

## 1. Named technical owners (blocks all phases)

A single accountable owner is required per workstream before Phase 1 starts. Without owners, remediation cannot pass its own quality gates.

| Workstream | Owner (TBD) | First responsibility |
|---|---|---|
| Platform (React, Supabase, edge fns, CI) | | Own Phase 1 truth-in-UI + Kit endpoint hardening |
| 3D / OpenUSD / Omniverse Kit | | Own OpenUSD registry + Kit farm design |
| Integrations (BMS, DCIM, EPMS, DCGM, edge gateway) | | Own edge-gateway prototype and telemetry ingest |
| Simulation and physics | | Own consolidation of 4 engines → 1; own validated scenario |
| Security, compliance and audit | | Own evidence pipeline and legal-claim review |

---

## 2. Facility and operational access

| Blocker | Gates | Resolution required |
|---|---|---|
| **First pilot facility identified** with a named operational owner and a signed data-sharing scope | Phases 2, 3, 5, 6 | Facility name, address, operator contact, scope memo |
| **Facility topology data available** (CAD, BIM, LiDAR scan, or rack elevation drawings) with license to derive USD assets | Phase 4 (OpenUSD registry) | Asset inventory + IP/license letter |
| **BMS / DCIM / EPMS credentials** for the pilot facility (read-only for Phase 3; write access deferred) | Phase 3 (telemetry ingest) | Vendor, protocol (Modbus / BACnet / OPC-UA), VPN or gateway path, credential owner |
| **Edge-gateway ownership decision** — M2M-owned appliance vs facility-hosted vs vendor-managed | Phase 3 | Written decision + procurement path if applicable |

## 3. NVIDIA / Omniverse access

| Blocker | Gates | Resolution required |
|---|---|---|
| NVIDIA Enterprise account and DSX programme access | Phase 4+ | Account holder, entitlements list |
| Omniverse Kit 109 package + license under M2M control | Phase 4 (Kit farm) | Package channel, license terms |
| GPU infrastructure authorization (e.g., single g5.xlarge for initial farm) | Phase 4 | Budget approval + cloud region choice (see §4) |
| Modulus / calibrated physics solver access | Phase 5 (validated scenario) | Partner or licensed access path |

## 4. Platform and data-residency decisions

| Blocker | Gates | Resolution required |
|---|---|---|
| **Canadian hosting and data residency decision** — where twin data, telemetry, and evidence live (region, provider, sovereignty posture) | Phases 3, 4, 6 | Written policy tied to the compliance claims in `capability-traceability.md` |
| **Time-series platform decision** — Timescale / ClickHouse / InfluxDB / Supabase-only | Phase 3 | Decision memo + hosting region aligned with §4.1 |
| **Event-bus / DSX Exchange decision** — NATS, Kafka, or DSX-native | Phases 3, 5 | Decision + delivery-semantics requirement |

## 5. Legal and compliance

| Blocker | Gates | Resolution required |
|---|---|---|
| **Legal review of current compliance claims** ("SOC 2", "ISO 27001", "Law 25", "Sovereign" language across 20+ files identified in `capability-traceability.md`) | Phase 1 (truth-in-UI) — cannot ship marketing while unverified | Legal opinion + copy-approval list |
| Data-processing agreement template for the pilot facility | Phase 3 | Draft DPA + counterparty review |

---

## Repository-only remediation is unblocked

The following Phase 1 items depend on **no** external blocker above and can proceed as soon as this Phase 0 report is approved:

1. Truth-in-UI relabelling — every synthesized KPI shown with a `provenance: 'synthesized' | 'derived' | 'live'` badge; label the Three.js viewer as "Procedural preview", not "Omniverse RTX Viewport".
2. Kit endpoint hardening — remove the hard-coded IPv4 fallback in `vite.config.ts:14`, `OmniverseStreamViewer.tsx:41`, `omniverseKit/client.ts:10`; fail-closed with a clear "Kit not configured" state when `VITE_OMNIVERSE_KIT_URL` is unset.
3. Consolidation — collapse 4 simulation engines → 1 canonical, merge 3 mock-data trees → 1, add ADR justifying the winner.
4. Fix the pre-existing red baseline (198 test failures, 23 `tsc` errors in `omniverseAdapter.ts`, top-N ESLint categories) or explicitly quarantine them behind a documented skip list.

---

## Proposed Phase 1 scope (for your approval — do not execute yet)

**Duration:** 2 sprints (approx. 4 weeks) with 4 engineers.
**P0 exit criteria:**

- Zero UI surface labels a synthesized value as "live".
- Zero hard-coded operational endpoints in source.
- Exactly one simulation engine module and one mock-data module remain under `src/`; deletions covered by codemod + tests.
- `tsc` clean (harness-level typecheck passes without the 23 `omniverseAdapter.ts` errors).
- Test suite delta: no new failures; documented plan for the pre-existing 198.
- ADR-0001 (canonical simulation engine), ADR-0002 (KPI provenance model), ADR-0003 (Kit endpoint config contract) checked in under `docs/adr/`.
- Legal sign-off (or removal) of every compliance claim string identified in the traceability matrix.

**Explicitly out of scope for Phase 1:** telemetry ingest, OpenUSD registry, Kit farm, DSX integration, edge gateway, compliance-evidence store, agent write actions. Those depend on the blockers above.

**Await approval before starting.**

---

## Phase 1A.3.g addendum — unresolved findings (2026-07-17)

| # | Finding | Owner | Phase | Acceptance |
|---|---|---|---|---|
| A | Public-route third-party egress (Supabase session probe, Google Fonts, GCS favicon, three.js example HDR, Microsoft Clarity, Bing beacon, Lovable badge) fires from the client bundle on unauthenticated pages. Aborted at the wire in the truth harness (`tests/truth-in-ui/_setup/network-guard.ts` `BOOTSTRAP_ALLOWED_SUFFIXES`) but reaches the network in production. | Platform | 1B | Zero unsolicited third-party egress on pre-auth landing; auth traffic goes only to Lovable Cloud backend. |
| B | Playwright Chromium fails to launch in current sandbox runner (`libglib-2.0.so.0` missing). 47/47 green run recorded on the same source tree in 1A.3.e.1 / 1A.3.f; 1A.3.g re-run blocked by the runner image. | Platform (CI) | 1A.3.g follow-up → 1B kick-off | `npx playwright test --config playwright.truth.config.ts` reports 47/47 in the Phase 1B CI runner. |
| C | Full Vitest suite still red (236 failed / 907 passed / 103 skipped). 198-failure Phase 0 baseline unresolved; +38 delta attributable to `vitest-pool` fork-runner timeouts under concurrent gate load — targeted provenance run is 194/194 green on the same tree. | Platform | 1B P0 | Full suite green in isolation. |
| D | Full ESLint still red (1472 problems vs 1471 baseline). Legacy `no-explicit-any` majority; no Phase 1A source file introduces a new error class. | Platform | 1B P1 | Baseline reduction plan approved and executed. |
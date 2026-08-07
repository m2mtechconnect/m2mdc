# NVIDIA terminology and claims register (Stage 3)

Sources: primary NVIDIA properties only, retrieved 2026-08-07.

## A. What "NVIDIA DSX" officially is

`https://www.nvidia.com/en-us/data-center/products/dsx/` states that NVIDIA DSX
is "NVIDIA's AI factory-scale platform... DSX spans chips and systems,
infrastructure software, facilities, and partner technologies."

**Classification: a combination of NVIDIA technologies published as an official
NVIDIA platform brand and reference-design framework.** It is not a single SKU,
not a partner-specific solution, and not an internal M2M name.

| Official name | Kind | Lifecycle (per primary source) |
|---|---|---|
| NVIDIA DSX (DSX Platform) | Platform / umbrella brand | Announced; components rolling out |
| NVIDIA DSX Reference Design (incl. Vera Rubin DSX AI Factory reference design) | Validated chip-to-grid reference architecture | Announced |
| **NVIDIA Omniverse DSX Blueprint** | Blueprint built on Omniverse + OpenUSD; includes SimReady assets, hardware configs, prebuilt web UI, sample scripts | **Generally available on build.nvidia.com** (explicit NVIDIA FAQ statement) |
| NVIDIA DSX Exchange | "Common communication layer" integrating compute, network, energy, power and cooling signals across IT, OT and operations systems | Announced |
| NVIDIA DSX OS | Open modular AI-factory operating layer | Announced |
| NVIDIA DSX Sim | Simulation tooling | Announced |
| NVIDIA DSX MaxLPS / DSX Flex | Power management / grid-responsive orchestration | Announced |

Correction to prior AURA documentation: `docs/dsx/nvidia-upstream-manifest.json`
cites `nvidia.com/en-us/data-center/dsx/` and describes DSX only as
"architecture". That entry predates the GA of the Omniverse DSX Blueprint and
the publication of DSX Exchange as a named NVIDIA layer. AURA's `src/dsx/` tree
and its `DSX Exchange` module were designed **before and independently of** the
official DSX Exchange definition; the name collision is not evidence of
conformance to NVIDIA's layer.

## B. Component naming corrections applicable to AURA

- PhysicsNeMo is the current name of the framework formerly called Modulus. AURA docs use both.
- SimReady is referenced by NVIDIA within the Omniverse DSX Blueprint, but no standalone public SimReady conformance specification could be retrieved; AURA therefore cannot claim SimReady conformance under any published criteria.
- Triton Inference Server remains published; NVIDIA Dynamo is also published. AURA uses neither.
- No EOL notice was found for Fleet Command. AURA uses it in no form.

## C. Validation and certification programmes

Named on the NVIDIA DSX page:
1. **NVIDIA-Certified Systems** — hardware/system certification.
2. **NVIDIA AI Cloud-Ready ISV Validation Initiative** — "assesses infrastructure software across networking, compute, orchestration, and AI platform layers for NVIDIA Cloud Partner deployments." This is the applicable path for a software vendor.
3. **AI Factory DSX Infrastructure Marketplace** — listing of products "validated to meet NVIDIA's functional requirement for AI factory applications."
4. **NVIDIA Qualified System Catalog** — separate from certification.

Legitimate use of "NVIDIA validated" or "NVIDIA certified" requires an explicit
NVIDIA-administered programme outcome and listing. Self-declared compatibility
is not sufficient.

**AURA DC holds no listing, certification, validation or entitlement under any
of these programmes. No evidence of an application exists in the repository.**

## D. Claims register

| # | Claim as it appears | Location | Evidence | Determination |
|---|---|---|---|---|
| C-01 | "Dedicated page for live NVIDIA Omniverse RTX-rendered data center scene... all powered by the Kit REST API" | `src/pages/OmniverseScene.tsx:1-6` | `readKitConfig()` returns `enabled:false` unconditionally; every client call throws `KitDisabledError` | **WITHDRAW** — nothing is live or rendered |
| C-02 | "NVIDIA Omniverse RTX • Kit 109 • {n} Racks • Live Scene" (UI badge) | `src/pages/OmniverseScene.tsx:168` | no Kit host, no stream, no version handshake | **WITHDRAW** |
| C-03 | "Connects to the DDN Data Center Digital Twin running on NVIDIA Kit 109" | `src/integrations/omniverseKit/client.ts:2-3` | client is disabled at build level | **QUALIFY** — rewrite as a target-state comment |
| C-04 | "Enterprise-grade KPI System matching Nvidia Omniverse, Siemens, Schneider, AWS, Azure" | `src/components/dc-twin/tabs/DCSimulationTab.tsx:3` and `src/components/simulation/EnterpriseKPIChart.tsx:3` | no comparative benchmark exists | **WITHDRAW** |
| C-05 | "NVIDIA B3100", "RTX PRO 6000", "Omniverse simulation engine runs thousands of what-if scenarios" | `src/pages/InfrastructurePage.tsx:44-58, 921` | no NVIDIA hardware, no Omniverse engine, no what-if solver | **WITHDRAW** — also violates the standing generic-infrastructure-terminology rule |
| C-06 | "Optimal band 70-90% per NVIDIA DGX SuperPOD reference" | `src/pages/IntelligenceDashboard.tsx:393, 562, 634` | a cited design band, not a product claim | **KEEP, with citation** |
| C-07 | "Omniverse USD", "Real-time sync" spec chips | `src/pages/InfrastructurePage.tsx:45` | zero USD files in the repository | **WITHDRAW** |
| C-08 | `src/dsx/exchange/*` named "DSX Exchange" | source tree | AURA's module is an MQTT abstraction; NVIDIA DSX Exchange is a distinct published layer | **QUALIFY** — rename or annotate as "DSX-Exchange-style local broker adapter (not NVIDIA DSX Exchange)" |
| C-09 | "NVIDIA validated" / "NVIDIA certified" / "powered by NVIDIA DSX" | not present in the repository | n/a | **CORRECTLY ABSENT — must remain absent** |

No code was modified in this stage; C-01 through C-08 are recorded for
remediation, not applied.

# AURA mapped to the NVIDIA Omniverse DSX Blueprint

DSX is a reference architecture published by NVIDIA. AURA is aligned to it
where AURA genuinely implements a concept, and is marked as a gap where it
does not. No DSX component is claimed as integrated.

Source of truth: `src/config/dsxCapabilityRegistry.ts`. This document is a
narrative view of that file; the file wins on any disagreement.

## Status levels

| Status | Meaning | Evidence required |
|---|---|---|
| `AURA_NATIVE` | AURA built it; no DSX equivalent claimed | Runtime evidence path |
| `DSX_ALIGNED` | Implements the DSX concept in AURA's own stack | Runtime evidence path |
| `NVIDIA_INTEGRATED` | NVIDIA code or service actually runs | NVIDIA code/service integrated flag |
| `SIMREADY_VALIDATED` | Asset passed SimReady validation | Validated metadata plus an OpenUSD master |
| `PLANNED` | Designed, not built | - |
| `BLOCKED` | Blocked on an external dependency | Named blocker |
| `UNAVAILABLE` | Not present and not scheduled | - |

Today the registry contains **zero** `NVIDIA_INTEGRATED` and **zero**
`SIMREADY_VALIDATED` capabilities, matching `NVIDIA_READINESS` in
`src/capabilities/registry.ts`.

## Lifecycle grouping

Navigation follows the AI-factory lifecycle: Overview, Design, Simulate,
Operate, Govern, Support. Every canonical route is preserved; only labels and
grouping changed. Legacy paths continue to resolve through
`src/config/routeAliases.ts`.

| Group | Pages |
|---|---|
| Overview | AI Factory Overview |
| Design | Facilities, Facility Blueprint, OpenUSD Asset Pipeline, Validation & Evidence |
| Simulate | Simulation Studio |
| Operate | Integrations, Agents & Optimization, Operations & Telemetry, Runtime Environments |
| Govern | Agent Configuration, Admin Console (incl. DSX capability registry) |
| Support | Search, Learning Hub |

## Layer separation

| Layer | Authority | Never does |
|---|---|---|
| Geometry, identity, hierarchy | OpenUSD masters under `assets/` | carry live telemetry |
| Browser rendering | approved GLB derivatives with checksums | become the source of truth |
| Operational data | AURA databases and the simulation facade | modify geometry |
| Analytical overlays | AURA runtime, procedural and transparent | replace an approved derivative |

A GLB derivative is a delivery artefact. It never replaces the OpenUSD master.

## Runtime boundary

The browser scene is the **AURA Web Runtime**: three.js rendering approved GLB
derivatives. It is not Omniverse Kit, not RTX streaming, and not an Omniverse
session. No Omniverse Kit or Nucleus instance is reachable from AURA.

## Known gaps

- DSX Exchange transport: local harness only, no official distribution deployed.
- Live telemetry sources: 0. Every operational number is simulated or replayed.
- Solver coupling (CFD, PhysicsX): not implemented.
- NIM inference and NeMo Retriever: not integrated.
- Cloud GPU validation lanes (Brev, AWS): planned, awaiting execution.
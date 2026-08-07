# NVIDIA / DSX readiness scorecard (Stage 3)

All percentages are recomputed from the gate arithmetic in docs 62-66 and the
checklists below. The previously circulated 68% and 56% figures were not
reproducible and are **not** reused.

## Gate arithmetic (pilot evidence base)

| Gate | Checks required | Checks met | % |
|---|---|---|---|
| DSX-01 Blueprint and lineage | 15 | 2 | 13% |
| DSX-02 OpenUSD and SimReady | 16 | 1 | 6% |
| DSX-03 Telemetry integration | 20 | 9 | 45% |
| DSX-04 Calibrated simulation | 17 | 2 | 12% |
| DSX-05 Operational scenarios | 14 | 6 | 43% |
| **Total** | **82** | **20** | **24%** |

## Level scoring

| Level | Checks | Met | % | Verdict |
|---|---|---|---|---|
| Architecture-aligned | 10 (named real NVIDIA components, correct terminology, reference-only policy enforced, no vendoring, fail-closed boundaries, declared touchpoints, capability registry, contract versioning, provenance model, honest unavailable states) | 8 (terminology corrections in doc 60 and the DSX Exchange name collision are the two misses) | **80%** | PASS |
| Demo-ready | 12 (deterministic seed, labelled synthetic data, no silent fallback, quarantine taxonomy, provenance drawer, 11 workspaces, decision workflow, audit log, keyboard/a11y coverage, cross-browser coverage, 173 passing tests, zero-egress test guard) | 11 (no completed reviewer walkthrough on record) | **92%** | PASS |
| Pilot-ready | 82 (see gate arithmetic) | 20 | **24%** | FAIL |
| Production-ready | 14 (pilot gates plus security, reliability, observability, supportability, operational validation) | 1 | **7%** | FAIL — compounded by the frozen F-01 and F-15 CRITICAL security findings |
| NVIDIA-validated | 4 (programme application, programme outcome, listing, written permission to use the mark) | 0 | **0%** | FAIL |

## Component roll-up (from 61-nvidia-stack-inventory.csv)

- Components claimed or referenced: 24 rows, of which 23 are NVIDIA-branded.
- Statically proven to exist as working code with real behaviour: **1** (the MQTT transport, an open-source substitute, not an NVIDIA component).
- NVIDIA components runtime-proven: **0**.
- Mock, disabled, UI-only or documentation-only: **23**.
- Correctly marked `not_applicable`: 11 (Riva, DeepStream, Metropolis, TensorRT, TAO, Triton, CUDA, Jetson, IGX, AI Enterprise, Fleet Command, ConnectX/Spectrum-X — none are in scope for a browser-delivered operations portal).

## What the platform genuinely is today

A deterministic, honestly-labelled, well-tested evidence and provenance surface
for data-centre operations, with a fail-closed ingestion boundary and a real
human-decision workflow. Its engineering discipline around truthfulness is
above average. It contains **no NVIDIA software, no GPU compute, no OpenUSD
stage and no calibrated physics**.

# Stage 4A - Provisioning Preflight Result (2026-08-07)

Status: **BLOCKED_BY_INFRASTRUCTURE**. The Stage 4 vertical slice is **not**
authorized. Artifacts 00-74 frozen; no application code, schema, migration or
prior evidence artifact was modified.

## Gate results

| Gate | Requirement | Result | Evidence | Responsible owner | Exact missing dependency |
|---|---|---|---|---|---|
| P4A-01 | NVIDIA GPU visible | BLOCKED | `/dev/nvidia*` absent | infrastructure administrator | GPU-attached Linux host |
| P4A-02 | NVIDIA driver healthy | BLOCKED | `nvidia-smi` absent, no `/proc/driver/nvidia` | infrastructure administrator | NVIDIA driver on that host |
| P4A-03 | Container GPU execution proven | BLOCKED | no `docker`/`podman`, no `nvidia-ctk` | infrastructure administrator | container runtime + NVIDIA Container Toolkit |
| P4A-04 | NGC authentication succeeds | BLOCKED | 0 NGC/NVIDIA credentials in runner environment | NVIDIA account owner | NGC API key injected via secret manager |
| P4A-05 | DSX Blueprint entitlement confirmed | BLOCKED | no authorized metadata retrieved (artifact 76) | NVIDIA account owner | entitlement to Omniverse DSX Blueprint |
| P4A-06 | Official DSX Exchange distribution accessible | BLOCKED | not retrieved; substitutes refused | NVIDIA account owner | official DSX Exchange distribution |
| P4A-07 | Official AsyncAPI schemas obtained | BLOCKED | not retrieved | NVIDIA account owner | official AsyncAPI documents |
| P4A-08 | OpenUSD validation tooling operational | BLOCKED | `usdchecker` absent, `pxr` module absent | infrastructure administrator | OpenUSD toolchain on the GPU host |
| P4A-09 | Disposable backend guard returns ALLOWED | BLOCKED | guard returned BLOCKED, 6 reasons | backend administrator | disposable project + the six Stage 2B variables |
| P4A-10 | Production targets and credentials absent | **FAIL** | target resolves to production ref; denylisted hostname | backend administrator | non-production target configuration |
| P4A-11 | Cleanup authorization confirmed | BLOCKED | `AURA_DC_TEST_CLEANUP_AUTHORIZED` not set | backend administrator | explicit cleanup authorization |
| P4A-12 | Evidence contains no reusable credentials | **PASS** | presence flags and identifiers only in 75-77 | audit | none |

Passed: 1. Failed: 1 (P4A-10). Blocked: 10.

## Actions taken and not taken

- The environment guard was run once, before any backend request, and returned
  BLOCKED. Zero requests were issued to the production project or to any
  NVIDIA registry.
- No package was installed. No credential was created, requested through chat,
  or written to disk.
- No gate was marked passed on the basis of a substitute component, a cached
  Stage 4 probe, or an unauthenticated HTTP response.

## Unchanged status

- Artifacts 00-74: frozen
- AURA DC demo: CONTROLLED_DEMO_READY
- NVIDIA vertical slice: BLOCKED_BY_NVIDIA_ENVIRONMENT
- Pilot readiness: 24%
- Production: NO-GO

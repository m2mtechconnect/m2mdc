# DSX-01 — Blueprint and lineage

Scope: does an executable NVIDIA blueprint, reference workflow or reproducible
architecture exist inside AURA DC? Diagrams and prose are explicitly excluded
as evidence.

## Evidence examined

| Artifact | Result |
|---|---|
| `docs/dsx/nvidia-upstream-manifest.json` | 5 upstream entries, `policy: reference-only`, `vendored: false` on every entry |
| `scripts/verify-dsx-upstream-manifest.mjs` | PASS: "5 reference-only entries, 0 vendored" |
| `package.json` dependencies | Zero NVIDIA packages. No Omniverse, USD, NIM, NeMo, Triton or CUDA dependency |
| Container manifests | Only `infra/dsx-exchange/docker-compose.yml` (Eclipse Mosquitto 2.0.22, loopback-only). No NVIDIA container image referenced anywhere |
| Kubernetes / Helm / Terraform | Absent. `docs/AURA-DC-Architecture.md` lists them as PLANNED |
| Model lineage | No model artifact, no registry, no checksum. `MODEL_VERSION = 'aura-dsx-thermal/0.1.0-uncalibrated'` is a string constant in `src/dsx/scenario/degradationEngine.ts` |
| Dataset lineage | `src/dsx/fixtures/evidenceBetaFacility.ts` + `timelines.ts`, seeded deterministic fixture. Provenance is internal authorship, not a facility dataset |
| Asset lineage | No geometry assets exist (see DSX-02) |
| Configuration lineage | `supabase/config.toml` records the `dsx-ingest` JWT exception; no NVIDIA-side configuration exists |
| SBOM | `41-dependency-inventory-sbom.json` present; contains zero NVIDIA entries |
| License / entitlement | No NVIDIA AI Enterprise, Omniverse Enterprise or DSX entitlement is held or referenced |
| Hardware requirements | No RTX/DGX/GPU host is provisioned or reachable from this workspace |
| Deployment evidence | None. No successful NVIDIA deployment has ever been executed from this repository |
| Manual steps | `infra/dsx-exchange/README.md` documents local broker start; unrelated to any NVIDIA blueprint |

## Gate arithmetic

15 required checks; 2 met (upstream manifest identity is declared and
machine-verified; reference-only policy is enforced in CI). 13 unmet.

**DSX-01 status:** ARCHITECTURE_ONLY
**Blueprint identity:** declared by reference only in `nvidia-upstream-manifest.json`; no blueprint is instantiated, pinned to a version, or executed
**Reproducible deployment:** NO — no container, manifest, chart or install procedure for any NVIDIA component
**Lineage completeness:** 2/15 (13%) — model, dataset, asset and configuration lineage for NVIDIA components are all absent
**Missing evidence:** blueprint version pin, container digests, deployment manifests, model + dataset registry, NVIDIA SBOM entries, entitlement records, hardware inventory, a single successful deployment run
**Verdict:** architecture_only

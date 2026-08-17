# Official NVIDIA source catalogue

All sources were retrieved server-side. Nothing is fetched from a floating
branch at application runtime.

## 1. GitHub - DSX Blueprint for AI Factories (RETRIEVED)

- Repository: https://github.com/NVIDIA-Omniverse-blueprints/omniverse-dsx-blueprint-for-ai-factories
- Pinned commit: `d940314d0593bbba1bae51e40ae7f9fd48358e18`
- Commit date: 2026-05-07T18:20:46Z
- Files retrieved and checksummed: `web/src/data/options.ts`, `web/src/data/kpis.ts`,
  `web/src/data/configs.ts`, `ARCHITECTURE.md`, `PRODUCT_TERMS_OMNIVERSE`
- Checksums: `source-checksums.json`
- Ingestion script: `scripts/dsx-reference/ingest.mjs` (idempotent, re-runnable,
  aborts on any checksum mismatch)

Content actually supplied by the source:

| Artefact | Content |
| --- | --- |
| `options.ts` | Site options (Virginia, New Mexico, Sweden), GPU options (GB200/GB300), power options (Grid/Hybrid/On-Prem), thermal and electrical simulation zones, operations and variable units |
| `kpis.ts` | Per-site specification sets, per-GPU KPI presets and building specifications |
| `configs.ts` | Six site x GPU configurations, each with Token Efficiency, PUE, WUE, CUE, Total Energy Use and Cost |

## 2. Official documentation (READ, DOCUMENTATION_ONLY)

- https://docs.omniverse.nvidia.com/dsx/latest/overview.html
- https://docs.omniverse.nvidia.com/dsx/latest/system-architecture.html
- https://docs.omniverse.nvidia.com/dsx/latest/user-interface-walkthrough.html

## 3. NGC dataset `nvidia/omniverse/dsx_dataset` v2.1 (NOT RETRIEVED - BLOCKED_ACCESS)

- Declared metadata: version 2.1, updated 6 May 2026, ~32.69 GB compressed,
  main assembly `DSX_BP/Assembly/DSX_Main_BP.usda`, USD plus images and sample
  simulation data, NVIDIA Sample Data License for Evaluation.
- Preflight result:
  - Disk available: 126 GB (sufficient)
  - NGC credentials present in the build environment: **none**
  - `GET https://api.ngc.nvidia.com/v2/org/nvidia/team/omniverse/resources/dsx_dataset/versions/2.1/files`
    returned **HTTP 401**
- Consequence: no archive checksum, no USD stage open, no unit/up-axis/default-prim
  record, no sample CFD or electrical outputs.
- All NGC-dependent functionality is recorded as **blocked** and renders
  `Unavailable`, never a substituted value.

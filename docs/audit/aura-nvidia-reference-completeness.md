# AURA NVIDIA AI Factory / DSX Mock Reference Completeness — Post-Implementation Ledger

## Scope

This is a **post-implementation completeness remediation**, not a repeat of the earlier mock-data cutover audit.

Preserved baselines:

- DSX/OpenUSD asset remediation: PR #16.
- Simulation-fidelity qualification: PR #18.
- Calibration-evidence qualification: PR #20 exact qualified head `9d002257b8a4db48851625bc69c5c659a6c5c0ff`.
- Original NVIDIA reference baseline: 65 normalized records pinned to NVIDIA commit `d940314d0593bbba1bae51e40ae7f9fd48358e18`.

The earlier 65 records remain committed unchanged for audit reproducibility. The current exported corpus layers the previously omitted public demo-source objects on top.

## External source validation

Official public source repository:

`NVIDIA-Omniverse-blueprints/omniverse-dsx-blueprint-for-ai-factories`

Pinned/public `main` commit at this qualification point:

`d940314d0593bbba1bae51e40ae7f9fd48358e18`

The source has therefore **not moved** since the original ingestion. The original file checksums remain the qualification anchors for:

- `web/src/data/options.ts`
- `web/src/data/kpis.ts`
- `web/src/data/configs.ts`

NVIDIA's broader DSX website/reference-design guidance is treated as a **separate freshness axis**. The May 2026 public blueprint demo dataset is not relabelled as current NVIDIA DSX reference-design truth.

## Source-complete normalized profile

Combined dataset version:

`2.0.0-source-complete@d940314`

Expected normalized records: **265**

Source split:

- `options.ts`: 23
- `kpis.ts`: 87
- `configs.ts`: 155

Added after the original 65-record phase:

- configurator GPU/site/power options;
- site hierarchy;
- 11 simulation variable/range definitions;
- global KPI chart values and score/icon metadata;
- per-GPU preset KPI values and scores;
- GPU hardware specification blocks from both `kpis.ts` and `configs.ts`;
- building specification blocks from both source scopes;
- config-specific site specification blocks;
- configuration KPI score/day/hour metadata.

## Upstream NVIDIA demo-source conflicts

AURA does **not** choose precedence for conflicting NVIDIA demo values.

Expected conflict records: **54**

Expected semantic conflict groups: **27**

Confirmed examples:

### New Mexico site specification

`kpis.ts` publishes generic `1 GW / 1,200 acres / 2,000,000 sq ft` site values.

`configs.ts` publishes `800 MW / 1,500 acres / 1,500,000 sq ft` plus reclaimed-water and mixed 400V/800V design values.

Both are retained with one conflict-group identity per semantic field.

### Sweden site specification

`kpis.ts` publishes the same generic 1 GW / 1,200-acre site block.

`configs.ts` publishes 600 MW / 700 acres / 1,200,000 sq ft plus Nordic-grid and free-air/rear-door cooling language.

Both are retained.

### GB200 hardware definition

`kpis.ts` describes a GB200 NVL72-style 72-GPU / 36-Grace configuration with 130 TB/s NVLink.

`configs.ts` describes a 48-GPU / 24-Grace GB200 SuperPod-style block with 80 TB/s NVLink.

Both are retained as `SOURCE_CONFLICT`; neither is promoted as the unique hardware truth.

GB300's matching hardware block is classified `DUPLICATE`, not conflict.

## Runtime/product truth

The reference dataset label is versioned to:

**NVIDIA Omniverse DSX Blueprint Demo Reference — May 2026 — Read-only**

Every reference-mode page inherits the global canary disclosure that:

- values are reference/demo data, never measured/live/operational;
- upstream source conflicts are preserved without precedence;
- this dataset is not a claim of current NVIDIA DSX reference-design parity;
- this dataset is not an NVIDIA runtime service;
- SimReady is not claimed;
- NGC-dependent content remains unavailable.

The production default remains `legacy-synthetic`; this remediation does not flip production data mode.

## NGC boundary

`nvidia/omniverse/dsx_dataset` v2.1 remains outside this public-source completeness layer.

No claim is made for byte/numerical parity of:

- NGC USD stages;
- sample CFD results;
- sample electrical simulation results;
- NGC images;
- SimReady asset metadata;
- operational/sample streams contained only in the authenticated content pack.

Those remain evidence-gated until the licensed content pack is retrieved and independently verified.

## Qualification rule

The dedicated CI gate must pass on one exact unchanged SHA:

1. typecheck;
2. existing reference-baseline and synthetic-data-ratchet tests;
3. source-completeness/conflict tests;
4. dataset isolation tests;
5. live check that NVIDIA public `main` still equals the pinned commit;
6. checksum verification of the three public data-bearing files;
7. production build.

If NVIDIA public `main` moves, qualification fails and requires a deliberate source re-audit. The pinned dataset is never silently updated.

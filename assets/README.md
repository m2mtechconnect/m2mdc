# AURA 3D asset pipeline

OpenUSD masters and recorded source identifiers are the authoritative geometry/provenance layer. The browser consumes only approved GLB derivatives that pass the runtime registry checks. A manifest row or a source USD path by itself never establishes runtime readiness, NVIDIA SimReady validation, DSX runtime integration, or installed hardware.

## Layout

```text
assets/
  manifest.json                  # registry consumed by the web app
  facility/                      # composed AURA reference-hall OpenUSD stage
  <asset_type>/<model_name>/
    <model_name>.usda            # AURA-authored master where applicable
    layers/                      # optional semantic / connection layers
    payloads/                    # real binary payloads only; never placeholders
    data/                        # provenance / validation records
    web/                         # approved browser derivative when published
```

The composed reference hall lives at:

```text
assets/facility/aura_reference_hall/aura_reference_hall.usda
  layers/semantic_bindings.usda
  layers/design_scenarios.usda
  layers/systems.usda
  layers/equipment.usda
  layers/building.usda
```

The companion `semantic_bindings.json` records stable AURA asset IDs, facility equipment IDs, semantic roles, telemetry-binding IDs, and available source/derivative checksums.

## Source rules

Allowed sources:

- user-provided CAD/USD/GLB with traceable rights;
- licensed vendor models;
- approved NVIDIA Data Center OpenUSD assets under their applicable licence;
- internally authored unbranded models with documented dimensions and provenance.

Forbidden:

- invented vendor products or logos;
- generic geometry represented as a specific NVIDIA/OEM product;
- empty or text-filled files masquerading as binary `.usdc` payloads;
- screenshots/video frames treated as 3D source geometry;
- untraceable bulk asset libraries;
- source CAD or licence-restricted masters redistributed to the frontend when their licence does not permit it.

## Current state

The registry is no longer an all-placeholder pipeline. Manifest v7 contains approved, runtime-eligible GLB derivatives derived from licensed NVIDIA Data Center OpenUSD source stages, including rack/rack-core, server, network-switch, rack-PDU, cable-tray, blanking-panel, and liquid-cooling classes. It also contains approved AURA-authored generic derivatives for facility shell, structural columns, raised-floor tiles, perforated airflow tiles, and data-hall luminaires.

Those facts do **not** establish full NVIDIA DSX blueprint coverage. In particular, the current generic NVIDIA data-centre asset set must not be substituted for generation-specific GB200/GB300 NVL72 hardware such as compute trays, NVLink switch trays, or power shelves. DSX exact-role coverage is defined separately in `src/dsx/blueprintAssetRequirements.ts` and fails closed until traceable source geometry is ingested and validated.

Some legacy/generic entries remain intentionally blocked or source-gated. Examples include the incomplete generic 42U rack stage with missing binary payloads and generic CRAH/UPS entries awaiting an approved source. Blocked assets must remain non-runtime.

## Truth labels

Use these claims precisely:

- **OpenUSD-derived**: a registered derivative has traceable OpenUSD lineage and passed the recorded AURA conversion/validation checks.
- **AURA-authored generic**: geometry was authored by M2M AURA and is not a vendor model.
- **Runtime eligible**: the current registry permits the validated GLB derivative to mount.
- **SimReady validated**: reserved for an asset with explicit NVIDIA SimReady validation evidence. Current AURA asset presence alone does not satisfy this claim.
- **DSX blueprint complete**: reserved for the fail-closed exact-role DSX asset gate. Generic or legacy visual approximations never count.

## Validation

Asset publication must preserve source identity, licence/provenance, dimensions, checksums, validation timestamp, derivative lineage, runtime eligibility, and—where supported—measured geometry/render-cost evidence. Superseded or quarantined builds stay in audit history but cannot resolve at runtime.

The reference-facility hardware harness is an additional runtime/visual test. It does not replace source lineage or the DSX blueprint asset gate, and a visually successful run cannot report DSX completeness while a required exact role is missing.

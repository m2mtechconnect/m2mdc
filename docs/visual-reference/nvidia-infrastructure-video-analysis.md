# Reference video analysis - infrastructure promo clip

Status: visual reference only. This clip is **not** engineering evidence, not a
source asset, not a texture library and not a replacement for validated
OpenUSD geometry. No pixels were extracted from it into any AURA asset.

## Source

| Field | Value |
| --- | --- |
| Filename | `Copy-of-ov-flavor-infrastructure-promo-pack-4480650-1280x680-1.mp4` |
| Duration | 5.405 s |
| Resolution | 1280 x 680, H.264, 29.97 fps, AAC audio |
| Size | 7,036,872 bytes |
| Inspected timestamps | 0.20 s, 1.30 s, 2.70 s, 4.00 s, 5.20 s |
| Frames retained in repo | none (frames were inspected in a scratch directory and discarded) |

## Transferable visual characteristics

1. **Populated rack interiors.** Cabinets read as full stacks of horizontal
   units rather than empty shells. Legibility comes from the repeated
   horizontal banding, not from high polygon counts.
2. **Equipment density and rhythm.** Groups of identical 1U units broken by
   occasional taller units and blank spans.
3. **Faceplate variation.** Light faceplates (network/switch tier at the top of
   the cabinet) contrast against darker compute faceplates further down.
4. **Vents, ports, rails, handles.** Detail is concentrated at the front plane;
   sides stay plain.
5. **Controlled cable organization.** Cables are bundled and follow vertical
   managers and overhead trays. Colour is functional (a small palette), never
   decorative.
6. **Subtle status LEDs.** Small, low-intensity points. No large glowing
   rectangles, no bloom.
7. **Material separation.** Painted near-black cabinet steel, brighter bare
   metal rails, matte plastic trim - three clearly different responses.
8. **Contact shadows.** Equipment reads as seated in the cabinet because of
   tight local occlusion, not because of a dark overall grade.
9. **Close-up inspection framing.** A single rack row fills the frame while the
   rest of the facility is out of view.
10. **Localized thermal visualization.** Colour is applied per equipment slot as
    an analytical layer over visible hardware, with soft transitions - not as a
    repaint of the cabinet doors.

## Characteristics that cannot be inferred from this clip

The clip provides **no reliable evidence** for:

- facility dimensions;
- rack spacing;
- shell construction;
- raised-floor engineering;
- luminaire photometrics;
- structural clearance;
- manufacturer-specific configuration;
- actual telemetry values.

## Prohibited assumptions

- Do not copy the clip's facility layout, UI, measurements, equipment
  configuration, temperatures, branding or cable topology.
- Do not reproduce the on-screen temperature, power or leak-status readings.
  Those are the clip's own scenario, not AURA measurements.
- Do not derive textures, logos or model numbers from any frame.
- Do not treat the clip's colour grade as a target; AURA must not become dark
  merely to imitate it.

## Proposed AURA changes

| Change | Affected semantic roles | Expected performance impact |
| --- | --- | --- |
| Shared AURA-authored material classes (painted steel, bare metal, plastic, faceplate, cable, LED, glass) replacing the single uniform tuning | all NVIDIA-derived equipment roles plus `rack-core-reference` | Material count bounded by class x band (single digits), not by instance count. No geometry change, no draw-call change. |
| Band-gated presentation: LED emissive off at overview, restrained nearby, full when a rack is selected | `server-1u`, `server-2u`, `network-switch`, `rack-pdu` | None at overview; emissive only on the small nearby set. |
| Evidence-gated LEDs (neutral/unlit without measured state) | equipment roles | None. |
| Contact-shadow and ambient balance review | facility lighting | Deferred until cloud GPU measurement. |
| Localized thermal remains a separate analytical layer over visible materials | thermal overlay | Unchanged. |

The clip is used primarily for **selected-rack and nearby equipment
presentation**. Overview presentation is deliberately left alone to protect the
verified baseline.

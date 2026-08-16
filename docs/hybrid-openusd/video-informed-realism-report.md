# Video-informed OpenUSD realism upgrade - report

Provenance statement used throughout: **NVIDIA OpenUSD-derived geometry with
AURA-authored material, lighting and visualization enhancements.** Nothing in
this phase is NVIDIA-authored, SimReady-certified, Omniverse-rendered or
RTX-rendered.

## 1. Video analysis

See `docs/visual-reference/nvidia-infrastructure-video-analysis.md`. The clip
(5.405 s, 1280 x 680) was used only to identify transferable presentation
characteristics. It contributed no geometry, no textures, no measurements and
no telemetry. Its facility, UI, temperatures, power figures, branding and cable
topology were explicitly excluded.

## 2. Baseline preserved

No change was made to geometry, prim paths, dimensions, placement, instancing
or derivative selection. The verified baseline stands unchanged:

- 178 NVIDIA OpenUSD-derived objects across eight semantic roles;
- 40/40 cabinets on the approved rack-core derivative;
- 916 AURA-authored facility objects across five families in 45 instanced draw calls;
- 1,094 OpenUSD-derived physical objects in total;
- NVIDIA, AURA-authored and procedural provenance counted separately.

## 3. Changes made

### 3.1 Material presentation policy (new)

`src/components/twin-visualization/materialPolicy.ts` replaces the previous
single uniform tuning (`metalness 0.5 / roughness 0.55` for every equipment
material, and a flat grey for the whole cabinet) with seven physically
separated classes:

| Class | Base colour | Roughness | Metalness | Notes |
| --- | --- | --- | --- | --- |
| painted-steel | `#2f333a` | 0.62 | 0.35 | graphite, not pure black; no mirror response |
| bare-metal | `#9aa2ab` | 0.42 | 0.85 | rails, brackets, trays; restrained highlights |
| plastic-composite | `#4a4f57` | 0.78 | 0.02 | handles, trim, blanking panels |
| faceplate | `#707880` | 0.55 | 0.45 | lighter than the cabinet so slots and vents read |
| cable | `#2b2f36` | 0.85 | 0.00 | polymer response, small functional palette |
| status-led | emissive gated | 0.40 | 0.00 | small emissive only; neutral without evidence |
| glass | `#1b1f24` | 0.12 | 0.00 | doors and windows only |

Class assignment is by authored material/mesh name first, semantic role second.
No invented manufacturer logos or model numbers were added. No textures were
authored, so no texture provenance is claimed.

### 3.2 Detail policy by distance band

`BAND_PRESENTATION` gates presentation richness: overview keeps LED emissive at
zero and reduces environment response; nearby restores restrained LEDs;
selected gets full presentation. A farther band can never receive richer
presentation than a nearer band - covered by unit test.

### 3.3 Evidence-gated LEDs

Without measured equipment state the LED class renders neutral and unlit rather
than displaying an invented healthy indicator.

### 3.4 Shared materials

`applyMaterialPolicy.ts` caches one three.js material per class/band/state
combination and reassigns it across every mesh. Material count is therefore
bounded by the policy, not by the number of servers, racks or cables.

### 3.5 USD override layer (non-destructive)

`assets/overrides/aura_nvidia_presentation/aura_nvidia_presentation.usda`
authors `over` prims for all 20 ingested NVIDIA sources, recording per asset:
source stage path, NVIDIA source checksum, semantic role, override kind, and
explicit `geometryModified=false`, `primPathsModified=false`,
`dimensionsModified=false`. No approved NVIDIA source USD was edited.

- Override layer checksum: `sha256:9a11a2925f06d882…` (full value in
  `docs/evidence/nvidia-pack/presentation-override-provenance.json`)
- Composition validated with usd-core: stage opens, 21 prims, overs resolve.

### 3.6 Manifest completeness fix

The five AURA facility derivatives were runtime-eligible but carried no
`qualityDecision`, `qualityMetrics` or `renderCostRank`. Metrics were measured
by downloading each published derivative and parsing the glTF chunk:

| Asset | Triangles | Draw calls | Materials | Bytes |
| --- | --- | --- | --- | --- |
| aura.floor.standard_tile_600.operations | 12 | 1 | 1 | 2,076 |
| aura.floor.perforated_tile_600.operations | 444 | 37 | 2 | 53,004 |
| aura.lighting.linear_luminaire_1500.operations | 48 | 4 | 2 | 6,468 |
| aura.structural.column_400.operations | 12 | 1 | 1 | 2,068 |
| aura.shell.facility_shell.operations | 48 | 4 | 1 | 6,112 |

## 4. Tests run

- `tsc -p tsconfig.app.json --noEmit`: clean.
- Twin-visualization + reference-facility suites: **50/50 pass**, including the
  new 7-case material policy suite (physical separation, no mirror/pure black,
  name-before-role classification, band gating, evidence gating, monotonic
  band richness, material sharing), the 178/916/40 regression baselines, role
  reconciliation and the quality-band policy (now green after 3.6).
- USD composition of the override layer validated with usd-core.

## 5. Not done in this phase

Honest gaps against the requested scope:

- Phase 6 rack population and cable-bundle geometry: not authored. Racks still
  use the existing representative placement; no new equipment was invented.
- Phase 7 lighting/ambient-occlusion changes: deferred - AO must not be enabled
  before cloud GPU measurement, and none is available here.
- Phase 9 inspection mode (front/rear/cutaway/cable/thermal/provenance views):
  not built.
- Phase 10: no new derivatives were generated or published; the change is
  runtime presentation over unchanged published GLBs, so no rollout, rollback
  or re-download verification was required.
- Phase 11 Brev and Phase 12 AWS GPU validation: **not executed**. No Brev
  Launchable access and no authorized AWS GPU instance are available from this
  environment. No GPU execution is claimed.
- Before/after screenshot evidence set: not captured (requires the GPU lanes
  above; software rendering would not be valid evidence of the material change).

### Launch instructions to unblock GPU validation

1. Brev: create a Launchable with an L40S (or equivalent graphics-capable GPU),
   verify `nvidia-smi`, launch Chrome with hardware WebGL, reject SwiftShader,
   open the published app at `/data-centre-twin?geometry=nvidia-reference`, run
   the existing 35-second reference-facility benchmark at overview, nearby and
   selected-rack bands, and export the JSON and markdown acceptance report from
   `/admin/reference-facility-validation`.
2. AWS: EC2 G6 (full NVIDIA L4) in Canada Central, Amazon DCV session, fixed
   1920 x 1080 viewport, DPR 1, Balanced quality, identical benchmark and guided
   views. Terminate the instance after evidence is saved.

## 6. Verdict

**AURA_VIDEO_INFORMED_OPENUSD_REALISM_PARTIAL**

Material realism, provenance and detail-band policy are implemented, tested and
non-destructive, but rack population, inspection mode, and Brev/AWS GPU visual
acceptance remain outstanding.

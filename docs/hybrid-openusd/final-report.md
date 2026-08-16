# AURA hybrid OpenUSD + NVIDIA Omniverse DSX - final report

## What changed

- Phase 1 audit recorded with per-category evidence: `docs/hybrid-openusd/phase-1-asset-audit.md`.
- Phase 2 canonical composition authored and validated: `assets/facility/aura_reference_hall/` with `building`, `equipment`, `systems`, `design_scenarios` and `semantic_bindings` layers.
- Phase 4 AURA-authored USD masters: raised-floor tile, perforated tile, linear luminaire, structural column, facility shell with variants.
- Phase 9/11 runtime provenance: the cabinet role now reports real mount evidence, and the twin shows a three-way breakdown (NVIDIA-derived / AURA-USD-derived / procedural physical / procedural overlays) with matching `data-*` attributes.
- Phase 5-7 pipeline definitions: `infra/brev/aura-usd-pipeline.launchable.json`, `infra/aws/publication-architecture.md`.
- Phase 8/10 DSX mapping: `docs/hybrid-openusd/dsx-alignment.md`.

## Runtime evidence, published host

`https://m2mdc.lovable.app/data-centre-twin?geometry=nvidia-reference`, WebGL2, ANGLE/SwiftShader:

```
NVIDIA OpenUSD-derived equipment: 178
AURA OpenUSD-derived facility assets: 0
AURA procedural physical geometry: 34
Procedural operational overlays: 1
Cabinets mounted from approved derivative: 40 / 40 (0 procedural fallback)
```

Eight semantic roles resolve to approved derivatives at runtime, including
`rack-core-reference`, which previously mounted without being counted. The
ninth role, `liquid-cooled-rack`, stays scoped to the simulated design
scenario by design.

## Residual gaps, stated plainly

- AURA-authored facility masters now have published, checksum-verified GLB derivatives and mount at runtime. Verified in a headless SwiftShader run of `/data-centre-twin?geometry=nvidia-reference` with the derivatives served from the asset CDN:

  ```
  AURA-authored OpenUSD facility: 916 visible scene objects
  across 5 of 5 families, 5 derivative files, 45 instanced draw calls
  Cabinets mounted from approved derivative: 40 / 40
  AURA procedural physical geometry: 28 (was 34; floor and shell stand-ins now suppressed)
  ```

  Families are mounted through `AuraFacilityLayer` as `InstancedMesh` per source mesh, and `DataHall` suppresses only the procedural geometry a derivative actually replaced. A family that fails or is still loading keeps its stand-in.
- The equipment and facility claims are now counted separately: the NVIDIA equipment line never borrows AURA-authored objects, and vice versa.
- The NVIDIA equipment roles report `preparing` in the sandboxed software-rendered run because the multi-megabyte pack derivatives are proxied over a slow path there; they mount on the published host (178 objects, 8 roles) as recorded above.
- Brev: `awaiting-execution`. No Brev credentials are reachable here.
- AWS: `publication-blocked`. No AWS credentials or infrastructure authority are reachable here; derivatives continue to be served by the existing asset CDN.
- No Omniverse Kit, Nucleus, CFD or PhysicsX coupling exists; the viewer boundary fails closed rather than simulating one.
- Hardware GPU visual acceptance still requires an administrator run on RTX hardware via `/admin/reference-facility-validation`.

## Verdict

**AURA_HYBRID_OPENUSD_DSX_PARTIAL** - OpenUSD composition, semantic bindings,
NVIDIA-derived equipment and cabinets, and truthful three-way runtime
provenance are verified on the published host. AURA-authored facility
derivatives, Brev execution and AWS publication remain blocked on external
access.

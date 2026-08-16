"""
Author the canonical AURA facility OpenUSD composition (Phase 2).

Structure (composition by sublayers + references + payloads + instancing):

  aura_reference_hall.usda            root stage, metres, Y-up
    layers/building.usda              Shell, RaisedFloor, Lighting, Structural
    layers/equipment.usda             Racks, Servers, Network, Power, Cooling
    layers/systems.usda               Electrical, CoolingLoops, DataNetwork
    layers/design_scenarios.usda      approved design variants
    layers/semantic_bindings.usda     stable identity + telemetry binding IDs

Licence-restricted NVIDIA pack masters are NOT redistributed into this stage.
Equipment prims that come from the pack carry the source identifier and the
recorded checksums as metadata; their geometry is delivered to the browser
through the approved GLB derivatives registered in assets/manifest.json.

Run: python3 scripts/asset-ingestion/author_aura_facility_stage.py
"""
import hashlib
import json
import os
from pxr import Usd, UsdGeom, Sdf, Gf, Kind

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".."))
HALL = os.path.join(ROOT, "assets/facility/aura_reference_hall")
LAYERS = os.path.join(HALL, "layers")
MANIFEST = json.load(open(os.path.join(ROOT, "assets/manifest.json")))
BY_ID = {a["assetId"]: a for a in MANIFEST["assets"]}

# Reference hall configuration. Mirrors the AURA facility model used by
# /data-centre-twin?geometry=nvidia-reference.
ROWS = ["A", "B", "C", "D"]
RACKS_PER_ROW = 5
RACK_PITCH = 1.1
ROW_PITCH = 3.6
TILE = 0.6
HALL_W, HALL_D = 26.0, 18.0


def stage_at(path, doc, default_prim=None):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path):
        os.remove(path)
    stage = Usd.Stage.CreateNew(path)
    UsdGeom.SetStageMetersPerUnit(stage, 1.0)
    UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.y)
    stage.GetRootLayer().documentation = doc
    if default_prim:
        root = UsdGeom.Xform.Define(stage, "/" + default_prim)
        Usd.ModelAPI(root).SetKind(Kind.Tokens.assembly)
        stage.SetDefaultPrim(root.GetPrim())
    return stage


def rel(target_dir, path):
    return "./" + os.path.relpath(path, target_dir).replace(os.sep, "/")


def rack_positions():
    out = []
    for ri, row in enumerate(ROWS):
        for i in range(RACKS_PER_ROW):
            x = -((RACKS_PER_ROW - 1) * RACK_PITCH) / 2 + i * RACK_PITCH
            z = -((len(ROWS) - 1) * ROW_PITCH) / 2 + ri * ROW_PITCH
            out.append((f"{row}{i + 1:02d}", row, x, z))
    return out


def building_layer():
    p = os.path.join(LAYERS, "building.usda")
    stage = stage_at(p, "AURA facility building layer: shell, raised floor, lighting, structural.")
    UsdGeom.Xform.Define(stage, "/AURA_Facility")
    UsdGeom.Xform.Define(stage, "/AURA_Facility/Building")

    shell = UsdGeom.Xform.Define(stage, "/AURA_Facility/Building/Shell")
    shell.GetPrim().GetReferences().AddReference(
        rel(LAYERS, os.path.join(ROOT, "assets/shell/aura_facility_shell/aura_facility_shell.usda")))
    shell.GetPrim().CreateAttribute("aura:shellModeDefault", Sdf.ValueTypeNames.String).Set("off")

    # Raised floor: two authored tile masters, instanced across the grid.
    floor = UsdGeom.Xform.Define(stage, "/AURA_Facility/Building/RaisedFloor")
    std = rel(LAYERS, os.path.join(ROOT, "assets/floor/aura_raised_floor_tile_600/aura_raised_floor_tile_600.usda"))
    per = rel(LAYERS, os.path.join(ROOT, "assets/floor/aura_perforated_floor_tile_600/aura_perforated_floor_tile_600.usda"))
    cold_z = {round(z - 1.4, 3) for _, _, _, z in rack_positions()}
    nx, nz = int(HALL_W / TILE), int(HALL_D / TILE)
    tiles = 0
    for ix in range(nx):
        for iz in range(nz):
            x = -HALL_W / 2 + TILE / 2 + ix * TILE
            z = -HALL_D / 2 + TILE / 2 + iz * TILE
            perforated = any(abs(z - cz) < TILE / 2 for cz in cold_z)
            t = UsdGeom.Xform.Define(
                stage, f"/AURA_Facility/Building/RaisedFloor/Tile_{ix:02d}_{iz:02d}")
            t.GetPrim().GetReferences().AddReference(per if perforated else std)
            t.AddTranslateOp().Set(Gf.Vec3d(x, 0.0, z))
            # Shared geometry and materials: one prototype per tile master.
            t.GetPrim().SetInstanceable(True)
            tiles += 1

    lighting = UsdGeom.Xform.Define(stage, "/AURA_Facility/Building/Lighting")
    lighting.GetPrim().CreateAttribute("aura:illuminationOwner", Sdf.ValueTypeNames.String).Set(
        "browser-native-lights")
    lum = rel(LAYERS, os.path.join(ROOT, "assets/lighting/aura_linear_luminaire_1500/aura_linear_luminaire_1500.usda"))
    lums = 0
    for ri, row in enumerate(ROWS):
        z = -((len(ROWS) - 1) * ROW_PITCH) / 2 + ri * ROW_PITCH
        for i in range(4):
            x = -9.0 + i * 6.0
            f = UsdGeom.Xform.Define(stage, f"/AURA_Facility/Building/Lighting/Luminaire_{row}_{i}")
            f.GetPrim().GetReferences().AddReference(lum)
            f.AddTranslateOp().Set(Gf.Vec3d(x, 4.9, z))
            f.GetPrim().SetInstanceable(True)
            lums += 1

    structural = UsdGeom.Xform.Define(stage, "/AURA_Facility/Building/Structural")
    col = rel(LAYERS, os.path.join(ROOT, "assets/structural/aura_structural_column_400/aura_structural_column_400.usda"))
    cols = 0
    for x in (-11.4, 11.4):
        for zi, z in enumerate((-7.6, 0.0, 7.6)):
            c = UsdGeom.Xform.Define(
                stage, f"/AURA_Facility/Building/Structural/Column_{'W' if x < 0 else 'E'}_{zi}")
            c.GetPrim().GetReferences().AddReference(col)
            c.AddTranslateOp().Set(Gf.Vec3d(x, 0.0, z))
            c.GetPrim().SetInstanceable(True)
            cols += 1
    stage.GetRootLayer().Save()
    return {"tiles": tiles, "luminaires": lums, "columns": cols}


def equipment_layer():
    p = os.path.join(LAYERS, "equipment.usda")
    stage = stage_at(p, "AURA facility equipment layer: racks and rack-mounted equipment. "
                        "Geometry for NVIDIA pack equipment is delivered to the browser through "
                        "approved GLB derivatives; the licence-restricted USD masters are not "
                        "redistributed into this stage.")
    UsdGeom.Xform.Define(stage, "/AURA_Facility")
    eq = UsdGeom.Xform.Define(stage, "/AURA_Facility/Equipment")
    for group in ("Racks", "Servers", "Network", "Power", "Cooling"):
        UsdGeom.Xform.Define(stage, f"/AURA_Facility/Equipment/{group}")

    core = BY_ID["nvidia.rack_core.rack_42u_a_core.operations"]
    for rid, row, x, z in rack_positions():
        prim = UsdGeom.Xform.Define(stage, f"/AURA_Facility/Equipment/Racks/Rack_{rid}")
        prim.AddTranslateOp().Set(Gf.Vec3d(x, 0.0, z))
        a = prim.GetPrim()
        Usd.ModelAPI(prim).SetKind(Kind.Tokens.component)
        a.CreateAttribute("aura:assetId", Sdf.ValueTypeNames.String).Set(core["assetId"])
        a.CreateAttribute("aura:facilityEquipmentId", Sdf.ValueTypeNames.String).Set(f"RACK-{rid}")
        a.CreateAttribute("aura:semanticRole", Sdf.ValueTypeNames.String).Set("rack-core-reference")
        a.CreateAttribute("aura:rowId", Sdf.ValueTypeNames.String).Set(row)
        a.CreateAttribute("aura:sourceUsdIdentifier", Sdf.ValueTypeNames.String).Set(
            core.get("sourceUrl") or "")
        a.CreateAttribute("aura:sourceChecksum", Sdf.ValueTypeNames.String).Set(
            (core.get("provenance") or {}).get("usdMasterSha256", ""))
        a.CreateAttribute("aura:derivativeChecksum", Sdf.ValueTypeNames.String).Set(
            core.get("checksum") or "")
        a.CreateAttribute("aura:derivativeUrl", Sdf.ValueTypeNames.String).Set(core.get("glbUrl") or "")
        a.CreateAttribute("aura:author", Sdf.ValueTypeNames.String).Set(
            "AURA-authored component selection of NVIDIA Data Center OpenUSD pack geometry")
        a.CreateAttribute("aura:licence", Sdf.ValueTypeNames.String).Set(core["licence"])
        a.CreateAttribute("aura:telemetryBindingId", Sdf.ValueTypeNames.String).Set(f"rack:{rid}")
        a.CreateAttribute("aura:evidenceMode", Sdf.ValueTypeNames.String).Set("SIMULATED")

    # Roles carried by approved derivatives but not placed per-rack in the USD
    # stage: they are runtime placements bound to their parent rack.
    for role, group, ids in (
        ("server-1u", "Servers", ["nvidia.server.server_1u_a.operations"]),
        ("server-2u", "Servers", ["nvidia.server.server_2u_b.operations", "nvidia.server.server_2u_c.operations"]),
        ("network-switch", "Network", ["nvidia.network_switch.sn3700c_01.operations"]),
        ("rack-pdu", "Power", ["nvidia.rack_pdu.rpdu_a_01.operations"]),
        ("blanking-panel", "Racks", ["nvidia.blanking_panel.blank_1u_black.operations"]),
        ("cable-tray", "Network", ["nvidia.cable_tray.cable_tray_299.operations"]),
        ("liquid-cooling-equipment", "Cooling", ["nvidia.liquid_cooling.dcp_a_01.operations"]),
        ("liquid-cooled-rack", "Cooling", ["nvidia.rack.rack_42u_a_01.operations"]),
    ):
        for aid in ids:
            e = BY_ID[aid]
            name = aid.split(".")[-2].replace("-", "_")
            prim = UsdGeom.Xform.Define(stage, f"/AURA_Facility/Equipment/{group}/Class_{name}")
            a = prim.GetPrim()
            a.CreateAttribute("aura:assetId", Sdf.ValueTypeNames.String).Set(aid)
            a.CreateAttribute("aura:semanticRole", Sdf.ValueTypeNames.String).Set(role)
            a.CreateAttribute("aura:derivativeChecksum", Sdf.ValueTypeNames.String).Set(e.get("checksum") or "")
            a.CreateAttribute("aura:derivativeUrl", Sdf.ValueTypeNames.String).Set(e.get("glbUrl") or "")
            a.CreateAttribute("aura:sourceUsdIdentifier", Sdf.ValueTypeNames.String).Set(e.get("sourceUrl") or "")
            a.CreateAttribute("aura:licence", Sdf.ValueTypeNames.String).Set(e["licence"])
            a.CreateAttribute("aura:placementOwner", Sdf.ValueTypeNames.String).Set(
                "AURA runtime (ReferenceEquipmentLayer)")
    stage.GetRootLayer().Save()


def systems_layer():
    p = os.path.join(LAYERS, "systems.usda")
    stage = stage_at(p, "AURA facility systems layer: electrical, cooling loops and data network "
                        "topology. Identity and topology only. No live telemetry is stored in USD.")
    UsdGeom.Xform.Define(stage, "/AURA_Facility")
    UsdGeom.Xform.Define(stage, "/AURA_Facility/Systems")
    for name, binding in (
        ("Electrical", "system:electrical"),
        ("CoolingLoops", "system:cooling-loop"),
        ("DataNetwork", "system:data-network"),
    ):
        prim = UsdGeom.Xform.Define(stage, f"/AURA_Facility/Systems/{name}")
        a = prim.GetPrim()
        a.CreateAttribute("aura:telemetryBindingId", Sdf.ValueTypeNames.String).Set(binding)
        a.CreateAttribute("aura:telemetryOwner", Sdf.ValueTypeNames.String).Set(
            "AURA operational services (not stored in USD)")
    stage.GetRootLayer().Save()


def design_scenarios_layer():
    p = os.path.join(LAYERS, "design_scenarios.usda")
    stage = stage_at(p, "Approved design scenarios as USD variant selections. Live telemetry is "
                        "never stored here; scenarios describe geometry and configuration only.")
    UsdGeom.Xform.Define(stage, "/AURA_Facility")
    ds = UsdGeom.Xform.Define(stage, "/AURA_Facility/DesignScenarios")
    vs = ds.GetPrim().GetVariantSets().AddVariantSet("designScenario")
    for v in ("baseline", "SIM-LIQUID-COOLED-RACK-PILOT-001"):
        vs.AddVariant(v)
    vs.SetVariantSelection("baseline")
    with vs.GetVariantEditContext():
        ds.GetPrim().CreateAttribute("aura:scenarioNote", Sdf.ValueTypeNames.String).Set(
            "Reference hall as modelled. All racks use the AURA-authored rack-core selection.")
    vs.SetVariantSelection("SIM-LIQUID-COOLED-RACK-PILOT-001")
    with vs.GetVariantEditContext():
        ds.GetPrim().CreateAttribute("aura:scenarioNote", Sdf.ValueTypeNames.String).Set(
            "Simulated design scenario. The complete NVIDIA liquid-cooled rack is mounted only "
            "where the facility model declares compatible liquid cooling and clearance.")
    vs.SetVariantSelection("baseline")
    stage.GetRootLayer().Save()


def semantic_bindings_layer(counts):
    p = os.path.join(LAYERS, "semantic_bindings.usda")
    stage = stage_at(p, "Stable identity bindings: USD prim path <-> AURA asset id <-> facility "
                        "equipment id <-> semantic role <-> telemetry binding id <-> checksums.")
    UsdGeom.Xform.Define(stage, "/AURA_Facility")
    sb = UsdGeom.Xform.Define(stage, "/AURA_Facility/SemanticBindings")
    sb.GetPrim().CreateAttribute("aura:bindingContract", Sdf.ValueTypeNames.String).Set(
        "assets/facility/aura_reference_hall/semantic_bindings.json")
    sb.GetPrim().CreateAttribute("aura:dsxAlignment", Sdf.ValueTypeNames.String).Set(
        "Aligned with the NVIDIA Omniverse DSX Blueprint (Flex, Boost, Exchange).")
    stage.GetRootLayer().Save()

    core = BY_ID["nvidia.rack_core.rack_42u_a_core.operations"]
    bindings = [{
        "usdPrimPath": f"/AURA_Facility/Equipment/Racks/Rack_{rid}",
        "auraAssetId": core["assetId"],
        "facilityEquipmentId": f"RACK-{rid}",
        "semanticRole": "rack-core-reference",
        "telemetryBindingId": f"rack:{rid}",
        "sourceChecksum": (core.get("provenance") or {}).get("usdMasterSha256", ""),
        "derivativeChecksum": core.get("checksum") or "",
    } for rid, _row, _x, _z in rack_positions()]
    for kind, path_fmt, asset_id, role in (
        ("tile", "/AURA_Facility/Building/RaisedFloor", "aura.floor.standard_tile_600", "raised-floor-tile"),
        ("luminaire", "/AURA_Facility/Building/Lighting", "aura.lighting.linear_luminaire_1500", "luminaire"),
        ("column", "/AURA_Facility/Building/Structural", "aura.structural.column_400", "structural-member"),
        ("shell", "/AURA_Facility/Building/Shell", "aura.shell.facility_shell", "facility-shell"),
    ):
        bindings.append({
            "usdPrimPath": path_fmt,
            "auraAssetId": asset_id,
            "facilityEquipmentId": None,
            "semanticRole": role,
            "telemetryBindingId": None,
            "sourceChecksum": None,
            "derivativeChecksum": None,
            "note": "AURA-authored OpenUSD master. No browser derivative published yet; the "
                    "runtime renders documented procedural geometry for this role.",
        })
    out = {
        "stage": "assets/facility/aura_reference_hall/aura_reference_hall.usda",
        "generatedBy": "scripts/asset-ingestion/author_aura_facility_stage.py",
        "counts": counts,
        "bindings": bindings,
    }
    with open(os.path.join(HALL, "semantic_bindings.json"), "w") as f:
        json.dump(out, f, indent=2)
        f.write("\n")


def root_stage():
    p = os.path.join(HALL, "aura_reference_hall.usda")
    stage = stage_at(p, "AURA reference data hall. Canonical OpenUSD composition: metres, Y-up, "
                       "floor origin. Composed from sublayers; no flattened monolith.",
                     default_prim="AURA_Facility")
    layer = stage.GetRootLayer()
    layer.subLayerPaths = [
        "./layers/semantic_bindings.usda",
        "./layers/design_scenarios.usda",
        "./layers/systems.usda",
        "./layers/equipment.usda",
        "./layers/building.usda",
    ]
    root = stage.GetPrimAtPath("/AURA_Facility")
    root.CreateAttribute("aura:stageVersion", Sdf.ValueTypeNames.String).Set("1.0.0")
    root.CreateAttribute("aura:facilityId", Sdf.ValueTypeNames.String).Set("aura.facility.reference_hall")
    root.CreateAttribute("aura:units", Sdf.ValueTypeNames.String).Set("metres")
    root.CreateAttribute("aura:upAxis", Sdf.ValueTypeNames.String).Set("Y")
    layer.Save()
    with open(p, "rb") as f:
        digest = hashlib.sha256(f.read()).hexdigest()
    return digest


if __name__ == "__main__":
    counts = building_layer()
    equipment_layer()
    systems_layer()
    design_scenarios_layer()
    semantic_bindings_layer(counts)
    print("root stage sha256:", root_stage())
    print("counts:", counts)

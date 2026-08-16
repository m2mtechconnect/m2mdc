"""
Author the AURA-authored OpenUSD component masters (Phase 4).

These are AURA-authored generic assets. They are NOT NVIDIA assets, they are
not SimReady-certified and they carry no manufacturer identity. Dimensions are
explicit metric values taken from published raised-floor / luminaire /
structural conventions, not from any vendor datasheet.

Run:  python3 scripts/asset-ingestion/author_aura_usd_assets.py
Output is deterministic and committed under assets/.
"""
import os
from pxr import Usd, UsdGeom, UsdShade, Sdf, Gf, Kind

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".."))
AUTHOR = "M2M AURA (AURA-authored generic asset)"
LICENCE = "AURA-authored, internal use by M2M Technology Connect. Generic geometry, not vendor-certified, not SimReady."


def box(stage, path, size, centre=(0.0, 0.0, 0.0)):
    """Axis-aligned box mesh in metres, Y-up, given by full extents."""
    sx, sy, sz = (s / 2.0 for s in size)
    cx, cy, cz = centre
    pts = [
        (cx - sx, cy - sy, cz - sz), (cx + sx, cy - sy, cz - sz),
        (cx + sx, cy + sy, cz - sz), (cx - sx, cy + sy, cz - sz),
        (cx - sx, cy - sy, cz + sz), (cx + sx, cy - sy, cz + sz),
        (cx + sx, cy + sy, cz + sz), (cx - sx, cy + sy, cz + sz),
    ]
    faces = [0, 3, 2, 1, 4, 5, 6, 7, 0, 1, 5, 4, 1, 2, 6, 5, 2, 3, 7, 6, 3, 0, 4, 7]
    mesh = UsdGeom.Mesh.Define(stage, path)
    mesh.CreatePointsAttr([Gf.Vec3f(*p) for p in pts])
    mesh.CreateFaceVertexCountsAttr([4] * 6)
    mesh.CreateFaceVertexIndicesAttr(faces)
    mesh.CreateSubdivisionSchemeAttr("none")
    mesh.CreateExtentAttr([Gf.Vec3f(cx - sx, cy - sy, cz - sz), Gf.Vec3f(cx + sx, cy + sy, cz + sz)])
    return mesh


def pbr(stage, path, colour, metallic, roughness, emissive=None):
    mat = UsdShade.Material.Define(stage, path)
    shader = UsdShade.Shader.Define(stage, path + "/PreviewSurface")
    shader.CreateIdAttr("UsdPreviewSurface")
    shader.CreateInput("diffuseColor", Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(*colour))
    shader.CreateInput("metallic", Sdf.ValueTypeNames.Float).Set(metallic)
    shader.CreateInput("roughness", Sdf.ValueTypeNames.Float).Set(roughness)
    if emissive:
        shader.CreateInput("emissiveColor", Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(*emissive))
    mat.CreateSurfaceOutput().ConnectToSource(shader.ConnectableAPI(), "surface")
    return mat


def new_stage(rel_path, default_prim_name, doc):
    path = os.path.join(ROOT, rel_path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    stage = Usd.Stage.CreateNew(path) if not os.path.exists(path) else Usd.Stage.Open(path)
    stage.GetRootLayer().Clear()
    UsdGeom.SetStageMetersPerUnit(stage, 1.0)
    UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.y)
    stage.GetRootLayer().documentation = doc
    root = UsdGeom.Xform.Define(stage, "/" + default_prim_name)
    Usd.ModelAPI(root).SetKind(Kind.Tokens.component)
    stage.SetDefaultPrim(root.GetPrim())
    return stage, root


def identity(prim, asset_id, equipment_class, role, author=AUTHOR, licence=LICENCE):
    p = prim.GetPrim()
    p.CreateAttribute("aura:assetId", Sdf.ValueTypeNames.String).Set(asset_id)
    p.CreateAttribute("aura:equipmentClass", Sdf.ValueTypeNames.String).Set(equipment_class)
    p.CreateAttribute("aura:semanticRole", Sdf.ValueTypeNames.String).Set(role)
    p.CreateAttribute("aura:author", Sdf.ValueTypeNames.String).Set(author)
    p.CreateAttribute("aura:licence", Sdf.ValueTypeNames.String).Set(licence)
    p.CreateAttribute("aura:vendorCertified", Sdf.ValueTypeNames.Bool).Set(False)
    p.CreateAttribute("aura:simReady", Sdf.ValueTypeNames.Bool).Set(False)
    p.CreateAttribute("aura:telemetryBindingId", Sdf.ValueTypeNames.String).Set("")
    p.CreateAttribute("aura:evidenceMode", Sdf.ValueTypeNames.String).Set("SIMULATED")


def raised_floor_tile(perforated: bool):
    name = "aura_perforated_floor_tile_600" if perforated else "aura_raised_floor_tile_600"
    rel = f"assets/floor/{name}/{name}.usda"
    stage, root = new_stage(
        rel, "FloorTile",
        "AURA-authored generic 600 mm raised-floor tile. Metric, Y-up, origin at the "
        "tile centre on the finished floor plane. Generic geometry, no vendor identity.")
    geo = UsdGeom.Scope.Define(stage, "/FloorTile/Geometry")
    mat = pbr(stage, "/FloorTile/Materials/TilePanel",
              (0.20, 0.21, 0.23) if not perforated else (0.16, 0.17, 0.19), 0.15, 0.72)
    body = box(stage, "/FloorTile/Geometry/Panel", (0.6, 0.035, 0.6), (0, 0.0175, 0))
    UsdShade.MaterialBindingAPI.Apply(body.GetPrim()).Bind(mat)
    if perforated:
        # 6 x 6 grille apertures represented as recessed slots, 25% open area.
        grille = pbr(stage, "/FloorTile/Materials/Grille", (0.08, 0.08, 0.09), 0.6, 0.45)
        for ix in range(6):
            for iz in range(6):
                x = -0.25 + ix * 0.1
                z = -0.25 + iz * 0.1
                slot = box(stage, f"/FloorTile/Geometry/Grille/Slot_{ix}_{iz}",
                           (0.05, 0.006, 0.05), (x, 0.0355, z))
                UsdShade.MaterialBindingAPI.Apply(slot.GetPrim()).Bind(grille)
    identity(root, f"aura.floor.{'perforated' if perforated else 'standard'}_tile_600",
             "raised-floor-tile",
             "perforated-floor-tile" if perforated else "raised-floor-tile")
    root.GetPrim().CreateAttribute("aif:core:width", Sdf.ValueTypeNames.Float).Set(0.6)
    root.GetPrim().CreateAttribute("aif:core:depth", Sdf.ValueTypeNames.Float).Set(0.6)
    root.GetPrim().CreateAttribute("aif:core:height", Sdf.ValueTypeNames.Float).Set(0.035)
    if perforated:
        root.GetPrim().CreateAttribute("aif:spec:openAreaFraction", Sdf.ValueTypeNames.Float).Set(0.25)
    stage.GetRootLayer().Save()
    return rel


def luminaire():
    name = "aura_linear_luminaire_1500"
    rel = f"assets/lighting/{name}/{name}.usda"
    stage, root = new_stage(
        rel, "Luminaire",
        "AURA-authored generic 1500 mm suspended linear data-hall luminaire. This "
        "asset carries VISIBLE FIXTURE GEOMETRY ONLY. Illumination in the browser "
        "runtime is produced by native scene lights, not by this geometry.")
    housing_mat = pbr(stage, "/Luminaire/Materials/Housing", (0.82, 0.83, 0.85), 0.5, 0.35)
    diffuser_mat = pbr(stage, "/Luminaire/Materials/Diffuser", (0.95, 0.96, 1.0), 0.0, 0.25,
                       emissive=(0.85, 0.88, 0.95))
    h = box(stage, "/Luminaire/Geometry/Housing", (1.5, 0.07, 0.12), (0, -0.035, 0))
    UsdShade.MaterialBindingAPI.Apply(h.GetPrim()).Bind(housing_mat)
    d = box(stage, "/Luminaire/Geometry/Diffuser", (1.44, 0.012, 0.1), (0, -0.075, 0))
    UsdShade.MaterialBindingAPI.Apply(d.GetPrim()).Bind(diffuser_mat)
    for sx in (-0.55, 0.55):
        r = box(stage, f"/Luminaire/Geometry/Suspension/Rod_{'n' if sx < 0 else 'p'}",
                (0.012, 0.30, 0.012), (sx, 0.15, 0))
        UsdShade.MaterialBindingAPI.Apply(r.GetPrim()).Bind(housing_mat)
    identity(root, "aura.lighting.linear_luminaire_1500", "luminaire", "luminaire")
    root.GetPrim().CreateAttribute("aura:emitsLight", Sdf.ValueTypeNames.Bool).Set(False)
    root.GetPrim().CreateAttribute("aura:lightingNote", Sdf.ValueTypeNames.String).Set(
        "Fixture geometry only. Runtime illumination is computed by browser-native lights.")
    stage.GetRootLayer().Save()
    return rel


def structural_column():
    name = "aura_structural_column_400"
    rel = f"assets/structural/{name}/{name}.usda"
    stage, root = new_stage(
        rel, "StructuralColumn",
        "AURA-authored generic 400 mm square structural column, 4.2 m clear height. "
        "Authored slim so it never occludes rack inspection.")
    mat = pbr(stage, "/StructuralColumn/Materials/Concrete", (0.55, 0.55, 0.54), 0.0, 0.85)
    c = box(stage, "/StructuralColumn/Geometry/Column", (0.4, 4.2, 0.4), (0, 2.1, 0))
    UsdShade.MaterialBindingAPI.Apply(c.GetPrim()).Bind(mat)
    identity(root, "aura.structural.column_400", "structural-member", "structural-member")
    stage.GetRootLayer().Save()
    return rel


def facility_shell():
    name = "aura_facility_shell"
    rel = f"assets/shell/{name}/{name}.usda"
    stage, root = new_stage(
        rel, "FacilityShell",
        "AURA-authored parametric facility shell. Dimensions are driven by the active "
        "AURA facility configuration; the values here are the reference-hall defaults. "
        "The variant set 'shellMode' provides off / cutaway / full. Roof and ceiling "
        "enclosure are intentionally absent from every mode so rack inspection is never "
        "obstructed.")
    W, D, H, T = 26.0, 18.0, 4.2, 0.2
    wall = pbr(stage, "/FacilityShell/Materials/WallPanel", (0.30, 0.32, 0.35), 0.05, 0.80)
    walls = UsdGeom.Scope.Define(stage, "/FacilityShell/PerimeterWalls")
    defs = {
        "North": ((W, H, T), (0, H / 2, -D / 2)),
        "West": ((T, H, D), (-W / 2, H / 2, 0)),
        "South": ((W, H, T), (0, H / 2, D / 2)),
        "East": ((T, H, D), (W / 2, H / 2, 0)),
    }
    for n, (size, centre) in defs.items():
        m = box(stage, f"/FacilityShell/PerimeterWalls/{n}", size, centre)
        UsdShade.MaterialBindingAPI.Apply(m.GetPrim()).Bind(wall)

    vs = root.GetPrim().GetVariantSets().AddVariantSet("shellMode")
    for v in ("off", "cutaway", "full"):
        vs.AddVariant(v)
    vs.SetVariantSelection("off")
    with vs.GetVariantEditContext():
        walls.GetPrim().SetActive(False)
    vs.SetVariantSelection("cutaway")
    with vs.GetVariantEditContext():
        # Only the two non-obstructing distant walls remain.
        stage.GetPrimAtPath("/FacilityShell/PerimeterWalls/South").SetActive(False)
        stage.GetPrimAtPath("/FacilityShell/PerimeterWalls/East").SetActive(False)
    vs.SetVariantSelection("full")
    vs.SetVariantSelection("off")

    identity(root, "aura.shell.facility_shell", "facility-shell", "facility-shell")
    root.GetPrim().CreateAttribute("aif:core:width", Sdf.ValueTypeNames.Float).Set(W)
    root.GetPrim().CreateAttribute("aif:core:depth", Sdf.ValueTypeNames.Float).Set(D)
    root.GetPrim().CreateAttribute("aif:core:height", Sdf.ValueTypeNames.Float).Set(H)
    root.GetPrim().CreateAttribute("aura:roofEnclosure", Sdf.ValueTypeNames.Bool).Set(False)
    stage.GetRootLayer().Save()
    return rel


if __name__ == "__main__":
    for rel in [raised_floor_tile(False), raised_floor_tile(True), luminaire(),
                structural_column(), facility_shell()]:
        print("authored", rel)

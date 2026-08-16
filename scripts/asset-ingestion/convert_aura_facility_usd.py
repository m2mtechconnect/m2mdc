"""
AURA-authored OpenUSD -> GLB derivative conversion (Phase 5).

Deterministic converter for the AURA-authored facility masters. USD stays the
source of truth: this script reads the composed stage, resolves world
transforms and bound UsdPreviewSurface parameters, and writes a glTF 2.0
binary derivative. GLB is never edited by hand and never treated as a source.

Run: python3 scripts/asset-ingestion/convert_aura_facility_usd.py
Output: dist/aura-derivatives/<name>.glb + conversion evidence JSON.
"""
import base64
import hashlib
import json
import os
import struct
import sys

from pxr import Usd, UsdGeom, UsdShade, Gf

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT_DIR = os.path.join(ROOT, "dist", "aura-derivatives")

# master path, derivative name, variant selections
TARGETS = [
    ("assets/floor/aura_raised_floor_tile_600/aura_raised_floor_tile_600.usda",
     "aura_raised_floor_tile_600", {}),
    ("assets/floor/aura_perforated_floor_tile_600/aura_perforated_floor_tile_600.usda",
     "aura_perforated_floor_tile_600", {}),
    ("assets/lighting/aura_linear_luminaire_1500/aura_linear_luminaire_1500.usda",
     "aura_linear_luminaire_1500", {}),
    ("assets/structural/aura_structural_column_400/aura_structural_column_400.usda",
     "aura_structural_column_400", {}),
    # The shell is exported once in "full": every wall is a separately named
    # node, so the browser toggles off / cutaway / full by node visibility
    # without a second download.
    ("assets/shell/aura_facility_shell/aura_facility_shell.usda",
     "aura_facility_shell", {"shellMode": "full"}),
]

COMPONENT_FLOAT = 5126
ARRAY_BUFFER = 34962


def surface_params(mesh_prim):
    """Diffuse / metallic / roughness / emissive from the bound preview surface."""
    params = {"base": [0.6, 0.62, 0.65, 1.0], "metallic": 0.1, "roughness": 0.8,
              "emissive": [0.0, 0.0, 0.0], "name": "default"}
    binding = UsdShade.MaterialBindingAPI(mesh_prim).ComputeBoundMaterial()[0]
    if not binding:
        return params
    params["name"] = binding.GetPrim().GetName()
    surface = binding.ComputeSurfaceSource()[0]
    if not surface:
        return params
    for attr, key in (("inputs:diffuseColor", "base"), ("inputs:emissiveColor", "emissive")):
        inp = surface.GetInput(attr.split(":")[1])
        v = inp.Get() if inp else None
        if v is not None:
            rgb = [float(v[0]), float(v[1]), float(v[2])]
            params[key] = rgb + [1.0] if key == "base" else rgb
    for name in ("metallic", "roughness"):
        inp = surface.GetInput(name)
        v = inp.Get() if inp else None
        if v is not None:
            params[name] = float(v)
    return params


def triangulate(counts, indices):
    tris, cursor = [], 0
    for c in counts:
        face = indices[cursor:cursor + c]
        cursor += c
        for i in range(1, c - 1):
            tris.append((face[0], face[i], face[i + 1]))
    return tris


def convert(stage_rel, name, variants):
    abs_path = os.path.join(ROOT, stage_rel)
    stage = Usd.Stage.Open(abs_path)
    if stage is None:
        raise SystemExit(f"cannot open {stage_rel}")
    default_prim = stage.GetDefaultPrim()
    for vset, sel in variants.items():
        vs = default_prim.GetVariantSets().GetVariantSet(vset)
        vs.SetVariantSelection(sel)

    xform_cache = UsdGeom.XformCache(Usd.TimeCode.Default())
    nodes, meshes, materials, accessors, buffer_views = [], [], [], [], []
    material_index = {}
    blob = bytearray()
    stats = {"meshes": 0, "triangles": 0, "vertices": 0}

    for prim in Usd.PrimRange.Stage(stage, Usd.TraverseInstanceProxies()):
        if not prim.IsA(UsdGeom.Mesh):
            continue
        mesh = UsdGeom.Mesh(prim)
        points = mesh.GetPointsAttr().Get() or []
        counts = mesh.GetFaceVertexCountsAttr().Get() or []
        indices = mesh.GetFaceVertexIndicesAttr().Get() or []
        if not points or not counts:
            continue
        world = xform_cache.GetLocalToWorldTransform(prim)
        world_points = [world.Transform(Gf.Vec3d(p[0], p[1], p[2])) for p in points]
        tris = triangulate(list(counts), list(indices))

        # Flat-shaded, non-indexed triangles: exact face normals, no smoothing
        # artefacts on hard-surface facility geometry.
        positions, normals = [], []
        for a, b, c in tris:
            pa, pb, pc = world_points[a], world_points[b], world_points[c]
            n = Gf.Cross(pb - pa, pc - pa)
            ln = n.GetLength()
            n = n / ln if ln > 1e-12 else Gf.Vec3d(0, 1, 0)
            for p in (pa, pb, pc):
                positions.append((float(p[0]), float(p[1]), float(p[2])))
                normals.append((float(n[0]), float(n[1]), float(n[2])))
        if not positions:
            continue

        params = surface_params(prim)
        mat_key = json.dumps(params, sort_keys=True)
        if mat_key not in material_index:
            material_index[mat_key] = len(materials)
            materials.append({
                "name": params["name"],
                "pbrMetallicRoughness": {
                    "baseColorFactor": params["base"],
                    "metallicFactor": params["metallic"],
                    "roughnessFactor": params["roughness"],
                },
                "emissiveFactor": params["emissive"],
                "doubleSided": False,
            })
        mat = material_index[mat_key]

        attrs = {}
        for semantic, data in (("POSITION", positions), ("NORMAL", normals)):
            offset = len(blob)
            for v in data:
                blob += struct.pack("<3f", *v)
            buffer_views.append({"buffer": 0, "byteOffset": offset,
                                 "byteLength": len(blob) - offset, "target": ARRAY_BUFFER})
            acc = {"bufferView": len(buffer_views) - 1, "componentType": COMPONENT_FLOAT,
                   "count": len(data), "type": "VEC3"}
            if semantic == "POSITION":
                xs = [v[0] for v in data]
                ys = [v[1] for v in data]
                zs = [v[2] for v in data]
                acc["min"] = [min(xs), min(ys), min(zs)]
                acc["max"] = [max(xs), max(ys), max(zs)]
            accessors.append(acc)
            attrs[semantic] = len(accessors) - 1
            while len(blob) % 4:
                blob += b"\x00"

        meshes.append({"name": prim.GetName(),
                       "primitives": [{"attributes": attrs, "material": mat, "mode": 4}]})
        # Prim path is preserved on the node so the browser can address the
        # same identity the USD stage and semantic bindings use.
        nodes.append({"name": prim.GetPath().pathString, "mesh": len(meshes) - 1})
        stats["meshes"] += 1
        stats["triangles"] += len(tris)
        stats["vertices"] += len(positions)

    if not meshes:
        raise SystemExit(f"{stage_rel}: no geometry converted")

    gltf = {
        "asset": {"version": "2.0",
                  "generator": "AURA usd-core 26.8 deterministic USD->glTF converter 1.0.0",
                  "copyright": "AURA-authored generic asset, M2M Technology Connect."},
        "scene": 0,
        "scenes": [{"nodes": list(range(len(nodes)))}],
        "nodes": nodes,
        "meshes": meshes,
        "materials": materials,
        "accessors": accessors,
        "bufferViews": buffer_views,
        "buffers": [{"byteLength": len(blob)}],
        "extras": {"auraSourceUsd": stage_rel, "auraVariants": variants},
    }

    json_bytes = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    while len(json_bytes) % 4:
        json_bytes += b" "
    bin_bytes = bytes(blob)
    while len(bin_bytes) % 4:
        bin_bytes += b"\x00"
    glb = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(json_bytes) + 8 + len(bin_bytes))
    glb += struct.pack("<II", len(json_bytes), 0x4E4F534A) + json_bytes
    glb += struct.pack("<II", len(bin_bytes), 0x004E4942) + bin_bytes

    os.makedirs(OUT_DIR, exist_ok=True)
    out_path = os.path.join(OUT_DIR, f"{name}.glb")
    with open(out_path, "wb") as f:
        f.write(glb)

    with open(abs_path, "rb") as f:
        source_sha = hashlib.sha256(f.read()).hexdigest()
    derivative_sha = hashlib.sha256(glb).hexdigest()

    xs = [a for acc in accessors if "min" in acc for a in [acc]]
    mins = [min(a["min"][i] for a in xs) for i in range(3)]
    maxs = [max(a["max"][i] for a in xs) for i in range(3)]

    return {
        "name": name,
        "sourceUsd": stage_rel,
        "sourceSha256": f"sha256:{source_sha}",
        "derivativeFile": os.path.relpath(out_path, ROOT),
        "derivativeSha256": f"sha256:{derivative_sha}",
        "derivativeBytes": len(glb),
        "variants": variants,
        "meshCount": stats["meshes"],
        "triangleCount": stats["triangles"],
        "vertexCount": stats["vertices"],
        "materialCount": len(materials),
        "imageCount": 0,
        "boundsMinMeters": mins,
        "boundsMaxMeters": maxs,
        "dimensionsMeters": {"x": maxs[0] - mins[0], "y": maxs[1] - mins[1], "z": maxs[2] - mins[2]},
        "floorContactY": mins[1],
        "upAxis": "Y",
        "metersPerUnit": 1,
        "tools": ["usd-core 26.8", "AURA deterministic USD->glTF converter 1.0.0"],
    }


if __name__ == "__main__":
    records = [convert(*t) for t in TARGETS]
    evidence = os.path.join(ROOT, "docs/evidence/aura-facility/conversion-evidence.json")
    os.makedirs(os.path.dirname(evidence), exist_ok=True)
    with open(evidence, "w") as f:
        json.dump({"pipelineVersion": "aura-facility-1.0.0", "records": records}, f, indent=2)
        f.write("\n")
    for r in records:
        print(f"{r['name']}: {r['meshCount']} meshes, {r['triangleCount']} tris, "
              f"{r['derivativeBytes']} bytes, floorY={r['floorContactY']:.4f}, "
              f"dims={r['dimensionsMeters']}")
    print("evidence:", os.path.relpath(evidence, ROOT))

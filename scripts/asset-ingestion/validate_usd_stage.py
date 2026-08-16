"""
Validate an AURA OpenUSD stage (Phase 2 / Phase 11).

Checks: stage opens, default prim resolves, units explicit, up-axis explicit,
references and payloads resolve, geometry non-zero, bounds physically credible,
prim paths stable, no absolute local paths, no missing dependencies.

Run: python3 scripts/asset-ingestion/validate_usd_stage.py [stage.usda ...]
Exit code 0 = all checks passed.
"""
import json
import os
import sys
from pxr import Usd, UsdGeom, UsdUtils, Gf

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEFAULT = ["assets/facility/aura_reference_hall/aura_reference_hall.usda"]
MAX_BOUND_M = 500.0


def check(stage_path):
    results = []

    def rec(name, ok, detail=""):
        results.append({"check": name, "ok": bool(ok), "detail": detail})

    abs_path = os.path.join(ROOT, stage_path)
    stage = Usd.Stage.Open(abs_path)
    rec("stage_opens", stage is not None, abs_path)
    if stage is None:
        return results, False

    dp = stage.GetDefaultPrim()
    rec("default_prim_resolves", bool(dp and dp.IsValid()), dp.GetPath().pathString if dp else "none")
    mpu = UsdGeom.GetStageMetersPerUnit(stage)
    units_authored = any(l.HasInfo("metersPerUnit") for l in stage.GetLayerStack())
    rec("units_explicit", units_authored and mpu > 0, f"metersPerUnit={mpu}")
    up = UsdGeom.GetStageUpAxis(stage)
    up_authored = any(l.HasInfo("upAxis") for l in stage.GetLayerStack())
    rec("up_axis_explicit", up_authored and up in ("Y", "Z"), f"upAxis={up}")

    # Composition: every reference / payload / sublayer asset path resolves and
    # is relative, never an absolute local path.
    missing, absolute = [], []
    layers, _assets, unresolved = UsdUtils.ComputeAllDependencies(abs_path)
    missing.extend(unresolved)
    for layer in layers:
        for p in layer.subLayerPaths:
            if os.path.isabs(str(p)):
                absolute.append(f"{layer.identifier}:sublayer:{p}")
    for prim in stage.TraverseAll():
        for name, spec in (("reference", "referenceList"), ("payload", "payloadList")):
            stack = prim.GetPrimStack()
            for ps in stack:
                items = ps.referenceList.prependedItems if name == "reference" else ps.payloadList.prependedItems
                for it in items:
                    ap = it.assetPath
                    if not ap:
                        continue
                    if os.path.isabs(ap):
                        absolute.append(f"{prim.GetPath()}:{name}:{ap}")
                    resolved = os.path.normpath(os.path.join(os.path.dirname(ps.layer.realPath), ap))
                    if not os.path.exists(resolved):
                        missing.append(f"{prim.GetPath()}:{name}:{ap}")
    rec("references_and_payloads_resolve", not missing, "; ".join(sorted(set(missing))[:5]))
    rec("no_absolute_local_paths", not absolute, "; ".join(sorted(set(absolute))[:5]))
    rec("no_missing_dependencies", not missing, f"{len(set(missing))} missing")

    meshes = [p for p in stage.TraverseAll() if p.IsA(UsdGeom.Mesh)]
    points = 0
    for m in meshes:
        attr = UsdGeom.Mesh(m).GetPointsAttr()
        points += len(attr.Get() or [])
    rec("geometry_non_zero", len(meshes) > 0 and points > 0, f"{len(meshes)} meshes, {points} points")

    cache = UsdGeom.BBoxCache(Usd.TimeCode.Default(), [UsdGeom.Tokens.default_, UsdGeom.Tokens.render],
                              useExtentsHint=False)
    bbox = cache.ComputeWorldBound(dp).ComputeAlignedRange()
    size = bbox.GetSize() if not bbox.IsEmpty() else Gf.Vec3d(0, 0, 0)
    credible = (not bbox.IsEmpty()) and all(0.0 < s < MAX_BOUND_M for s in size)
    rec("bounds_physically_credible", credible,
        f"size_m=({size[0]:.3f}, {size[1]:.3f}, {size[2]:.3f})")

    paths = [p.GetPath().pathString for p in stage.TraverseAll()]
    rec("prim_paths_stable", len(paths) == len(set(paths)), f"{len(paths)} prims")

    ok = all(r["ok"] for r in results)
    return results, ok


if __name__ == "__main__":
    targets = sys.argv[1:] or DEFAULT
    all_ok = True
    report = {}
    for t in targets:
        results, ok = check(t)
        report[t] = results
        all_ok = all_ok and ok
        print(f"\n== {t} ==")
        for r in results:
            print(("PASS " if r["ok"] else "FAIL ") + r["check"] + (f"  [{r['detail']}]" if r["detail"] else ""))
    out = os.path.join(ROOT, "docs/evidence/nvidia-pack/usd-stage-validation.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as f:
        json.dump({"allPassed": all_ok, "stages": report}, f, indent=2)
        f.write("\n")
    print("\nevidence:", os.path.relpath(out, ROOT), "allPassed=", all_ok)
    sys.exit(0 if all_ok else 1)

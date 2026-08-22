#!/usr/bin/env python3
"""Create a thin private USDA wrapper referencing one verified DSX prim.

This does NOT flatten or copy NVIDIA geometry. It verifies that the requested
prim exists in the local source USD stage, then authors a tiny wrapper stage
whose default prim references that exact source prim. The wrapper belongs under
`.dsx-private/` and is suitable as input to the existing AURA Blender USD->GLB
pipeline in an authorized evaluation environment.

Usage:
  python3 scripts/dsx/extract-source-prim.py \
    <source.usd> </Exact/Prim/Path> <output-wrapper.usda>
"""

import os
import sys
from pxr import Usd, UsdGeom, Sdf, Kind


def die(message: str) -> None:
    print(f"DSX PRIM EXTRACT FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    if len(sys.argv) != 4:
        die("usage: extract-source-prim.py <source.usd> </prim/path> <output.usda>")

    source_path = os.path.realpath(sys.argv[1])
    prim_path_text = sys.argv[2]
    output_path = os.path.realpath(sys.argv[3])

    if not os.path.isfile(source_path):
        die(f"source USD does not exist: {source_path}")

    prim_path = Sdf.Path(prim_path_text)
    if not prim_path.IsAbsolutePath() or not prim_path.IsPrimPath():
        die(f"expected an absolute USD prim path, got: {prim_path_text}")

    source = Usd.Stage.Open(source_path, load=Usd.Stage.LoadNone)
    if source is None:
        die(f"could not open source stage: {source_path}")

    prim = source.GetPrimAtPath(prim_path)
    if not prim or not prim.IsValid():
        die(f"prim not found in source stage: {prim_path_text}")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    if os.path.exists(output_path):
        os.remove(output_path)

    wrapper = Usd.Stage.CreateNew(output_path)
    if wrapper is None:
        die(f"could not create wrapper stage: {output_path}")

    meters = UsdGeom.GetStageMetersPerUnit(source)
    axis = UsdGeom.GetStageUpAxis(source)
    UsdGeom.SetStageMetersPerUnit(wrapper, meters)
    UsdGeom.SetStageUpAxis(wrapper, axis)
    wrapper.GetRootLayer().documentation = (
        "Private AURA DSX evaluation wrapper. References one verified NVIDIA DSX source prim; "
        "does not flatten, redistribute, or claim ownership of source geometry."
    )

    root = UsdGeom.Xform.Define(wrapper, "/AURA_DSX_Evaluation_Extract")
    Usd.ModelAPI(root).SetKind(Kind.Tokens.component)
    wrapper.SetDefaultPrim(root.GetPrim())

    # Absolute path is intentional for a local private evaluation wrapper. The
    # path never enters a public manifest; the wrapper is gitignored.
    root.GetPrim().GetReferences().AddReference(source_path, prim_path)
    root.GetPrim().CreateAttribute("aura:sourceUsdPath", Sdf.ValueTypeNames.String).Set(source_path)
    root.GetPrim().CreateAttribute("aura:sourcePrimPath", Sdf.ValueTypeNames.String).Set(prim_path_text)
    root.GetPrim().CreateAttribute("aura:evidenceMode", Sdf.ValueTypeNames.String).Set("PRIVATE_EVALUATION")
    wrapper.GetRootLayer().Save()

    # Reopen with payloads/references composed enough to prove the reference is
    # syntactically valid. This does not assert material/texture completeness.
    check = Usd.Stage.Open(output_path, load=Usd.Stage.LoadNone)
    if check is None or not check.GetDefaultPrim().IsValid():
        die("wrapper did not reopen with a valid default prim")

    print("DSX PRIM EXTRACT PASS")
    print(f"source={source_path}")
    print(f"prim={prim_path_text}")
    print(f"wrapper={output_path}")


if __name__ == "__main__":
    main()

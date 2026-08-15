#!/usr/bin/env python3
"""Annotate manifest derivatives with an explicit runtime quality policy.

Runtime derivative selection must be a recorded decision, never an inference
from filename or triangle count alone. For every logical asset this script
compares the published operations and LOD derivatives across triangles, draw
calls and transfer size, then writes:

  qualityMetrics   measured cost of that derivative
  renderCostRank   1 = cheapest derivative of that logical asset
  runtimePreferred whether the runtime may select it at all
  preferredFor     camera distance bands this derivative serves
  cameraDistanceMeters  intended distance range
  qualityDecision  human-readable justification, including exceptions

A declared LOD that is more expensive than operations on triangles AND bytes
without a material draw-call saving is marked runtimePreferred=false. It is
kept in the manifest for audit; it is never mounted.
"""
import json, time

STATE = 'docs/evidence/nvidia-pack/conversion-state.json'
MANIFEST = 'assets/manifest.json'
REPORT = 'docs/evidence/nvidia-pack/quality-policy.md'

BANDS = {
    'selected': (0.0, 3.0),
    'nearby': (3.0, 12.0),
    'overview': (12.0, 400.0),
}


def cost(rec):
    return {
        'triangles': rec['triangleCount'],
        'drawCalls': rec['drawCallEstimate'],
        'meshes': rec['meshCount'],
        'materials': rec['materialCount'],
        'textures': rec.get('textureCount', 0),
        'sizeBytes': rec['sizeBytes'],
    }


def main():
    state = json.load(open(STATE))
    manifest = json.load(open(MANIFEST))
    by_id = {a['assetId']: a for a in manifest['assets']}
    rows = []

    for key, e in sorted(state['assets'].items()):
        derivs = e.get('derivatives') or {}
        ops, lod = derivs.get('operations'), derivs.get('lod')
        if not ops or not lod:
            continue
        c_ops, c_lod = cost(ops), cost(lod)
        cheaper_tris = c_lod['triangles'] < c_ops['triangles']
        cheaper_bytes = c_lod['sizeBytes'] < c_ops['sizeBytes']
        dc_saving = c_ops['drawCalls'] - c_lod['drawCalls']
        material_dc_saving = dc_saving >= 1 and dc_saving / max(c_ops['drawCalls'], 1) >= 0.5

        if cheaper_tris and cheaper_bytes:
            lod_preferred, reason = True, (
                f"LOD is cheaper on triangles ({c_lod['triangles']} vs {c_ops['triangles']}) and "
                f"transfer ({c_lod['sizeBytes']} vs {c_ops['sizeBytes']} bytes); selected for overview.")
        elif material_dc_saving and not cheaper_bytes:
            lod_preferred, reason = True, (
                f"Documented exception: LOD carries more geometry but cuts draw calls "
                f"{c_ops['drawCalls']} to {c_lod['drawCalls']} (>=50% saving), which dominates at "
                f"overview distance on tiled GPUs.")
        else:
            lod_preferred, reason = False, (
                f"LOD rejected: {c_lod['triangles']} triangles / {c_lod['sizeBytes']} bytes against "
                f"operations {c_ops['triangles']} / {c_ops['sizeBytes']}, draw-call saving {dc_saving}. "
                f"Objectively more expensive with no overview benefit; operations is used at every "
                f"distance. LOD retained for audit only.")

        ranked = sorted(
            [('operations', c_ops), ('lod', c_lod)],
            key=lambda kv: (kv[1]['triangles'], kv[1]['drawCalls'], kv[1]['sizeBytes']),
        )
        rank = {name: i + 1 for i, (name, _) in enumerate(ranked)}

        plan = {
            'operations': ['selected', 'nearby'] + ([] if lod_preferred else ['overview']),
            'lod': ['overview'] if lod_preferred else [],
        }

        for level, rec, c in (('operations', ops, c_ops), ('lod', lod, c_lod)):
            entry = by_id.get(rec['assetId'])
            if not entry:
                continue
            bands = plan[level]
            entry['qualityMetrics'] = {
                **c,
                'boundsMin': rec['boundsMin'],
                'boundsMax': rec['boundsMax'],
                'silhouette': rec.get('silhouette') or e.get('validationStatus'),
                'decodeMsMeasured': rec.get('decodeMs'),
            }
            entry['renderCostRank'] = rank[level]
            entry['runtimePreferred'] = bool(bands) and entry.get('runtimeEligible') is True
            entry['preferredFor'] = bands
            entry['cameraDistanceMeters'] = (
                {'min': min(BANDS[b][0] for b in bands), 'max': max(BANDS[b][1] for b in bands)}
                if bands else None
            )
            entry['qualityDecision'] = reason

        rows.append((key, e.get('semanticRole'), c_ops, c_lod, lod_preferred, reason))

    manifest['manifestVersion'] = manifest.get('manifestVersion', 4) + 1
    manifest['generatedAt'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    manifest['qualityPolicyVersion'] = '1.0.0'
    json.dump(manifest, open(MANIFEST, 'w'), indent=2)

    with open(REPORT, 'w') as f:
        f.write('# NVIDIA derivative quality policy\n\n')
        f.write(f'Manifest version {manifest["manifestVersion"]}, generated {manifest["generatedAt"]}.\n')
        f.write('Runtime selection reads `preferredFor` / `runtimePreferred` from the manifest. '
                'Filenames and triangle counts are never used to infer quality.\n\n')
        f.write('| Logical asset | Role | Ops tris/dc/bytes | LOD tris/dc/bytes | LOD runtimePreferred | Decision |\n')
        f.write('|---|---|---|---|---|---|\n')
        for key, role, co, cl, pref, reason in rows:
            f.write(f"| {key} | {role} | {co['triangles']}/{co['drawCalls']}/{co['sizeBytes']} | "
                    f"{cl['triangles']}/{cl['drawCalls']}/{cl['sizeBytes']} | {pref} | {reason} |\n")
    print(f"manifest v{manifest['manifestVersion']} logical={len(rows)} "
          f"lod-preferred={sum(1 for r in rows if r[4])} lod-rejected={sum(1 for r in rows if not r[4])}")


if __name__ == '__main__':
    main()

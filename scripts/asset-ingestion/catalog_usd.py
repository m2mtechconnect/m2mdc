#!/usr/bin/env python3
"""Phase 5/6: catalogue USD stages and score rack candidates on evidence, not filename alone."""
import json, os, sys
from pxr import Usd, UsdGeom, Gf

RACK_MIN = {'w': 0.4, 'h': 1.6, 'd': 0.7}
RACK_MAX = {'w': 1.2, 'h': 2.6, 'd': 1.6}

def stage_record(path, root):
    rec = {'path': os.path.relpath(path, root)}
    try:
        stage = Usd.Stage.Open(path)
    except Exception as e:
        rec['error'] = str(e); return rec
    if not stage:
        rec['error'] = 'stage-open-failed'; return rec
    dp = stage.GetDefaultPrim()
    rec['defaultPrim'] = dp.GetPath().pathString if dp else None
    rec['upAxis'] = UsdGeom.GetStageUpAxis(stage)
    rec['metersPerUnit'] = UsdGeom.GetStageMetersPerUnit(stage)
    prims = list(stage.Traverse())
    rec['primCount'] = len(prims)
    rec['meshCount'] = sum(1 for p in prims if p.IsA(UsdGeom.Mesh))
    rec['materialCount'] = sum(1 for p in prims if p.GetTypeName() == 'Material')
    rec['missingDependencies'] = [str(u) for u in stage.GetRootLayer().GetCompositionAssetDependencies()
                                  if not os.path.exists(os.path.join(os.path.dirname(path), str(u)))]
    try:
        bbox = UsdGeom.BBoxCache(Usd.TimeCode.Default(), [UsdGeom.Tokens.default_, UsdGeom.Tokens.render])
        r = bbox.ComputeWorldBound(dp if dp else stage.GetPseudoRoot()).ComputeAlignedRange()
        if not r.IsEmpty():
            sz = r.GetSize(); mpu = rec['metersPerUnit'] or 1.0
            rec['sizeMeters'] = {'x': sz[0]*mpu, 'y': sz[1]*mpu, 'z': sz[2]*mpu}
            rec['boundsMin'] = list(r.GetMin()); rec['boundsMax'] = list(r.GetMax())
    except Exception as e:
        rec['boundsError'] = str(e)
    # deterministic rack score
    score, ev = 0, []
    s = rec.get('sizeMeters')
    if s:
        up = rec['upAxis']
        h = s['y'] if up == 'Y' else s['z']
        foot = sorted([s['x'], s['z'] if up == 'Y' else s['y']])
        if RACK_MIN['h'] <= h <= RACK_MAX['h']:
            score += 40; ev.append(f'height {h:.2f} m within rack envelope')
        if RACK_MIN['w'] <= foot[0] <= RACK_MAX['w'] and RACK_MIN['d'] <= foot[1] <= RACK_MAX['d']:
            score += 30; ev.append(f'footprint {foot[0]:.2f} x {foot[1]:.2f} m within rack envelope')
    if rec['meshCount'] > 0:
        score += 10; ev.append(f"{rec['meshCount']} meshes present")
    if not rec['missingDependencies']:
        score += 10; ev.append('all root-layer dependencies resolve')
    low = rec['path'].lower()
    if '/racks/' in low.replace('\\', '/'):
        score += 5; ev.append('classified under Racks equipment category')
    if 'rack' in os.path.basename(low) and 'inst' not in os.path.basename(low):
        score += 5; ev.append('asset name indicates rack')
    if 'datahall' in low or 'stages/' in low:
        score -= 40; ev.append('full facility stage, not a standalone asset (penalised)')
    rec['rackScore'] = score
    rec['rackEvidence'] = ev
    return rec

def main(root, out):
    stages = []
    for dirpath, _, files in os.walk(root):
        for f in files:
            if os.path.splitext(f)[1].lower() in ('.usd', '.usda', '.usdc', '.usdz'):
                stages.append(os.path.join(dirpath, f))
    records = [stage_record(p, root) for p in sorted(stages)]
    cands = sorted([r for r in records if r.get('rackScore', 0) >= 60],
                   key=lambda r: -r['rackScore'])
    cat = {'root': root, 'stageCount': len(records), 'stages': records,
           'rackCandidates': [{'path': c['path'], 'score': c['rackScore'],
                               'evidence': c['rackEvidence'], 'sizeMeters': c.get('sizeMeters')}
                              for c in cands]}
    with open(out, 'w') as f: json.dump(cat, f, indent=2)
    print('stages:', len(records), 'rack candidates:', len(cands))
    for c in cands[:8]:
        print(f"  {c['rackScore']:>3}  {c['path']}  {c.get('sizeMeters')}")

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])

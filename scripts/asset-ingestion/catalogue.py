#!/usr/bin/env python3
"""Pack-wide USD catalogue: opens every stage, records evidence, classifies by content."""
import json, os, sys, hashlib
from pxr import Usd, UsdGeom, UsdShade, Sdf

ROOT = sys.argv[1]; OUT = sys.argv[2]

def sha256(p):
    h = hashlib.sha256()
    with open(p,'rb') as f:
        for c in iter(lambda: f.read(1<<20), b''): h.update(c)
    return h.hexdigest()

def classify(rel, size, meshes, prims):
    l = rel.lower()
    if '/stages/' in l or 'datahall' in l:
        return 'facility-stage','data-hall stage','reference-only'
    if '/cable_tray/' in l: return 'cable-tray','cable tray section','cableRoute'
    if '/accessories/' in l and 'blank' in l: return 'blanking-panel','1U blanking panel','emptyUSpace'
    if 'rackscrews' in l or 'rail_kit' in l or 'rackmountbrackets' in l or 'brackets' in l:
        return 'accessory','mounting hardware','none'
    if '/patch_panels/' in l: return 'patch-panel','1U fibre patch panel','patchLocation'
    if '/power_distribution/' in l: return 'rack-pdu','rack PDU','powerEquipment'
    if '/network_switches/' in l: return 'network-switch','rack-mount switch','networkSlot'
    if '/server_nodes/' in l: return 'server','rack-mount compute','computeSlot'
    if '/liquid_cooling/' in l: return 'liquid-cooling','coolant distribution','coolingEquipment'
    if '/racks/' in l: return 'rack','42U cabinet','rackShell'
    return 'unclassified','unknown','none'

def stage_record(path):
    rel = os.path.relpath(path, ROOT)
    rec = {'path': rel, 'bytes': os.path.getsize(path), 'sha256': sha256(path)}
    try:
        stage = Usd.Stage.Open(path)
    except Exception as e:
        rec['error'] = str(e); rec['eligible']=False; rec['blockerReason']='stage-open-failed'; return rec
    if not stage:
        rec['error']='stage-open-failed'; rec['eligible']=False; rec['blockerReason']='stage-open-failed'; return rec
    dp = stage.GetDefaultPrim()
    rec['defaultPrim'] = dp.GetPath().pathString if dp else None
    rec['upAxis'] = UsdGeom.GetStageUpAxis(stage)
    rec['metersPerUnit'] = UsdGeom.GetStageMetersPerUnit(stage)
    prims = list(stage.Traverse())
    rec['primCount'] = len(prims)
    meshes = [p for p in prims if p.IsA(UsdGeom.Mesh)]
    rec['meshCount'] = len(meshes)
    tri = 0
    for m in meshes:
        fc = UsdGeom.Mesh(m).GetFaceVertexCountsAttr().Get()
        if fc: tri += sum(max(0,int(c)-2) for c in fc)
    rec['triangleEstimate'] = tri
    rec['materialCount'] = sum(1 for p in prims if p.GetTypeName()=='Material')
    # texture dependencies
    tex = set()
    for p in prims:
        if p.GetTypeName()=='Shader':
            for a in p.GetAttributes():
                if a.GetTypeName()==Sdf.ValueTypeNames.Asset:
                    v = a.Get()
                    if v: tex.add(str(v.path))
    rec['textureDependencies'] = sorted(tex)
    layer = stage.GetRootLayer()
    deps = [str(u) for u in layer.GetCompositionAssetDependencies()]
    rec['references'] = deps
    base = os.path.dirname(path)
    rec['missingDependencies'] = [d for d in deps if not os.path.exists(os.path.join(base,d))]
    payloads = []
    for p in prims:
        if p.GetPayloads and p.HasPayload(): payloads.append(p.GetPath().pathString)
    rec['payloads'] = payloads
    try:
        bc = UsdGeom.BBoxCache(Usd.TimeCode.Default(), [UsdGeom.Tokens.default_, UsdGeom.Tokens.render])
        r = bc.ComputeWorldBound(dp if dp else stage.GetPseudoRoot()).ComputeAlignedRange()
        if not r.IsEmpty():
            s = r.GetSize(); mpu = rec['metersPerUnit'] or 1.0
            rec['sizeMeters'] = {'x': round(s[0]*mpu,4), 'y': round(s[1]*mpu,4), 'z': round(s[2]*mpu,4)}
    except Exception as e:
        rec['boundsError'] = str(e)
    cat, sub, role = classify(rel, rec.get('sizeMeters'), rec['meshCount'], rec['primCount'])
    rec['category'], rec['subtype'], rec['runtimeRole'] = cat, sub, role
    name = os.path.basename(rel)
    is_variant = ('_inst' in name or '/SubUSDs/' in rel.replace('\\','/') or '/.SubUSDs/' in rel.replace('\\','/')
                  or '.material.' in name or '.geo.' in name)
    rec['isSubLayer'] = is_variant
    if rec['meshCount']==0:
        rec['eligible']=False; rec['rejectionReason']='no mesh geometry in stage'
    elif is_variant:
        rec['eligible']=False; rec['rejectionReason']='sub-layer/instance proxy, not a standalone publishable master'
    elif cat=='facility-stage':
        rec['eligible']=False; rec['rejectionReason']='full facility stage, not a placeable equipment asset'
    elif cat=='accessory':
        rec['eligible']=False; rec['rejectionReason']='mounting hardware with no AURA domain object'
    elif rec['missingDependencies']:
        rec['eligible']=False; rec['blockerReason']='unresolved composition dependencies'
    else:
        rec['eligible']=True
    return rec

stages=[]
for dp,_,fs in os.walk(ROOT):
    if '/.thumbs' in dp.replace('\\','/'): continue
    for f in fs:
        if os.path.splitext(f)[1].lower() in ('.usd','.usda','.usdc','.usdz'):
            stages.append(os.path.join(dp,f))
recs=[stage_record(p) for p in sorted(stages)]
json.dump({'root':ROOT,'stageCount':len(recs),'stages':recs}, open(OUT,'w'), indent=2)
elig=[r for r in recs if r.get('eligible')]
print('stages:',len(recs),'eligible:',len(elig))
for r in sorted(elig,key=lambda r:r['path']):
    print(f"  {r['category']:<16} {r['triangleEstimate']:>8} tri  {r.get('sizeMeters')}  {r['path']}")

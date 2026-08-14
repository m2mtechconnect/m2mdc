"""Blender headless USD -> GLB derivative generator (inspection / operations / lod).

Run:
  blender -b -P convert_pack_asset.py -- <src.usd> <workdir> <assetKey> <levelsJson> <stripInternal:0|1>

levelsJson example: {"inspection": null, "operations": 20000, "lod": 2500}
A null target means "no decimation" (source detail retained).

Internal-hardware stripping (operations/lod only, opt-in per category) removes
mesh objects whose world bounding box sits entirely inside the asset bounding
box with clearance on all six sides - i.e. geometry that can never be seen from
outside the enclosure. Front-panel geometry touches the enclosure boundary and
is therefore always preserved.
"""
import bpy, sys, json, os
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
src, workdir, key, levels_json, strip_internal = argv[0], argv[1], argv[2], json.loads(argv[3]), argv[4] == '1'
# Optional component selection: delete every mesh whose USD ancestry contains one
# of these prim names. Used for the AURA-authored rack-core reference derivative.
exclude_ancestors = json.loads(argv[5]) if len(argv) > 5 else []
os.makedirs(workdir, exist_ok=True)

INTERIOR_CLEARANCE_M = 0.02


def mesh_objects():
    return [o for o in bpy.data.objects if o.type == 'MESH']


def tri_count(objs):
    n = 0
    for o in objs:
        o.data.calc_loop_triangles()
        n += len(o.data.loop_triangles)
    return n


def world_bbox(objs):
    lo = Vector((1e18, 1e18, 1e18)); hi = Vector((-1e18, -1e18, -1e18))
    for o in objs:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            for i in range(3):
                lo[i] = min(lo[i], w[i]); hi[i] = max(hi[i], w[i])
    return lo, hi


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.usd_import(filepath=src, import_materials=True, import_meshes=True,
                      import_cameras=False, import_lights=False,
                      mtl_name_collision_mode='MAKE_UNIQUE')

def obj_path(o):
    parts, cur = [], o
    while cur is not None:
        parts.append(cur.name)
        cur = cur.parent
    return '/' + '/'.join(reversed(parts))


selection = {'excludeAncestors': exclude_ancestors, 'included': [], 'excluded': []}
if exclude_ancestors:
    for o in list(mesh_objects()):
        path = obj_path(o)
        segs = path.split('/')
        if any(any(seg.startswith(a) for a in exclude_ancestors) for seg in segs):
            selection['excluded'].append(path)
            bpy.data.objects.remove(o, do_unlink=True)
        else:
            selection['included'].append(path)
    # drop now-empty transform parents so no empty declared group survives
    for o in list(bpy.data.objects):
        if o.type == 'EMPTY' and not o.children:
            bpy.data.objects.remove(o, do_unlink=True)

source_objs = mesh_objects()
source = {
    'meshCount': len(source_objs),
    'triangleCount': tri_count(source_objs),
    'materialCount': len(bpy.data.materials),
    'imageCount': len(bpy.data.images),
    'componentNames': sorted({o.name.split('.')[0] for o in source_objs})[:200],
}
base_blend = os.path.join(workdir, f'{key}.base.blend')
bpy.ops.wm.save_as_mainfile(filepath=base_blend)

report = {'asset': key, 'source': src, 'sourceStats': source, 'componentSelection': selection,
          'blender': bpy.app.version_string, 'levels': {}}

for level, target in levels_json.items():
    bpy.ops.wm.open_mainfile(filepath=base_blend)
    objs = mesh_objects()
    removed_internal = 0
    joined_by_material = 0
    if strip_internal and level != 'inspection':
        lo, hi = world_bbox(objs)
        keep = []
        for o in objs:
            olo, ohi = world_bbox([o])
            inside = all(olo[i] > lo[i] + INTERIOR_CLEARANCE_M and ohi[i] < hi[i] - INTERIOR_CLEARANCE_M
                         for i in range(3))
            if inside:
                keep.append(o)
        for o in keep:
            bpy.data.objects.remove(o, do_unlink=True)
        removed_internal = len(keep)
        objs = mesh_objects()

    # Envelope recorded BEFORE any decimation. Decimation must never grow it.
    env_lo, env_hi = world_bbox(objs) if objs else (Vector((0, 0, 0)), Vector((0, 0, 0)))

    if level == 'lod' and len(objs) > 1:
        # Joining per material first lets collapse decimation work across the
        # whole shell instead of stalling on hundreds of tiny separate objects,
        # and collapses the draw call count to one per material.
        by_mat = {}
        for o in objs:
            slot = o.data.materials[0].name if o.data.materials and o.data.materials[0] else '__none__'
            by_mat.setdefault(slot, []).append(o)
        bpy.ops.object.select_all(action='DESELECT')
        for group in by_mat.values():
            if len(group) < 2:
                continue
            bpy.ops.object.select_all(action='DESELECT')
            for o in group:
                o.select_set(True)
            bpy.context.view_layer.objects.active = group[0]
            try:
                bpy.ops.object.join()
                joined_by_material += len(group) - 1
            except RuntimeError:
                pass
        bpy.ops.object.select_all(action='DESELECT')
        objs = mesh_objects()

    before = tri_count(objs)

    # Per-object pre-decimation bounds. The silhouette guard compares against
    # these so an object can neither grow outside nor collapse inside its own
    # source silhouette.
    pre_obj_bounds = {}
    for o in objs:
        lo_o, hi_o = world_bbox([o])
        pre_obj_bounds[o.name] = ([lo_o[i] for i in range(3)], [hi_o[i] for i in range(3)])

    def evaluated_tris():
        dg = bpy.context.evaluated_depsgraph_get()
        n = 0
        for o in mesh_objects():
            ev = o.evaluated_get(dg)
            me = ev.to_mesh()
            me.calc_loop_triangles()
            n += len(me.loop_triangles)
            ev.to_mesh_clear()
        return n

    def decimate_pass(r, floor_tris):
        dg = bpy.context.evaluated_depsgraph_get()
        for o in mesh_objects():
            ev = o.evaluated_get(dg)
            me = ev.to_mesh()
            me.calc_loop_triangles()
            n = len(me.loop_triangles)
            ev.to_mesh_clear()
            if n < floor_tris:
                continue
            m = o.modifiers.new('aura_decimate', 'DECIMATE')
            m.decimate_type = 'COLLAPSE'
            m.ratio = max(0.005, r)
            m.use_collapse_triangulate = True
        bpy.context.view_layer.update()

    ratio = 1.0
    # Converging multi-pass decimation: a single global ratio undershoots because
    # very small objects are skipped, so refine until the budget is met.
    if target and before > target:
        current = before
        for i in range(4):
            if current <= target:
                break
            r = max(0.005, float(target) / float(current))
            ratio *= r
            decimate_pass(r, 12 if i else 40)
            current = evaluated_tris()

    # Envelope guard: collapse decimation can push vertices outside the source
    # silhouette on thin or non-manifold parts. Any object whose decimated
    # bounds escape the pre-decimation envelope reverts to source detail rather
    # than shipping distorted geometry. Budget misses are reported honestly.
    envelope_reverted = []
    considered = []
    decimated = []
    softened = []
    tol = [max(0.004, (env_hi[i] - env_lo[i]) * 0.01) for i in range(3)]

    def silhouette_ok(o):
        """True when the evaluated object still fills its own source silhouette
        and stays inside the pre-decimation envelope."""
        dg2 = bpy.context.evaluated_depsgraph_get()
        ev2 = o.evaluated_get(dg2)
        me2 = ev2.to_mesh()
        lo3 = [1e18] * 3
        hi3 = [-1e18] * 3
        for v in me2.vertices:
            w = o.matrix_world @ v.co
            for i in range(3):
                lo3[i] = min(lo3[i], w[i]); hi3[i] = max(hi3[i], w[i])
        ev2.to_mesh_clear()
        if any(lo3[i] < env_lo[i] - tol[i] or hi3[i] > env_hi[i] + tol[i] for i in range(3)):
            return False
        pre = pre_obj_bounds.get(o.name)
        if pre:
            plo, phi = pre
            otol = [max(0.002, (phi[i] - plo[i]) * 0.05) for i in range(3)]
            if any(lo3[i] > plo[i] + otol[i] or hi3[i] < phi[i] - otol[i] for i in range(3)):
                return False
        return True

    for o in list(mesh_objects()):
        mods = [m for m in o.modifiers if m.name.startswith('aura_decimate')]
        if not mods:
            considered.append(o.name)
            continue
        considered.append(o.name)
        decimated.append(o.name)
        if silhouette_ok(o):
            continue
        # Soften before reverting: an object that loses its silhouette at the
        # aggressive ratio is retried at progressively gentler ratios so the
        # budget is not paid back in full source detail unless it must be.
        base = min(m.ratio for m in mods)
        recovered = False
        for factor in (4, 10, 25, 60):
            r = min(0.95, base * factor)
            if r >= 0.95:
                break
            for m in mods:
                m.ratio = r
            bpy.context.view_layer.update()
            if silhouette_ok(o):
                softened.append({'object': o.name, 'ratio': round(r, 5)})
                recovered = True
                break
        if not recovered:
            for m in mods:
                o.modifiers.remove(m)
            envelope_reverted.append(o.name)
            bpy.context.view_layer.update()
    if envelope_reverted:
        bpy.context.view_layer.update()
        decimated = [n for n in decimated if n not in set(envelope_reverted)]

    # Triangles restored by reverting to source detail (evidence, never hidden).
    reverted_tris = 0
    if envelope_reverted:
        names = set(envelope_reverted)
        for o in mesh_objects():
            if o.name in names:
                o.data.calc_loop_triangles()
                reverted_tris += len(o.data.loop_triangles)

    post_lo, post_hi = world_bbox(mesh_objects()) if mesh_objects() else (env_lo, env_hi)

    out = os.path.join(workdir, f'{key}.{level}.raw.glb')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_yup=True,
                              export_apply=True, export_materials='EXPORT',
                              export_image_format='AUTO', use_visible=True)
    # count post-decimation triangles via evaluated depsgraph
    dg = bpy.context.evaluated_depsgraph_get()
    after = 0
    for o in mesh_objects():
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        me.calc_loop_triangles()
        after += len(me.loop_triangles)
        ev.to_mesh_clear()
    report['levels'][level] = {
        'output': out, 'target': target, 'decimateRatio': ratio,
        'trianglesBeforeDecimate': before, 'trianglesAfter': after,
        'internalObjectsRemoved': removed_internal,
        'joinedByMaterial': joined_by_material,
        'envelopeRevertedObjects': envelope_reverted,
        'softenedObjects': softened,
        'objectsConsideredForDecimation': len(considered),
        'objectsDecimated': len(decimated),
        'envelopeReverted': len(envelope_reverted),
        'trianglesRestoredByReversion': reverted_tris,
        'preDecimationBounds': {'min': [round(v, 5) for v in env_lo], 'max': [round(v, 5) for v in env_hi]},
        'postDecimationBounds': {'min': [round(v, 5) for v in post_lo], 'max': [round(v, 5) for v in post_hi]},
        'boundsToleranceM': [round(t, 5) for t in tol],
        'revertedTrianglePercent': round(100.0 * reverted_tris / after, 2) if after else 0.0,
        'meshCount': len(mesh_objects()),
        'materialCount': len(bpy.data.materials),
        'imageCount': len(bpy.data.images),
        'bytes': os.path.getsize(out) if os.path.exists(out) else 0,
    }

print('CONVERSION_JSON ' + json.dumps(report))

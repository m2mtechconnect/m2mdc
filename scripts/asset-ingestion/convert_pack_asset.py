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
    tol = [max(0.004, (env_hi[i] - env_lo[i]) * 0.01) for i in range(3)]
    dgv = bpy.context.evaluated_depsgraph_get()
    for o in list(mesh_objects()):
        if not any(m.name.startswith('aura_decimate') for m in o.modifiers):
            continue
        ev = o.evaluated_get(dgv)
        me = ev.to_mesh()
        lo2 = [1e18] * 3
        hi2 = [-1e18] * 3
        for v in me.vertices:
            w = o.matrix_world @ v.co
            for i in range(3):
                lo2[i] = min(lo2[i], w[i]); hi2[i] = max(hi2[i], w[i])
        ev.to_mesh_clear()
        escaped = any(lo2[i] < env_lo[i] - tol[i] or hi2[i] > env_hi[i] + tol[i] for i in range(3))
        if escaped:
            for m in [m for m in o.modifiers if m.name.startswith('aura_decimate')]:
                o.modifiers.remove(m)
            envelope_reverted.append(o.name)
    if envelope_reverted:
        bpy.context.view_layer.update()

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
        'meshCount': len(mesh_objects()),
        'materialCount': len(bpy.data.materials),
        'imageCount': len(bpy.data.images),
        'bytes': os.path.getsize(out) if os.path.exists(out) else 0,
    }

print('CONVERSION_JSON ' + json.dumps(report))

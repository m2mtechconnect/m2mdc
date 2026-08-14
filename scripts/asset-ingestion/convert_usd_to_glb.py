"""Phase 9: Blender headless USD -> GLB conversion. Run: blender -b -P this.py -- <usd> <glb>"""
import bpy, sys, json, os

argv = sys.argv[sys.argv.index('--') + 1:]
src, dst = argv[0], argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.usd_import(filepath=src, import_materials=True, import_meshes=True,
                      import_cameras=False, import_lights=False, mtl_name_collision_mode='MAKE_UNIQUE')

meshes = [o for o in bpy.data.objects if o.type == 'MESH']
tris = 0
for o in meshes:
    o.data.calc_loop_triangles()
    tris += len(o.data.loop_triangles)

bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_yup=True,
                          export_apply=True, export_materials='EXPORT',
                          export_image_format='AUTO', use_visible=True)

# NOTE: Draco compression is disabled: the Blender 5.0.1 build available to this
# pipeline aborts ("stack smashing detected") inside the Draco encoder. Mesh
# optimisation is performed downstream by gltf-transform instead.

report = {
    'converter': 'Blender glTF 2.0 exporter (Blender %s) via Blender OpenUSD importer' % bpy.app.version_string,
    'source': src, 'output': dst,
    'objectCount': len(bpy.data.objects), 'meshCount': len(meshes),
    'triangleCount': tris, 'materialCount': len(bpy.data.materials),
    'imageCount': len(bpy.data.images),
    'outputBytes': os.path.getsize(dst) if os.path.exists(dst) else 0,
}
print('CONVERSION_JSON ' + json.dumps(report))

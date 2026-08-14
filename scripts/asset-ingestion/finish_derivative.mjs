/**
 * Publication finisher for a raw Blender GLB export.
 *
 * - optimises (dedup, weld, join by material, prune, quantize)
 * - normalises to floor contact y=0, centred on footprint, optional Y rotation
 * - records bounds, triangles, meshes, draw-call estimate, materials, textures,
 *   named-component map and the output checksum
 *
 * Usage: node finish_derivative.mjs <in.glb> <out.glb> <rotationYDeg> <record.json> [--no-join]
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { flatten, join, dedup, prune, weld, quantize } from '@gltf-transform/functions';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const [input, output, rotDeg, recordPath, ...flags] = process.argv.slice(2);
const noJoin = flags.includes('--no-join');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);
const root = doc.getRoot();
const scene = root.getDefaultScene() ?? root.listScenes()[0];

await doc.transform(...[flatten(), dedup(), weld(), ...(noJoin ? [] : [join({ keepNamed: false })]), prune(), quantize()]);

// normalisation root
const wrapper = doc.createNode('AURA_Publication_Root');
for (const child of scene.listChildren()) { wrapper.addChild(child); scene.removeChild(child); }
scene.addChild(wrapper);
const rad = (Number(rotDeg) * Math.PI) / 180;
wrapper.setRotation([0, Math.sin(rad / 2), 0, Math.cos(rad / 2)]);

function bounds() {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const walk = (node) => {
    const mesh = node.getMesh();
    if (mesh) {
      const t = node.getWorldTranslation();
      const s = node.getWorldScale();
      const r = node.getWorldRotation();
      for (const prim of mesh.listPrimitives()) {
        const pos = prim.getAttribute('POSITION');
        const pmin = pos.getMinNormalized ? pos.getMinNormalized([0, 0, 0]) : pos.getMin([0, 0, 0]);
        const pmax = pos.getMaxNormalized ? pos.getMaxNormalized([0, 0, 0]) : pos.getMax([0, 0, 0]);
        // sample the 8 corners through the node world transform (rotation about Y only)
        for (const cx of [pmin[0], pmax[0]]) for (const cy of [pmin[1], pmax[1]]) for (const cz of [pmin[2], pmax[2]]) {
          const v = [cx * s[0], cy * s[1], cz * s[2]];
          const ang = 2 * Math.atan2(r[1], r[3]);
          const x = v[0] * Math.cos(ang) + v[2] * Math.sin(ang);
          const z = -v[0] * Math.sin(ang) + v[2] * Math.cos(ang);
          const w = [x + t[0], v[1] + t[1], z + t[2]];
          for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], w[i]); max[i] = Math.max(max[i], w[i]); }
        }
      }
    }
    node.listChildren().forEach(walk);
  };
  scene.listChildren().forEach(walk);
  return { min, max };
}

const b0 = bounds();
wrapper.setTranslation([
  -(b0.min[0] + b0.max[0]) / 2,
  -b0.min[1],
  -(b0.min[2] + b0.max[2]) / 2,
]);
const b = bounds();

await io.write(output, doc);
const bytes = readFileSync(output);
const meshNodes = root.listNodes().filter((n) => n.getMesh());
const primCount = meshNodes.reduce((n, x) => n + x.getMesh().listPrimitives().length, 0);
const tris = root.listMeshes().flatMap((m) => m.listPrimitives())
  .reduce((n, p) => n + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0);

const record = {
  input, output,
  sizeBytes: bytes.length,
  checksum: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
  triangleCount: Math.round(tris),
  meshCount: root.listMeshes().length,
  drawCallEstimate: primCount,
  materialCount: root.listMaterials().length,
  materialNames: root.listMaterials().map((m) => m.getName()),
  textureCount: root.listTextures().length,
  namedComponents: scene.listChildren().flatMap((n) => n.listChildren().map((c) => c.getName()).filter(Boolean)).slice(0, 64),
  boundsMin: b.min.map((v) => Number(v.toFixed(4))),
  boundsMax: b.max.map((v) => Number(v.toFixed(4))),
  sizeMeters: [0, 1, 2].map((i) => Number((b.max[i] - b.min[i]).toFixed(4))),
  rotationYDegrees: Number(rotDeg),
  originConvention: 'floor-contact at y=0, centred on footprint',
  generatedAt: new Date().toISOString(),
};
writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`);
console.log('FINISH_JSON ' + JSON.stringify(record));

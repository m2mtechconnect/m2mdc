/**
 * Phase 9/10: publication normalisation of the converted GLB.
 * Wraps the scene in a single root node so the asset is:
 *   - floor-contact at y = 0
 *   - centred on its footprint in X/Z
 *   - rotated so the rack front faces +Z and cabinet width runs along X
 * Geometry is never rewritten by hand; only a node transform is added.
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds as bounds } from '@gltf-transform/functions';
import fs from 'node:fs';

const [src, dst, reportPath] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(src);
const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0];

const before = bounds(scene);
const root = doc.createNode('AURA_Publication_Root');
for (const child of scene.listChildren()) { root.addChild(child); scene.removeChild(child); }
scene.addChild(root);

// -90 deg about Y (quaternion x,y,z,w)
const s = Math.SQRT1_2;
root.setRotation([0, -s, 0, s]);

const after0 = bounds(scene);
root.setTranslation([
  -(after0.min[0] + after0.max[0]) / 2,
  -after0.min[1],
  -(after0.min[2] + after0.max[2]) / 2,
].map((v, i) => (root.getTranslation()[i] ?? 0) + v));

const after = bounds(scene);
await io.write(dst, doc);
const report = {
  boundsBefore: before, boundsAfter: after,
  sizeMeters: {
    x: after.max[0] - after.min[0],
    y: after.max[1] - after.min[1],
    z: after.max[2] - after.min[2],
  },
  transform: { rotationYDegrees: -90, originConvention: 'floor-contact, centred on footprint' },
  outputBytes: fs.statSync(dst).size,
};
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

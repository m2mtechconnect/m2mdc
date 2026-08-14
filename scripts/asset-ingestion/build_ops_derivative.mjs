/**
 * Build the AURA "operations" derivative of the NVIDIA 42U rack.
 *
 * The validated visual derivative keeps all 546 source meshes (546 draw calls),
 * which is too expensive for facility-scale rendering. This script merges the
 * static meshes by material inside four addressable groups:
 *
 *   Rack_Core, Front_Door, Rear_Cooler_Door, Chilled_Water_Risers
 *
 * The validated derivative is NEVER overwritten; the output is a new file with
 * its own checksum and conversion record.
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { flatten, join, dedup, prune, weld, quantize } from '@gltf-transform/functions';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const [input, output] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);
const root = doc.getRoot();
const scene = root.getDefaultScene() ?? root.listScenes()[0];

/**
 * Group assignment is priority-ordered and evaluated against the FULL ancestry
 * trail. The source hierarchy is misleading: the rack chassis sits under a node
 * named `Rack_42RU_Rear_Door_V2_Component_01`, so a naive /rear_door/ match
 * swallows the whole cabinet. Chassis markers are therefore tested first and
 * the rear-door match is anchored on the real `Rear_Cooler_Door` subtree.
 *
 * The source asset has no separate front-door subtree, so no Front_Door group
 * is emitted - claiming one would be a fabricated part.
 */
const GROUPS = [
  { name: 'Chilled_Water_Risers', match: /chilled_water/i },
  { name: 'Rack_Core', match: /rack_core|leveling_post/i },
  { name: 'Rear_Cooler_Door', match: /rear_cooler_door/i },
];
const REQUIRED_GROUPS = ['Rack_Core', 'Rear_Cooler_Door', 'Chilled_Water_Risers'];

// Record the semantic group of every mesh node before the hierarchy is baked.
const groupOf = new Map();
const visit = (node, ancestry) => {
  const trail = [...ancestry, node.getName() ?? ''];
  if (node.getMesh()) {
    const group = GROUPS.find((g) => trail.some((n) => g.match.test(n)));
    if (!group) throw new Error(`Ungrouped mesh node: ${trail.join('/')}`);
    groupOf.set(node, group.name);
  }
  node.listChildren().forEach((c) => visit(c, trail));
};
scene.listChildren().forEach((n) => visit(n, []));

await doc.transform(flatten());

// Reparent every mesh node under its semantic group so `join` can only merge
// within a group, keeping the four parts individually addressable.
const groupNodes = new Map();
for (const { name } of GROUPS) {
  const node = doc.createNode(name);
  scene.addChild(node);
  groupNodes.set(name, node);
}
for (const node of root.listNodes()) {
  if (!node.getMesh()) continue;
  const group = groupOf.get(node);
  if (!group) continue;
  const parent = node.getParentNode();
  if (parent) parent.removeChild(node);
  else scene.removeChild(node);
  groupNodes.get(group).addChild(node);
}

await doc.transform(dedup(), weld(), join({ keepNamed: false }), prune(), quantize());

await io.write(output, doc);
const bytes = readFileSync(output);
const sha = createHash('sha256').update(bytes).digest('hex');

const meshNodes = root.listNodes().filter((n) => n.getMesh());
const tris = root
  .listMeshes()
  .flatMap((m) => m.listPrimitives())
  .reduce((n, p) => n + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0);

const emitted = scene.listChildren().map((n) => n.getName());
for (const required of REQUIRED_GROUPS) {
  if (!emitted.includes(required)) throw new Error(`Missing addressable group: ${required}`);
}

const record = {
  derivative: 'operations',
  source: input,
  output,
  sizeBytes: bytes.length,
  checksum: `sha256:${sha}`,
  drawCallMeshes: meshNodes.length,
  triangleCount: tris,
  addressableGroups: emitted,
  generatedAt: new Date().toISOString(),
};
writeFileSync(`${output}.record.json`, `${JSON.stringify(record, null, 2)}\n`);
console.log(JSON.stringify(record, null, 2));

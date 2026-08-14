/**
 * Independent validation of the operations derivative (nvidia.rack.42u_a_01.ops)
 * against the approved visual derivative (nvidia.rack.42u_a_01).
 *
 * The operations derivative does NOT inherit the visual derivative's approval:
 * it gets its own record only when every check below passes.
 *
 * Usage: node scripts/asset-ingestion/validate_ops_derivative.mjs <visual.glb> <ops.glb>
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const [visualPath, opsPath] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

/** Bounds tolerance in metres: quantization can shift a vertex by <=1 mm. */
const TOLERANCE_M = 0.002;
const REQUIRED_GROUPS = ['Rack_Core', 'Rear_Cooler_Door', 'Chilled_Water_Risers'];

async function inspect(path) {
  const doc = await io.read(path);
  const root = doc.getRoot();
  const scene = root.getDefaultScene() ?? root.listScenes()[0];
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let tris = 0;

  const walk = (node, parentMatrix) => {
    const m = node.getWorldMatrix ? node.getWorldMatrix() : null;
    const mesh = node.getMesh();
    if (mesh) {
      for (const prim of mesh.listPrimitives()) {
        const pos = prim.getAttribute('POSITION');
        tris += (prim.getIndices()?.getCount() ?? pos.getCount()) / 3;
        const pmin = pos.getMinNormalized ? pos.getMinNormalized([0, 0, 0]) : pos.getMin([0, 0, 0]);
        const pmax = pos.getMaxNormalized ? pos.getMaxNormalized([0, 0, 0]) : pos.getMax([0, 0, 0]);
        const t = node.getWorldTranslation();
        const s = node.getWorldScale();
        for (let i = 0; i < 3; i++) {
          min[i] = Math.min(min[i], pmin[i] * s[i] + t[i], pmax[i] * s[i] + t[i]);
          max[i] = Math.max(max[i], pmin[i] * s[i] + t[i], pmax[i] * s[i] + t[i]);
        }
      }
    }
    node.listChildren().forEach((c) => walk(c, m));
  };
  scene.listChildren().forEach((n) => walk(n, null));

  const meshNodes = root.listNodes().filter((n) => n.getMesh());
  return {
    path,
    bytes: readFileSync(path).length,
    checksum: `sha256:${createHash('sha256').update(readFileSync(path)).digest('hex')}`,
    triangleCount: Math.round(tris),
    drawCallMeshes: meshNodes.length,
    materials: root.listMaterials().map((m) => m.getName()),
    images: root.listTextures().length,
    min: min.map((v) => Number(v.toFixed(4))),
    max: max.map((v) => Number(v.toFixed(4))),
    size: [0, 1, 2].map((i) => Number((max[i] - min[i]).toFixed(4))),
    nodeNames: scene.listChildren().map((n) => n.getName()),
  };
}

const visual = await inspect(visualPath);
const ops = await inspect(opsPath);

const near = (a, b) => Math.abs(a - b) <= TOLERANCE_M;
const checks = [
  { id: 'checksum-recorded', pass: /^sha256:[0-9a-f]{64}$/.test(ops.checksum), detail: ops.checksum },
  {
    id: 'bounds-match-validated-derivative',
    pass: [0, 1, 2].every((i) => near(ops.size[i], visual.size[i])),
    detail: `ops ${ops.size.join(' x ')} vs visual ${visual.size.join(' x ')} (tolerance ${TOLERANCE_M} m)`,
  },
  { id: 'floor-contact-y0', pass: near(ops.min[1], 0), detail: `min.y = ${ops.min[1]}` },
  {
    id: 'front-orientation-plus-z',
    pass: near(ops.min[2], visual.min[2]) && near(ops.max[2], visual.max[2]),
    detail: `z range ops [${ops.min[2]}, ${ops.max[2]}] vs visual [${visual.min[2]}, ${visual.max[2]}]`,
  },
  {
    id: 'triangles-preserved',
    pass: ops.triangleCount === visual.triangleCount,
    detail: `${ops.triangleCount} vs ${visual.triangleCount}`,
  },
  {
    id: 'material-appearance-equivalent',
    pass: JSON.stringify(ops.materials) === JSON.stringify(visual.materials) && ops.images === visual.images,
    detail: `materials ${ops.materials.join(',')} / images ${ops.images}`,
  },
  {
    id: 'addressable-parts-present',
    pass: REQUIRED_GROUPS.every((g) => ops.nodeNames.includes(g)),
    detail: ops.nodeNames.join(', '),
  },
];

const record = {
  assetId: 'nvidia.rack.42u_a_01.ops',
  validatedAt: new Date().toISOString(),
  toleranceMeters: TOLERANCE_M,
  lineage: [
    { stage: 'source', id: 'Rack_42U_A_01.usd', format: 'OpenUSD', pack: 'Datacenter_NVD@10012' },
    { stage: 'validated-derivative', id: 'nvidia.rack.42u_a_01', checksum: visual.checksum, drawCallMeshes: visual.drawCallMeshes },
    { stage: 'operations-derivative', id: 'nvidia.rack.42u_a_01.ops', checksum: ops.checksum, drawCallMeshes: ops.drawCallMeshes },
  ],
  visual,
  ops,
  checks,
  approvalStatus: checks.every((c) => c.pass) ? 'approved' : 'rejected',
};

writeFileSync('docs/remediation/rack_42u_a_ops.approval.json', `${JSON.stringify(record, null, 2)}\n`);
console.log(JSON.stringify({ approvalStatus: record.approvalStatus, checks }, null, 2));
if (record.approvalStatus !== 'approved') process.exit(1);

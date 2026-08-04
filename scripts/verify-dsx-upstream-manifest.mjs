#!/usr/bin/env node
/**
 * Fail-closed integrity check for docs/dsx/nvidia-upstream-manifest.json.
 *
 * Enforces that every declared upstream is reference-only (never vendored),
 * that each entry names its AURA touchpoints, and that the touchpoint files
 * actually exist.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(REPO, 'docs/dsx/nvidia-upstream-manifest.json');
const ROLES = new Set(['reference', 'contract', 'architecture', 'future-dependency']);

const errors = [];

if (!existsSync(MANIFEST)) {
  console.error('DSX upstream manifest missing:', MANIFEST);
  process.exit(1);
}

const m = JSON.parse(readFileSync(MANIFEST, 'utf8'));

if (m.policy !== 'reference-only') errors.push(`policy must be "reference-only", got "${m.policy}"`);
if (!Array.isArray(m.upstream) || m.upstream.length === 0) errors.push('upstream list is empty');

const ids = new Set();
for (const u of m.upstream ?? []) {
  const where = `upstream "${u.id ?? '(missing id)'}"`;
  if (!u.id) errors.push(`${where}: missing id`);
  if (ids.has(u.id)) errors.push(`${where}: duplicate id`);
  ids.add(u.id);
  if (!/^https:\/\//.test(u.url ?? '')) errors.push(`${where}: url must be https`);
  if (!ROLES.has(u.role)) errors.push(`${where}: invalid role "${u.role}"`);
  if (!u.used_for) errors.push(`${where}: missing used_for`);
  if (u.vendored !== false) errors.push(`${where}: vendoring NVIDIA source is prohibited`);
  if (!Array.isArray(u.aura_touchpoints)) {
    errors.push(`${where}: aura_touchpoints must be an array`);
  } else {
    for (const p of u.aura_touchpoints) {
      if (!existsSync(join(REPO, p))) errors.push(`${where}: touchpoint does not exist: ${p}`);
    }
  }
  if (u.role !== 'future-dependency' && (u.aura_touchpoints ?? []).length === 0) {
    errors.push(`${where}: an active upstream must declare at least one touchpoint`);
  }
}

if (errors.length > 0) {
  console.error('DSX upstream manifest verification FAILED:');
  for (const e of errors) console.error('  -', e);
  process.exit(1);
}

console.log(`DSX upstream manifest verified: ${m.upstream.length} reference-only entries, 0 vendored.`);
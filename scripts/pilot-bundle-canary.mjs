#!/usr/bin/env node
/**
 * PR-0.1 Checkpoint B7.4F - Pilot bundle canary.
 *
 * Static (source-level) reachability scanner for the controlled
 * approved-user pilot surface. Walks the import graph starting from
 * src/pilot/PilotShell.tsx and asserts that no module in that graph
 * imports any of the excluded application capabilities:
 *
 *   - src/components/Layout
 *   - src/components/copilot/**
 *   - src/contexts/CoPilotContext
 *   - src/contexts/CoPilotCommandContext
 *   - src/hooks/useTokenRefresh
 *   - src/components/*HealthBadges*
 *   - src/components/*GlobalSearchBar*
 *   - src/tours/**
 *
 * Reachability is defined transitively over `import ... from "@/..."`
 * and relative-path imports. Absolute `@/` maps to `src/`.
 *
 * This scanner is intentionally strict: any hit fails the run with a
 * non-zero exit code. It is meant to run in CI alongside the
 * production-perimeter enforcer.
 */
import { readFileSync, existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const SRC = join(ROOT, "src");
const ENTRY = join(SRC, "pilot", "PilotShell.tsx");

const FORBIDDEN = [
  /^@\/components\/Layout$/,
  /^@\/components\/copilot(\/|$)/,
  /^@\/contexts\/CoPilotContext$/,
  /^@\/contexts\/CoPilotCommandContext$/,
  /^@\/hooks\/useTokenRefresh$/,
  /^@\/components\/.*HealthBadges/,
  /^@\/components\/.*GlobalSearchBar/,
  /^@\/tours(\/|$)/,
];

const IMPORT_RE = /^\s*(?:import|export)[^'";]*from\s+["']([^"']+)["']/gm;
const DYN_IMPORT_RE = /import\(\s*["']([^"']+)["']\s*\)/g;

function resolveSpec(spec, fromFile) {
  if (spec.startsWith("@/")) return resolveFile(join(SRC, spec.slice(2)));
  if (spec.startsWith(".")) return resolveFile(join(dirname(fromFile), spec));
  return null; // bare module - ignored
}
function resolveFile(base) {
  const exts = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx"];
  for (const e of exts) {
    const p = base + e;
    if (existsSync(p) && statSync(p).isFile()) return p;
  }
  return null;
}

const visited = new Set();
const violations = [];
function walk(file) {
  if (visited.has(file)) return;
  visited.add(file);
  const src = readFileSync(file, "utf8");
  const specs = new Set();
  for (const m of src.matchAll(IMPORT_RE)) specs.add(m[1]);
  for (const m of src.matchAll(DYN_IMPORT_RE)) specs.add(m[1]);
  for (const spec of specs) {
    for (const rx of FORBIDDEN) {
      if (rx.test(spec)) {
        violations.push({ from: file.replace(ROOT + "/", ""), spec });
      }
    }
    const next = resolveSpec(spec, file);
    if (next) walk(next);
  }
}

walk(ENTRY);

if (violations.length > 0) {
  console.error("PILOT BUNDLE CANARY FAILED - forbidden imports reachable from PilotShell:");
  for (const v of violations) console.error(`  ${v.from} -> ${v.spec}`);
  process.exit(1);
}
console.log(
  `PILOT BUNDLE CANARY PASSED - ${visited.size} modules scanned, 0 forbidden imports reachable.`
);
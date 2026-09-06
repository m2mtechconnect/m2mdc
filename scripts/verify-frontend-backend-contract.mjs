#!/usr/bin/env node
/**
 * Verifies that every frontend Supabase Edge Function call is represented by
 * the governed production perimeter or by an explicit, reviewed blocker.
 *
 * Default mode is a drift gate: known blockers are allowed, but new, stale,
 * or misclassified calls fail. `--release` is fail-closed and also rejects
 * every known blocker and unresolved dynamic call site.
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const RELEASE_MODE = process.argv.includes('--release');
const failures = [];

const readJson = (relativePath) => JSON.parse(
  fs.readFileSync(path.join(ROOT, relativePath), 'utf8'),
);

const allowlist = readJson('docs/remediation/evidence/pr-0.1/route-allowlist.json');
const inventory = readJson('docs/remediation/evidence/pr-0.1/edge-function-inventory.json');
const contract = readJson('docs/remediation/evidence/pr-0.1/frontend-backend-contract.json');
const promotionPath = path.join(
  ROOT,
  'docs/remediation/evidence/pr-0.1/edge-function-promotions.json',
);

if (contract.schema !== 'aura.frontend-backend-contract.v1') {
  failures.push(`Unexpected frontend/backend contract schema: ${contract.schema}`);
}
if (contract.policy !== 'default-deny') {
  failures.push(`Unexpected frontend/backend contract policy: ${contract.policy}`);
}

const effectiveInventory = new Map(inventory.map((entry) => [entry.function, { ...entry }]));
if (fs.existsSync(promotionPath)) {
  const promotionDoc = JSON.parse(fs.readFileSync(promotionPath, 'utf8'));
  for (const promotion of promotionDoc.promotions ?? []) {
    const current = effectiveInventory.get(promotion.function);
    if (current) Object.assign(current, promotion);
  }
}

function walkRuntimeSource(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkRuntimeSource(absolute));
    } else if (/\.(?:ts|tsx|js|jsx)$/.test(entry.name) && !/\.(?:test|spec)\.[^.]+$/.test(entry.name)) {
      files.push(absolute);
    }
  }
  return files;
}

function isSupabaseFunctionInvoke(node) {
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return false;
  if (node.expression.name.text !== 'invoke') return false;
  const functionsAccess = node.expression.expression;
  return ts.isPropertyAccessExpression(functionsAccess) && functionsAccess.name.text === 'functions';
}

function functionNameFromArgument(argument) {
  if (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) {
    return argument.text.split('?')[0];
  }
  if (ts.isTemplateExpression(argument)) {
    const stablePrefix = argument.head.text.split('?')[0];
    return stablePrefix || null;
  }
  return null;
}

const invocations = [];
for (const absolute of walkRuntimeSource(path.join(ROOT, 'src'))) {
  const relative = path.relative(ROOT, absolute).replaceAll('\\', '/');
  const sourceText = fs.readFileSync(absolute, 'utf8');
  const kind = absolute.endsWith('.tsx') || absolute.endsWith('.jsx')
    ? ts.ScriptKind.TSX
    : ts.ScriptKind.TS;
  const source = ts.createSourceFile(relative, sourceText, ts.ScriptTarget.Latest, true, kind);

  function visit(node) {
    if (isSupabaseFunctionInvoke(node)) {
      const argument = node.arguments[0];
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      const name = argument ? functionNameFromArgument(argument) : null;
      invocations.push({
        file: relative,
        line,
        name,
        expression: argument?.getText(source) ?? '<missing>',
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}

const byFunction = new Map();
const dynamicCalls = [];
for (const call of invocations) {
  if (!call.name) {
    dynamicCalls.push(call);
    continue;
  }
  const consumers = byFunction.get(call.name) ?? new Set();
  consumers.add(call.file);
  byFunction.set(call.name, consumers);
}

const productionFunctions = new Set(allowlist.production_functions ?? []);
const knownBlockers = new Map((contract.known_blockers ?? []).map((entry) => [entry.function, entry]));
const expectedDynamicSites = new Map(
  (contract.dynamic_call_sites ?? []).map((entry) => [`${entry.file}::${entry.expression}`, entry]),
);

for (const [name] of byFunction) {
  const functionDirectory = path.join(ROOT, 'supabase/functions', name, 'index.ts');
  if (!fs.existsSync(functionDirectory)) {
    failures.push(`${name}: frontend call has no matching Edge Function directory`);
    continue;
  }
  const inventoryEntry = effectiveInventory.get(name);
  if (!inventoryEntry) {
    failures.push(`${name}: frontend call is missing from the Edge Function inventory`);
    continue;
  }

  if (productionFunctions.has(name)) {
    if (knownBlockers.has(name)) failures.push(`${name}: production function is also listed as blocked`);
    if (inventoryEntry.production_disposition !== 'production-allowlisted') {
      failures.push(
        `${name}: production allowlist conflicts with inventory disposition ` +
        `"${inventoryEntry.production_disposition}"`,
      );
    }
    continue;
  }

  const blocker = knownBlockers.get(name);
  if (!blocker) {
    failures.push(`${name}: non-production frontend call has no reviewed blocker entry`);
    continue;
  }
  if (blocker.inventory_disposition !== inventoryEntry.production_disposition) {
    failures.push(
      `${name}: blocker disposition "${blocker.inventory_disposition}" does not match ` +
      `effective inventory "${inventoryEntry.production_disposition}"`,
    );
  }
}

for (const [name] of knownBlockers) {
  if (!byFunction.has(name)) failures.push(`${name}: stale blocker has no runtime frontend invocation`);
}

for (const call of dynamicCalls) {
  const key = `${call.file}::${call.expression}`;
  if (!expectedDynamicSites.has(key)) {
    failures.push(`${call.file}:${call.line}: unresolved dynamic invocation ${call.expression}`);
  }
}
for (const [key] of expectedDynamicSites) {
  if (!dynamicCalls.some((call) => `${call.file}::${call.expression}` === key)) {
    failures.push(`${key}: stale dynamic-call exception`);
  }
}

if (RELEASE_MODE) {
  for (const [name, blocker] of knownBlockers) {
    failures.push(
      `${name}: release blocked (${blocker.inventory_disposition}) — ${blocker.reason}`,
    );
  }
  for (const call of dynamicCalls) {
    failures.push(
      `${call.file}:${call.line}: release blocked by unresolved dynamic invocation ${call.expression}`,
    );
  }
}

const totalConsumers = [...byFunction.values()].reduce((sum, files) => sum + files.size, 0);
const productionCallCount = [...byFunction.keys()].filter((name) => productionFunctions.has(name)).length;
const summary =
  `${byFunction.size} functions / ${totalConsumers} consumer links: ` +
  `${productionCallCount} production, ${knownBlockers.size} explicitly blocked, ` +
  `${dynamicCalls.length} dynamic call site(s)`;

if (failures.length > 0) {
  console.error(`Frontend/backend contract FAILED (${summary})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Frontend/backend contract PASS (${summary})`);

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const typesPath = resolve(root, 'src/integrations/supabase/types.ts');
const migrationsPath = resolve(root, 'supabase/migrations');
const edgeFunctionsPath = resolve(root, 'supabase/functions');
const supabaseConfigPath = resolve(root, 'supabase/config.toml');
const routeAllowlistPath = resolve(root, 'docs/remediation/evidence/pr-0.1/route-allowlist.json');
const summaryOnly = process.argv.includes('--summary');
const checkMode = process.argv.includes('--check');
const historicalMigrationCutoff = '20260827014500';

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function filesUnder(start, predicate = () => true) {
  if (!existsSync(start)) return [];
  const result = [];
  const visit = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
      const full = resolve(current, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (predicate(full)) result.push(full);
    }
  };
  visit(start);
  return result.sort();
}

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Unable to find generated type section ${startMarker}`);
  return source.slice(start + startMarker.length, end);
}

function namedBlocks(source) {
  const matches = [...source.matchAll(/^      ([a-zA-Z0-9_]+): \{/gm)];
  return matches.map((match, index) => ({
    name: match[1],
    source: source.slice(match.index, matches[index + 1]?.index ?? source.length),
  }));
}

function rowFields(block) {
  const match = block.match(/\n        Row: \{([\s\S]*?)\n        \}\n        (?:Insert|Relationships):/);
  if (!match) return [];
  return [...match[1].matchAll(/^          ([a-zA-Z0-9_]+):/gm)].map((item) => item[1]);
}

function relationships(block) {
  return [...block.matchAll(
    /foreignKeyName: "([^"]+)"[\s\S]*?columns: \["([^"]+)"\][\s\S]*?referencedRelation: "([^"]+)"[\s\S]*?referencedColumns: \["([^"]+)"\]/g,
  )].map((match) => ({
    name: match[1],
    column: match[2],
    referencedTable: match[3],
    referencedColumn: match[4],
  }));
}

function collectCalls(source, regex) {
  return [...source.matchAll(regex)].map((match) => match[1]);
}

function addConsumer(map, name, file) {
  const value = map.get(name) ?? new Set();
  value.add(file);
  map.set(name, value);
}

function isRuntimeSource(file) {
  const normalized = relative(root, file).replaceAll('\\', '/');
  return /\.(?:[cm]?[jt]sx?)$/.test(file)
    && !normalized.includes('/__tests__/')
    && !normalized.includes('/test/')
    && !/\.(?:test|spec|stories)\.[cm]?[jt]sx?$/.test(normalized)
    && !normalized.endsWith('.d.ts');
}

function resolveInternalImport(importer, specifier) {
  let base;
  if (specifier.startsWith('@/')) base = resolve(root, 'src', specifier.slice(2));
  else if (specifier.startsWith('.')) base = resolve(dirname(importer), specifier);
  else return null;
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.mjs`,
    resolve(base, 'index.ts'),
    resolve(base, 'index.tsx'),
    resolve(base, 'index.js'),
    resolve(base, 'index.jsx'),
  ];
  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) ?? null;
}

const generated = readFileSync(typesPath, 'utf8').replaceAll('\r\n', '\n');
const tableBlocks = namedBlocks(section(generated, '    Tables: {', '    Views: {'));
const viewBlocks = namedBlocks(section(generated, '    Views: {', '    Functions: {'));
const functionBlocks = namedBlocks(section(generated, '    Functions: {', '    Enums: {'));

const tables = tableBlocks.map(({ name, source }) => {
  const fields = rowFields(source);
  return {
    name,
    fields,
    tenantKeys: fields.filter((field) => ['tenant_id', 'organization_id', 'org_id'].includes(field)),
    ownerKeys: fields.filter((field) => ['user_id', 'owner_id', 'created_by', 'requested_by'].includes(field)),
    relationships: relationships(source),
  };
});

const migrations = filesUnder(migrationsPath, (file) => file.endsWith('.sql')).map((file) => {
  const source = readFileSync(file, 'utf8');
  const name = relative(migrationsPath, file).replaceAll('\\', '/');
  const createdTables = [...source.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-zA-Z0-9_]+)"?/gi)]
    .map((match) => match[1].toLowerCase());
  const rlsEnabled = [...source.matchAll(/alter\s+table\s+(?:only\s+)?(?:public\.)?"?([a-zA-Z0-9_]+)"?\s+enable\s+row\s+level\s+security/gi)]
    .map((match) => match[1].toLowerCase());
  const policies = [...source.matchAll(/create\s+policy\s+(?:"[^"]+"|[a-zA-Z0-9_]+)\s+on\s+(?:public\.)?"?([a-zA-Z0-9_]+)"?/gi)]
    .map((match) => match[1].toLowerCase());
  return {
    name,
    opaqueName: /^\d{14}_[0-9a-f]{8}-[0-9a-f-]{27,}\.sql$/i.test(name),
    timestamp: name.match(/^(\d{14})_/)?.[1] ?? null,
    descriptiveName: /^\d{14}_[a-z][a-z0-9_]*\.sql$/.test(name),
    createdTables: [...new Set(createdTables)],
    rlsEnabled: [...new Set(rlsEnabled)],
    policyTables: [...new Set(policies)],
  };
});

const runtimeConsumerRoots = ['src', 'services', 'supabase/functions'].map((path) => resolve(root, path));
const sourceFiles = runtimeConsumerRoots.flatMap((start) => filesUnder(start, (file) => /\.(?:[cm]?[jt]sx?)$/.test(file)));
const tableConsumers = new Map();
const rpcConsumers = new Map();
const edgeFunctionConsumers = new Map();
let dynamicFromCalls = 0;
let dynamicRpcCalls = 0;
let dynamicFunctionInvocations = 0;

for (const file of sourceFiles) {
  const normalized = relative(root, file).replaceAll('\\', '/');
  if (normalized === 'src/integrations/supabase/types.ts') continue;
  const source = readFileSync(file, 'utf8');
  for (const name of collectCalls(source, /\.from\(\s*['"`]([^'"`]+)['"`]\s*\)/g)) addConsumer(tableConsumers, name, normalized);
  for (const name of collectCalls(source, /\.rpc\(\s*['"`]([^'"`]+)['"`]/g)) addConsumer(rpcConsumers, name, normalized);
  for (const name of collectCalls(source, /\.functions\.invoke\(\s*['"`]([^'"`]+)['"`]/g)) addConsumer(edgeFunctionConsumers, name, normalized);
  dynamicFromCalls += (source.match(/\.from\(\s*(?!['"`])/g) ?? []).length;
  dynamicRpcCalls += (source.match(/\.rpc\(\s*(?!['"`])/g) ?? []).length;
  dynamicFunctionInvocations += (source.match(/\.functions\.invoke\(\s*(?!['"`])/g) ?? []).length;
}

const appSourceFiles = filesUnder(resolve(root, 'src'), isRuntimeSource);
const appSourceSet = new Set(appSourceFiles);
const importGraph = new Map();
const unresolvedInternalImports = [];
let importMetaGlobCalls = 0;
for (const file of appSourceFiles) {
  const source = readFileSync(file, 'utf8');
  const specifiers = new Set([
    ...collectCalls(source, /(?:from\s*|import\s*\()\s*['"`]([^'"`]+)['"`]/g),
    ...collectCalls(source, /import\s*['"`]([^'"`]+)['"`]/g),
    ...collectCalls(source, /new\s+URL\(\s*['"`]([^'"`]+)['"`]\s*,\s*import\.meta\.url/g),
  ]);
  importMetaGlobCalls += (source.match(/import\.meta\.glob/g) ?? []).length;
  const resolvedImports = new Set();
  for (const specifier of specifiers) {
    const resolvedImport = resolveInternalImport(file, specifier);
    if (resolvedImport && appSourceSet.has(resolvedImport)) resolvedImports.add(resolvedImport);
    else if (specifier.startsWith('@/') || specifier.startsWith('.')) {
      unresolvedInternalImports.push({
        importer: relative(root, file).replaceAll('\\', '/'),
        specifier,
      });
    }
  }
  importGraph.set(file, [...resolvedImports]);
}

const appEntries = [resolve(root, 'src/main.tsx')].filter((entry) => appSourceSet.has(entry));
const reachableAppFiles = new Set();
const queue = [...appEntries];
while (queue.length > 0) {
  const file = queue.shift();
  if (reachableAppFiles.has(file)) continue;
  reachableAppFiles.add(file);
  for (const dependency of importGraph.get(file) ?? []) queue.push(dependency);
}
const unreachableAppCandidates = appSourceFiles
  .filter((file) => !reachableAppFiles.has(file))
  .map((file) => relative(root, file).replaceAll('\\', '/'));

const duplicateHashes = new Map();
for (const file of appSourceFiles) {
  const source = readFileSync(file);
  const hash = createHash('sha256').update(source).digest('hex');
  const files = duplicateHashes.get(hash) ?? [];
  files.push(relative(root, file).replaceAll('\\', '/'));
  duplicateHashes.set(hash, files);
}
const exactDuplicateSourceGroups = [...duplicateHashes.entries()]
  .filter(([, files]) => files.length > 1)
  .map(([hash, files]) => ({ hash, files }));

const topLevelSourceAreas = Object.entries(appSourceFiles.reduce((areas, file) => {
  const normalized = relative(resolve(root, 'src'), file).replaceAll('\\', '/');
  const area = normalized.split('/')[0];
  areas[area] = (areas[area] ?? 0) + 1;
  return areas;
}, {})).sort((a, b) => b[1] - a[1]);

const incomingRelationships = new Map();
for (const table of tables) {
  for (const relationship of table.relationships) {
    const values = incomingRelationships.get(relationship.referencedTable) ?? [];
    values.push({ fromTable: table.name, ...relationship });
    incomingRelationships.set(relationship.referencedTable, values);
  }
}

const scopePathByTable = new Map();
for (const table of tables) {
  if (table.tenantKeys.length > 0) scopePathByTable.set(table.name, [table.name, `tenant:${table.tenantKeys.join(',')}`]);
  else if (table.ownerKeys.length > 0) scopePathByTable.set(table.name, [table.name, `user:${table.ownerKeys.join(',')}`]);
}
for (let pass = 0; pass < tables.length; pass += 1) {
  let changed = false;
  for (const table of tables) {
    if (scopePathByTable.has(table.name)) continue;
    const scopedParent = table.relationships.find((relationship) => scopePathByTable.has(relationship.referencedTable));
    if (!scopedParent) continue;
    scopePathByTable.set(table.name, [
      table.name,
      `${scopedParent.column}->${scopedParent.referencedTable}.${scopedParent.referencedColumn}`,
      ...scopePathByTable.get(scopedParent.referencedTable).slice(1),
    ]);
    changed = true;
  }
  if (!changed) break;
}

const edgeFunctions = readdirSync(edgeFunctionsPath, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
  .map((entry) => entry.name)
  .sort();
const supabaseConfig = readFileSync(supabaseConfigPath, 'utf8');
const configuredEdgeFunctions = new Set(
  [...supabaseConfig.matchAll(/^\[functions\.([^\]]+)\]/gm)].map((match) => match[1]),
);
const routeAllowlist = existsSync(routeAllowlistPath)
  ? JSON.parse(readFileSync(routeAllowlistPath, 'utf8'))
  : {};
const declaredProductionFunctions = new Set(routeAllowlist.production_functions ?? []);
const declaredDisabledFunctions = new Set(routeAllowlist.disabled_functions ?? []);
const newNonDescriptiveMigrations = migrations
  .filter((migration) => migration.timestamp > historicalMigrationCutoff && !migration.descriptiveName)
  .map((migration) => migration.name);
const missingDeclaredProductionFunctions = [...declaredProductionFunctions]
  .filter((name) => !edgeFunctions.includes(name));
const productionDisabledOverlap = [...declaredProductionFunctions]
  .filter((name) => declaredDisabledFunctions.has(name));

const tableInventory = tables.map((table) => ({
  ...table,
  scopePath: scopePathByTable.get(table.name) ?? [],
  incomingRelationships: incomingRelationships.get(table.name) ?? [],
  runtimeConsumers: [...(tableConsumers.get(table.name) ?? [])].sort(),
  createdByMigrations: migrations.filter((migration) => migration.createdTables.includes(table.name)).map((migration) => migration.name),
  rlsTouchedByMigrations: migrations.filter((migration) => migration.rlsEnabled.includes(table.name)).map((migration) => migration.name),
  policyTouchedByMigrations: migrations.filter((migration) => migration.policyTables.includes(table.name)).map((migration) => migration.name),
}));

const runtimeUntouchedTables = tableInventory
  .filter((table) => table.runtimeConsumers.length === 0)
  .map((table) => table.name);
const isolatedTableCandidates = tableInventory
  .filter((table) => table.runtimeConsumers.length === 0 && table.relationships.length === 0 && table.incomingRelationships.length === 0)
  .map((table) => table.name);
const tablesWithoutResolvableScope = tableInventory
  .filter((table) => table.scopePath.length === 0)
  .map((table) => table.name);
const tablesWithoutRlsMigrationEvidence = tableInventory
  .filter((table) => table.rlsTouchedByMigrations.length === 0)
  .map((table) => table.name);
const tablesWithoutPolicyMigrationEvidence = tableInventory
  .filter((table) => table.policyTouchedByMigrations.length === 0)
  .map((table) => table.name);

const report = {
  generatedAt: new Date().toISOString(),
  repository: 'm2mtechconnect/m2mdc',
  auditedLocalCommit: git('rev-parse', 'HEAD'),
  schemaSource: 'src/integrations/supabase/types.ts (generated client contract; deployed-schema verification still required)',
  summary: {
    tables: tables.length,
    views: viewBlocks.length,
    databaseFunctions: functionBlocks.length,
    relationships: tables.reduce((total, table) => total + table.relationships.length, 0),
    migrations: migrations.length,
    opaqueMigrationNames: migrations.filter((migration) => migration.opaqueName).length,
    newNonDescriptiveMigrations: newNonDescriptiveMigrations.length,
    edgeFunctions: edgeFunctions.length,
    directlyInvokedEdgeFunctions: edgeFunctionConsumers.size,
    configuredEdgeFunctions: configuredEdgeFunctions.size,
    declaredProductionFunctions: declaredProductionFunctions.size,
    declaredDisabledFunctions: declaredDisabledFunctions.size,
    directlyConsumedTables: tableConsumers.size,
    directlyConsumedDatabaseFunctions: rpcConsumers.size,
    runtimeUntouchedTables: runtimeUntouchedTables.length,
    isolatedTableCandidates: isolatedTableCandidates.length,
    tablesWithoutResolvableScope: tablesWithoutResolvableScope.length,
    tablesWithoutRlsMigrationEvidence: tablesWithoutRlsMigrationEvidence.length,
    tablesWithoutPolicyMigrationEvidence: tablesWithoutPolicyMigrationEvidence.length,
    dynamicFromCalls,
    dynamicRpcCalls,
    dynamicFunctionInvocations,
    runtimeAppSourceFiles: appSourceFiles.length,
    reachableRuntimeAppSourceFiles: reachableAppFiles.size,
    unreachableRuntimeAppCandidates: unreachableAppCandidates.length,
    exactDuplicateSourceGroups: exactDuplicateSourceGroups.length,
    unresolvedInternalImports: unresolvedInternalImports.length,
    importMetaGlobCalls,
  },
  migrations,
  tables: tableInventory,
  views: viewBlocks.map((view) => view.name),
  databaseFunctions: functionBlocks.map((fn) => fn.name),
  edgeFunctions: edgeFunctions.map((name) => ({
    name,
    directlyInvokedBy: [...(edgeFunctionConsumers.get(name) ?? [])].sort(),
    configuredInSupabase: configuredEdgeFunctions.has(name),
    declaredProduction: declaredProductionFunctions.has(name),
    declaredDisabled: declaredDisabledFunctions.has(name),
  })),
  unresolved: {
    runtimeUntouchedTables,
    isolatedTableCandidates,
    tablesWithoutResolvableScope,
    tablesWithoutRlsMigrationEvidence,
    tablesWithoutPolicyMigrationEvidence,
    generatedFunctionsWithoutDirectRpcCall: functionBlocks.map((fn) => fn.name).filter((name) => !rpcConsumers.has(name)),
    edgeFunctionsWithoutDirectInvokeCall: edgeFunctions.filter((name) => !edgeFunctionConsumers.has(name)),
    unreachableRuntimeAppCandidates: unreachableAppCandidates,
    exactDuplicateSourceGroups,
    unresolvedInternalImports,
    note: 'These are investigation candidates, not deletion proof. SQL-only, dynamic, webhook, scheduled, external, generated, and operational consumers are not fully resolved.',
  },
  codeOrganization: {
    appEntries: appEntries.map((file) => relative(root, file).replaceAll('\\', '/')),
    topLevelSourceAreas,
  },
  governance: {
    historicalMigrationCutoff,
    newNonDescriptiveMigrations,
    missingDeclaredProductionFunctions,
    productionDisabledOverlap,
    routeAllowlistPolicy: routeAllowlist.policy ?? null,
  },
};

const governanceErrors = [
  ...tablesWithoutRlsMigrationEvidence.map((name) => `table lacks RLS migration evidence: ${name}`),
  ...tablesWithoutPolicyMigrationEvidence.map((name) => `table lacks policy migration evidence: ${name}`),
  ...newNonDescriptiveMigrations.map((name) => `new migration name is not descriptive: ${name}`),
  ...missingDeclaredProductionFunctions.map((name) => `declared production function directory is missing: ${name}`),
  ...productionDisabledOverlap.map((name) => `function is both production and disabled: ${name}`),
];
if (routeAllowlist.policy !== 'default-deny') {
  governanceErrors.push('route allowlist policy is not default-deny');
}

const output = summaryOnly
  ? {
      generatedAt: report.generatedAt,
      repository: report.repository,
      auditedLocalCommit: report.auditedLocalCommit,
      schemaSource: report.schemaSource,
      summary: report.summary,
      investigationCandidates: {
        isolatedTables: isolatedTableCandidates,
        tablesWithoutResolvableScope,
        edgeFunctionsWithoutStaticInvoke: report.unresolved.edgeFunctionsWithoutDirectInvokeCall,
        unreachableRuntimeSourceCount: unreachableAppCandidates.length,
      },
      governance: report.governance,
      governanceErrors,
      warning: report.unresolved.note,
    }
  : report;

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
if (checkMode && governanceErrors.length > 0) process.exitCode = 1;

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd());
const retiredFunctions = [
  'integrations-zapier',
  'zapier-action-execute',
  'zapier-app-connect',
  'zapier-app-disconnect',
  'zapier-apps-detail',
  'zapier-apps-list',
  'zapier-auto-refresh',
  'zapier-connect',
  'zapier-disconnect',
  'zapier-integration-status',
  'zapier-oauth-callback',
  'zapier-oauth-connect',
  'zapier-oauth-start',
  'zapier-refresh-token',
  'zapier-status',
  'zapier-test-connection',
  'zapier-test',
  'zapier-webhook-trigger',
  'zapier-webhook',
];

const expected = [
  "import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';",
  "import { retiredEndpoint } from '../_shared/retiredEndpoint.ts';",
  '',
  'serve(retiredEndpoint);',
  '',
].join('\n');

const violations = [];

for (const fn of retiredFunctions) {
  const path = join(root, 'supabase', 'functions', fn, 'index.ts');
  if (!existsSync(path)) {
    violations.push(`${fn}: retirement tombstone missing before runtime undeployment is verified`);
    continue;
  }
  const content = readFileSync(path, 'utf8');
  if (content !== expected) violations.push(`${fn}: contains logic beyond the approved fail-closed tombstone`);
}

const configPath = join(root, 'supabase', 'config.toml');
const config = readFileSync(configPath, 'utf8');
if (/\[functions\.(?:zapier[^\]]*|integrations-zapier)\]/i.test(config)) {
  violations.push('supabase/config.toml: legacy Zapier function-specific runtime configuration is active');
}

const tombstonePath = join(root, 'supabase', 'functions', '_shared', 'retiredEndpoint.ts');
if (!existsSync(tombstonePath)) {
  violations.push('shared fail-closed retired endpoint handler is missing');
} else {
  const tombstone = readFileSync(tombstonePath, 'utf8');
  for (const required of ["status: 410", "ENDPOINT_RETIRED", "Cache-Control", "no-store"]) {
    if (!tombstone.includes(required)) violations.push(`retiredEndpoint.ts: missing ${JSON.stringify(required)}`);
  }
}

if (violations.length > 0) {
  console.error('Zapier retirement guard failed:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(`Zapier retirement guard passed: ${retiredFunctions.length} legacy endpoints are fail-closed and unconfigured.`);

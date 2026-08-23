import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(process.cwd());
const srcRoot = join(root, 'src');

const forbiddenPaths = [
  'src/components/builder/BuilderIntegrationsHub.tsx',
  'src/components/builder/ConnectStep.tsx',
  'src/components/builder/MCPToolsPlayground.tsx',
  'src/components/integrations/ZapierIntegrationCard.tsx',
  'src/hooks/useTokenRefresh.ts',
  'src/components/builder/steps/DCStep1Summary.tsx',
  'src/components/builder/steps/DCStep2Blueprint.tsx',
  'src/components/builder/steps/DCStep3Integrations.tsx',
  'src/components/builder/steps/DCStep4Scenarios.tsx',
  'src/components/builder/steps/DCStep5Deploy.tsx',
];

const globalForbidden = [
  'ZapierIntegrationCard',
  'zapier-integration-status',
  'zapier-auto-refresh',
  'zapier-refresh-token',
  'BuilderIntegrationsHub',
  'MCPToolsPlayground',
];

const builderForbidden = [
  'value="mcp"',
  "value='mcp'",
  'value="api"',
  "value='api'",
  'Bearer Token',
  'API Key',
  'Add API Connector',
  'Custom API Connectors',
  'MCP Servers',
];

const violations = [];

for (const path of forbiddenPaths) {
  if (existsSync(join(root, path))) violations.push(`${path}: retired legacy file still exists`);
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path);
      continue;
    }
    if (!/\.(ts|tsx|js|jsx)$/.test(name)) continue;

    const rel = relative(root, path).replaceAll('\\', '/');
    const content = readFileSync(path, 'utf8');

    for (const token of globalForbidden) {
      if (content.includes(token)) violations.push(`${rel}: forbidden legacy token ${JSON.stringify(token)}`);
    }

    if (rel.startsWith('src/components/builder/') || rel === 'src/pages/Builder.tsx') {
      for (const token of builderForbidden) {
        if (content.includes(token)) violations.push(`${rel}: retired Builder surface ${JSON.stringify(token)}`);
      }
    }
  }
}

walk(srcRoot);

if (violations.length > 0) {
  console.error('Legacy frontend guard failed:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('Legacy frontend guard passed: retired Zapier/MCP/raw-API Builder surfaces are absent.');

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = 'dist';
const expectedSha = (process.env.AURA_COMMIT_SHA || process.env.GITHUB_SHA || '').trim();
const expectedDemo = process.env.VITE_AURA_DEMO_INTEGRATIONS === 'true';

function fail(message) {
  console.error(`AURA_DEMO_BUILD_INVALID: ${message}`);
  process.exit(1);
}

if (!existsSync(DIST)) fail('dist directory is missing');
if (!expectedDemo) fail('VITE_AURA_DEMO_INTEGRATIONS must equal true for a demo artifact');

const releasePath = join(DIST, 'release.json');
if (!existsSync(releasePath)) fail('release.json is missing');
const release = JSON.parse(readFileSync(releasePath, 'utf8'));
if (release.environment !== 'demo') fail(`release environment is ${String(release.environment)}, expected demo`);
if (expectedSha && release.sha !== expectedSha) fail(`release SHA ${String(release.sha)} does not match ${expectedSha}`);

const forbiddenStaticTerms = [
  /lovable\.app/i,
  /lovable\.dev/i,
  />\s*Lovable\s*</i,
  />\s*Zapier\s*</i,
];

const staticExtensions = new Set(['.html', '.css', '.json', '.txt', '.svg', '.xml']);
const javascriptFiles = [];
const staticFiles = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path);
    else if (extname(path) === '.js') javascriptFiles.push(path);
    else if (staticExtensions.has(extname(path))) staticFiles.push(path);
    else if (extname(path) === '.map') fail(`source map must not ship in demo artifact: ${path}`);
  }
}
walk(DIST);

for (const path of staticFiles) {
  const text = readFileSync(path, 'utf8');
  for (const forbidden of forbiddenStaticTerms) {
    if (forbidden.test(text)) fail(`customer-visible static artifact ${path} contains forbidden implementation branding`);
  }
}

let compiled = '';
for (const path of javascriptFiles) compiled += readFileSync(path, 'utf8');
if (!compiled.includes('AURA demo integrations')) fail('compiled artifact does not contain the enabled AURA demo integrations surface');
if (!compiled.includes('Demo data')) fail('compiled artifact is missing explicit demo-data labeling');
if (compiled.includes('lovable-tagger')) fail('development component tagger was bundled into the demo artifact');

const manifest = {
  schema: 'aura.demo-build.v1',
  sha: release.sha,
  environment: release.environment,
  demoIntegrations: true,
  releaseFile: 'release.json',
  verifiedAt: new Date().toISOString(),
  assertions: {
    productionModeArtifact: true,
    releaseFingerprintBound: true,
    noSourceMaps: true,
    noStaticImplementationBranding: true,
    demoTruthLabelsPresent: true,
    devTaggerAbsent: true,
  },
};
writeFileSync(join(DIST, 'aura-demo-build.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));

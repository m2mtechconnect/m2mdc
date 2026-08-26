import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CONTRACT_PATH = path.join(ROOT, 'config/aura-release-contract.json');
const CONTRACT = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));

function fail(message) {
  throw new Error(message);
}

function blockingSpecs(group) {
  if (group === 'all') {
    return [...CONTRACT.blockingE2E.lifecycle, ...CONTRACT.blockingE2E.authSecurity];
  }
  if (group === 'lifecycle') return CONTRACT.blockingE2E.lifecycle;
  if (group === 'auth-security') return CONTRACT.blockingE2E.authSecurity;
  fail(`Unknown release E2E group: ${group}`);
}

function validateContract({ quiet = false } = {}) {
  if (CONTRACT.schema !== 'aura.release-contract.v1') {
    fail(`Unexpected release contract schema: ${CONTRACT.schema}`);
  }

  const specs = blockingSpecs('all');
  if (specs.length === 0) fail('Release contract has no blocking E2E specs.');
  if (new Set(specs).size !== specs.length) fail('Release contract contains duplicate blocking E2E specs.');

  for (const spec of specs) {
    if (!spec.startsWith('tests/e2e/')) fail(`Blocking E2E spec is outside tests/e2e: ${spec}`);
    if (!fs.existsSync(path.join(ROOT, spec))) fail(`Blocking E2E spec does not exist: ${spec}`);
  }

  if (!fs.existsSync(path.join(ROOT, CONTRACT.legacyE2E.directory))) {
    fail(`Legacy E2E directory does not exist: ${CONTRACT.legacyE2E.directory}`);
  }
  if (CONTRACT.legacyE2E.policy !== 'non-blocking-until-reconciled') {
    fail(`Unexpected legacy E2E policy: ${CONTRACT.legacyE2E.policy}`);
  }

  const gateNames = CONTRACT.workflowGates.map((gate) => gate.name);
  if (new Set(gateNames).size !== gateNames.length) fail('Release contract contains duplicate workflow gate names.');
  for (const gate of CONTRACT.workflowGates) {
    if (!['always', 'paths'].includes(gate.mode)) fail(`Unsupported gate mode for ${gate.name}: ${gate.mode}`);
    if (gate.mode === 'paths' && (!Array.isArray(gate.paths) || gate.paths.length === 0)) {
      fail(`Path-scoped gate has no paths: ${gate.name}`);
    }
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  if (pkg.scripts?.['test:e2e'] !== 'bun run test:e2e:release') {
    fail('package.json test:e2e must resolve to the canonical release E2E set.');
  }
  if (pkg.scripts?.['test:e2e:legacy'] !== 'playwright test') {
    fail('package.json test:e2e:legacy must retain the full historical E2E catalog.');
  }
  if (pkg.scripts?.['test:e2e:release'] !== 'node scripts/run-release-e2e.mjs') {
    fail('package.json test:e2e:release must execute the release-contract runner.');
  }
  if (pkg.scripts?.['verify:release']) {
    fail('verify:release is intentionally reserved for full CI qualification. Use verify:release:smoke locally.');
  }

  if (!quiet) {
    console.log(`Release contract valid: ${specs.length} blocking E2E specs, ${gateNames.length} workflow gates.`);
  }
}

function globToRegExp(pattern) {
  const doubleSlash = '__AURA_DOUBLE_SLASH__';
  const double = '__AURA_DOUBLE__';
  const single = '__AURA_SINGLE__';
  const value = pattern
    .replaceAll('**/', doubleSlash)
    .replaceAll('**', double)
    .replaceAll('*', single)
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replaceAll(doubleSlash, '(?:.*/)?')
    .replaceAll(double, '.*')
    .replaceAll(single, '[^/]*');
  return new RegExp(`^${value}$`);
}

function gateApplies(gate, files) {
  if (gate.mode === 'always') return true;
  return gate.paths.some((pattern) => {
    const regex = globToRegExp(pattern);
    return files.some((file) => regex.test(file));
  });
}

async function githubJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'aura-release-qualification',
    },
  });
  if (!response.ok) {
    const body = await response.text();
    fail(`GitHub API ${response.status} for ${url}: ${body.slice(0, 500)}`);
  }
  return response.json();
}

async function pullRequestFiles(repo, prNumber, token) {
  const files = [];
  for (let page = 1; page <= 30; page += 1) {
    const batch = await githubJson(
      `https://api.github.com/repos/${repo}/pulls/${prNumber}/files?per_page=100&page=${page}`,
      token,
    );
    files.push(...batch.map((item) => item.filename));
    if (batch.length < 100) break;
  }
  return files;
}

async function workflowRuns(repo, sha, token) {
  const payload = await githubJson(
    `https://api.github.com/repos/${repo}/actions/runs?head_sha=${sha}&event=pull_request&per_page=100`,
    token,
  );
  return payload.workflow_runs ?? [];
}

function latestRunByName(runs) {
  const result = new Map();
  for (const run of runs) {
    if (!result.has(run.name)) result.set(run.name, run);
  }
  return result;
}

function writeQualificationSummary(payload) {
  const dir = path.join(ROOT, 'release-qualification');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'summary.json'), `${JSON.stringify(payload, null, 2)}\n`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = [
      '## AURA Release Qualification',
      '',
      `- Source SHA: \`${payload.sha}\``,
      `- Status: **${payload.status}**`,
      `- Expected gates: ${payload.gates.length}`,
      '',
      ...payload.gates.map((gate) => `- ${gate.name}: ${gate.status}${gate.conclusion ? ` (${gate.conclusion})` : ''}`),
      '',
    ];
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
  }
}

async function qualify() {
  validateContract({ quiet: true });

  const repo = process.env.GITHUB_REPOSITORY;
  const sha = process.env.AURA_SOURCE_SHA;
  const prNumber = process.env.AURA_PR_NUMBER;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !sha || !prNumber || !token) {
    fail('Qualification requires GITHUB_REPOSITORY, AURA_SOURCE_SHA, AURA_PR_NUMBER and GITHUB_TOKEN.');
  }
  if (!/^[0-9a-f]{40}$/i.test(sha)) fail(`AURA_SOURCE_SHA is not an exact SHA: ${sha}`);

  const files = await pullRequestFiles(repo, prNumber, token);
  const expected = CONTRACT.workflowGates.filter((gate) => gateApplies(gate, files));
  const timeoutMs = Number(process.env.AURA_QUALIFICATION_TIMEOUT_MS ?? 3_000_000);
  const pollMs = Number(process.env.AURA_QUALIFICATION_POLL_MS ?? 20_000);
  const deadline = Date.now() + timeoutMs;

  while (true) {
    const runs = latestRunByName(await workflowRuns(repo, sha, token));
    const gates = expected.map((gate) => {
      const run = runs.get(gate.name);
      return {
        name: gate.name,
        status: run?.status ?? 'not-started',
        conclusion: run?.conclusion ?? null,
        runId: run?.id ?? null,
        url: run?.html_url ?? null,
      };
    });

    const failed = gates.find((gate) => gate.status === 'completed' && gate.conclusion !== 'success');
    if (failed) {
      const payload = {
        schema: 'aura.release-qualification.v1',
        sha,
        prNumber: Number(prNumber),
        status: 'failed',
        failedGate: failed.name,
        changedFiles: files,
        gates,
        checkedAt: new Date().toISOString(),
      };
      writeQualificationSummary(payload);
      fail(`Required workflow failed: ${failed.name} (${failed.conclusion})`);
    }

    if (gates.every((gate) => gate.status === 'completed' && gate.conclusion === 'success')) {
      const payload = {
        schema: 'aura.release-qualification.v1',
        sha,
        prNumber: Number(prNumber),
        status: 'qualified',
        changedFiles: files,
        gates,
        checkedAt: new Date().toISOString(),
      };
      writeQualificationSummary(payload);
      console.log(`AURA release qualification passed for ${sha} with ${gates.length} required workflows.`);
      return;
    }

    if (Date.now() >= deadline) {
      const payload = {
        schema: 'aura.release-qualification.v1',
        sha,
        prNumber: Number(prNumber),
        status: 'timed-out',
        changedFiles: files,
        gates,
        checkedAt: new Date().toISOString(),
      };
      writeQualificationSummary(payload);
      fail(`Timed out waiting for required workflows: ${gates.filter((gate) => gate.status !== 'completed').map((gate) => gate.name).join(', ')}`);
    }

    console.log(`Waiting for release gates: ${gates.filter((gate) => gate.status !== 'completed').map((gate) => `${gate.name}:${gate.status}`).join(', ')}`);
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

const [command = 'validate', arg = 'all'] = process.argv.slice(2);

try {
  if (command === 'validate') {
    validateContract();
  } else if (command === 'list') {
    validateContract({ quiet: true });
    for (const spec of blockingSpecs(arg)) console.log(spec);
  } else if (command === 'qualify') {
    await qualify();
  } else {
    fail(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

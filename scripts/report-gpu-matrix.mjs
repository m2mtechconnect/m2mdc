#!/usr/bin/env node
/**
 * Reads the Playwright JSON output of a GPU-matrix lane and classifies the
 * outcome into:
 *   • real failures                    -> gate the job (exit 1)
 *   • software-rendering limitations   -> reported, never gating
 *
 * Usage: node scripts/report-gpu-matrix.mjs test-results/gpu-matrix-<lane>.json
 */

import { readFileSync, appendFileSync, existsSync } from 'node:fs';

const file = process.argv[2];
const lane = process.env.AURA_GPU_LANE ?? 'software';
const gpuRequired = process.env.AURA_GPU_REQUIRED === '1';

if (!file || !existsSync(file)) {
  console.error(`[gpu-matrix] results file not found: ${file}`);
  process.exit(1);
}

const report = JSON.parse(readFileSync(file, 'utf8'));

const specs = [];
const walk = (suite) => {
  for (const s of suite.specs ?? []) specs.push(s);
  for (const child of suite.suites ?? []) walk(child);
};
for (const suite of report.suites ?? []) walk(suite);

const rows = specs.map((spec) => {
  const result = spec.tests?.[0]?.results?.[0];
  const annotations = [
    ...(spec.tests?.[0]?.annotations ?? []),
    ...(result?.annotations ?? []),
  ];
  const renderer = annotations.find((a) => a.type === 'webgl-renderer')?.description ?? 'unknown';
  const softwareLimited = annotations.some((a) => a.type === 'software-rendering-limitation');
  const status = result?.status ?? 'unknown';
  return { title: spec.title, status, renderer, softwareLimited };
});

const failures = rows.filter((r) => r.status !== 'passed' && r.status !== 'skipped' && !(r.softwareLimited && !gpuRequired));
const limitations = rows.filter((r) => r.softwareLimited);

const lines = [
  `### Twin canvas GPU matrix - lane \`${lane}\``,
  '',
  `Hardware WebGL required: **${gpuRequired ? 'yes' : 'no'}**`,
  '',
  '| Test | Status | Renderer |',
  '| --- | --- | --- |',
  ...rows.map((r) => `| ${r.title} | ${r.status} | ${r.renderer} |`),
  '',
  `Real failures: **${failures.length}** - software-rendering limitations: **${limitations.length}**`,
];

if (limitations.length && !gpuRequired) {
  lines.push('', 'Software-rendering limitations are informational on this lane and do not gate the build.');
}

const summary = lines.join('\n');
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);

if (gpuRequired && limitations.length) {
  console.error('[gpu-matrix] GPU lane did not obtain a hardware WebGL context.');
  process.exit(1);
}
process.exit(failures.length ? 1 : 0);

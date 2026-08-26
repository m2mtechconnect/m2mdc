#!/usr/bin/env node
/**
 * Observability end-to-end verification probe (read-only against app state).
 *
 * Sends one synthetic, clearly-labelled probe event through the governed
 * observability-capture relay and records redacted evidence under
 * docs/evidence/observability/. When provider read credentials are present
 * (POSTHOG_PERSONAL_API_KEY + POSTHOG_PROJECT_ID), it additionally confirms
 * the event landed in the provider before claiming delivery.
 *
 * Truth rules:
 * - No secret values are ever written to the evidence artifact or stdout.
 * - A relay 200 without provider confirmation is recorded as
 *   delivered_to_relay only - not verified end-to-end.
 * - When the backend is not configured, the artifact says so and the script
 *   exits non-zero. Nothing is fabricated.
 *
 * Usage:
 *   AURA_FUNCTIONS_BASE=https://<project>.supabase.co \
 *     node scripts/verify-observability-e2e.mjs [--release-sha <sha>]
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const releaseShaArg = args.includes('--release-sha')
  ? args[args.indexOf('--release-sha') + 1]
  : null;

const FUNCTIONS_BASE = (process.env.AURA_FUNCTIONS_BASE ?? '').trim().replace(/\/$/, '');
const PERSONAL_KEY = (process.env.POSTHOG_PERSONAL_API_KEY ?? '').trim();
const PROJECT_ID = (process.env.POSTHOG_PROJECT_ID ?? '').trim();
const PROVIDER_HOST = (process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com').trim().replace(/\/$/, '');

const now = new Date();
const probeId = `aura-obs-probe-${now.toISOString().replace(/[-:.]/g, '').slice(0, 15)}-${Math.random().toString(36).slice(2, 8)}`;

const evidence = {
  evidence_type: 'observability.e2e_probe',
  evidence_version: '1.0.0',
  probe_id: probeId,
  started_at: now.toISOString(),
  functions_base_host: FUNCTIONS_BASE ? new URL(FUNCTIONS_BASE).host : null,
  release_sha: releaseShaArg ?? process.env.GITHUB_SHA ?? null,
  steps: [],
  delivered_to_relay: false,
  verified_in_provider: null, // null = provider read-back not attempted
  result: 'unknown',
  redaction: 'No credentials, tenant ids, user ids, or raw error content are included in this artifact.',
};

function step(name, ok, detail) {
  evidence.steps.push({ name, ok, detail, at: new Date().toISOString() });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${detail}`);
}

function finish(result, exitCode) {
  evidence.result = result;
  evidence.finished_at = new Date().toISOString();
  const dir = path.resolve(process.cwd(), 'docs/evidence/observability');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = now.toISOString().slice(0, 10);
  const file = path.join(dir, `e2e-${stamp}-${probeId.slice(-6)}.json`);
  fs.writeFileSync(file, JSON.stringify(evidence, null, 2));
  console.log(`evidence: ${path.relative(process.cwd(), file)}`);
  process.exit(exitCode);
}

if (!FUNCTIONS_BASE) {
  step('config.target', false, 'AURA_FUNCTIONS_BASE is not set; target unknown.');
  finish('not_run', 2);
}

let config;
try {
  const res = await fetch(`${FUNCTIONS_BASE}/functions/v1/observability-config`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    step('config.fetch', false, `observability-config returned HTTP ${res.status}.`);
    finish('config_unavailable', 1);
  }
  const body = await res.json();
  config = body?.data ?? body;
} catch (err) {
  step('config.fetch', false, `observability-config unreachable: ${String(err)}`);
  finish('config_unavailable', 1);
}

if (config?.enabled !== true || config?.provider !== 'posthog') {
  step('config.enabled', false, 'Backend reports no configured observability provider.');
  finish('not_configured', 1);
}
step('config.enabled', true, 'Backend declares a configured posthog provider.');

const probeEvent = {
  event: 'runtime.client_error',
  properties: {
    source: 'observability.e2e_probe',
    error_type: 'ObservabilitySyntheticProbe',
    route: '/observability-probe',
    release_sha: evidence.release_sha ?? 'unknown',
    build_id: 'e2e-probe',
    app_version: 'e2e-probe',
    synthetic_probe_id: probeId,
  },
};

try {
  const res = await fetch(`${FUNCTIONS_BASE}/functions/v1/observability-capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(probeEvent),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await res.json().catch(() => null);
  const data = body?.data ?? body;
  if (res.ok && data?.delivered === true) {
    evidence.delivered_to_relay = true;
    step('relay.deliver', true, 'Relay accepted and forwarded the synthetic probe.');
  } else {
    step('relay.deliver', false, `Relay did not deliver: HTTP ${res.status} status=${data?.status ?? 'unknown'}`);
    finish('relay_rejected', 1);
  }
} catch (err) {
  step('relay.deliver', false, `Relay unreachable: ${String(err)}`);
  finish('relay_unreachable', 1);
}

if (!PERSONAL_KEY || !PROJECT_ID) {
  step('provider.verify', false, 'Provider read-back credentials absent; delivery not verified end-to-end.');
  finish('delivered_to_relay_unverified', 1);
}

const deadline = Date.now() + 90_000;
let confirmed = false;
while (Date.now() < deadline && !confirmed) {
  try {
    const url = `${PROVIDER_HOST}/api/projects/${encodeURIComponent(PROJECT_ID)}/events/?event=runtime.client_error&limit=25`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${PERSONAL_KEY}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const body = await res.json();
      confirmed = Array.isArray(body?.results)
        && body.results.some((e) => e?.properties?.synthetic_probe_id === probeId);
    }
  } catch {
    // retry until deadline
  }
  if (!confirmed) await new Promise((r) => setTimeout(r, 5_000));
}

evidence.verified_in_provider = confirmed;
step('provider.verify', confirmed, confirmed
  ? 'Synthetic probe observed in provider event stream.'
  : 'Synthetic probe not observed in provider within 90s.');
finish(confirmed ? 'verified' : 'provider_not_confirmed', confirmed ? 0 : 1);

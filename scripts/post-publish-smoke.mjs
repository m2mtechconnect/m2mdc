/**
 * Post-publish smoke qualification suite (READ-ONLY, FAIL-CLOSED).
 *
 * Validates a published AURA target after a release without mutating
 * anything:
 *
 *   Public plane (no credentials):
 *     1. /release.json — HTTP 200, schema aura.release-fingerprint.v1,
 *        non-empty sha/branch/environment/buildId, optional expected-SHA match
 *     2. / and /login — HTTP 200, AURA SPA shell marker, not a 5xx/nginx
 *        error page
 *     3. Unauthenticated deep-link to /dashboard — must bounce to an
 *        unauthenticated surface (/login or /), never render protected content
 *
 *   Authenticated plane (requires a session from preview-session.mjs):
 *     4. /dashboard, /analytics, /evidence/overview render for the smoke
 *        identity (route availability + session behavior)
 *     5. Truth/provenance labels present on simulated surfaces
 *
 * Fail-closed contract:
 *   - Any failed check exits non-zero.
 *   - If no session is resolvable, authenticated checks are recorded as
 *     BLOCKED_BY_AUTH and the suite exits non-zero. Passing a partial run is
 *     not possible without the explicit --unauthenticated-only flag, which
 *     records plane: 'public-only' in the evidence.
 *   - The suite performs GET navigations only. It never submits a form,
 *     never writes to the database and never calls a mutation endpoint.
 *   - Tenant-boundary probing requires a second tenant identity and is
 *     recorded as 'not-run' with a reason rather than approximated.
 *
 * Secret hygiene: session material is held in memory only. Evidence files
 * record the session source as '<session-installed>' and never contain
 * tokens, cookies, emails or storage keys.
 *
 * Usage:
 *   node scripts/post-publish-smoke.mjs
 *   AURA_SMOKE_TARGET=https://auradc.m2mtechconnect.com \
 *   AURA_EXPECTED_SHA=<40-char sha> \
 *   node scripts/post-publish-smoke.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { resolvePreviewSession, installPreviewSession, PreviewSessionUnavailableError } from './preview-session.mjs';

const TARGET = (process.env.AURA_SMOKE_TARGET ?? 'https://auradc.m2mtechconnect.com').replace(/\/$/, '');
const EXPECTED_SHA = process.env.AURA_EXPECTED_SHA ?? null;
const PUBLIC_ONLY = process.argv.includes('--unauthenticated-only');
const EVIDENCE_DIR = new URL('../docs/evidence/post-publish-smoke/', import.meta.url);
const AUTHENTICATED_ROUTES = ['/dashboard', '/analytics', '/evidence/overview'];

const results = [];
const record = (id, plane, status, detail) => {
  results.push({ id, plane, status, detail });
  console.log(`[${status}] ${id} — ${detail}`);
};

async function fetchCheck(url) {
  const res = await fetch(url, { redirect: 'follow' });
  const text = await res.text();
  return { status: res.status, text };
}

async function checkReleaseFingerprint() {
  try {
    const { status, text } = await fetchCheck(`${TARGET}/release.json`);
    if (status !== 200) {
      record('release-fingerprint', 'public', 'FAIL', `/release.json returned HTTP ${status}`);
      return;
    }
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      record('release-fingerprint', 'public', 'FAIL', '/release.json is not valid JSON');
      return;
    }
    const problems = [];
    if (payload.schema !== 'aura.release-fingerprint.v1') problems.push(`schema=${payload.schema ?? 'missing'}`);
    for (const field of ['sha', 'branch', 'environment', 'buildId']) {
      if (!payload[field] || typeof payload[field] !== 'string') problems.push(`${field} empty`);
    }
    if (EXPECTED_SHA && payload.sha !== EXPECTED_SHA) problems.push(`sha mismatch: expected ${EXPECTED_SHA}, got ${payload.sha}`);
    if (problems.length > 0) {
      record('release-fingerprint', 'public', 'FAIL', problems.join('; '));
    } else {
      record('release-fingerprint', 'public', 'PASS', `sha=${payload.sha} branch=${payload.branch} env=${payload.environment}`);
    }
  } catch (error) {
    record('release-fingerprint', 'public', 'FAIL', `fetch error: ${error.message}`);
  }
}

async function checkPublicShell(path) {
  try {
    const { status, text } = await fetchCheck(`${TARGET}${path}`);
    const looksLikeErrorPage = status >= 500 || /nginx|Bad Gateway|Service Unavailable/i.test(text);
    const hasShell = text.includes('id="root"') && /<title>[^<]+<\/title>/.test(text);
    if (status !== 200 || looksLikeErrorPage || !hasShell) {
      record(`public-shell:${path}`, 'public', 'FAIL', `status=${status} errorPage=${looksLikeErrorPage} shell=${hasShell}`);
    } else {
      record(`public-shell:${path}`, 'public', 'PASS', 'AURA SPA shell served');
    }
  } catch (error) {
    record(`public-shell:${path}`, 'public', 'FAIL', `fetch error: ${error.message}`);
  }
}

async function checkUnauthenticatedRedirect(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(`${TARGET}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    const path = new URL(page.url()).pathname;
    const bounced = path === '/login' || path === '/';
    const protectedContent = await page.evaluate(() =>
      Boolean(document.querySelector('[data-testid="operating-state-bar"]')),
    );
    if (bounced && !protectedContent) {
      record('auth-gate:unauthenticated-dashboard', 'public', 'PASS', `unauthenticated /dashboard resolved to ${path}`);
    } else {
      record('auth-gate:unauthenticated-dashboard', 'public', 'FAIL', `path=${path} protectedContent=${protectedContent}`);
    }
  } catch (error) {
    record('auth-gate:unauthenticated-dashboard', 'public', 'FAIL', `browser error: ${error.message}`);
  } finally {
    await context.close();
  }
}

async function checkAuthenticatedPlane(browser) {
  let session;
  try {
    session = await resolvePreviewSession();
  } catch (error) {
    if (error instanceof PreviewSessionUnavailableError) {
      for (const route of AUTHENTICATED_ROUTES) {
        record(`authed-route:${route}`, 'authenticated', 'BLOCKED_BY_AUTH', 'no resolvable smoke session (fail closed)');
      }
      record('truth-labels:analytics', 'authenticated', 'BLOCKED_BY_AUTH', 'no resolvable smoke session (fail closed)');
      return false;
    }
    throw error;
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await installPreviewSession(context, session, TARGET);
  const page = await context.newPage();
  try {
    for (const route of AUTHENTICATED_ROUTES) {
      await page.goto(`${TARGET}${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      const path = new URL(page.url()).pathname;
      const text = await page.evaluate(() => (document.body.innerText ?? '').trim());
      const bounced = path === '/login' || path === '/';
      if (!bounced && text.length > 200) {
        record(`authed-route:${route}`, 'authenticated', 'PASS', `rendered (${text.length} chars)`);
      } else {
        record(`authed-route:${route}`, 'authenticated', 'FAIL', `path=${path} textLength=${text.length}`);
      }
    }
    // Truth/provenance labels on the simulated analytics surface.
    await page.goto(`${TARGET}/analytics`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const analyticsText = await page.evaluate(() => document.body.innerText ?? '');
    if (/simulat|demonstration|not measured|fixture/i.test(analyticsText)) {
      record('truth-labels:analytics', 'authenticated', 'PASS', 'simulated/demo provenance language present');
    } else {
      record('truth-labels:analytics', 'authenticated', 'FAIL', 'no simulated/demo provenance language detected');
    }
  } catch (error) {
    record('authenticated-plane', 'authenticated', 'FAIL', `browser error: ${error.message}`);
  } finally {
    await context.close();
  }

  // Tenant-boundary probing needs a second tenant identity; approximating it
  // with one session would be unsafe and untruthful, so it is not run here.
  record(
    'tenant-boundary:cross-tenant-isolation',
    'authenticated',
    'NOT_RUN',
    'requires a second approved tenant identity; covered by tests/database/01_auth_rls_suite.sh instead',
  );
  return true;
}

async function main() {
  console.log(`Post-publish smoke (read-only) against ${TARGET}`);
  if (EXPECTED_SHA) console.log(`Expected SHA: ${EXPECTED_SHA}`);

  await checkReleaseFingerprint();
  await checkPublicShell('/');
  await checkPublicShell('/login');

  const browser = await chromium.launch({ headless: true });
  try {
    await checkUnauthenticatedRedirect(browser);
    if (!PUBLIC_ONLY) {
      await checkAuthenticatedPlane(browser);
    } else {
      record('authenticated-plane', 'authenticated', 'SKIPPED', '--unauthenticated-only flag set; partial run recorded');
    }
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => r.status === 'FAIL');
  const blocked = results.filter((r) => r.status === 'BLOCKED_BY_AUTH');
  const verdict = failed.length === 0 && blocked.length === 0 ? 'PASS' : 'FAIL';

  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const evidencePath = new URL(`smoke-${stamp}.json`, EVIDENCE_DIR);
  writeFileSync(
    evidencePath,
    JSON.stringify(
      {
        suite: 'aura.post-publish-smoke.v1',
        target: TARGET,
        expectedSha: EXPECTED_SHA,
        plane: PUBLIC_ONLY ? 'public-only' : 'public+authenticated',
        session: PUBLIC_ONLY ? 'not-requested' : '<session-installed>',
        verdict,
        results,
      },
      null,
      2,
    ),
  );
  console.log(`Evidence: ${evidencePath.pathname}`);
  console.log(`Verdict: ${verdict} (${failed.length} failed, ${blocked.length} blocked)`);
  process.exit(verdict === 'PASS' ? 0 : 1);
}

main().catch((error) => {
  console.error(`Suite error: ${error.message}`);
  process.exit(1);
});

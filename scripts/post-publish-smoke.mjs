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
 *     4. /dashboard, /analytics, /simulation and /evidence/overview commit
 *        route-specific meaningful content for the smoke identity within the
 *        production loading budget
 *     5. Truth/provenance labels present on simulated surfaces
 *
 * Fail-closed contract:
 *   - Any failed check exits non-zero.
 *   - If no session is resolvable, authenticated checks are recorded as
 *     BLOCKED_BY_AUTH and the suite exits non-zero. Passing a partial run is
 *     not possible without the explicit --unauthenticated-only flag, which
 *     records plane: 'public-only' in the evidence.
 *   - The suite performs GET navigations and activates read-only route links
 *     only. It never submits a form, writes to the database or calls a
 *     mutation endpoint.
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
import { writeFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';
import { resolvePreviewSession, installPreviewSession, PreviewSessionUnavailableError } from './preview-session.mjs';

const TARGET = (process.env.AURA_SMOKE_TARGET ?? 'https://auradc.m2mtechconnect.com').replace(/\/$/, '');
const EXPECTED_SHA = process.env.AURA_EXPECTED_SHA?.trim() || null;
const PUBLIC_ONLY = process.argv.includes('--unauthenticated-only');
const EVIDENCE_DIR = new URL('../docs/evidence/post-publish-smoke/', import.meta.url);
const AUTHENTICATED_ROUTES = [
  { id: 'dashboard', path: '/dashboard' },
  { id: 'analytics', path: '/analytics' },
  { id: 'simulation', path: '/simulation?step=inspect' },
  { id: 'evidence', path: '/evidence/overview' },
];
const REGISTRY_FILE = fileURLToPath(new URL('../src/supervisor/postPublishSmokeRegistry.ts', import.meta.url));
/** How the run was started. Read-only in every mode. */
const TRIGGER = ['automatic-on-publish', 'scheduled', 'manual'].includes(process.env.AURA_SMOKE_TRIGGER ?? '')
  ? process.env.AURA_SMOKE_TRIGGER
  : 'manual';
const parseBoundedMs = (value, fallback, max) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.min(parsed, max) : fallback;
};
/** Publish-triggered runs wait for the immutable fingerprint, not a timer guess. */
const RELEASE_WAIT_MS = parseBoundedMs(
  process.env.AURA_RELEASE_WAIT_MS,
  EXPECTED_SHA ? 10 * 60_000 : 0,
  15 * 60_000,
);
const RELEASE_POLL_MS = parseBoundedMs(process.env.AURA_RELEASE_POLL_MS, 5_000, 30_000);
/** Meaningful production content must commit before the bounded loader expires. */
const MEANINGFUL_ROUTE_BUDGET_MS = parseBoundedMs(
  process.env.AURA_MEANINGFUL_ROUTE_BUDGET_MS,
  12_000,
  30_000,
);
/** Publish-driven mode: exit cleanly when the live SHA has already been qualified. */
const ONLY_IF_NEW_PUBLISH = process.argv.includes('--only-if-new-publish');
/** SHA served by the live target, resolved during the fingerprint check. */
let observedSha = null;

/** Reads recorded evidence artifacts, newest first. Never invents a result. */
function readRecordedReports() {
  const dir = fileURLToPath(EVIDENCE_DIR);
  let files = [];
  try {
    files = readdirSync(dir).filter((f) => f.startsWith('smoke-') && f.endsWith('.json'));
  } catch {
    return [];
  }
  return files
    .map((file) => {
      try {
        return JSON.parse(readFileSync(path.join(dir, file), 'utf8'));
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => String(b.completedAt ?? '').localeCompare(String(a.completedAt ?? '')));
}

/** Regenerates the supervisor registry from the stored artifacts (latest 10). */
function regenerateRegistry() {
  const reports = readRecordedReports().slice(0, 10);
  const header = readFileSync(REGISTRY_FILE, 'utf8').split('export const')[0];
  writeFileSync(
    REGISTRY_FILE,
    `${header}export const POST_PUBLISH_SMOKE_REGISTRY: readonly unknown[] = ${JSON.stringify(reports, null, 2)};\n`,
  );
  return reports.length;
}

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function checkReleaseFingerprint() {
  if (EXPECTED_SHA && !/^[0-9a-f]{40}$/.test(EXPECTED_SHA)) {
    record('release-fingerprint', 'public', 'FAIL', `expected SHA is not a 40-character lowercase Git SHA: ${EXPECTED_SHA}`);
    return;
  }

  const deadline = Date.now() + RELEASE_WAIT_MS;
  let attempt = 0;
  for (;;) {
    attempt += 1;
    let retryDetail = null;
    try {
      const { status, text } = await fetchCheck(`${TARGET}/release.json`);
      if (status !== 200) {
        retryDetail = `/release.json returned HTTP ${status}`;
      } else {
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
        if (typeof payload.sha === 'string' && /^[0-9a-f]{40}$/.test(payload.sha)) observedSha = payload.sha;
        if (problems.length > 0) {
          record('release-fingerprint', 'public', 'FAIL', problems.join('; '));
          return;
        }
        if (EXPECTED_SHA && payload.sha !== EXPECTED_SHA) {
          retryDetail = `sha mismatch: expected ${EXPECTED_SHA}, got ${payload.sha}`;
        } else {
          record(
            'release-fingerprint',
            'public',
            'PASS',
            `sha=${payload.sha} branch=${payload.branch} env=${payload.environment} attempts=${attempt}`,
          );
          return;
        }
      }
    } catch (error) {
      retryDetail = `fetch error: ${error.message}`;
    }

    if (EXPECTED_SHA && Date.now() < deadline) {
      const remainingSeconds = Math.ceil((deadline - Date.now()) / 1000);
      console.log(`[WAIT] release-fingerprint — ${retryDetail}; retrying in ${RELEASE_POLL_MS}ms (${remainingSeconds}s remain)`);
      await sleep(RELEASE_POLL_MS);
      continue;
    }

    record('release-fingerprint', 'public', 'FAIL', retryDetail ?? 'release fingerprint did not resolve');
    return;
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

function meaningfulLocator(page, routeId) {
  switch (routeId) {
    case 'dashboard':
      return page.getByTestId('facility-highlights').getByRole('heading', { level: 1 });
    case 'analytics':
      return page.getByRole('heading', { name: 'Operations & Telemetry', level: 1 });
    case 'simulation':
      return page.getByTestId('aura-workspace');
    case 'evidence':
      return page.getByTestId('dsx-workspace-title').or(
        page.getByRole('heading', { name: 'Evidence unavailable for this facility', level: 1 }),
      );
    case 'builder':
      return page.getByRole('heading', { name: /Create your first facility|Start a facility build/i, level: 1 });
    default:
      throw new Error(`No meaningful-content locator is registered for ${routeId}`);
  }
}

async function openMeaningfulRoute(page, route, { recordResult = true } = {}) {
  const startedAt = Date.now();
  try {
    await page.goto(`${TARGET}${route.path}`, { waitUntil: 'domcontentloaded' });
    await meaningfulLocator(page, route.id).waitFor({
      state: 'visible',
      timeout: MEANINGFUL_ROUTE_BUDGET_MS,
    });
    const meaningfulMs = Date.now() - startedAt;
    const actualPath = new URL(page.url()).pathname;
    const expectedPath = route.path.split('?')[0];
    const textLength = await page.evaluate(() => (document.body.innerText ?? '').trim().length);
    const loadingVisible = await page.getByText('Loading your workspace', { exact: true }).count();
    if (actualPath !== expectedPath || textLength <= 200 || loadingVisible > 0) {
      if (recordResult) {
        record(
          `authed-route:${route.path}`,
          'authenticated',
          'FAIL',
          `path=${actualPath} textLength=${textLength} loadingVisible=${loadingVisible} meaningfulMs=${meaningfulMs}`,
        );
      }
      return false;
    }
    if (recordResult) {
      record(
        `authed-route:${route.path}`,
        'authenticated',
        'PASS',
        `meaningful content in ${meaningfulMs}ms (${textLength} chars)`,
      );
    }
    return true;
  } catch (error) {
    if (recordResult) {
      record(
        `authed-route:${route.path}`,
        'authenticated',
        'FAIL',
        `meaningful content did not commit within ${MEANINGFUL_ROUTE_BUDGET_MS}ms: ${error.message}`,
      );
    }
    return false;
  }
}

async function checkAuthenticatedPlane(browser) {
  let session;
  try {
    session = await resolvePreviewSession();
  } catch (error) {
    if (error instanceof PreviewSessionUnavailableError) {
      for (const route of AUTHENTICATED_ROUTES) {
        record(`authed-route:${route.path}`, 'authenticated', 'BLOCKED_BY_AUTH', 'no resolvable smoke session (fail closed)');
      }
      record('truth-labels:analytics', 'authenticated', 'BLOCKED_BY_AUTH', 'no resolvable smoke session (fail closed)');
      record('truth-labels:evidence', 'authenticated', 'BLOCKED_BY_AUTH', 'no resolvable smoke session (fail closed)');
      record('journey:builder-saved-draft', 'authenticated', 'BLOCKED_BY_AUTH', 'no resolvable smoke session (fail closed)');
      record('journey:builder-to-operations', 'authenticated', 'BLOCKED_BY_AUTH', 'no resolvable smoke session (fail closed)');
      return false;
    }
    throw error;
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await installPreviewSession(context, session, TARGET);
  const page = await context.newPage();
  try {
    for (const route of AUTHENTICATED_ROUTES) {
      await openMeaningfulRoute(page, route);
    }
    // Truth/provenance labels on the simulated analytics surface.
    await openMeaningfulRoute(page, { id: 'analytics', path: '/analytics' }, { recordResult: false });
    const analyticsText = await page.evaluate(() => document.body.innerText ?? '');
    if (/simulat|demonstration|not measured|fixture/i.test(analyticsText)) {
      record('truth-labels:analytics', 'authenticated', 'PASS', 'simulated/demo provenance language present');
    } else {
      record('truth-labels:analytics', 'authenticated', 'FAIL', 'no simulated/demo provenance language detected');
    }

    // Evidence truth language must agree with the current data mode. Run the
    // deterministic demonstration without a tenant-facility id so a stored
    // facility is never silently substituted onto the fixture.
    await page.goto(`${TARGET}/evidence/operations/thermal`, { waitUntil: 'domcontentloaded' });
    await page.getByTestId('dsx-workspace-title').or(
      page.getByRole('heading', { name: 'Evidence unavailable for this facility', level: 1 }),
    ).waitFor({
      state: 'visible',
      timeout: MEANINGFUL_ROUTE_BUDGET_MS,
    });
    const evidenceText = await page.evaluate(() => document.body.innerText ?? '');
    if (
      /simulat|replayed|live-source|unavailable/i.test(evidenceText) &&
      !/Maximum measured rack inlet|from the measured value only|Ranked by measured inlet temperature/i.test(evidenceText)
    ) {
      record('truth-labels:evidence', 'authenticated', 'PASS', 'Evidence value language agrees with its visible data mode');
    } else {
      record('truth-labels:evidence', 'authenticated', 'FAIL', 'Evidence contains missing or contradictory data-mode language');
    }

    // High-value Builder journeys are read-only. The smoke identity must own
    // a saved draft fixture so the same-path `?draft=` transition is exercised
    // without creating or changing production data.
    await openMeaningfulRoute(page, { id: 'builder', path: '/builder' }, { recordResult: false });
    const savedDraft = page.locator('section[aria-labelledby="builder-existing-heading"] a[href^="/builder?draft="]').first();
    if (await savedDraft.count()) {
      try {
        await savedDraft.click();
        await page.waitForSelector('[data-testid="builder-layout"]', { state: 'visible', timeout: 15000 });
        const draftLoaded = new URL(page.url()).pathname === '/builder' && new URL(page.url()).searchParams.has('draft');
        record(
          'journey:builder-saved-draft',
          'authenticated',
          draftLoaded ? 'PASS' : 'FAIL',
          draftLoaded ? 'saved draft committed without a document reload' : 'saved draft did not become the visible Builder state',
        );
      } catch (error) {
        record('journey:builder-saved-draft', 'authenticated', 'FAIL', `read-only journey error: ${error.message}`);
      }
    } else {
      record('journey:builder-saved-draft', 'authenticated', 'FAIL', 'smoke identity has no saved Builder draft fixture');
    }

    try {
      const operationsLink = page.locator('a[href="/analytics"]:visible').first();
      if (!(await operationsLink.count())) throw new Error('visible Operations route link not found');
      await operationsLink.click();
      await page.waitForURL((url) => url.pathname === '/analytics', { timeout: 10000 });
      await page.getByRole('heading', { name: 'Operations & Telemetry', exact: true }).waitFor({ state: 'visible', timeout: 15000 });
      const staleBuilder = await page.locator('[data-testid="builder-layout"]').count();
      record(
        'journey:builder-to-operations',
        'authenticated',
        staleBuilder === 0 ? 'PASS' : 'FAIL',
        staleBuilder === 0 ? 'Operations URL and visible workspace committed together' : 'URL changed while stale Builder content remained visible',
      );
    } catch (error) {
      record('journey:builder-to-operations', 'authenticated', 'FAIL', `read-only journey error: ${error.message}`);
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

  // Publish-driven automation: a target whose live SHA already carries a
  // passing recorded run is not re-qualified. Nothing is claimed either way.
  if (ONLY_IF_NEW_PUBLISH) {
    const already = readRecordedReports().find(
      (r) => r.verdict === 'PASS' && r.target === TARGET && (r.observedSha ?? r.expectedSha) === observedSha,
    );
    if (observedSha && already) {
      console.log(`No new publish detected: ${observedSha} already qualified by ${already.artifactRef}`);
      regenerateRegistry();
      process.exit(0);
    }
  }

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
        observedSha,
        expectedSha: EXPECTED_SHA,
        completedAt: new Date().toISOString(),
        trigger: TRIGGER,
        artifactRef: `docs/evidence/post-publish-smoke/smoke-${stamp}.json`,
        plane: PUBLIC_ONLY ? 'public-only' : 'public+authenticated',
        session: PUBLIC_ONLY ? 'not-requested' : '<session-installed>',
        verdict,
        checks: results,
      },
      null,
      2,
    ),
  );
  const registryCount = regenerateRegistry();
  console.log(`Evidence: ${evidencePath.pathname}`);
  console.log(`Supervisor registry entries: ${registryCount}`);
  console.log(`Verdict: ${verdict} (${failed.length} failed, ${blocked.length} blocked)`);
  process.exit(verdict === 'PASS' ? 0 : 1);
}

main().catch((error) => {
  console.error(`Suite error: ${error.message}`);
  process.exit(1);
});

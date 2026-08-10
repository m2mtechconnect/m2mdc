/**
 * S5A-12 / S5A-13 / S5A-14 authenticated-route runner.
 *
 * Boots the preview with a real signed-in session (see preview-session.mjs),
 * then executes the three previously BLOCKED_BY_AUTH gates:
 *
 *   S5A-13  deep-link + hard-refresh stability for every authenticated route
 *   S5A-12  visual QA at desktop / tablet / mobile (overflow, blank, console)
 *   S5A-14  OperatingStateBar truth surface present on every authenticated route
 *
 * Writes machine-readable evidence to docs/evidence/full-stack-audit/.
 * Never records tokens, emails or cookies in the output.
 */
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { resolvePreviewSession, installPreviewSession, PreviewSessionUnavailableError } from './preview-session.mjs';

const ORIGIN = process.env.AURA_TARGET_ORIGIN ?? 'http://localhost:8080';
const EVIDENCE_DIR = new URL('../docs/evidence/full-stack-audit/', import.meta.url);
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'mobile', width: 390, height: 844 },
];
const TOUR_KEY = 'm2m_tour_state_v1';
const TOUR_IDS = ['studioIntro', 'overview', 'simulation', 'blueprint', 'role_executive', 'role_manager', 'role_engineer', 'role_security_admin'];

function authenticatedRoutes() {
  const matrix = JSON.parse(readFileSync(new URL('79-s5a-route-matrix.json', EVIDENCE_DIR), 'utf8'));
  return matrix.authenticated.map((r) => r.route);
}

async function seedContext(context, session) {
  await installPreviewSession(context, session, ORIGIN);
  await context.addInitScript(
    ([key, value]) => {
      try { window.localStorage.setItem(key, value); } catch { /* noop */ }
    },
    [TOUR_KEY, JSON.stringify(Object.fromEntries(TOUR_IDS.map((id) => [id, { seen: true, completedAt: '2026-01-01T00:00:00.000Z' }])))],
  );
}

async function probe(page, route) {
  const consoleErrors = [];
  const onConsole = (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 300)); };
  page.on('console', onConsole);
  await page.goto(`${ORIGIN}${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const afterDeeplink = new URL(page.url()).pathname;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const afterRefresh = new URL(page.url()).pathname;
  const metrics = await page.evaluate(() => ({
    text: (document.body.innerText ?? '').trim().length,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    operatingStateBar: Boolean(document.querySelector('[data-testid="operating-state-bar"]')),
    simulatedLabel: /simulated/i.test(document.body.innerText ?? ''),
  }));
  page.off('console', onConsole);
  return {
    route,
    after_deeplink: afterDeeplink,
    after_refresh: afterRefresh,
    redirected_to_public: afterDeeplink === '/' && route !== '/',
    blank: metrics.text < 40,
    horizontal_overflow_px: Math.max(0, metrics.scrollWidth - metrics.clientWidth),
    operating_state_bar: metrics.operatingStateBar,
    simulated_label_visible: metrics.simulatedLabel,
    console_errors: consoleErrors,
  };
}

async function main() {
  let session;
  try {
    session = await resolvePreviewSession();
  } catch (err) {
    if (err instanceof PreviewSessionUnavailableError) {
      console.error(`BLOCKED_BY_AUTH\n${err.message}`);
      process.exit(78);
    }
    throw err;
  }
  console.log(`session source: ${session.source} (value redacted)`);

  const routes = authenticatedRoutes();
  const browser = await chromium.launch();
  const results = {};
  try {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      await seedContext(context, session);
      const page = await context.newPage();
      const rows = [];
      for (const route of routes) {
        try {
          rows.push(await probe(page, route));
        } catch (err) {
          rows.push({ route, error: String(err).slice(0, 300) });
        }
      }
      results[vp.name] = rows;
      await context.close();
      console.log(`${vp.name}: ${rows.length} routes probed`);
    }
  } finally {
    await browser.close();
  }

  const flat = Object.values(results).flat();
  const summary = {
    generated_at: new Date().toISOString(),
    origin: ORIGIN,
    session_source: session.source,
    route_count: routes.length,
    viewports: VIEWPORTS.map((v) => v.name),
    gates: {
      'S5A-13': flat.every((r) => !r.error && !r.redirected_to_public && !r.blank && r.after_deeplink === r.after_refresh) ? 'PASS' : 'FAIL',
      'S5A-12': flat.every((r) => !r.error && !r.blank && (r.horizontal_overflow_px ?? 0) === 0 && (r.console_errors ?? []).length === 0) ? 'PASS' : 'FAIL',
      'S5A-14': flat.every((r) => r.operating_state_bar && r.simulated_label_visible) ? 'PASS' : 'FAIL',
    },
    defects: flat.filter((r) => r.error || r.redirected_to_public || r.blank || (r.horizontal_overflow_px ?? 0) > 0 || (r.console_errors ?? []).length > 0 || !r.operating_state_bar),
  };

  mkdirSync(EVIDENCE_DIR, { recursive: true });
  writeFileSync(new URL('84-s5a-authenticated-route-matrix.json', EVIDENCE_DIR), JSON.stringify(results, null, 2));
  writeFileSync(new URL('85-s5a-authenticated-gate-summary.json', EVIDENCE_DIR), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary.gates, null, 2));
  process.exit(Object.values(summary.gates).includes('FAIL') ? 1 : 0);
}

main().catch((err) => { console.error(err); process.exit(1); });
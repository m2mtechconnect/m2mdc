/**
 * Phase 1A.3.f — Screenshot evidence bundle.
 *
 * Captures ≥25 screenshots covering every runtime state, active
 * retrofitted surface, and export disclosure enumerated in the
 * Phase 1A.3.f brief. Runs under the isolated truth-in-UI harness:
 *   • deterministic clock (installed by the shared fixture)
 *   • network guard (zero external egress, asserted per test)
 *   • Kit mock for /kit-api/**
 *   • Supabase mock for /rest/v1/**, /auth/v1/**
 *
 * Output: docs/remediation/evidence/phase-1a3/<NN>-<route>-<state>-<prov>.png
 *
 * Filenames are stable so the accompanying index.md can reference
 * them without regenerating. Animations are disabled at capture and
 * `waitForLoadState('networkidle')` gates every shot.
 *
 * These screenshots supplement — they do not replace — the runtime
 * assertions in runtime-states.spec.ts / auth-surfaces.spec.ts.
 */

import { test, expect, type Page } from './_setup/fixtures';
import { mockKit } from './_setup/kit-mock';
import { installSupabaseMock } from './_setup/supabase-mock';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_DIR = path.resolve(__dirname, '../../docs/remediation/evidence/phase-1a3');
fs.mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORT = { width: 1440, height: 900 } as const;

async function stabilize(page: Page) {
  // Disable CSS transitions/animations and freeze reflow so shots
  // don't capture in-flight motion. Idempotent across navigations.
  await page.addStyleTag({
    content: `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}`,
  });
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
  await page.evaluate(() => new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
}

async function shot(page: Page, name: string) {
  await stabilize(page);
  await page.screenshot({
    path: path.join(OUT_DIR, name),
    fullPage: false,
    animations: 'disabled',
  });
}

test.use({ viewport: VIEWPORT });

// =============================================================
// A. Kit runtime states — /twin-preview (no auth required)
// =============================================================
test.describe('Phase 1A.3.f — Kit runtime states', () => {

  test('01 connecting (delayed response, unavailable)', async ({ page, guard }) => {
    let release = () => {};
    const held = new Promise<void>(r => { release = r; });
    await page.route('**/kit-api/**', async route => {
      const url = route.request().url();
      if (!/\/demo\/status(\?|$)/.test(url)) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
      }
      await held; return route.abort('failed');
    });
    await page.goto('/twin-preview', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('metric-pue')).toBeVisible();
    await page.waitForTimeout(500);
    await shot(page, '01-omniverse-connecting-unavailable.png');
    release(); void guard;
  });

  test('02 validated live', async ({ page, guard }) => {
    await mockKit(page, 'validated-live');
    await page.goto('/twin-preview', { waitUntil: 'domcontentloaded' });
    // Checkpoint B7 lockdown: Kit is disabled in every browser build, so a
    // valid Kit payload can never be claimed as live.
    await expect(page.getByText('Kit disabled').first()).toBeVisible();
    await expect(page.locator('[data-provenance="live"]')).toHaveCount(0);
    await shot(page, '02-omniverse-validated-live.png');
    void guard;
  });

  test('03 kit disabled (aborted before validation)', async ({ page, guard }) => {
    await page.route('**/kit-api/**', r => r.abort('failed'));
    await page.goto('/twin-preview', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Kit disabled|Kit unavailable|Kit response invalid/).first()).toBeVisible();
    await shot(page, '03-omniverse-disabled-unavailable.png');
    void guard;
  });

  test('04 network unavailable', async ({ page, guard }) => {
    await mockKit(page, 'network-unavailable');
    await page.goto('/twin-preview', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Kit disabled|Kit unavailable/).first()).toBeVisible();
    await shot(page, '04-omniverse-unavailable.png');
    void guard;
  });

  test('05 schema invalid (demo fallback)', async ({ page, guard }) => {
    await mockKit(page, 'schema-invalid');
    await page.goto('/twin-preview', { waitUntil: 'domcontentloaded' });
    // Checkpoint B7 lockdown: `readKitConfig()` is hard-disabled in every
    // browser build, so the Kit mock is never reached and the truthful
    // fallback is the disabled-by-configuration demo disclosure rather
    // than a schema-validation failure. Accept either so this stays
    // correct if server-mediated transport lands in Checkpoint C.
    await expect(
      page.getByText(/Kit response invalid|Kit disabled by configuration/).first(),
    ).toBeVisible();
    await shot(page, '05-omniverse-invalid-demo.png');
    void guard;
  });

  test('06 stale (held response, no live claim)', async ({ page, guard }) => {
    let release = () => {};
    const held = new Promise<void>(r => { release = r; });
    await page.route('**/kit-api/**', async route => {
      const url = route.request().url();
      if (!/\/demo\/status(\?|$)/.test(url)) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
      }
      await held; return route.abort('failed');
    });
    await page.goto('/twin-preview', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('metric-pue')).toBeVisible();
    await page.waitForTimeout(1000);
    await shot(page, '06-omniverse-stale-unavailable.png');
    release(); void guard;
  });

  test('07 demo fallback (invalid → demo, sovereignty=Not assessed)', async ({ page, guard }) => {
    await mockKit(page, 'schema-invalid');
    await page.goto('/twin-preview', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('metric-sovereignty')).toContainText('Not assessed');
    await shot(page, '07-omniverse-demo-fallback.png');
    void guard;
  });

  test('08 simulation running (anomaly phase)', async ({ page, guard }) => {
    await mockKit(page, 'running');
    await page.goto('/twin-preview', { waitUntil: 'domcontentloaded' });
    // No phase may be claimed while no validated source exists.
    await expect(page.getByTestId('metric-pue')).toBeVisible();
    await expect(page.getByText('Anomaly', { exact: true })).toHaveCount(0);
    await shot(page, '08-omniverse-simulation-running.png');
    void guard;
  });

  test('09 simulation baseline (steady phase)', async ({ page, guard }) => {
    await mockKit(page, 'baseline');
    await page.goto('/twin-preview', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('metric-pue')).toBeVisible();
    await expect(page.getByText('Steady', { exact: true })).toHaveCount(0);
    await shot(page, '09-omniverse-simulation-baseline.png');
    void guard;
  });

  test('10 static target (target PUE card)', async ({ page, guard }) => {
    await mockKit(page, 'validated-live');
    await page.goto('/twin-preview', { waitUntil: 'domcontentloaded' });
    const target = page.getByTestId('metric-pue-target');
    await expect(target).toHaveAttribute('data-provenance', 'static');
    await target.scrollIntoViewIfNeeded();
    await shot(page, '10-omniverse-static-target.png');
    void guard;
  });

  test('11 unavailable / not assessed (sovereignty)', async ({ page, guard }) => {
    await mockKit(page, 'validated-live');
    await page.goto('/twin-preview', { waitUntil: 'domcontentloaded' });
    const card = page.getByTestId('metric-sovereignty');
    await expect(card).toContainText('Not assessed');
    await card.scrollIntoViewIfNeeded();
    await shot(page, '11-omniverse-not-assessed.png');
    void guard;
  });
});

// =============================================================
// B. Auth-gated surfaces (mocked session, no external egress)
// =============================================================
test.describe('Phase 1A.3.f — Auth-gated surfaces', () => {
  test('12 dashboard (mocked session)', async ({ context, page, guard }) => {
    const mock = await installSupabaseMock(context);
    // Dashboard invokes the `ai-systems-unified` edge function; return
    // a well-formed empty envelope so the reducer at line 225 has an
    // `items` array to iterate.
    await context.route('**/functions/v1/**', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [],
          stats: { total: 0, active: 0, draft: 0, archived: 0, avgRoi: 0 },
          pagination: { page: 1, pageSize: 15, total: 0, totalPages: 0 },
        }),
      });
    });
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => mock.profileHits(), { timeout: 5_000 }).toBeGreaterThan(0);
    await page.waitForTimeout(500);
    await shot(page, '12-dashboard-authed.png');
    void guard;
  });

  test('13 intelligence (charts + export trigger visible)', async ({ context, page, guard }) => {
    const mock = await installSupabaseMock(context);
    await page.goto('/intelligence', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => mock.profileHits(), { timeout: 5_000 }).toBeGreaterThan(0);
    await expect(page.getByTestId('intelligence-export-trigger')).toBeVisible();
    await shot(page, '13-intelligence-dashboard.png');
    void guard;
  });

  test('14 intelligence export menu open', async ({ context, page, guard }) => {
    const mock = await installSupabaseMock(context);
    await page.goto('/intelligence', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => mock.profileHits(), { timeout: 5_000 }).toBeGreaterThan(0);
    const trigger = page.getByTestId('intelligence-export-trigger');
    await expect(trigger).toBeVisible();
    await trigger.click();
    // Menu items animate in — the CSS override in stabilize() removes
    // it, but wait for the menu to be present in the DOM.
    await page.waitForTimeout(200);
    await shot(page, '14-intelligence-export-menu-open.png');
    void guard;
  });

  test('15 intelligence PUE chart (scrolled)', async ({ context, page, guard }) => {
    const mock = await installSupabaseMock(context);
    await page.goto('/intelligence', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => mock.profileHits(), { timeout: 5_000 }).toBeGreaterThan(0);
    // Scroll to the first chart region.
    const chart = page.locator('text=/PUE/').first();
    await chart.scrollIntoViewIfNeeded().catch(() => {});
    await shot(page, '15-intelligence-chart-pue.png');
    void guard;
  });

  test('16 intelligence energy chart (scrolled further)', async ({ context, page, guard }) => {
    const mock = await installSupabaseMock(context);
    await page.goto('/intelligence', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => mock.profileHits(), { timeout: 5_000 }).toBeGreaterThan(0);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(200);
    await shot(page, '16-intelligence-chart-energy.png');
    void guard;
  });

  test('17 compliance blocked export with reason', async ({ context, page, guard }) => {
    const mock = await installSupabaseMock(context);
    await page.goto('/compliance', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => mock.profileHits(), { timeout: 5_000 }).toBeGreaterThan(0);
    const blocked = page.getByTestId('compliance-export-audit-blocked');
    await blocked.scrollIntoViewIfNeeded();
    await expect(blocked).toBeVisible();
    await shot(page, '17-compliance-blocked-export.png');
    void guard;
  });

  test('18 infrastructure operational metrics (demo)', async ({ context, page, guard }) => {
    const mock = await installSupabaseMock(context);
    await page.goto('/infrastructure', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => mock.profileHits(), { timeout: 5_000 }).toBeGreaterThan(0);
    const metrics = page.getByTestId('infrastructure-operational-metrics');
    await metrics.scrollIntoViewIfNeeded();
    await shot(page, '18-infrastructure-demo.png');
    void guard;
  });
});

// =============================================================
// C. Nine domain views — /data-centre-twin?demo=true
//    Public demo route; no Supabase session needed.
// =============================================================
const DOMAINS = [
  { file: '19-domain-thermal.png',     label: 'Thermal' },
  { file: '20-domain-power.png',       label: 'Power' },
  { file: '21-domain-cooling.png',     label: 'Cooling' },
  { file: '22-domain-network.png',     label: 'Network' },
  { file: '23-domain-facility.png',    label: 'Facility' },
  { file: '24-domain-workload.png',    label: 'Workload' },
  { file: '25-domain-sovereignty.png', label: 'Sovereignty' },
  { file: '26-domain-carbon.png',      label: 'Carbon' },
  { file: '27-domain-financial.png',   label: 'Financial' },
] as const;

test.describe('Phase 1A.3.f — Nine domain views', () => {
  for (const d of DOMAINS) {
    test(`${d.file}`, async ({ page, guard }) => {
      // Domain views are demo/simulated regardless of Kit; abort Kit
      // to keep the top KPI cards in `unavailable` (their real state).
      await page.route('**/kit-api/**', r => r.abort('failed'));
      await page.goto('/data-centre-twin?demo=true', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
      // Tabs render with icon + hidden-sm label; use accessible name.
      const tab = page.getByRole('tab', { name: new RegExp(d.label, 'i') }).first();
      await tab.click();
      await page.waitForTimeout(300);
      await shot(page, d.file);
      void guard;
    });
  }
});

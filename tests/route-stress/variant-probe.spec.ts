/** TEMPORARY diagnostic — removed after the A/B matrix is recorded. */
import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { installSupabaseMock } from '../truth-in-ui/_setup/supabase-mock';

const OUT = 'docs/remediation/hybrid-nvidia-runtime/evidence/reference-facility-ui/suspense-retry';
const BUDGET = 15_000;
const N = Number(process.env.PROBE_N ?? 20);
const URLS = (process.env.PROBE_URLS ?? '/data-centre-twin?geometry=aura,/dashboard').split(',');

async function seed(context: BrowserContext) {
  const mock = await installSupabaseMock(context);
  const twinId = '00000000-0000-4000-8000-000000000042';
  const twin = {
    id: twinId, location_id: null, name: 'Stress Twin', city: 'Montreal',
    region_code: 'ca-central-1', tier: '4', capacity_kw: 5000, industry: 'data_centre',
    sovereignty_level: 'sovereign', pue_target: 1.2, renewable_target_pct: 80,
    carbon_intensity: 25, metadata: {}, blueprint_id: null,
    created_by_user: mock.session.userId,
    created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
  };
  await context.route('**/rest/v1/data_centre_twins*', async (route) => {
    const single = (route.request().headers()['accept'] ?? '').includes('pgrst.object');
    await route.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(single ? twin : [twin]) });
  });
  await context.addInitScript((id) => localStorage.setItem('dc_active_twin_id', id), twinId);
}

async function settle(page: Page) {
  const started = Date.now();
  const fallback = page.getByText('Loading workspace...', { exact: true });
  const layout = page.getByTestId(process.env.PROBE_TESTID ?? 'twin-visualization-layout');
  try {
    await expect
      .poll(async () => await layout.count(), { timeout: BUDGET, intervals: [200] })
      .toBeGreaterThan(0);
  } catch {
    return {
      ms: Date.now() - started,
      result: 'fallback' as const,
      fallbackVisible: (await fallback.count()) > 0,
    };
  }
  return { ms: Date.now() - started, result: 'committed' as const };
}

test('variant probe', async ({ browser }) => {
  test.setTimeout(0);
  const rows: Array<Record<string, unknown>> = [];
  const context = await browser.newContext();
  await seed(context);
  const page = await context.newPage();
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  for (let i = 0; i < N; i++) {
    const url = URLS[i % URLS.length];
    const nav = i % 5 === 4 ? 'reload' : i % 5 === 3 ? 'back' : 'direct';
    if (nav === 'reload') await page.reload({ waitUntil: 'domcontentloaded' });
    else if (nav === 'back') {
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await page.goForward({ waitUntil: 'domcontentloaded' });
    } else await page.goto(url, { waitUntil: 'domcontentloaded' });
    rows.push({ i, url, nav, ...(await settle(page)) });
  }
  await context.close();
  mkdirSync(OUT, { recursive: true });
  const tag = process.env.PROBE_TAG ?? 'probe';
  writeFileSync(`${OUT}/variant-${tag}.json`, JSON.stringify({ errs, rows }, null, 2));
  console.log('PROBE', tag, JSON.stringify(rows.filter((r) => r.result !== 'committed')));
  console.log('TOTALFAIL', rows.filter((r) => r.result !== 'committed').length, '/', rows.length);
});

/**
 * /data-centre-twin route-commit stress reproducer.
 *
 * Measures how often the route fails to commit (the Suspense fallback stays
 * visible) across cold and warm navigations. It asserts a terminal state, it
 * never sleeps for a fixed budget.
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { installSupabaseMock } from '../truth-in-ui/_setup/supabase-mock';

const OUT = 'docs/remediation/hybrid-nvidia-runtime/evidence/reference-facility-ui/suspense-retry';
const COLD = Number(process.env.AURA_STRESS_COLD ?? 30);
const WARM = Number(process.env.AURA_STRESS_WARM ?? 50);
const BUDGET = Number(process.env.AURA_STRESS_BUDGET ?? 25_000);

type Row = {
  id: string;
  mode: 'cold' | 'warm';
  url: string;
  nav: 'direct' | 'reload' | 'back' | 'forward';
  ms: number;
  result: 'committed' | 'fallback' | 'error';
  fallbackText?: string;
};

async function seedTwin(context: BrowserContext) {
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
    await route.fulfill({
      status: 200, contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(single ? twin : [twin]),
    });
  });
  await context.addInitScript((id) => localStorage.setItem('dc_active_twin_id', id), twinId);
}

async function settle(page: Page): Promise<Omit<Row, 'id' | 'mode' | 'url' | 'nav'>> {
  const started = Date.now();
  const layout = page.getByTestId('twin-visualization-layout');
  const fallback = page.getByText('Loading workspace...', { exact: true });
  const recovery = page.getByTestId('route-load-recovery');
  try {
    await expect
      .poll(async () => (await layout.count()) + (await recovery.count()), {
        timeout: BUDGET, intervals: [250],
      })
      .toBeGreaterThan(0);
  } catch {
    return {
      ms: Date.now() - started,
      result: 'fallback',
      fallbackText: (await fallback.count()) ? 'route suspense fallback visible' : 'unknown stall',
    };
  }
  if (await recovery.count()) return { ms: Date.now() - started, result: 'error' };
  return { ms: Date.now() - started, result: 'committed' };
}

test('route-commit stress', async ({ browser }) => {
  test.setTimeout(0);
  const rows: Row[] = [];
  const urls = (process.env.AURA_STRESS_URLS ?? '/data-centre-twin?geometry=aura,/data-centre-twin?geometry=nvidia-reference').split(',');

  for (let i = 0; i < COLD; i++) {
    const context = await browser.newContext();
    await seedTwin(context);
    const page = await context.newPage();
    const url = urls[i % urls.length];
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    rows.push({ id: `cold-${i}`, mode: 'cold', url, nav: 'direct', ...(await settle(page)) });
    await context.close();
  }

  const context = await browser.newContext();
  await seedTwin(context);
  const page = await context.newPage();
  for (let i = 0; i < WARM; i++) {
    const url = urls[i % urls.length];
    const nav: Row['nav'] = i % 5 === 4 ? 'reload' : i % 5 === 3 ? 'back' : 'direct';
    if (nav === 'reload') await page.reload({ waitUntil: 'domcontentloaded' });
    else if (nav === 'back') { await page.goBack({ waitUntil: 'domcontentloaded' }); await page.goForward({ waitUntil: 'domcontentloaded' }); }
    else await page.goto(url, { waitUntil: 'domcontentloaded' });
    rows.push({ id: `warm-${i}`, mode: 'warm', url, nav, ...(await settle(page)) });
  }
  await context.close();

  mkdirSync(OUT, { recursive: true });
  const failures = rows.filter((r) => r.result !== 'committed');
  const committed = rows.filter((r) => r.result === 'committed').map((r) => r.ms).sort((a, b) => a - b);
  const summary = {
    cold: COLD, warm: WARM, total: rows.length,
    failures: failures.length,
    p50: committed[Math.floor(committed.length * 0.5)] ?? null,
    p95: committed[Math.floor(committed.length * 0.95)] ?? null,
    max: committed[committed.length - 1] ?? null,
  };
  writeFileSync(`${OUT}/stress-${process.env.AURA_STRESS_TAG ?? 'run'}.json`,
    JSON.stringify({ summary, rows }, null, 2));
  console.log('SUMMARY', JSON.stringify(summary));
  expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
});

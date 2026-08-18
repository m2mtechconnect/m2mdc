import { test } from '@playwright/test';
import { installSupabaseMock } from '../truth-in-ui/_setup/supabase-mock';

test('case2 probe', async ({ context, page }) => {
  test.setTimeout(120_000);
  const pending = new Map<string, string>();
  page.on('request', (r) => pending.set(r.url(), r.resourceType()));
  page.on('requestfinished', (r) => pending.delete(r.url()));
  page.on('requestfailed', (r) => pending.delete(r.url()));
  page.on('console', (m) => console.log('CONSOLE', m.type(), m.text().slice(0, 200)));
  page.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 300)));

  const mock = await installSupabaseMock(context);
  const twinId = '00000000-0000-4000-8000-000000000042';
  const twin = { id: twinId, location_id: null, name: 'Matrix Twin', city: 'Montreal',
    region_code: 'ca-central-1', tier: '4', capacity_kw: 5000, industry: 'data_centre',
    sovereignty_level: 'sovereign', pue_target: 1.2, renewable_target_pct: 80,
    carbon_intensity: 25, metadata: {}, blueprint_id: null,
    created_by_user: mock.session.userId,
    created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' };
  await context.route('**/rest/v1/data_centre_twins*', async (route) => {
    const wantsSingle = (route.request().headers()['accept'] ?? '').includes('pgrst.object');
    await route.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(wantsSingle ? twin : [twin]) });
  });

  await page.goto('/data-centre-twin?geometry=nvidia-reference', { waitUntil: 'domcontentloaded' });
  for (const t of [10, 25]) {
    await page.waitForTimeout(t === 10 ? 10_000 : 10_000);
    const main = await page.locator('main').first().innerText().catch(() => '(none)');
    console.log(`T+${t}s main=${JSON.stringify(main.slice(0, 120).replace(/\s+/g, ' '))} pending=${JSON.stringify([...pending.entries()].slice(0, 10))}`);
    console.log(`T+${t}s lazy=`, await page.evaluate(() => JSON.stringify({url:location.pathname+location.search, lazy:(window as any).__lazyState})));
    console.log(`T+${t}s render=`, await page.evaluate(() => JSON.stringify({r:(window as any).__dctRender ?? null, i:(window as any).__dctAfterI18n ?? null})));
  }
});

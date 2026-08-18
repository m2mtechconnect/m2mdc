/** Temporary diagnostic: reproduce a hang, then probe what wakes the tree. */
import { test, expect, type BrowserContext } from '@playwright/test';
import { installSupabaseMock } from '../truth-in-ui/_setup/supabase-mock';

async function seed(context: BrowserContext) {
  const mock = await installSupabaseMock(context);
  const twinId = '00000000-0000-4000-8000-000000000042';
  const twin = { id: twinId, location_id: null, name: 'Probe', city: 'Montreal', region_code: 'ca-central-1', tier: '4', capacity_kw: 5000, industry: 'data_centre', sovereignty_level: 'sovereign', pue_target: 1.2, renewable_target_pct: 80, carbon_intensity: 25, metadata: {}, blueprint_id: null, created_by_user: mock.session.userId, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' };
  await context.route('**/rest/v1/data_centre_twins*', async (route) => {
    const single = (route.request().headers()['accept'] ?? '').includes('pgrst.object');
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(single ? twin : [twin]) });
  });
  await context.addInitScript((id) => localStorage.setItem('dc_active_twin_id', id), twinId);
}

test('probe a hung route', async ({ browser }) => {
  test.setTimeout(0);
  for (let i = 0; i < 25; i++) {
    const context = await browser.newContext();
    await seed(context);
    const page = await context.newPage();
    await page.addInitScript(() => {
      (window as any).__longTasks = [];
      try {
        new PerformanceObserver((l) => l.getEntries().forEach((e) => (window as any).__longTasks.push({ start: Math.round(e.startTime), dur: Math.round(e.duration) }))).observe({ entryTypes: ['longtask'] });
      } catch { /* not supported */ }
      (window as any).__rafTicks = 0;
      const tick = () => { (window as any).__rafTicks++; requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    await page.goto('/data-centre-twin?geometry=nvidia-reference', { waitUntil: 'domcontentloaded' });
    const layout = page.getByTestId('twin-visualization-layout');
    let hung = false;
    try {
      await expect.poll(async () => layout.count(), { timeout: 12_000, intervals: [250] }).toBeGreaterThan(0);
    } catch { hung = true; }
    if (!hung) { await context.close(); continue; }

    console.log(`HANG on iteration ${i}`);
    console.log('longTasks', JSON.stringify(await page.evaluate(() => (window as any).__longTasks)));
    console.log('rafTicks', await page.evaluate(() => (window as any).__rafTicks));
    console.log('bodyText', (await page.locator('body').innerText()).slice(0, 300).replace(/\n/g, ' | '));

    // Probe 1: does a plain DOM event wake React?
    await page.mouse.click(640, 450);
    let woke1 = false;
    try { await expect.poll(async () => layout.count(), { timeout: 5_000 }).toBeGreaterThan(0); woke1 = true; } catch { /* still hung */ }
    console.log('wokeOnClick', woke1);

    if (!woke1) {
      // Probe 2: does forcing a resize (external store / rAF churn) wake it?
      await page.setViewportSize({ width: 1000, height: 800 });
      let woke2 = false;
      try { await expect.poll(async () => layout.count(), { timeout: 5_000 }).toBeGreaterThan(0); woke2 = true; } catch { /* still hung */ }
      console.log('wokeOnResize', woke2);
    }
    await context.close();
    return;
  }
  console.log('NO HANG REPRODUCED');
});

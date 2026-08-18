import { test, expect } from '@playwright/test';
import { installSupabaseMock } from './_setup/supabase-mock';

test('diag', async ({ context, page }) => {
  test.setTimeout(300_000);
  await installSupabaseMock(context);
  let started = 0, finished = 0;
  const pending = new Set<string>();
  page.on('request', (r) => { started++; pending.add(r.url()); });
  page.on('requestfinished', (r) => { finished++; pending.delete(r.url()); });
  page.on('requestfailed', (r) => { pending.delete(r.url()); console.log('FAIL', r.url().slice(-90), r.failure()?.errorText); });
  await page.goto('/data-centre-twin?geometry=nvidia-reference', { waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(5000);
    const has = await page.evaluate(() => !!document.querySelector('[data-testid=twin-visualization-layout]'));
    console.log(i * 5, 'req', started, '/', finished, 'pending', pending.size, 'layout', has,
      [...pending].slice(0, 3).map((u) => u.slice(-70)).join(' , '));
    if (has) break;
  }
});

import { test } from './_setup/fixtures';
import { mockKit } from './_setup/kit-mock';

test('perf probe', async ({ page }) => {
  test.setTimeout(150_000);
  const t0 = Date.now(); const mark = (s: string) => console.log('MARK', s, Date.now() - t0);
  await page.addInitScript(() => {
    (window as any).__longTasks = [];
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) (window as any).__longTasks.push({ d: Math.round(e.duration), s: Math.round(e.startTime) });
      }).observe({ entryTypes: ['longtask'] });
    } catch { /* noop */ }
  });
  await mockKit(page, 'network-unavailable');
  await page.goto('/data-centre-twin?demo=true', { waitUntil: 'domcontentloaded' });
  mark('goto');
  const tab = page.getByRole('tab', { name: 'Sovereignty' });
  await tab.waitFor({ state: 'attached', timeout: 60000 }); mark('tab-attached');
  await tab.waitFor({ state: 'visible', timeout: 60000 }); mark('tab-visible');
  await tab.click({ timeout: 60000 }); mark('tab-clicked');
  const lt = await page.evaluate(() => (window as any).__longTasks as {d:number;s:number}[]);
  console.log('LONGTASKS total', lt.length, 'sum', lt.reduce((a,b)=>a+b.d,0));
  console.log('TOP', JSON.stringify(lt.sort((a,b)=>b.d-a.d).slice(0,12)));
});

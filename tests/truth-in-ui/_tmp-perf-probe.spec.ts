import { test } from './_setup/fixtures';
import { mockKit } from './_setup/kit-mock';

test('perf probe', async ({ page }) => {
  test.setTimeout(150_000);
  const t0 = Date.now(); const mark = (s: string) => console.log('MARK', s, Date.now() - t0);
  await mockKit(page, 'network-unavailable');
  await page.goto('/data-centre-twin?demo=true', { waitUntil: 'domcontentloaded' });
  mark('goto');
  const tab = page.getByRole('tab', { name: 'Sovereignty' });
  await tab.waitFor({ state: 'visible', timeout: 60000 }); mark('tab-visible');
  await tab.click({ timeout: 60000 }); mark('tab-clicked');
  await page.getByTestId('sovereignty-domain-view').waitFor({ timeout: 30000 }); mark('panel');
  await page.locator('canvas').first().waitFor({ state: 'attached', timeout: 60000 }); mark('canvas-attached');
});

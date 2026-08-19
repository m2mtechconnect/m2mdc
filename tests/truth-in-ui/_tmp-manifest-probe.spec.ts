import { test, expect } from './_setup/fixtures';
import { mockKit } from './_setup/kit-mock';

test('probe', async ({ page }) => {
  test.setTimeout(120_000);
  const t = Date.now(); const mark = (s: string) => console.log(s, Date.now() - t);
  await mockKit(page, 'network-unavailable');
  await page.goto('/data-centre-twin?demo=true', { waitUntil: 'domcontentloaded' });
  mark('goto');
  await page.getByRole('tab', { name: 'Sovereignty' }).click();
  mark('tabclick');
  const panel = page.getByTestId('sovereignty-domain-view');
  await expect(panel).toBeVisible({ timeout: 30000 });
  mark('panel');
  console.log('summaries', await panel.locator('summary').count());
  const summary = panel.locator('summary').first();
  await summary.focus(); mark('focus');
  await page.keyboard.press('Enter'); mark('enter');
  console.log('rows', await panel.locator('[aria-label^="Provenance:"]').count());
});

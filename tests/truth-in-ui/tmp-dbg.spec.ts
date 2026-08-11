import { test, expect } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';

test('dbg', async ({ page, context }) => {
  await installSupabaseMock(context);
  page.on('console', (m) => console.log('PAGE', m.text()));
  await page.goto('/dashboard?rack=A3&action=kpi-pue');
  const d = page.getByTestId('action-detail-drawer');
  await expect(d).toBeVisible();
  const names = await d.getByRole('button').evaluateAll((ns) => ns.map((n) => (n as HTMLElement).getAttribute('aria-label') || (n as HTMLElement).innerText));
  console.log('BUTTONS', JSON.stringify(names));
  await d.getByRole('button', { name: /close/i }).first().click();
  await page.waitForTimeout(1500);
  console.log('URL', page.url());
  console.log('STILL', await d.count(), await d.isVisible().catch(() => false));
});

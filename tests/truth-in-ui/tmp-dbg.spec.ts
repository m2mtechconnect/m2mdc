import { test, expect } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';
test('dbg', async ({ page, context }) => {
  await installSupabaseMock(context);
  await page.goto('/dashboard?rack=A3&action=kpi-pue');
  const d = page.getByTestId('action-detail-drawer');
  await expect(d).toBeVisible();
  console.log('X0', (await d.boundingBox())!.x, await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches));
  await d.getByRole('button', { name: /close/i }).first().click();
  await page.waitForTimeout(800);
  console.log('URL', page.url());
});

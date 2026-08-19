import { test, expect } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';

test('probe thermal workspace', async ({ context, page }) => {
  test.setTimeout(90_000);
  await installSupabaseMock(context);
  await page.goto('/dsx/evidence-beta/thermal', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('dsx-workspace-title')).toBeVisible({ timeout: 20_000 });
  console.log('URL', page.url());
  console.log('title', await page.getByTestId('dsx-workspace-title').innerText());
  console.log('selects', await page.locator('[data-testid^="dsx-select-asset-"]').count());
  console.log('metric tiles', await page.locator('[data-testid^="dsx-metric-"]').count());
  console.log('rows', await page.locator('[data-testid="dsx-thermal-queue"] tbody tr').count());
  console.log('TEXT', (await page.locator('main').innerText()).slice(0, 2000));
});

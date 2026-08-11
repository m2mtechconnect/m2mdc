import { test, expect } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';
test('debug', async ({ page, context }) => {
  await installSupabaseMock(context);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('facility-floor-plan')).toBeVisible({ timeout: 30000 });
  const input = page.getByTestId('rack-search-input');
  await input.click();
  await input.fill('E7');
  await page.waitForTimeout(1000);
  console.log('VALUE', await input.inputValue());
  console.log('RESULTS', await page.getByTestId('rack-search-results').count());
  console.log('HTML', await page.getByTestId('rack-search-results').innerHTML().catch(() => 'x'));
  console.log('SELATTR', await page.locator('[data-rack-code="E7"]').getAttribute('data-selected'));
});

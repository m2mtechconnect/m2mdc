import { test, expect } from '../truth-in-ui/_setup/fixtures';
import { installSupabaseMock } from '../truth-in-ui/_setup/supabase-mock';

test.beforeEach(async ({ context }) => {
  await installSupabaseMock(context);
});

test('AI runtime route renders without recovery or browser exceptions', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/settings/ai');
  await page.waitForLoadState('networkidle');

  expect(pageErrors, `AI runtime page errors: ${JSON.stringify(pageErrors)}`).toEqual([]);
  await expect(page.getByTestId('route-load-recovery')).toHaveCount(0);
  await expect(page.getByTestId('ai-settings-workspace')).toBeVisible();
});

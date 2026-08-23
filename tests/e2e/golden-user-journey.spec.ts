import { test, expect } from '@playwright/test';
import { resolveTestUserCredentials } from '../helpers/testSupabaseClient';

/**
 * One serial user journey through the integrated AURA stack.
 *
 * This intentionally reuses the authenticated QA storage state for the first
 * half of the journey, then exercises the committed sign-out and sign-in
 * contracts before proving the protected session restores correctly.
 */
test.describe('Golden user journey', () => {
  test.describe.configure({ mode: 'serial' });

  test('dashboard -> builder draft -> connections -> simulation -> profile -> logout -> login -> restore', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Golden journey runs once on Chromium');

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard(?:[/?#]|$)/, { timeout: 15_000 });
    await expect(page.locator('body')).not.toContainText(/authorization error|something went wrong/i);

    await page.goto('/builder');
    await expect(page.getByRole('heading', { name: /start a new build/i })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /^start blank$/i }).click();
    await expect(page).toHaveURL(/\/builder\?draft=[^&#]+/, { timeout: 20_000 });

    await page.goto('/manage/integrations');
    await expect(page).toHaveURL(/\/manage\/integrations(?:[/?#]|$)/, { timeout: 15_000 });
    await expect(page.locator('body')).not.toContainText(/authorization error|something went wrong/i);

    await page.goto('/simulation');
    await expect(page).toHaveURL(/\/simulation(?:[/?#]|$)/, { timeout: 15_000 });
    await expect(page.locator('body')).not.toContainText(/authorization error|something went wrong/i);

    await page.goto('/account/profile');
    await expect(page.getByRole('heading', { name: /^profile$/i }).first()).toBeVisible({ timeout: 15_000 });

    await page.goto('/sign-out');
    await page.waitForURL((url) => url.pathname === '/', { timeout: 10_000 });

    const credentials = resolveTestUserCredentials();
    await page.goto('/login?returnTo=%2Fdashboard');
    await expect(page.getByLabel('Email Address', { exact: true })).toBeVisible({ timeout: 10_000 });
    await page.getByLabel('Email Address', { exact: true }).fill(credentials.email);
    await page.getByLabel('Password', { exact: true }).fill(credentials.password);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/dashboard(?:[/?#]|$)/, { timeout: 15_000 });

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard(?:[/?#]|$)/, { timeout: 15_000 });

    await page.goto('/account/profile');
    await expect(page.getByRole('heading', { name: /^profile$/i }).first()).toBeVisible({ timeout: 15_000 });
  });
});

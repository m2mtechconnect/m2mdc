import { test, expect } from '@playwright/test';
import { resolveTestUserCredentials } from '../helpers/testSupabaseClient';

/**
 * Canonical AURA DC golden journey.
 *
 * This test intentionally starts from an authenticated approved user and proves
 * the first real product handoffs rather than legacy generic-agent routes:
 * facility -> bound Builder -> Connections -> AI readiness -> Simulation ->
 * activation/runtime evidence -> Evidence -> session restore.
 */
test.describe('Golden AURA DC user journey', () => {
  test.describe.configure({ mode: 'serial' });

  test('facility -> build -> connect -> AI -> simulate -> operate -> evidence -> session restore', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Golden journey runs once on Chromium');

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard(?:[/?#]|$)/, { timeout: 20_000 });
    await expect(page.locator('body')).not.toContainText(/authorization error|something went wrong/i);

    // First-run Build must either require an explicit facility or offer a build
    // against an already configured facility. No fabricated starter values are
    // accepted as a hidden prerequisite.
    await page.goto('/builder');
    await expect(page).toHaveURL(/\/builder(?:[/?#]|$)/, { timeout: 20_000 });

    const firstFacility = page.getByRole('heading', { name: /create your first facility/i });
    if (await firstFacility.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: /^create facility$/i }).click();
      await expect(page).toHaveURL(/\/manage\/facilities\?[^#]*next=builder/, { timeout: 15_000 });
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });

      await page.getByLabel('Facility name').fill('QA Journey Data Centre');

      await page.getByRole('combobox', { name: 'Facility region' }).click();
      await page.getByRole('option', { name: /Toronto, Ontario/i }).click();

      await page.getByRole('combobox', { name: 'Facility tier' }).click();
      await page.getByRole('option', { name: 'Tier III' }).click();

      await page.getByLabel('Design capacity (kW)').fill('3200');
      await page.getByTestId('confirm-create-facility').click();

      await expect(page).toHaveURL(/\/builder\?[^#]*(draft|new)=/, { timeout: 30_000 });
    } else {
      await expect(page.getByRole('heading', { name: /start a facility build/i })).toBeVisible({ timeout: 15_000 });
      await page.getByRole('button', { name: /^start build$/i }).click();
      await expect(page).toHaveURL(/\/builder\?[^#]*(draft|new)=/, { timeout: 30_000 });
    }

    // The URL preserves the facility identity while the one-time `new` intent
    // is consumed into a durable draft.
    await expect(page).toHaveURL(/twin=[0-9a-f-]{36}/i, { timeout: 30_000 });
    await expect(page.locator('body')).not.toContainText(/not bound to a facility|still requires operator setup/i);

    // Build lifecycle destinations must all be reachable under the same signed
    // in tenant without falling through a recovery screen.
    await page.goto('/manage/integrations');
    await expect(page).toHaveURL(/\/manage\/integrations(?:[/?#]|$)/, { timeout: 15_000 });
    await expect(page.locator('body')).not.toContainText(/authorization error|something went wrong/i);

    await page.goto('/settings/ai');
    await expect(page.getByTestId('ai-settings-workspace')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/server-owned runtime/i).first()).toBeVisible();

    // The retired preview URL must converge into the one canonical Simulation
    // workspace instead of exposing a second simulation product.
    await page.goto('/simulation/preview?source=golden-journey');
    await expect(page).toHaveURL(/\/simulation\?source=golden-journey$/, { timeout: 15_000 });
    await expect(page.locator('body')).not.toContainText(/authorization error|something went wrong/i);

    await page.goto('/deployments');
    await expect(page.getByRole('heading', { name: /activation & runtime evidence/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/configuration activation and external runtime evidence are tracked separately/i)).toBeVisible();

    await page.goto('/analytics');
    await expect(page).toHaveURL(/\/analytics(?:[/?#]|$)/, { timeout: 15_000 });
    await expect(page.locator('body')).not.toContainText(/authorization error|something went wrong/i);

    await page.goto('/evidence/overview');
    await expect(page).toHaveURL(/\/evidence\/overview(?:[/?#]|$)/, { timeout: 15_000 });
    await expect(page.locator('body')).not.toContainText(/authorization error|something went wrong/i);

    // Authentication remains durable after the product journey.
    await page.goto('/account/profile');
    await expect(page.getByRole('heading', { name: /^profile$/i }).first()).toBeVisible({ timeout: 15_000 });

    await page.goto('/sign-out');
    await page.waitForURL((url) => url.pathname === '/', { timeout: 10_000 });

    const credentials = resolveTestUserCredentials();
    await page.goto('/login?returnTo=%2Fdashboard');
    await page.getByLabel('Email Address', { exact: true }).fill(credentials.email);
    await page.getByLabel('Password', { exact: true }).fill(credentials.password);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/dashboard(?:[/?#]|$)/, { timeout: 20_000 });

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard(?:[/?#]|$)/, { timeout: 15_000 });
  });
});

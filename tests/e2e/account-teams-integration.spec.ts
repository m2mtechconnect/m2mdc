import { test, expect } from '@playwright/test';

const LIVE_QA = process.env.QA_AUTH_BOOTSTRAP === '1';

test.describe('Account Profile & Governance Integration', () => {
  test.skip(!LIVE_QA, 'Requires the disposable authenticated QA backend');

  test('profile identity is backed by the same persisted user used by Access Control', async ({ page }) => {
    await page.goto('/account/profile');
    await expect(page.locator('h1:has-text("Profile")').first()).toBeVisible({ timeout: 15_000 });

    const nameInput = page.locator('input#full_name');
    const emailInput = page.locator('input#email');
    await expect(nameInput).toBeVisible();
    await expect(emailInput).toBeVisible();

    const profileName = await nameInput.inputValue();
    const profileEmail = await emailInput.inputValue();
    expect(profileName.trim()).not.toBe('');
    expect(profileEmail).toMatch(/@/);

    await page.goto('/teams');
    await expect(page).toHaveURL(/\/teams\/access-control(?:[/?#]|$)/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /Access control/i })).toBeVisible();

    const roleRow = page.getByRole('row').filter({ hasText: profileEmail });
    await expect(roleRow).toBeVisible({ timeout: 15_000 });
    await expect(roleRow).toContainText(profileName);
    await expect(roleRow).toContainText(/admin/i);
  });

  test('profile update persists after reload and propagates to the governance roster', async ({ page }) => {
    const testName = `AURA QA Profile ${Date.now()}`;

    await page.goto('/account/profile');
    const nameInput = page.locator('input#full_name');
    const emailInput = page.locator('input#email');
    await expect(nameInput).toBeVisible({ timeout: 15_000 });
    await expect(emailInput).toBeVisible();
    const profileEmail = await emailInput.inputValue();

    await nameInput.fill(testName);
    await page.getByRole('button', { name: /Save Changes/i }).click();
    await expect(page.getByText('Profile updated successfully', { exact: true })).toBeVisible({ timeout: 10_000 });

    await page.reload();
    await expect(page.locator('input#full_name')).toHaveValue(testName, { timeout: 15_000 });

    await page.goto('/teams');
    await expect(page).toHaveURL(/\/teams\/access-control(?:[/?#]|$)/, { timeout: 15_000 });
    const roleRow = page.getByRole('row').filter({ hasText: profileEmail });
    await expect(roleRow).toBeVisible({ timeout: 15_000 });
    await expect(roleRow).toContainText(testName);
  });
});

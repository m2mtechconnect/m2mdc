import { test, expect } from '@playwright/test';

test.describe('Account settings', () => {
  test('navigates from the user menu using the current Preferences label', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByRole('menuitem', { name: 'Preferences' }).click();

    await expect(page).toHaveURL(/\/account\/settings$/);
    await expect(page.getByRole('heading', { name: 'Workspace settings' })).toBeVisible();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/account/settings');
    await expect(page.getByRole('heading', { name: 'Workspace settings' })).toBeVisible();
  });

  test('general is the only tab with workspace save actions', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'General' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByLabel('Workspace Name')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible();

    await page.getByRole('tab', { name: 'Security' }).click();
    await expect(page.getByText('Access and security')).toBeVisible();
    await expect(page.getByRole('switch', { name: 'Multi-factor authentication (unavailable)' })).toBeDisabled();
    await expect(page.getByRole('switch', { name: 'Single sign-on (unavailable)' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Save Changes' })).toHaveCount(0);

    await page.getByRole('tab', { name: 'Notifications' }).click();
    await expect(page.getByText('Notification Preferences')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Changes' })).toHaveCount(0);
  });

  test('renders the organization values already persisted by the backend', async ({ page }) => {
    await expect(page.getByRole('combobox', { name: 'Industry' })).not.toHaveText('');
    await expect(page.getByRole('combobox', { name: 'Default role for new members' })).not.toHaveText('');
  });
});

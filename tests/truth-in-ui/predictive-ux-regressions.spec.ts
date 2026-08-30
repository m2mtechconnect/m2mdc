import { test, expect } from './_setup/fixtures';
import { assertNoOnboardingOverlay, seedDismissedTours } from './_setup/app-state';
import { installSupabaseMock } from './_setup/supabase-mock';

async function openAuthorized(
  context: import('@playwright/test').BrowserContext,
  page: import('@playwright/test').Page,
  path: string,
) {
  await seedDismissedTours(context);
  const mock = await installSupabaseMock(context, { withActiveOrganization: true });
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect.poll(() => mock.profileHits(), { timeout: 5_000 }).toBeGreaterThan(0);
  await assertNoOnboardingOverlay(page, `predictive regression ${path}`);
}

test.describe('predictive defect-family regressions', () => {
  test('overlay inspector owns one close action and restores focus for click and Escape', async ({ context, page }) => {
    test.setTimeout(45_000);
    await page.setViewportSize({ width: 900, height: 900 });
    await openAuthorized(context, page, '/simulation?step=inspect');

    const trigger = page.getByRole('button', { name: 'Inspector' });
    const drawer = page.getByTestId('workspace-inspector-drawer');
    if (!(await drawer.isVisible().catch(() => false))) await trigger.click();
    await expect(drawer).toBeVisible({ timeout: 10_000 });
    await expect(drawer.getByRole('button', { name: /close/i })).toHaveCount(1);

    await drawer.getByRole('button', { name: /close/i }).click();
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await expect(drawer).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('saved organization values render and only the General tab owns page save actions', async ({ context, page }) => {
    test.setTimeout(45_000);
    await openAuthorized(context, page, '/account/settings');

    await expect(page.getByRole('combobox', { name: 'Industry' })).toContainText('AI data centre validation');
    await expect(page.getByRole('combobox', { name: 'Default role for new members' })).toContainText('Viewer');
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible();

    await page.getByRole('tab', { name: 'Security' }).click();
    await expect(page.getByRole('button', { name: 'Save Changes' })).toHaveCount(0);
    await expect(page.getByRole('switch', { name: 'Single sign-on (unavailable)' })).toBeVisible();

    await page.getByRole('tab', { name: 'Notifications' }).click();
    await expect(page.getByRole('button', { name: 'Save Changes' })).toHaveCount(0);
  });

  test('route-local truth does not inherit the Command Center run strip', async ({ context, page }) => {
    test.setTimeout(60_000);
    await openAuthorized(context, page, '/dashboard');
    await expect(page.getByTestId('operating-state-bar')).toBeVisible({ timeout: 10_000 });

    for (const route of ['/analytics', '/account/settings', '/manage/integrations?tab=connections']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('operating-state-bar')).toHaveCount(0);
    }
  });
});

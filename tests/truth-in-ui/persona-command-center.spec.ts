import { expect, test } from './_setup/fixtures';
import { seedDismissedTours } from './_setup/app-state';
import { installSupabaseMock } from './_setup/supabase-mock';

async function openDashboard(
  context: import('@playwright/test').BrowserContext,
  page: import('@playwright/test').Page,
  withActiveOrganization: boolean,
) {
  await seedDismissedTours(context);
  const mock = await installSupabaseMock(context, { withActiveOrganization });
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => mock.profileHits()).toBeGreaterThan(0);
  await expect(page.getByTestId('persona-priority-panel')).toBeVisible();
  return page.getByTestId('persona-priority-panel');
}

test.describe('persona-prioritized Command Center', () => {
  test('uses active organization scope and exposes only governed owner actions', async ({ context, page, guard }) => {
    const panel = await openDashboard(context, page, true);

    await expect(panel).toHaveAttribute('data-persona-family', 'owner_admin');
    await expect(panel.getByText(/Owner \/ administrator focus · AURA Truth Organization organization/i)).toBeVisible();
    await expect(panel.getByTestId('persona-action-readiness')).toBeVisible();
    await expect(panel.getByTestId('persona-action-people-access')).toBeVisible();
    await expect(panel.getByTestId('persona-action-connections')).toBeVisible();
    await expect(panel.locator('[data-testid^="persona-action-"]')).toHaveCount(3);

    await page.getByTestId('primary-persona-action').click();
    await expect(page).toHaveURL(/\/readiness\/supervisor$/);
    expect(guard.anyExternalCompleted(), 'no external request may complete').toBe(false);
  });

  test('labels platform scope explicitly when no organization is active', async ({ context, page, guard }) => {
    const panel = await openDashboard(context, page, false);

    await expect(panel).toHaveAttribute('data-persona-family', 'owner_admin');
    await expect(panel.getByText(/Owner \/ administrator focus · Platform scope/i)).toBeVisible();
    await expect(panel.getByTestId('persona-action-platform-readiness')).toBeVisible();
    await expect(page.getByTestId('primary-persona-action')).toHaveAttribute('href', '/admin/platform-readiness');
    expect(guard.anyExternalCompleted(), 'no external request may complete').toBe(false);
  });
});

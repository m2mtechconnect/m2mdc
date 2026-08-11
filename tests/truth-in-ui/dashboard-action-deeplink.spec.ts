import { test, expect } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';

const DASHBOARD = '/dashboard';

test.describe('Action Center deep links', () => {
  test.beforeEach(async ({ context }) => {
    await installSupabaseMock(context);
  });

  test('opening a row writes ?action= and the link restores the drawer', async ({ page }) => {
    await page.goto(DASHBOARD, { waitUntil: 'domcontentloaded' });
    const firstOpen = page.locator('[data-testid^="action-item-open-"]').first();
    await expect(firstOpen).toBeVisible();
    const id = (await firstOpen.getAttribute('data-testid'))!.replace('action-item-open-', '');

    await firstOpen.click();
    await expect(page).toHaveURL(new RegExp(`action=${id}`));
    await expect(page.getByTestId('action-detail-drawer')).toBeVisible();

    await page.goto(`${DASHBOARD}?action=${id}`);
    await expect(page.getByTestId('action-detail-drawer')).toBeVisible();
  });

  test('a deep link to a below-fold row also shows that row in the list', async ({ page }) => {
    await page.goto(`${DASHBOARD}?actions=all`);
    const all = page.getByTestId('action-center-all-list');
    await expect(all).toBeVisible();
    const ids = await all.locator('[data-testid^="action-item-open-"]').evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute('data-testid')!.replace('action-item-open-', '')),
    );
    const last = ids[ids.length - 1];

    await page.goto(`${DASHBOARD}?action=${last}`);
    await expect(page.getByTestId('action-detail-drawer')).toBeVisible();
    // Row context is inline, not a second stacked dialog.
    await expect(page.getByTestId('action-center-all-list')).toHaveCount(0);
    await expect(page.getByTestId(`action-item-${last}`)).toBeVisible();
  });

  test('closing the drawer clears the parameter and preserves other state', async ({ page }) => {
    await page.goto(`${DASHBOARD}?rack=A3&action=kpi-pue`);
    await expect(page.getByTestId('action-detail-drawer')).toBeVisible();
    // Close via the drawer's own control: a global Escape also clears the rack
    // selection, which is separate behaviour.
    // The sheet slides in; wait for it to settle so the close control is at
    // its final position before clicking.
    await page.getByTestId('action-detail-drawer').evaluate((el) =>
      Promise.all(el.getAnimations().map((a) => a.finished.catch(() => undefined))).then(() => undefined),
    );
    await page.getByTestId('action-detail-drawer').getByRole('button', { name: /close/i }).first().click();
    await expect(page).not.toHaveURL(/action=/);
    await expect(page).toHaveURL(/rack=A3/);
  });
});

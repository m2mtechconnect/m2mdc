import { test, expect } from '../_setup/fixtures';
import { installSupabaseMock } from '../_setup/supabase-mock';
import { seedDismissedTours } from '../_setup/app-state';
import { activateCard } from '../_setup/card-activation';

test('diag escape', async ({ page, context }) => {
  await installSupabaseMock(context);
  await seedDismissedTours(context);
  await page.goto('/dsx/evidence-beta', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('dsx-workspace-title')).toBeVisible({ timeout: 15_000 });
  const trigger = page.locator('[data-testid^="dsx-constraint-open-"]').last();
  const drawer = page.locator('[data-testid="dsx-constraint-drawer"]');
  await activateCard(page, trigger, drawer, 'diag');
  await page.evaluate(`window.__esc=0; document.addEventListener('keydown', e => { if (e.key === 'Escape') window.__esc++; }, true);`);
  await drawer.press('Escape');
  await page.waitForTimeout(1200);
  console.log('DIAG docEscapes=', await page.evaluate('window.__esc'), 'state=', await drawer.getAttribute('data-state'));
  console.log('DIAG active=', await page.evaluate(`document.activeElement && (document.activeElement.getAttribute('data-testid') || document.activeElement.tagName + '#' + document.activeElement.id)`));
  if (await drawer.getAttribute('data-state') === 'open') {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1200);
    console.log('DIAG afterPageEsc state=', await drawer.getAttribute('data-state'), 'escapes=', await page.evaluate('window.__esc'));
  }
});

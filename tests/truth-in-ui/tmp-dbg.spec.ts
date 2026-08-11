import { test, expect } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';

test('dbg', async ({ page, context }) => {
  page.on('console', (m) => console.log('PAGE', m.text()));
  await installSupabaseMock(context);
  await page.goto('/dashboard?rack=A3&action=kpi-pue');
  const d = page.getByTestId('action-detail-drawer');
  await expect(d).toBeVisible();
  console.log('DRAWERS', await page.getByTestId('action-detail-drawer').count());
  const btn = d.getByRole('button', { name: /close/i }).first();
  console.log('BOX', JSON.stringify(await btn.boundingBox()));
  await page.evaluate(() => { document.addEventListener('click', (e) => console.log('CLICKED', (e.target as HTMLElement).tagName, (e.target as HTMLElement).className), true); });
  await btn.click();
  await page.waitForTimeout(1000);
  console.log('URL', page.url());
});

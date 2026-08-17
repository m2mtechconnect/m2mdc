import { test } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';
import { seedDismissedTours } from './_setup/app-state';

test('debug integrations render', async ({ context, page }) => {
  test.setTimeout(90_000);
  const mock = await installSupabaseMock(context);
  await seedDismissedTours(context);
  const { key, value } = mock.storage();
  await context.addInitScript(([k, v]) => { try { window.localStorage.setItem(k as string, v as string); } catch {} }, [key, value] as const);
  page.on('console', (m) => console.log('[console]', m.type(), m.text().slice(0, 300)));
  page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 600)));
  for (const url of ['/manage/integrations?facility=montreal', '/dsx/evidence-beta/evidence?facility=montreal']) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);
    console.log('URL', page.url());
    console.log('page-content count', await page.locator("[data-testid='page-content']").count());
    console.log('BODY', (await page.locator('body').innerText()).slice(0, 800));
  }
});

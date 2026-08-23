import { test } from './_setup/fixtures';
import { installSupabaseMock, STORAGE_KEY } from './_setup/supabase-mock';

test('debug auth', async ({ context, page }) => {
  const mock = await installSupabaseMock(context);
  page.on('console', (m) => console.log('CONSOLE', m.type(), m.text().slice(0, 200)));
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  console.log('KEY', STORAGE_KEY);
  console.log('LS', await page.evaluate((k) => window.localStorage.getItem(k)?.slice(0, 60), STORAGE_KEY));
  console.log('URL', page.url());
  console.log('REQ', JSON.stringify(mock.requests()));
});

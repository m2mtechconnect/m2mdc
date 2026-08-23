import { test } from './_setup/fixtures';
import { installSupabaseMock, STORAGE_KEY } from './_setup/supabase-mock';

test('debug auth', async ({ context, page }) => {
  const mock = await installSupabaseMock(context);
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  console.log('KEY', STORAGE_KEY);
  console.log('LSKEYS', await page.evaluate(() => Object.keys(window.localStorage)));
  console.log('SBURL', await page.evaluate(() => (window as any).__vite_supabase_url ?? 'n/a'));
  console.log('URL', page.url(), 'hits', mock.profileHits());
  console.log('REQ', JSON.stringify(mock.requests()));
});

import { test } from './_setup/fixtures';
import { installSupabaseMock, STORAGE_KEY } from './_setup/supabase-mock';

test('debug auth', async ({ context, page }) => {
  await installSupabaseMock(context);
  const urls: string[] = [];
  page.on('request', (r) => { if (!r.url().startsWith('http://localhost:8091')) urls.push(r.method() + ' ' + r.url().slice(0, 120)); });
  page.on('requestfailed', (r) => console.log('FAILED', r.url().slice(0, 120), r.failure()?.errorText));
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  console.log('EXT', JSON.stringify(urls, null, 1));
  console.log('BOOT', await page.evaluate((k) => ({ has: !!window.localStorage.getItem(k), now: Date.now() }), STORAGE_KEY));
});

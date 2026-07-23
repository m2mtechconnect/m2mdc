import { test } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';

test('debug dashboard error', async ({ page, context }) => {
  await installSupabaseMock(context);
  const errs: string[] = [];
  page.on('pageerror', e => errs.push(`PAGEERR: ${e.message}\n${e.stack}`));
  page.on('console', m => { if (m.type()==='error') errs.push(`CONSOLE: ${m.text()}`); });
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  console.log('\n\n===ERRORS===\n' + errs.slice(0,15).join('\n---\n'));
});

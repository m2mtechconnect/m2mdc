import { test } from '../truth-in-ui/_setup/fixtures';
import { installSupabaseMock } from '../truth-in-ui/_setup/supabase-mock';

const ROUTES = [
  '/dsx/evidence-beta/operations/thermal', '/dsx/evidence-beta/operations/compute',
  '/dsx/evidence-beta/sustainability/financial', '/dsx/evidence-beta/decisions',
  '/dsx/evidence-beta/decisions/log', '/dsx/evidence-beta/assets', '/builder', '/dashboard',
];

test('recheck', async ({ page, context }) => {
  test.setTimeout(300_000);
  await installSupabaseMock(context);
  for (const r of ROUTES) {
    await page.goto(r, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const d = await page.evaluate(() => ({
      url: location.pathname,
      mains: document.querySelectorAll('main').length,
      notFound: /page not found|404/i.test(document.body.innerText),
      snippet: document.body.innerText.slice(0,120),
      unnamed: [...document.querySelectorAll<HTMLElement>('button,a[href],[role="button"]')]
        .filter((el) => el.getBoundingClientRect().width && !(el.textContent || '').trim() && !el.getAttribute('aria-label') && !el.getAttribute('title') && !el.getAttribute('aria-labelledby')).length,
    }));
    // eslint-disable-next-line no-console
    console.log(r, JSON.stringify(d));
  }
});

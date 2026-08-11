import { test } from '../truth-in-ui/_setup/fixtures';
import { installSupabaseMock } from '../truth-in-ui/_setup/supabase-mock';
import AxeBuilder from '@axe-core/playwright';

test('detail', async ({ page, context }) => {
  test.setTimeout(300_000);
  await installSupabaseMock(context);
  for (const route of ['/dashboard', '/builder', '/analytics', '/infrastructure', '/account/profile', '/help', '/dsx/evidence-beta']) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(1500);
    const info = await page.evaluate(() => {
      const unnamed = [...document.querySelectorAll<HTMLElement>('button,a[href],[role="button"]')]
        .filter((el) => el.getBoundingClientRect().width && !(el.textContent || '').trim() && !el.getAttribute('aria-label') && !el.getAttribute('title') && !el.getAttribute('aria-labelledby'))
        .map((el) => el.outerHTML.slice(0, 160));
      const mains = [...document.querySelectorAll('main')].map((m) => (m.className || '').toString().slice(0, 90));
      const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => `${h.tagName}:${(h.textContent || '').trim().slice(0, 40)}`);
      return { unnamed, mains, headings };
    });
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const v = r.violations.map((x) => `${x.id} :: ${x.nodes.slice(0, 2).map((n) => n.html.slice(0, 120)).join(' | ')}`);
    // eslint-disable-next-line no-console
    console.log('\n=== ' + route + '\n' + JSON.stringify({ ...info, axe: v }, null, 1));
  }
});

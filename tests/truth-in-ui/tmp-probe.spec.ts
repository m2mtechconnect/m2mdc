import { test } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';

test('probe', async ({ context, page }) => {
  const mock = await installSupabaseMock(context);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  const info = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out: unknown[] = [];
    for (const el of Array.from(document.querySelectorAll('[role="button"]'))) {
      const r = el.getBoundingClientRect();
      if (r.right <= vw + 1) continue;
      let scroller = 'none';
      let p: Element | null = el.parentElement;
      while (p) {
        const s = getComputedStyle(p);
        if (/(auto|scroll)/.test(s.overflowX)) { scroller = p.className.toString().slice(0, 80); break; }
        p = p.parentElement;
      }
      out.push({ tag: el.tagName, text: (el.textContent || '').trim().slice(0, 20), right: Math.round(r.right), vw, scroller, ownerSvgW: (el.closest('svg') as SVGElement | null)?.getBoundingClientRect().width });
    }
    return out;
  });
  console.log('PROBE', JSON.stringify(info, null, 1));
});

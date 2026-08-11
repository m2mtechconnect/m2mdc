import { test, expect } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';
test('dbg', async ({ page, context }) => {
  await installSupabaseMock(context);
  await page.goto('/dashboard?rack=A3&action=kpi-pue');
  const d = page.getByTestId('action-detail-drawer');
  await expect(d).toBeVisible();
  console.log(JSON.stringify(await d.evaluate((el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    let p: HTMLElement | null = el.parentElement; const chain: string[] = [];
    while (p) { const s = getComputedStyle(p); chain.push(`${p.tagName}.${p.className.toString().slice(0,40)}|pos=${s.position}|tr=${s.transform}|f=${s.filter}|ovf=${s.overflowX}|w=${p.getBoundingClientRect().width}`); p = p.parentElement; }
    return { pos: cs.position, rect: { x: r.x, w: r.width }, docW: document.documentElement.scrollWidth, inner: window.innerWidth, chain };
  })));
});

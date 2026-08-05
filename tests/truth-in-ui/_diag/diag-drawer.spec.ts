import { test, expect } from '../_setup/fixtures';
import { installSupabaseMock } from '../_setup/supabase-mock';

test.describe('diag', () => {
  test.beforeEach(async ({ context }) => { await installSupabaseMock(context); });

  test('constraint power + asset drawers', async ({ page }) => {
    test.setTimeout(180_000);
    const logs: string[] = [];
    page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
    page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

    await page.goto(process.env.DIAG_ROUTE ?? '/dsx/evidence-beta', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('dsx-workspace-title')).toBeVisible({ timeout: 15000 });

    const triggers = page.locator('[data-testid^="dsx-constraint-open-"]');
    const n = await triggers.count();
    console.log('DIAG constraint triggers:', n);
    for (let i = 0; i < n; i++) {
      const t = triggers.nth(i);
      const id = await t.getAttribute('data-testid');
      await t.scrollIntoViewIfNeeded();
      const box = await t.boundingBox();
      let intercept = 'n/a';
      if (box) {
        intercept = await page.evaluate(([x, y]) => {
          const el = document.elementFromPoint(x, y) as HTMLElement | null;
          return el ? `${el.tagName}.${el.className?.toString().slice(0, 60)}#${el.getAttribute('data-testid') ?? ''}` : 'null';
        }, [box.x + box.width / 2, box.y + box.height / 2]);
      }
      const geo = await page.evaluate((sel) => {
        const el = document.querySelector(`[data-testid="${sel}"]`) as HTMLElement;
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width/2, r.y + r.height/2) as HTMLElement | null;
        const chain: string[] = [];
        let n: HTMLElement | null = hit;
        while (n && chain.length < 8) {
          const cs = getComputedStyle(n);
          chain.push(`${n.tagName}[${n.getAttribute('data-testid') ?? ''}] pos=${cs.position} z=${cs.zIndex} rect=${JSON.stringify(n.getBoundingClientRect().toJSON())}`);
          n = n.parentElement;
        }
        return { trigger: r.toJSON(), chain };
      }, id!);
      console.log('DIAG geo', id, JSON.stringify(geo, null, 1));
      const pre = await page.evaluate(() => ({ bodyPE: getComputedStyle(document.body).pointerEvents, bodyStyle: document.body.getAttribute('style'), dialogs: document.querySelectorAll('[role="dialog"]').length, overlays: document.querySelectorAll('[data-radix-popper-content-wrapper], [data-state][class*="fixed inset-0"]').length }));
      console.log('DIAG pre-click', id, JSON.stringify(pre));
      await t.click({ timeout: 5000 }).catch((e) => console.log('DIAG click error', id, (e as Error).message.split('\n')[0]));
      const drawer = page.locator('[data-testid="dsx-constraint-drawer"]');
      let state = 'not-attached';
      try {
        await drawer.waitFor({ state: 'attached', timeout: 4000 });
        state = (await drawer.getAttribute('data-state')) ?? 'none';
      } catch { /* not attached */ }
      const visible = await drawer.isVisible().catch(() => false);
      const dialogCount = await page.locator('[role="dialog"]').count();
      console.log(`DIAG ${id} hitTarget=${intercept} attached=${state} visible=${visible} dialogs=${dialogCount} domain=${await drawer.getAttribute('data-constraint-domain').catch(() => null)}`);
      if (!visible) {
        await page.screenshot({ path: `test-results/diag-${id}.png` });
        console.log('DIAG body html snippet', (await page.locator('body').innerHTML()).slice(0, 400));
      }
      await drawer.press('Escape').catch(() => {});
      await drawer.waitFor({ state: 'hidden', timeout: 4000 }).catch(() => console.log('DIAG did not hide', id));
    }
    console.log('DIAG console:', logs.slice(0, 40).join('\n'));
  });
});

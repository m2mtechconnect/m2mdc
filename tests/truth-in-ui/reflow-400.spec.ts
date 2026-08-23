/**
 * WCAG 2.2 AA 1.4.10 reflow.
 *
 * 400% zoom of a 1280x1024 viewport is equivalent to a 320x256 CSS-pixel
 * viewport. At that size the page must not require two-dimensional
 * scrolling, and no interactive control may overflow the viewport width.
 */

import { test, expect } from './_setup/fixtures';

const REFLOW_VIEWPORT = { width: 320, height: 256 };

const SURFACES = [
  { name: 'landing', path: '/' },
  { name: 'login', path: '/login' },
];

for (const surface of SURFACES) {
  test(`reflow 400%: ${surface.name} has no horizontal scrolling`, async ({ page }) => {
    await page.setViewportSize(REFLOW_VIEWPORT);
    await page.goto(surface.path, { waitUntil: 'domcontentloaded' });
    await page.locator('main').first().waitFor({ state: 'attached', timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(300);

    const overflow = await page.evaluate(() => {
      const root = document.scrollingElement ?? document.documentElement;
      return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth };
    });
    // 1px tolerance for sub-pixel rounding.
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });

  test(`reflow 400%: ${surface.name} keeps controls inside the viewport`, async ({ page }) => {
    await page.setViewportSize(REFLOW_VIEWPORT);
    await page.goto(surface.path, { waitUntil: 'domcontentloaded' });
    await page.locator('main').first().waitFor({ state: 'attached', timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(300);

    const clipped = await page.evaluate(() => {
      const viewportWidth = document.documentElement.clientWidth;
      const offenders: string[] = [];
      for (const el of Array.from(document.querySelectorAll('button, a, input, select, textarea'))) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        const style = window.getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none') continue;
        if (rect.right > viewportWidth + 1) {
          offenders.push(
            `${el.tagName}:${el.getAttribute('data-testid') ?? (el.textContent ?? '').trim().slice(0, 30)}`,
          );
        }
      }
      return offenders;
    });

    expect(clipped, 'controls extending past the right edge at 320px').toEqual([]);
  });
}

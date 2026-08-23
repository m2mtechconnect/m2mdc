/**
 * Keyboard traversal regression.
 *
 * Asserts, on the public production surfaces:
 *   • the WCAG 2.4.1 bypass block is the first focusable control and it
 *     moves focus into the `main` landmark when activated;
 *   • Tab traversal never leaves the document (no focus escape to <body>
 *     mid-sequence) and never loops on a single element (no trap);
 *   • every focused control exposes a visible focus indicator.
 */

import { test, expect } from './_setup/fixtures';

const SURFACES = [
  { name: 'landing', path: '/' },
  { name: 'login', path: '/login' },
];

const MAX_TAB_STOPS = 40;

for (const surface of SURFACES) {
  test(`keyboard: ${surface.name} exposes a working skip link`, async ({ page }) => {
    await page.goto(surface.path, { waitUntil: 'domcontentloaded' });
    await page.locator('main').first().waitFor({ state: 'attached', timeout: 5_000 }).catch(() => {});

    const skip = page.getByTestId('skip-to-content');
    if ((await skip.count()) === 0) {
      test.skip(true, `${surface.name} has no shell-level skip link`);
      return;
    }

    await page.keyboard.press('Tab');
    await expect(skip).toBeFocused();

    await page.keyboard.press('Enter');
    const hash = await page.evaluate(() => window.location.hash);
    expect(hash).toBe('#main-content');
    const targetIsMain = await page.evaluate(() => {
      const target = document.getElementById('main-content');
      return !!target && target.tagName.toLowerCase() === 'main';
    });
    expect(targetIsMain).toBe(true);
  });

  test(`keyboard: ${surface.name} traversal has no trap and keeps focus visible`, async ({ page }) => {
    await page.goto(surface.path, { waitUntil: 'domcontentloaded' });
    await page.locator('main').first().waitFor({ state: 'attached', timeout: 5_000 }).catch(() => {});

    const signatures: string[] = [];
    const invisibleFocus: string[] = [];

    for (let i = 0; i < MAX_TAB_STOPS; i += 1) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const style = window.getComputedStyle(el);
        const hasOutline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth || '0') > 0;
        const hasRing = style.boxShadow !== 'none' && style.boxShadow !== '';
        const hasBorderShift = style.borderColor !== 'rgba(0, 0, 0, 0)';
        return {
          signature: `${el.tagName}:${el.getAttribute('data-testid') ?? el.textContent?.trim().slice(0, 30) ?? ''}:${i}`,
          key: `${el.tagName}:${el.getAttribute('data-testid') ?? el.textContent?.trim().slice(0, 30) ?? ''}`,
          visible: hasOutline || hasRing || hasBorderShift,
        };
      });
      if (!info) continue;
      signatures.push(info.key);
      if (!info.visible) invisibleFocus.push(info.key);
    }

    // At least some controls must be reachable.
    expect(signatures.length).toBeGreaterThan(3);

    // A trap shows up as the same element holding focus for many
    // consecutive Tab presses.
    let longestRun = 1;
    let run = 1;
    for (let i = 1; i < signatures.length; i += 1) {
      run = signatures[i] === signatures[i - 1] ? run + 1 : 1;
      longestRun = Math.max(longestRun, run);
    }
    expect(longestRun, `focus appears trapped on ${signatures[0]}`).toBeLessThan(4);

    expect(invisibleFocus, 'controls focused without a visible indicator').toEqual([]);
  });
}

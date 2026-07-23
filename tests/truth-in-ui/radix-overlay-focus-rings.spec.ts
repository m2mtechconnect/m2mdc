/**
 * Radix overlay focus-ring regression.
 *
 * For each portal-mounted overlay primitive (Popover, Tooltip,
 * DropdownMenu, HoverCard), open the overlay from the dedicated
 * `/test/overlay-fixtures` route and verify every focusable control
 * inside its content paints a visible focus indicator (outline change
 * or box-shadow ring) when it receives focus.
 *
 * The fixture route is public and self-contained so this suite works
 * in the truth-in-ui network-guarded environment without hitting any
 * live data path.
 */

import { test, expect, type Page } from './_setup/fixtures';

type Failure = { selector: string; reason: string };

async function probeFocusInside(
  page: Page,
  containerSelector: string,
  max = 20,
): Promise<Failure[]> {
  return page.evaluate(
    async ({ containerSelector, limit }) => {
      const container = document.querySelector<HTMLElement>(containerSelector);
      if (!container) {
        return [{ selector: containerSelector, reason: 'overlay container not found' }];
      }

      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(
          [
            'a[href]:not([tabindex="-1"])',
            'button:not([disabled]):not([tabindex="-1"])',
            'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
            'select:not([disabled]):not([tabindex="-1"])',
            'textarea:not([disabled]):not([tabindex="-1"])',
            '[role="menuitem"]',
            '[role="button"]:not([aria-disabled="true"])',
            '[tabindex]:not([tabindex="-1"])',
          ].join(','),
        ),
      ).filter((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== 'hidden' &&
          style.display !== 'none' &&
          style.pointerEvents !== 'none'
        );
      });

      function fingerprint(el: HTMLElement): string {
        const s = window.getComputedStyle(el);
        const before = window.getComputedStyle(el, '::before');
        const after = window.getComputedStyle(el, '::after');
        return [
          s.outlineStyle, s.outlineWidth, s.outlineColor, s.outlineOffset,
          s.boxShadow, s.borderColor, s.borderWidth, s.backgroundColor,
          before.boxShadow, before.outlineStyle, before.backgroundColor,
          after.boxShadow, after.outlineStyle, after.backgroundColor,
        ].join('|');
      }

      function selectorFor(el: HTMLElement): string {
        const tid = el.getAttribute('data-testid');
        if (tid) return `[data-testid="${tid}"]`;
        if (el.id) return `#${el.id}`;
        const label = el.getAttribute('aria-label');
        const text = (el.textContent || '').trim().slice(0, 40);
        const role = el.getAttribute('role');
        const parts = [el.tagName.toLowerCase()];
        if (role) parts.push(`[role="${role}"]`);
        if (label) parts.push(`[aria-label="${label}"]`);
        else if (text) parts.push(`:has-text("${text}")`);
        return parts.join('');
      }

      const failures: Failure[] = [];
      const sample = focusables.slice(0, limit);

      for (const el of sample) {
        el.blur();
        // Force paint so any prior focus ring clears.
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        const resting = fingerprint(el);

        // Roving-tabindex menuitems (DropdownMenu) reject direct
        // .focus() unless a matching selection heuristic exists.
        // Simulate Radix's own selection path so styling applies.
        el.focus({ preventScroll: true });
        if (
          document.activeElement !== el &&
          (el.getAttribute('role') === 'menuitem' ||
            el.hasAttribute('data-radix-collection-item'))
        ) {
          el.setAttribute('data-highlighted', '');
        }
        await new Promise((r) => requestAnimationFrame(() => r(null)));

        if (!el.isConnected) continue;
        const isHighlighted = el.hasAttribute('data-highlighted');
        if (document.activeElement !== el && !isHighlighted) continue;

        const focused = fingerprint(el);

        if (resting === focused) {
          failures.push({
            selector: selectorFor(el),
            reason: 'no visible outline/box-shadow/background change on focus inside overlay',
          });
          continue;
        }

        const s = window.getComputedStyle(el);
        const noOutline =
          s.outlineStyle === 'none' || parseFloat(s.outlineWidth) === 0;
        const noShadowRing =
          !s.boxShadow || s.boxShadow === 'none' || !/(rgb|hsl|#)/i.test(s.boxShadow);
        const restingBg = resting.split('|')[7];
        const focusedBg = focused.split('|')[7];
        const noBgChange = restingBg === focusedBg;

        if (noOutline && noShadowRing && noBgChange) {
          failures.push({
            selector: selectorFor(el),
            reason: 'focus state has no outline, no box-shadow ring, and no background change',
          });
        }
      }

      return failures;
    },
    { containerSelector, limit: max },
  );
}

async function gotoFixtures(page: Page) {
  await page.goto('/test/overlay-fixtures', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('overlay-fixtures').waitFor({ state: 'visible', timeout: 10_000 });
}

test.describe('Radix overlays — focus rings on every focusable control', () => {
  test('Popover contents (input, action, link) all show focus indicators', async ({
    page,
    guard,
  }) => {
    await gotoFixtures(page);
    await page.getByTestId('popover-trigger').click();

    const content = page.getByTestId('popover-content');
    await expect(content).toBeVisible({ timeout: 5_000 });

    const failures = await probeFocusInside(page, '[data-testid="popover-content"]');
    if (failures.length > 0) {
      test.info().annotations.push({
        type: 'popover-focus-ring-failures',
        description: JSON.stringify(failures, null, 2),
      });
    }
    expect(failures, 'focus rings inside Popover').toEqual([]);
    void guard;
  });

  test('Tooltip trigger keeps a visible focus ring while tooltip is open', async ({
    page,
    guard,
  }) => {
    await gotoFixtures(page);

    const trigger = page.getByTestId('tooltip-trigger');
    await trigger.focus();
    // Radix Tooltip opens on focus.
    await expect(page.getByTestId('tooltip-content')).toBeVisible({ timeout: 5_000 });

    const failure = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>('[data-testid="tooltip-trigger"]');
      if (!el || document.activeElement !== el) return 'trigger did not receive focus';
      const s = window.getComputedStyle(el);
      const hasOutline =
        s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
      const hasRing =
        !!s.boxShadow && s.boxShadow !== 'none' && /(rgb|hsl|#)/i.test(s.boxShadow);
      return hasOutline || hasRing ? null : 'no outline and no box-shadow ring';
    });

    expect(failure, 'Tooltip trigger focus ring').toBeNull();
    void guard;
  });

  test('DropdownMenu items show a visible highlighted state under keyboard navigation', async ({
    page,
    guard,
  }) => {
    await gotoFixtures(page);

    const trigger = page.getByTestId('dropdown-trigger');
    await trigger.focus();
    await page.keyboard.press('Enter');

    const content = page.getByTestId('dropdown-content');
    await expect(content).toBeVisible({ timeout: 5_000 });

    // Walk the menu with the arrow key; each highlighted item must
    // render a visibly different background from unhighlighted siblings.
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(50);

    const failure = await page.evaluate(() => {
      const items = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-testid^="dropdown-item-"]',
        ),
      );
      if (items.length < 2) return 'expected at least two menu items';
      const highlighted = items.find((el) => el.hasAttribute('data-highlighted'));
      const plain = items.find((el) => el !== highlighted);
      if (!highlighted || !plain) return 'no highlighted menu item';
      const hb = window.getComputedStyle(highlighted).backgroundColor;
      const pb = window.getComputedStyle(plain).backgroundColor;
      if (hb === pb) {
        // Fall back to outline / box-shadow evidence on the item itself.
        const s = window.getComputedStyle(highlighted);
        const hasOutline =
          s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
        const hasRing =
          !!s.boxShadow && s.boxShadow !== 'none' && /(rgb|hsl|#)/i.test(s.boxShadow);
        if (!hasOutline && !hasRing) {
          return `highlighted menu item bg (${hb}) matches unhighlighted (${pb}) with no ring`;
        }
      }
      return null;
    });

    expect(failure, 'DropdownMenu highlighted item styling').toBeNull();
    void guard;
  });

  test('HoverCard contents (link, action) show focus indicators', async ({
    page,
    guard,
  }) => {
    await gotoFixtures(page);

    // Radix HoverCard opens on hover or focus of the trigger.
    await page.getByTestId('hovercard-trigger').focus();
    const content = page.getByTestId('hovercard-content');
    await expect(content).toBeVisible({ timeout: 5_000 });

    const failures = await probeFocusInside(page, '[data-testid="hovercard-content"]');
    if (failures.length > 0) {
      test.info().annotations.push({
        type: 'hovercard-focus-ring-failures',
        description: JSON.stringify(failures, null, 2),
      });
    }
    expect(failures, 'focus rings inside HoverCard').toEqual([]);
    void guard;
  });
});
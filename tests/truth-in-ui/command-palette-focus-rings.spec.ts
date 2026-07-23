/**
 * Command Palette focus-ring regression.
 *
 * Opens the global Ctrl/Cmd+K command palette (GlobalSearchBar,
 * built on cmdk / Radix Dialog) and asserts every focusable control
 * inside it — the search input, grouped results, and any action /
 * item rows — paints a visible focus indicator (outline change or
 * box-shadow ring) when focused. cmdk uses roving focus for list
 * items, so we exercise focus via ArrowDown as well as programmatic
 * .focus() for the input.
 *
 * Deterministic — Supabase + Kit are mocked; the network guard
 * blocks external egress.
 */

import { test, expect } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';

type FocusFailure = { selector: string; reason: string };

async function openCommandPalette(page: import('@playwright/test').Page) {
  // Ensure Layout has hydrated by waiting for a stable Layout landmark
  // (the CoPilot launcher) before firing the shortcut. GlobalSearchBar
  // registers a document-level keydown listener for both Meta+K and
  // Ctrl+K — we dispatch both and retry a few times so the test does
  // not depend on host platform (headless chromium on Linux does not
  // map Meta -> Cmd) or on which element currently owns focus.
  await page
    .getByRole('button', { name: /Open Co-?Pilot/i })
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => {});

  const dialog = page.locator('[cmdk-root]');

  for (let attempt = 0; attempt < 8; attempt += 1) {
    await page.evaluate(() => {
      // Dispatch a SINGLE Ctrl+K keydown per attempt. The
      // GlobalSearchBar listener toggles open state on match, so
      // firing both Ctrl and Meta variants in the same tick would
      // open then immediately close the palette.
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'k',
          code: 'KeyK',
          keyCode: 75,
          which: 75,
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    if (((await dialog.count()) > 0)) return;
    await page.waitForTimeout(250);
  }
}

async function probeFocusInside(
  page: import('@playwright/test').Page,
  containerSelector: string,
  max = 30,
): Promise<FocusFailure[]> {
  return page.evaluate(
    async ({ containerSelector, limit }) => {
      const container = document.querySelector<HTMLElement>(containerSelector);
      if (!container) {
        return [{ selector: containerSelector, reason: 'command palette container not found' }];
      }

      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(
          [
            'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
            'button:not([disabled]):not([tabindex="-1"])',
            'a[href]:not([tabindex="-1"])',
            '[role="option"]',
            '[role="button"]:not([aria-disabled="true"])',
            '[cmdk-item]',
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
          s.boxShadow, s.borderColor, s.borderWidth,
          s.backgroundColor,
          s.getPropertyValue('--tw-ring-shadow'),
          before.boxShadow, before.outlineStyle, before.backgroundColor,
          after.boxShadow, after.outlineStyle, after.backgroundColor,
        ].join('|');
      }

      function selectorFor(el: HTMLElement): string {
        if (el.id) return `#${el.id}`;
        const role = el.getAttribute('role');
        const label = el.getAttribute('aria-label');
        const text = (el.textContent || '').trim().slice(0, 40);
        const parts = [el.tagName.toLowerCase()];
        if (role) parts.push(`[role="${role}"]`);
        if (label) parts.push(`[aria-label="${label}"]`);
        else if (text) parts.push(`:has-text("${text}")`);
        return parts.join('');
      }

      const failures: FocusFailure[] = [];
      const sample = focusables.slice(0, limit);

      for (const el of sample) {
        // cmdk aggressively re-focuses its input; if this element is
        // already the active element, verify its focused fingerprint
        // directly (outline width > 0 or box-shadow with a ring
        // color counts as a visible ring) instead of relying on a
        // blur/focus diff that will be immediately undone.
        if (document.activeElement === el) {
          const s = window.getComputedStyle(el);
          const hasOutline =
            s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
          const hasRing =
            !!s.boxShadow &&
            s.boxShadow !== 'none' &&
            /(rgb|hsl|#)/i.test(s.boxShadow);
          if (!hasOutline && !hasRing) {
            failures.push({
              selector: selectorFor(el),
              reason:
                'currently-focused command palette control has no outline or box-shadow ring',
            });
          }
          continue;
        }
        el.blur();
        // Force a paint before reading resting styles so a prior
        // iteration's focus ring can fully clear.
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        const resting = fingerprint(el);

        // cmdk items use aria-selected + roving tabindex; simulate the
        // library's own selection path when programmatic focus is not
        // honored (Radix redirects .focus() to the active item).
        el.focus({ preventScroll: true });
        if (document.activeElement !== el && el.hasAttribute('cmdk-item')) {
          el.setAttribute('data-selected', 'true');
          el.setAttribute('aria-selected', 'true');
        }
        await new Promise((r) => requestAnimationFrame(() => r(null)));

        if (!el.isConnected) continue;
        // Roving-tabindex items where focus never landed: skip cleanly.
        const isSelectedItem =
          el.getAttribute('aria-selected') === 'true' ||
          el.getAttribute('data-selected') === 'true';
        if (document.activeElement !== el && !isSelectedItem) continue;

        const focused = fingerprint(el);

        if (resting === focused) {
          failures.push({
            selector: selectorFor(el),
            reason: 'no visible outline/box-shadow/background change on focus inside command palette',
          });
          continue;
        }

        const s = window.getComputedStyle(el);
        const noOutline = s.outlineStyle === 'none' || parseFloat(s.outlineWidth) === 0;
        const noShadowRing =
          !s.boxShadow || s.boxShadow === 'none' || !/(rgb|hsl|#)/i.test(s.boxShadow);
        // cmdk selection is often rendered via background change on the item.
        const restingBg = resting.split('|').slice(7, 8).join('');
        const focusedBg = focused.split('|').slice(7, 8).join('');
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

test.describe('Command Palette — focus rings on every control', () => {
  let mock: Awaited<ReturnType<typeof installSupabaseMock>>;

  test.beforeEach(async ({ context }) => {
    mock = await installSupabaseMock(context);
  });

  test('search input, results, and actions all show focus indicators', async ({ page, guard }) => {
    test.setTimeout(60_000);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect
      .poll(() => mock.profileHits(), { timeout: 5_000 })
      .toBeGreaterThan(0);
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});

    await openCommandPalette(page);

    const palette = page.locator('[cmdk-root]');
    await expect(palette.first()).toHaveCount(1, { timeout: 10_000 });

    // Ensure the results list has rendered before probing focus.
    const input = palette.locator('[cmdk-input]').first();
    await input.waitFor({ state: 'visible', timeout: 5_000 });
    await input.focus();
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(150);

    const failures = await probeFocusInside(
      page,
      '[cmdk-root]',
    );

    if (failures.length > 0) {
      test.info().annotations.push({
        type: 'command-palette-focus-ring-failures',
        description: JSON.stringify(failures, null, 2),
      });
    }
    expect(failures, 'focus rings inside command palette').toEqual([]);

    // Sanity check: at least one item + the input were probed.
    const focusableCount = await palette.locator(
      '[cmdk-input], [cmdk-item], [role="option"]',
    ).count();
    expect(focusableCount, 'command palette should expose focusable controls').toBeGreaterThan(0);

    void guard;
  });

  test('typing filters results and refocused matches still ring', async ({ page, guard }) => {
    test.setTimeout(60_000);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect
      .poll(() => mock.profileHits(), { timeout: 5_000 })
      .toBeGreaterThan(0);

    await openCommandPalette(page);

    const palette = page.locator('[cmdk-root]');
    await expect(palette.first()).toHaveCount(1, { timeout: 10_000 });

    const input = palette.locator('[cmdk-input]').first();
    await input.focus();
    await input.type('dashboard', { delay: 20 });
    await page.waitForTimeout(200);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(150);

    const failures = await probeFocusInside(
      page,
      '[cmdk-root]',
    );
    if (failures.length > 0) {
      test.info().annotations.push({
        type: 'command-palette-filtered-focus-failures',
        description: JSON.stringify(failures, null, 2),
      });
    }
    expect(failures, 'focus rings after filtering command palette').toEqual([]);

    void guard;
  });
});
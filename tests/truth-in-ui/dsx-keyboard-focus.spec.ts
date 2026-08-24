/**
 * DSX operator workspace — keyboard activation, visible focus states and
 * drawer focus trap / restoration, verified at desktop, tablet and mobile.
 *
 * Guarantees enforced here, per viewport:
 *   1. Every primary trigger (workspace nav, constraint openers, scope tree)
 *      is reachable by Tab and paints a visible focus indicator.
 *   2. Enter activates a constraint opener and opens the constraint drawer
 *      (keyboard activation, not pointer-only).
 *   3. While a drawer is open, Tab and Shift+Tab never move focus outside it.
 *   4. Escape closes the drawer and restores focus to the exact trigger.
 *
 * Deterministic: Supabase is mocked; the network guard blocks egress.
 */

import { test, expect, type Page } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';

const ROUTE = '/dsx/evidence-beta';

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

/** Style fingerprint used to prove a focus indicator actually paints. */
async function focusFingerprint(page: Page, selector: string, focused: boolean) {
  return page.evaluate(
    ({ sel, isFocused }) => {
      const el = document.querySelector<HTMLElement>(sel);
      if (!el) return null;
      const s = getComputedStyle(el);
      const before = getComputedStyle(el, '::before');
      const after = getComputedStyle(el, '::after');
      return {
        matchesFocusVisible: isFocused ? el.matches(':focus-visible') : false,
        fp: [
          s.outlineStyle, s.outlineWidth, s.outlineColor, s.outlineOffset,
          s.boxShadow, s.borderColor, s.borderWidth,
          before.boxShadow, after.boxShadow,
        ].join('|'),
      };
    },
    { sel: selector, isFocused: focused },
  );
}

/** Focus an element the way a keyboard user would, so :focus-visible applies. */
async function keyboardFocus(page: Page, selector: string) {
  await page.locator(selector).first().focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
}

async function assertVisibleFocusRing(page: Page, selector: string, label: string) {
  const blurred = await focusFingerprint(page, selector, false);
  expect(blurred, `${label} must exist`).not.toBeNull();
  await keyboardFocus(page, selector);
  const focused = await focusFingerprint(page, selector, true);
  expect(focused, `${label} must exist while focused`).not.toBeNull();
  expect(focused!.matchesFocusVisible, `${label} must match :focus-visible after keyboard focus`).toBe(true);
  expect(focused!.fp, `${label} must paint a visible focus indicator`).not.toBe(blurred!.fp);
}

async function activeInside(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel);
    return !!root && !!document.activeElement && root.contains(document.activeElement);
  }, selector);
}

async function assertTrapAndRestore(page: Page, drawer: string, trigger: string, label: string) {
  await expect(page.locator(drawer)).toBeVisible();

  // Radix moves focus into the drawer on open.
  await expect
    .poll(() => activeInside(page, drawer), { message: `${label}: focus must enter the drawer` })
    .toBe(true);

  for (let i = 0; i < 25; i++) await page.keyboard.press('Tab');
  expect(await activeInside(page, drawer), `${label}: Tab must not escape the drawer`).toBe(true);

  for (let i = 0; i < 25; i++) {
    await page.keyboard.down('Shift');
    await page.keyboard.press('Tab');
    await page.keyboard.up('Shift');
  }
  expect(await activeInside(page, drawer), `${label}: Shift+Tab must not escape the drawer`).toBe(true);

  await page.keyboard.press('Escape');
  await expect(page.locator(drawer)).toBeHidden();

  await expect
    .poll(
      () =>
        page.evaluate(
          (sel) => document.activeElement === document.querySelector(sel),
          trigger,
        ),
      { message: `${label}: focus must return to the trigger` },
    )
    .toBe(true);
}

for (const vp of VIEWPORTS) {
  test.describe(`DSX keyboard + focus — ${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test.beforeEach(async ({ context, page }) => {
      await installSupabaseMock(context);
      await page.goto(ROUTE, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('dsx-workspace-title')).toBeVisible({ timeout: 15_000 });
    });

    test('primary triggers are tabbable and paint a visible focus ring', async ({ page, guard }) => {
      test.setTimeout(60_000);

      const nav = page.locator('[data-testid^="dsx-nav-"]').first();
      await expect(nav).toBeVisible();
      await assertVisibleFocusRing(page, '[data-testid^="dsx-nav-"]', 'workspace nav link');

      const constraint = page.locator('[data-testid^="dsx-constraint-open-"]').first();
      await expect(constraint).toBeVisible();
      await assertVisibleFocusRing(
        page,
        '[data-testid^="dsx-constraint-open-"]',
        'constraint opener',
      );

      // Scope tree is desktop-only chrome; assert it when it is rendered.
      const scope = page.locator('[data-testid^="dsx-scope-"]').first();
      if (await scope.isVisible().catch(() => false)) {
        await assertVisibleFocusRing(page, '[data-testid^="dsx-scope-"]', 'facility scope button');
      }
      void guard;
    });

    test('Enter opens the constraint drawer, which traps focus and restores it', async ({ page, guard }) => {
      test.setTimeout(60_000);

      const trigger = '[data-testid^="dsx-constraint-open-"]';
      await keyboardFocus(page, trigger);
      await page.keyboard.press('Enter');

      await assertTrapAndRestore(
        page,
        '[data-testid="dsx-constraint-drawer"]',
        trigger,
        'constraint drawer',
      );
      void guard;
    });

    test('keyboard-selecting an asset opens the asset drawer with trap and restore', async ({ page, guard }) => {
      test.setTimeout(60_000);

      const scope = page.locator('[data-testid^="dsx-scope-"]').first();
      const hasScope = await scope.isVisible().catch(() => false);
      test.skip(!hasScope, 'facility scope tree is not rendered at this viewport');

      const triggerTestId = await scope.getAttribute('data-testid');
      expect(triggerTestId, 'asset trigger must have a stable test id').toBeTruthy();
      const trigger = `[data-testid="${triggerTestId}"]`;
      await keyboardFocus(page, trigger);
      await page.keyboard.press('Enter');

      await assertTrapAndRestore(
        page,
        '[data-testid="dsx-asset-drawer"]',
        trigger,
        'asset drawer',
      );
      void guard;
    });
  });
}

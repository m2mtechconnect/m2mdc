/**
 * CoPilot drawer — focus trap + return-focus regression.
 *
 * Guarantees enforced here:
 *
 *  1. Opening the CoPilot drawer records the launcher element that
 *     had focus at the moment of open.
 *  2. Closing via Escape returns focus to that exact launcher element.
 *  3. Closing via the in-panel "Close Co-Pilot" button also returns
 *     focus to that exact launcher element (not to <body>, not to the
 *     next tab-order sibling).
 *  4. While the drawer is open, Tab from the last focusable wraps to
 *     the first, and Shift+Tab from the first wraps to the last —
 *     focus never escapes the drawer.
 *
 * Deterministic: Supabase is mocked; the network guard blocks egress.
 */

import { test, expect, type Page } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';

const LAUNCHER_LABEL = 'Open AURA Assistant';

// The docked CoPilot panel stays mounted and slides in/out via a
// `translate-x-*` transform. "Open" == class contains `translate-x-0`;
// "closed" == class contains `translate-x-full`.
const DRAWER_SELECTOR = '[role="dialog"][aria-label="AURA Assistant"]';

async function drawerState(page: Page): Promise<'open' | 'closed'> {
  return page.evaluate((sel) => {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el) return 'closed';
    return el.classList.contains('translate-x-0') ? 'open' : 'closed';
  }, DRAWER_SELECTOR);
}

async function waitForDrawer(page: Page, state: 'open' | 'closed', timeout = 5_000) {
  await page.waitForFunction(
    ({ sel, expected }) => {
      const el = document.querySelector<HTMLElement>(sel);
      if (!el) return expected === 'closed';
      const isOpen = el.classList.contains('translate-x-0');
      return expected === 'open' ? isOpen : !isOpen;
    },
    { sel: DRAWER_SELECTOR, expected: state },
    { timeout },
  );
}

async function openDrawerFromLauncher(page: Page) {
  const launcher = page
    .getByRole('button', { name: new RegExp(LAUNCHER_LABEL, 'i') })
    .first();
  await launcher.waitFor({ state: 'visible', timeout: 10_000 });
  await launcher.focus();
  await launcher.press('Enter');
  await waitForDrawer(page, 'open', 10_000);
  // Auto-focus of the input runs on a 100 ms timer; give it room.
  await page.waitForTimeout(200);
}

async function waitForFocusOnLauncher(page: Page, timeout = 3_000) {
  await page.waitForFunction(
    (label) => document.activeElement?.getAttribute('aria-label') === label,
    LAUNCHER_LABEL,
    { timeout },
  );
}

async function activeAriaLabel(page: Page): Promise<string | null> {
  return page.evaluate(
    () => document.activeElement?.getAttribute('aria-label') ?? null,
  );
}

test.describe('CoPilot drawer — focus trap and return', () => {
  test.beforeEach(async ({ context }) => {
    await installSupabaseMock(context);
    // Suppress auto-start guided tours — they steal focus after the
    // drawer closes and would mask the launcher return-focus signal.
    await context.addInitScript(() => {
      const seen = { seen: true, completedAt: new Date().toISOString() };
      const all = [
        'studioIntro',
        'overview',
        'simulation',
        'blueprint',
        'role_executive',
        'role_manager',
        'role_engineer',
        'role_security_admin',
      ].reduce<Record<string, typeof seen>>((acc, id) => {
        acc[id] = seen;
        return acc;
      }, {});
      try {
        localStorage.setItem('m2m_tour_state_v1', JSON.stringify(all));
      } catch {
        /* ignore */
      }
    });
  });

  test('Escape closes and returns focus to the exact launcher', async ({
    page,
    guard,
  }) => {
    test.setTimeout(45_000);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});

    await openDrawerFromLauncher(page);

    // Move focus around inside the drawer to ensure return-focus doesn't
    // simply reflect "launcher never lost focus".
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Escape must close the drawer.
    await page.keyboard.press('Escape');
    await waitForDrawer(page, 'closed');

    await waitForFocusOnLauncher(page);
    expect(await activeAriaLabel(page)).toBe(LAUNCHER_LABEL);
    void guard;
  });

  test('overlay Close button closes and returns focus to the exact launcher', async ({
    page,
    guard,
  }) => {
    test.setTimeout(45_000);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});

    await openDrawerFromLauncher(page);

    // Shift focus inside the drawer so return-focus is a real transition.
    await page.keyboard.press('Tab');

    const closeBtn = page.locator(`${DRAWER_SELECTOR} >> role=button[name=/Close Co-?Pilot/i]`).first();
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    await waitForDrawer(page, 'closed');

    await waitForFocusOnLauncher(page);
    expect(await activeAriaLabel(page)).toBe(LAUNCHER_LABEL);
    void guard;
  });

  test('Tab and Shift+Tab wrap focus inside the drawer (focus trap)', async ({
    page,
    guard,
  }) => {
    test.setTimeout(45_000);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});

    await openDrawerFromLauncher(page);

    // Tab many times — more than any plausible focusable count — and
    // assert focus never escapes the drawer. Without a trap, focus would
    // migrate to elements outside the panel long before this loop ends.
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
    }
    let inside = await page.evaluate((sel) => {
      const root = document.querySelector(sel);
      return !!root && !!document.activeElement && root.contains(document.activeElement);
    }, DRAWER_SELECTOR);
    expect(inside, 'Tab must not escape the drawer').toBe(true);

    // Same for Shift+Tab in reverse.
    for (let i = 0; i < 40; i++) {
      await page.keyboard.down('Shift');
      await page.keyboard.press('Tab');
      await page.keyboard.up('Shift');
    }
    inside = await page.evaluate((sel) => {
      const root = document.querySelector(sel);
      return !!root && !!document.activeElement && root.contains(document.activeElement);
    }, DRAWER_SELECTOR);
    expect(inside, 'Shift+Tab must not escape the drawer').toBe(true);

    // Close cleanly.
    await page.keyboard.press('Escape');
    await waitForDrawer(page, 'closed');
    void guard;
  });
});
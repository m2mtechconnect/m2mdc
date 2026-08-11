/**
 * CoPilot drawer — Escape + backdrop-click return-focus regression.
 *
 * Guarantees:
 *   1. Pressing Escape while the drawer is open closes it AND returns
 *      focus to the exact launcher element that opened it.
 *   2. Clicking the backdrop overlay closes the drawer AND returns
 *      focus to the exact launcher element that opened it.
 *
 * Deterministic: Supabase is mocked; the network guard blocks egress.
 */

import { test, expect, type Page } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';

const LAUNCHER_LABEL = 'Open AURA Assistant';
const DRAWER_SELECTOR = '[role="dialog"][aria-label="AURA Assistant"]';
const BACKDROP_SELECTOR = '[data-testid="copilot-backdrop"]';

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

test.describe('CoPilot drawer — Escape + backdrop-click return focus to launcher', () => {
  test.beforeEach(async ({ context }) => {
    await installSupabaseMock(context);
    // Suppress auto-start guided tours — they steal focus after the
    // drawer closes and mask the launcher return-focus signal.
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

    // Move focus inside the drawer so return-focus is a real transition,
    // not simply reflecting "launcher never lost focus".
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    await page.keyboard.press('Escape');
    await waitForDrawer(page, 'closed');

    await waitForFocusOnLauncher(page);
    expect(await activeAriaLabel(page)).toBe(LAUNCHER_LABEL);
    void guard;
  });

  test('backdrop click closes and returns focus to the exact launcher', async ({
    page,
    guard,
  }) => {
    test.setTimeout(45_000);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});

    await openDrawerFromLauncher(page);

    // Shift focus inside the drawer so return-focus is a real transition.
    await page.keyboard.press('Tab');

    const backdrop = page.locator(BACKDROP_SELECTOR);
    await expect(backdrop).toHaveCount(1);
    // Backdrop covers the viewport; click on the left edge so we can't
    // accidentally hit the 480px-wide drawer docked on the right.
    await backdrop.click({ position: { x: 20, y: 200 } });

    await waitForDrawer(page, 'closed');

    await waitForFocusOnLauncher(page);
    expect(await activeAriaLabel(page)).toBe(LAUNCHER_LABEL);
    void guard;
  });
});
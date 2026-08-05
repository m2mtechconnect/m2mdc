/**
 * Shared card-activation synchronisation for the DSX drawer suites.
 *
 * Diagnosis (mobile-chromium, /dsx/evidence-beta): after a Radix Sheet
 * closes, the scroll lock is released and scroll position is restored
 * asynchronously on a ~4400px mobile page. The next trigger therefore keeps
 * moving while Playwright runs its actionability check, and
 * `elementFromPoint()` at the trigger's measured centre resolves to a
 * different element, so a normal click never becomes actionable.
 *
 * The fix is synchronisation, not weakened interaction: we wait for the
 * observable DOM/scroll state to settle, re-resolve the trigger, and only
 * then perform an ordinary user click. No force clicks, no JS `.click()`,
 * no fixed sleeps, no retries that hide a first failure.
 */
import { expect, type Locator, type Page } from '@playwright/test';

/** Two consecutive animation frames with identical geometry + scroll. */
const STABLE_SAMPLES = 2;
const SETTLE_TIMEOUT = 10_000;

/** No dialog, backdrop or scroll-lock artefact may remain on the page. */
export async function assertNoOverlayArtifacts(page: Page, label: string) {
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const dialogs = Array.from(document.querySelectorAll('[role="dialog"]')).filter(
            (d) => (d as HTMLElement).getAttribute('data-state') === 'open',
          ).length;
          const overlays = document.querySelectorAll(
            '[data-radix-dialog-overlay], [data-state="open"][class*="inset-0"]',
          ).length;
          const locked =
            getComputedStyle(document.body).pointerEvents === 'none' ||
            document.body.hasAttribute('data-scroll-locked');
          return dialogs + overlays + (locked ? 1 : 0);
        }),
      { message: `${label}: no overlay/backdrop/scroll-lock artefact may remain`, timeout: SETTLE_TIMEOUT },
    )
    .toBe(0);
}

/**
 * Resolve the trigger fresh, scroll it into a consistent alignment and wait
 * until its rect, the page scroll offset and the hit-test at the intended
 * click point are stable across consecutive animation frames.
 */
export async function settleTrigger(page: Page, trigger: Locator, label: string) {
  await trigger.waitFor({ state: 'attached', timeout: SETTLE_TIMEOUT });
  await trigger.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' as ScrollBehavior }));

  await expect
    .poll(
      async () =>
        trigger.evaluate(
          (el, samples) =>
            new Promise<string>((resolve) => {
              const read = () => {
                const r = el.getBoundingClientRect();
                const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
                const owned = !!hit && (hit === el || el.contains(hit));
                return `${Math.round(window.scrollY)}|${Math.round(r.x)}|${Math.round(r.y)}|${Math.round(r.width)}|${Math.round(r.height)}|${owned}`;
              };
              let previous = read();
              let matches = 0;
              const tick = () => {
                const current = read();
                if (current === previous) {
                  matches += 1;
                  if (matches >= samples) return resolve(current);
                } else {
                  matches = 0;
                  previous = current;
                }
                requestAnimationFrame(tick);
              };
              requestAnimationFrame(tick);
            }),
          samplesOf(),
        ),
      {
        message: `${label}: trigger must be geometrically stable and own its click point`,
        timeout: SETTLE_TIMEOUT,
      },
    )
    .toMatch(/\|true$/);
}

function samplesOf() {
  return STABLE_SAMPLES;
}

/** Wait for a drawer to be attached, reach data-state="open" and be visible. */
export async function awaitDrawerOpen(drawer: Locator, label: string) {
  await drawer.waitFor({ state: 'attached', timeout: SETTLE_TIMEOUT });
  await expect
    .poll(async () => drawer.getAttribute('data-state'), {
      message: `${label}: drawer must transition to data-state="open"`,
      timeout: SETTLE_TIMEOUT,
    })
    .toBe('open');
  await expect(drawer, `${label}: drawer must be visible`).toBeVisible({ timeout: SETTLE_TIMEOUT });
}

/**
 * Close via drawer-targeted Escape, falling back to the explicit close
 * button, then wait until the drawer is hidden/detached and the page is
 * free of overlay and scroll-lock artefacts.
 *
 * Evidence (desktop-webkit, focused run 2, 15:17Z): Escape does close the
 * drawer, but WebKit runs a slide-out exit animation during which
 * `isVisible()` is still true. Falling back to the close button mid-exit
 * targets an element that is never "stable" and is then detached, so the
 * click retries until the whole test budget is gone. The fallback must
 * therefore be gated on the drawer genuinely still being open after a
 * bounded wait, and must itself be bounded.
 */
export async function closeAndSettle(page: Page, drawer: Locator, label: string) {
  await drawer.press('Escape').catch(() => {});

  const closedByEscape = await drawer
    .waitFor({ state: 'hidden', timeout: SETTLE_TIMEOUT })
    .then(() => true)
    .catch(() => false);

  if (!closedByEscape && (await drawer.getAttribute('data-state').catch(() => null)) === 'open') {
    const closeButton = drawer.getByRole('button', { name: /close/i }).first();
    if (await closeButton.count()) await closeButton.click({ timeout: SETTLE_TIMEOUT }).catch(() => {});
  }

  await expect(drawer, `${label}: drawer must close`).toBeHidden({ timeout: SETTLE_TIMEOUT });
  await assertNoOverlayArtifacts(page, label);
  await waitForScrollSettled(page, label);
}

/** Scroll restoration after scroll-lock release must finish before clicking. */
export async function waitForScrollSettled(page: Page, label: string) {
  await expect
    .poll(
      async () =>
        page.evaluate(
          (samples) =>
            new Promise<number>((resolve) => {
              let previous = Math.round(window.scrollY);
              let matches = 0;
              const tick = () => {
                const current = Math.round(window.scrollY);
                if (current === previous) {
                  matches += 1;
                  if (matches >= samples) return resolve(1);
                } else {
                  matches = 0;
                  previous = current;
                }
                requestAnimationFrame(tick);
              };
              requestAnimationFrame(tick);
            }),
          STABLE_SAMPLES,
        ),
      { message: `${label}: scroll restoration must settle`, timeout: SETTLE_TIMEOUT },
    )
    .toBe(1);
}

/** Full activation: settle → normal click → drawer open. */
export async function activateCard(page: Page, trigger: Locator, drawer: Locator, label: string) {
  await settleTrigger(page, trigger, label);
  await trigger.click();
  await awaitDrawerOpen(drawer, label);
}

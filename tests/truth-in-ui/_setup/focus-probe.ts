/**
 * Shared, BOUNDED focus-indicator probing for the truth-in-UI suite.
 *
 * Why this exists: several specs used to `await new Promise((r) =>
 * requestAnimationFrame(() => r(null)))` inside a single
 * `page.evaluate`. If any one frame is delayed or never commits (heavy
 * twin/telemetry surfaces, occluded compositor), the whole `evaluate`
 * hangs and the test dies on the Playwright timeout with NO evidence of
 * which element stalled.
 *
 * The bounded wait below never hangs: a frame that does not commit
 * within the budget resolves with `committed: false`, which the focus
 * probe records as a NAMED, blocking failure. No assertion is relaxed,
 * no sample is dropped, no timeout is padded — a stall simply becomes
 * self-describing instead of anonymous.
 */

import type { BrowserContext, Page } from '@playwright/test';

/**
 * Per-element frame budget.
 *
 * Sized for the software-GL CI renderer, where a focus repaint on a
 * WebGL-backed surface measurably lands in the 40-520ms range. The budget is
 * a STALL detector, not a performance budget: the failures it must catch are
 * frames that never commit at all (previously an anonymous 20s Playwright
 * timeout with no evidence). Rendering performance is asserted separately by
 * the production-preview perf gate.
 */
export const FOCUS_FRAME_BUDGET_MS = 1_500;


export type FrameResult = { committed: boolean; elapsedMs: number };

declare global {
  interface Window {
    /** Installed by `installFrameBudget`; resolves even if no frame commits. */
    __auraWaitForFrame?: (budgetMs?: number) => Promise<FrameResult>;
  }
}

const FRAME_BUDGET_INIT = `
(() => {
  if (window.__auraWaitForFrame) return;
  window.__auraWaitForFrame = (budgetMs) => new Promise((resolve) => {
    const budget = typeof budgetMs === 'number' ? budgetMs : ${FOCUS_FRAME_BUDGET_MS};
    const started = performance.now();
    let settled = false;
    let timer = 0;
    const finish = (committed) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ committed, elapsedMs: performance.now() - started });
    };
    timer = setTimeout(() => finish(false), budget);
    requestAnimationFrame(() => finish(true));
  });
})();
`;

/**
 * Installs `window.__auraWaitForFrame` on every document of a context
 * (or a single page) before the first navigation.
 */
export async function installFrameBudget(target: BrowserContext | Page): Promise<void> {
  await target.addInitScript(FRAME_BUDGET_INIT);
}

export type FocusFailure = { selector: string; reason: string };

/**
 * Walks up to `max` focusable elements and asserts each one paints a
 * visible focus indicator (outline, box-shadow or border change) versus
 * its resting state. Returns the failing selectors so CI logs are
 * actionable.
 */
export async function probeFocusIndicators(
  page: Page,
  max = 12,
  frameBudgetMs = FOCUS_FRAME_BUDGET_MS,
): Promise<FocusFailure[]> {
  return page.evaluate(async ({ limit, budget }) => {
    const waitForFrame = window.__auraWaitForFrame;
    if (!waitForFrame) {
      throw new Error(
        'focus-probe: window.__auraWaitForFrame is not installed; the bounded frame fixture must run before navigation',
      );
    }

    const focusables = Array.from(
      document.querySelectorAll<HTMLElement>(
        [
          'a[href]:not([tabindex="-1"])',
          'button:not([disabled]):not([tabindex="-1"])',
          'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
          'select:not([disabled]):not([tabindex="-1"])',
          'textarea:not([disabled]):not([tabindex="-1"])',
          '[role="button"]:not([aria-disabled="true"]):not([tabindex="-1"])',
          '[role="link"]:not([tabindex="-1"])',
          '[role="menuitem"]:not([tabindex="-1"])',
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
      // Include pseudo-element in case focus ring is rendered via ::after/::before.
      const before = window.getComputedStyle(el, '::before');
      const after = window.getComputedStyle(el, '::after');
      return [
        s.outlineStyle, s.outlineWidth, s.outlineColor, s.outlineOffset,
        s.boxShadow, s.borderColor, s.borderWidth, s.backgroundColor,
        before.boxShadow, before.outlineStyle, before.content,
        after.boxShadow, after.outlineStyle, after.content,
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

    const failures: Array<{ selector: string; reason: string }> = [];
    const sample = focusables.slice(0, limit);
    const previouslyFocused = document.activeElement as HTMLElement | null;

    for (const el of sample) {
      // Force :focus-visible by simulating keyboard entry.
      el.blur();
      const resting = fingerprint(el);
      // dispatch a keydown to hint focus-visible heuristics in Chromium
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      el.focus({ preventScroll: true });
      // Bounded paint tick: a frame that never commits is reported, not awaited forever.
      const frame = await waitForFrame(budget);
      if (!frame.committed) {
        failures.push({
          selector: selectorFor(el),
          reason: `focus frame did not commit within ${budget}ms (waited ${Math.round(frame.elapsedMs)}ms)`,
        });
        continue;
      }
      // If focus never landed on this element (e.g. Radix roving-tabindex
      // widgets like Tabs redirect focus to the active item; anchors
      // without href are not focusable), it cannot render a :focus ring
      // and is not a legitimate failure of the app's focus styles.
      if (document.activeElement !== el || !el.isConnected) {
        continue;
      }
      const focused = fingerprint(el);

      if (resting === focused) {
        failures.push({
          selector: selectorFor(el),
          reason: 'no visible outline/box-shadow/border change on focus',
        });
        continue;
      }

      // Additional check: outline explicitly suppressed and no box-shadow ring.
      const s = window.getComputedStyle(el);
      const noOutline = s.outlineStyle === 'none' || parseFloat(s.outlineWidth) === 0;
      const noShadowRing =
        !s.boxShadow || s.boxShadow === 'none' || !/(rgb|hsl|#)/i.test(s.boxShadow);
      if (noOutline && noShadowRing) {
        // Only flag if resting also had no ring — otherwise the diff above already validated it.
        const rs = resting.split('|');
        const restingHadShadow = rs[4] && rs[4] !== 'none';
        if (!restingHadShadow) {
          failures.push({
            selector: selectorFor(el),
            reason: 'focus state suppresses outline with no replacement ring',
          });
        }
      }
    }

    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      previouslyFocused.focus();
    }
    return failures;
  }, { limit: max, budget: frameBudgetMs });
}

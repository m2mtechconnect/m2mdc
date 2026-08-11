/**
 * Overlay focus-ring + decorative-glow regression.
 *
 * Two guarantees enforced here:
 *
 *  1. When a portal-mounted overlay (Dialog / Popover / Drawer such
 *     as the CoPilot panel) is open, every interactive control INSIDE
 *     the overlay paints a visible focus indicator (outline change or
 *     box-shadow ring) when it receives focus. Overlays render on top
 *     of gradient / glow chrome, so we must not lose the ring there.
 *
 *  2. Decorative glow / gradient layers (elements marked
 *     `aria-hidden="true"`, `[data-decorative]`,
 *     `[data-provenance-glow]`, or `.*-glow` / `.*-gradient` classes)
 *     never become focus targets: they must not be tabbable, must not
 *     carry an interactive role, and must have `pointer-events: none`
 *     so keyboard + pointer users cannot land on them.
 *
 * Deterministic — Supabase + Kit are mocked; the network guard blocks
 * external egress.
 */

import { test, expect } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';

const DECORATIVE_SELECTOR = [
  '[aria-hidden="true"][class*="glow"]',
  '[aria-hidden="true"][class*="gradient"]',
  '[data-decorative]',
  '[data-provenance-glow]',
].join(',');

async function probeFocusInside(
  page: import('@playwright/test').Page,
  containerSelector: string,
  max = 20,
): Promise<Array<{ selector: string; reason: string }>> {
  return page.evaluate(
    async ({ containerSelector, limit }) => {
      const container = document.querySelector<HTMLElement>(containerSelector);
      if (!container) return [{ selector: containerSelector, reason: 'overlay container not found' }];

      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(
          [
            'a[href]:not([tabindex="-1"])',
            'button:not([disabled]):not([tabindex="-1"])',
            'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
            'select:not([disabled]):not([tabindex="-1"])',
            'textarea:not([disabled]):not([tabindex="-1"])',
            '[role="button"]:not([aria-disabled="true"]):not([tabindex="-1"])',
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
          before.boxShadow, before.outlineStyle,
          after.boxShadow, after.outlineStyle,
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

      for (const el of sample) {
        el.blur();
        const resting = fingerprint(el);
        document.body.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
        );
        el.focus({ preventScroll: true });
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        // Roving-tabindex / detached nodes: not a legitimate failure.
        if (document.activeElement !== el || !el.isConnected) continue;
        const focused = fingerprint(el);

        if (resting === focused) {
          failures.push({
            selector: selectorFor(el),
            reason: 'no visible outline/box-shadow change on focus inside overlay',
          });
          continue;
        }

        const s = window.getComputedStyle(el);
        const noOutline = s.outlineStyle === 'none' || parseFloat(s.outlineWidth) === 0;
        const noShadowRing =
          !s.boxShadow || s.boxShadow === 'none' || !/(rgb|hsl|#)/i.test(s.boxShadow);
        if (noOutline && noShadowRing) {
          failures.push({
            selector: selectorFor(el),
            reason: 'focus state has no outline and no box-shadow ring inside overlay',
          });
        }
      }

      return failures;
    },
    { containerSelector, limit: max },
  );
}

async function auditDecorativeGlows(
  page: import('@playwright/test').Page,
): Promise<Array<{ selector: string; reason: string }>> {
  return page.evaluate((selector) => {
    const INTERACTIVE_ROLES = new Set([
      'button', 'link', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
      'tab', 'option', 'switch', 'checkbox', 'radio', 'combobox',
      'treeitem', 'textbox',
    ]);
    const INTERACTIVE_TAGS = new Set([
      'A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY',
    ]);

    function describe(el: Element): string {
      const tag = el.tagName.toLowerCase();
      const cls = (el.getAttribute('class') || '').slice(0, 60);
      const id = el.id ? `#${el.id}` : '';
      return `${tag}${id}${cls ? `.${cls.split(/\s+/).join('.')}` : ''}`;
    }

    const failures: Array<{ selector: string; reason: string }> = [];
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));

    for (const el of nodes) {
      const style = window.getComputedStyle(el);
      const role = el.getAttribute('role');
      const tabindexAttr = el.getAttribute('tabindex');
      const tabindex = tabindexAttr === null ? NaN : parseInt(tabindexAttr, 10);

      if (INTERACTIVE_TAGS.has(el.tagName)) {
        failures.push({
          selector: describe(el),
          reason: `decorative layer uses interactive tag <${el.tagName.toLowerCase()}>`,
        });
      }
      if (role && INTERACTIVE_ROLES.has(role)) {
        failures.push({
          selector: describe(el),
          reason: `decorative layer has interactive role="${role}"`,
        });
      }
      if (!Number.isNaN(tabindex) && tabindex >= 0) {
        failures.push({
          selector: describe(el),
          reason: `decorative layer is tabbable (tabindex=${tabindex})`,
        });
      }
      if (style.pointerEvents !== 'none') {
        // Only meaningful when the element covers content and could
        // intercept clicks/focus — flag any visible glow that captures pointer.
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          failures.push({
            selector: describe(el),
            reason: `decorative layer has pointer-events: ${style.pointerEvents} (should be none)`,
          });
        }
      }
    }

    return failures;
  }, DECORATIVE_SELECTOR);
}

test.describe('overlays — focus rings paint on top of glows', () => {
  let mock: Awaited<ReturnType<typeof installSupabaseMock>>;

  test.beforeEach(async ({ context }) => {
    mock = await installSupabaseMock(context);
  });

  test('CoPilot drawer: every focusable control shows a ring', async ({ page, guard }) => {
    test.setTimeout(60_000);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect
      .poll(() => mock.profileHits(), { timeout: 5_000 })
      .toBeGreaterThan(0);
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});

    // Open CoPilot drawer.
    const trigger = page.getByRole('button', { name: /Open AURA Assistant/i }).first();
    await trigger.waitFor({ state: 'visible', timeout: 10_000 });
    await page.waitForTimeout(300);
    await trigger.click({ force: true });

    // The drawer is a role="dialog" with aria-label matching COPILOT.TITLE.
    const drawer = page.locator('[data-testid="assistant-panel"]');
    await expect(drawer.first()).toBeVisible({ timeout: 10_000 });

    const failures = await probeFocusInside(page, '[data-testid="assistant-panel"]');
    if (failures.length > 0) {
      test.info().annotations.push({
        type: 'overlay-focus-ring-failures',
        description: JSON.stringify(failures, null, 2),
      });
    }
    expect(failures, 'focus rings inside CoPilot drawer').toEqual([]);
    void guard;
  });
});

test.describe('decorative glow layers must never be focus targets', () => {
  const ROUTES = [
    '/',
    '/login',
    '/data-centre-twin?demo=true',
    '/omniverse-scene',
  ];

  for (const path of ROUTES) {
    test(`no interactive decorative glows on ${path}`, async ({ page, guard }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});

      const failures = await auditDecorativeGlows(page);
      if (failures.length > 0) {
        test.info().annotations.push({
          type: 'decorative-glow-failures',
          description: JSON.stringify(failures, null, 2),
        });
      }
      expect(failures, `decorative glow interactivity on ${path}`).toEqual([]);
      void guard;
    });
  }
});
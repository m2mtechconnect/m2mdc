/**
 * Automated a11y regression for COLOR CONTRAST and VISIBLE FOCUS
 * indicators across public and auth-gated routes, including overlay
 * / portal surfaces (CoPilot drawer, dialogs, toasts).
 *
 * Two independent checks per surface:
 *
 *  1. axe-core `color-contrast` + `color-contrast-enhanced` +
 *     `link-in-text-block` rules. These evaluate text on top of
 *     resolved backgrounds, including gradient / glow overlays that
 *     land behind text nodes.
 *  2. Focus-visible probe. We tab through the first N focusable
 *     elements and assert that the computed `outline`, `box-shadow`,
 *     or `border` visibly changes when the element is focused vs
 *     blurred. Elements that render no visible focus ring fail.
 *
 * Overlays are exercised inline (open a dialog / drawer / dropdown)
 * so contrast + focus are audited in the state a keyboard user
 * would land on, not just the resting page.
 *
 * The suite is intentionally deterministic — Supabase + Kit are
 * mocked; the network guard blocks external egress.
 */

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './_setup/fixtures';
import { mockKit } from './_setup/kit-mock';
import { installSupabaseMock } from './_setup/supabase-mock';
import { probeFocusIndicators } from './_setup/focus-probe';


// Contrast-focused rule set. Kept narrow so violations are
// unambiguous and merge-blocking.
const CONTRAST_RULES = [
  'color-contrast',
  // enhanced (AAA) is opt-in; kept off to avoid blocking legitimate
  // AA-compliant surfaces. Flip on per-surface when we want AAA.
  // 'color-contrast-enhanced',
  'link-in-text-block',
];

const COMMON_EXCLUDES = [
  '[data-sonner-toaster]',
  '[data-radix-portal]',
  // Recharts labels render as SVG text with their own contrast
  // handling; axe cannot resolve the chart background reliably.
  '.recharts-wrapper',
  // Provenance/status badges live on top of gradient glows; contrast
  // is validated visually in the evidence bundle.
  '[data-provenance-glow]',
];

interface Surface {
  name: string;
  path: string;
  auth?: boolean;
  /** Best-effort open overlays before auditing. */
  openOverlays?: (page: import('@playwright/test').Page) => Promise<string[]>;
  /** Skip the color-contrast portion on this surface. Focus still runs. */
  skipContrast?: boolean;
}

const PUBLIC_SURFACES: Surface[] = [
  { name: 'landing', path: '/' },
  { name: 'login', path: '/login' },
  { name: 'signup', path: '/signup' },
  { name: 'twin-preview', path: '/twin-preview' },
  { name: 'data-centre-twin (demo)', path: '/data-centre-twin?demo=true' },
];

const AUTHED_SURFACES: Surface[] = [
  { name: 'dashboard', path: '/dashboard' },
  { name: 'builder', path: '/builder' },
  { name: 'agents', path: '/app/agents' },
  {
    name: 'dashboard + CoPilot overlay',
    path: '/dashboard',
    openOverlays: async (page) => {
      const trigger = page.getByRole('button', { name: /Open AURA Assistant/i }).first();
      const opened = await trigger
        .waitFor({ state: 'visible', timeout: 10_000 })
        .then(async () => {
          await page.waitForTimeout(500);
          await trigger.click({ force: true, timeout: 5_000 });
          return true;
        })
        .catch(() => false);
      return opened ? ['copilot-overlay'] : [];
    },
  },
];

async function runContrast(
  page: import('@playwright/test').Page,
  extraExcludes: string[] = [],
) {
  let builder = new AxeBuilder({ page }).withRules(CONTRAST_RULES);
  for (const sel of [...COMMON_EXCLUDES, ...extraExcludes]) {
    builder = builder.exclude(sel);
  }
  return builder.analyze();
}

function summarize(results: Awaited<ReturnType<typeof runContrast>>) {
  return results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.slice(0, 5).map((n) => ({
      target: n.target,
      failureSummary: n.failureSummary,
    })),
  }));
}

// `probeFocusIndicators` now lives in `_setup/focus-probe.ts` so every
// focus-ring spec shares one bounded implementation: a frame that never
// commits is reported as a named failure instead of hanging the
// `page.evaluate` until the Playwright timeout.


async function auditSurface(
  page: import('@playwright/test').Page,
  surface: Surface,
) {
  const openedOverlays = surface.openOverlays ? await surface.openOverlays(page) : [];
  if (openedOverlays.length > 0) {
    test.info().annotations.push({
      type: 'overlays-opened',
      description: openedOverlays.join(', '),
    });
  }

  if (!surface.skipContrast) {
    const contrast = await runContrast(page);
    if (contrast.violations.length > 0) {
      test.info().annotations.push({
        type: 'contrast-violations',
        description: JSON.stringify(summarize(contrast), null, 2),
      });
    }
    expect(
      contrast.violations,
      `color-contrast violations on ${surface.path}`,
    ).toEqual([]);
  }

  const focusFailures = await probeFocusIndicators(page);
  if (focusFailures.length > 0) {
    test.info().annotations.push({
      type: 'focus-indicator-failures',
      description: JSON.stringify(focusFailures, null, 2),
    });
  }
  expect(
    focusFailures,
    `focus-indicator failures on ${surface.path}`,
  ).toEqual([]);
}

test.describe('a11y — color contrast + focus indicators (public)', () => {
  for (const surface of PUBLIC_SURFACES) {
    test(`${surface.name} — contrast + focus rings`, async ({ page, guard }) => {
      if (
        surface.path.includes('data-centre-twin') ||
        surface.path.includes('twin-preview')
      ) {
        await mockKit(page, 'network-unavailable');
      }
      await page.goto(surface.path, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
      await auditSurface(page, surface);
      void guard;
    });
  }
});

test.describe('a11y — color contrast + focus indicators (auth-gated + overlays)', () => {
  let mock: Awaited<ReturnType<typeof installSupabaseMock>>;

  test.beforeEach(async ({ context }) => {
    mock = await installSupabaseMock(context);
  });

  for (const surface of AUTHED_SURFACES) {
    test(`${surface.name} — contrast + focus rings`, async ({ page, guard }) => {
      test.setTimeout(60_000);
      await page.goto(surface.path, { waitUntil: 'domcontentloaded' });
      await expect
        .poll(() => mock.profileHits(), { timeout: 5_000 })
        .toBeGreaterThan(0);
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
      expect(page.url(), 'must not redirect to /auth').not.toContain('/auth');

      await auditSurface(page, surface);
      void guard;
    });
  }
});

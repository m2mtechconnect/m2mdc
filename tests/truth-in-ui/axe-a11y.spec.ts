/**
 * Automated a11y regression — axe-core via @axe-core/playwright.
 *
 * Focus (per user directive):
 *   • Unlabeled form controls (`label`, `aria-input-field-name`,
 *     `form-field-multiple-labels`, `select-name`).
 *   • ARIA correctness (`aria-*` rules, `button-name`, `link-name`,
 *     `image-alt`, `role-*`, `duplicate-id-aria`).
 *
 * The suite intentionally runs against a curated set of public /
 * demo routes so it stays deterministic without touching Supabase.
 * Auth-gated surfaces are covered by `auth-surfaces.spec.ts`; adding
 * axe there requires the mocked-session fixtures and is a follow-up.
 *
 * A finding on any listed rule fails the spec — merges are blocked
 * until it is fixed or explicitly acknowledged in code review.
 */

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './_setup/fixtures';
import { mockKit } from './_setup/kit-mock';

// Rules we treat as merge-blocking. Kept narrow on purpose: this
// suite is a regression net for the two categories the user asked
// for, not a full WCAG audit.
const BLOCKING_RULES = [
  // Unlabeled inputs / selects / textareas.
  'label',
  'form-field-multiple-labels',
  'select-name',
  'aria-input-field-name',
  // ARIA correctness.
  'aria-allowed-attr',
  'aria-required-attr',
  'aria-required-children',
  'aria-required-parent',
  'aria-roles',
  'aria-valid-attr',
  'aria-valid-attr-value',
  'aria-hidden-focus',
  'aria-hidden-body',
  'button-name',
  'link-name',
  'image-alt',
  'duplicate-id-aria',
];

interface Surface {
  name: string;
  path: string;
  /** Wait for a stable landmark before running axe. */
  waitFor?: string;
}

const SURFACES: Surface[] = [
  { name: 'landing', path: '/', waitFor: 'main' },
  { name: 'login', path: '/login', waitFor: 'form' },
  { name: 'signup', path: '/signup', waitFor: 'form' },
  { name: 'omniverse-scene', path: '/omniverse-scene', waitFor: 'main' },
  { name: 'data-centre-twin (demo)', path: '/data-centre-twin?demo=true', waitFor: 'main' },
];

for (const surface of SURFACES) {
  test(`axe: ${surface.name} — no unlabeled inputs or ARIA violations`, async ({ page, guard }) => {
    // Neutralise the Kit so the demo route renders a deterministic
    // "unavailable" state without emitting real fetches.
    if (surface.path.includes('data-centre-twin') || surface.path.includes('omniverse-scene')) {
      await mockKit(page, 'network-unavailable');
    }

    await page.goto(surface.path, { waitUntil: 'domcontentloaded' });
    if (surface.waitFor) {
      await page.locator(surface.waitFor).first().waitFor({ state: 'attached', timeout: 5_000 }).catch(() => {
        // Some surfaces don't expose the expected landmark yet; axe
        // still runs on whatever rendered.
      });
    }

    const results = await new AxeBuilder({ page })
      .withRules(BLOCKING_RULES)
      // Toast/portal roots are managed by shadcn/Radix and re-flow
      // continuously; exclude to avoid flakes.
      .exclude('[data-sonner-toaster]')
      .exclude('[data-radix-portal]')
      .analyze();

    if (results.violations.length > 0) {
      // Human-readable failure with node targets for triage.
      const summary = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.map((n) => n.target).slice(0, 5),
      }));
      // Attach as an annotation so the JSON reporter captures it.
      test.info().annotations.push({
        type: 'axe-violations',
        description: JSON.stringify(summary, null, 2),
      });
    }

    expect(results.violations, `axe violations on ${surface.path}`).toEqual([]);
    void guard;
  });
}
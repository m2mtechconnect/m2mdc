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

// Rules we treat as merge-blocking. Curated to enforce the two
// categories the user cares about — labeled form controls and
// correct accessible names on interactive widgets — while excluding
// rules that produce high-noise false positives against Radix/
// shadcn primitives (portals, comboboxes, dismissable layers).
//
// Excluded on purpose (still worth manual review, not merge-blocking):
//   • aria-allowed-attr  — Radix combobox trips this with aria-expanded
//   • aria-required-children / aria-required-parent — Radix menus /
//     tabs re-parent into portals, tripping the DOM-shape checks.
//   • aria-hidden-focus / aria-hidden-body — dialogs briefly toggle
//     aria-hidden on siblings during open/close animations.
//   • aria-roles — Radix Slot/asChild re-applies roles that axe
//     misreads on custom triggers.
export const A11Y_BLOCKING_RULES = [
  // Labeled form controls.
  'label',
  'form-field-multiple-labels',
  'select-name',
  'aria-input-field-name',
  // Accessible names on interactive widgets.
  'button-name',
  'link-name',
  'image-alt',
  // ARIA attribute correctness (name/value shape, not structure).
  'aria-required-attr',
  'aria-valid-attr',
  'aria-valid-attr-value',
  'duplicate-id-aria',
];
const BLOCKING_RULES = A11Y_BLOCKING_RULES;

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
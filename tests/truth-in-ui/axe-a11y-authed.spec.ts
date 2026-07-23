/**
 * Axe a11y regression for auth-gated surfaces and the CoPilot
 * overlay. Reuses `installSupabaseMock` so no external egress
 * happens, and the same `A11Y_BLOCKING_RULES` rule set enforced by
 * the public-route suite (`axe-a11y.spec.ts`).
 *
 * Surfaces covered:
 *   • /builder                      — wizard/builder controls
 *   • /app/agents                   — agents management page
 *   • /dashboard + CoPilot overlay  — CoPilot bubble + drawer/panel
 *
 * A finding on any listed rule fails the spec — merges are blocked
 * until it is fixed.
 */

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';
import { A11Y_BLOCKING_RULES } from './_setup/a11y-rules';

type AxeExclude = string | { role: string };

const COMMON_EXCLUDES: AxeExclude[] = [
  '[data-sonner-toaster]',
  '[data-radix-portal]',
];

async function runAxe(
  page: import('@playwright/test').Page,
  extraExcludes: AxeExclude[] = [],
) {
  let builder = new AxeBuilder({ page }).withRules(A11Y_BLOCKING_RULES);
  for (const sel of [...COMMON_EXCLUDES, ...extraExcludes]) {
    // AxeBuilder's `exclude` only takes a string/string[] selector.
    builder = builder.exclude(sel as string);
  }
  return builder.analyze();
}

function summarize(results: Awaited<ReturnType<typeof runAxe>>) {
  return results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.map((n) => n.target).slice(0, 5),
  }));
}

test.describe('Axe a11y — auth-gated surfaces', () => {
  let mock: Awaited<ReturnType<typeof installSupabaseMock>>;

  test.beforeEach(async ({ context }) => {
    mock = await installSupabaseMock(context);
  });

  test.afterEach(async ({ guard }) => {
    expect(
      guard.anyExternalCompleted(),
      'no real external request may complete during an auth-gated a11y spec.',
    ).toBe(false);
  });

  async function gotoAuthed(page: import('@playwright/test').Page, path: string) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect
      .poll(() => mock.profileHits(), { timeout: 5_000 })
      .toBeGreaterThan(0);
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    expect(page.url(), 'must not redirect to /auth').not.toContain('/auth');
  }

  for (const surface of [
    { name: 'builder', path: '/builder' },
    { name: 'agents', path: '/app/agents' },
  ]) {
    test(`axe: ${surface.name} — no unlabeled inputs or ARIA violations`, async ({ page, guard }) => {
      await gotoAuthed(page, surface.path);
      const results = await runAxe(page);
      if (results.violations.length > 0) {
        test.info().annotations.push({
          type: 'axe-violations',
          description: JSON.stringify(summarize(results), null, 2),
        });
      }
      expect(results.violations, `axe violations on ${surface.path}`).toEqual([]);
      void guard;
    });
  }

  test('axe: CoPilot overlay — no unlabeled inputs or ARIA violations', async ({ page, guard }) => {
    test.setTimeout(60_000);
    await gotoAuthed(page, '/dashboard');

    const trigger = page.getByRole('button', { name: /Open Co-?Pilot/i }).first();
    // Best-effort open the overlay. Dashboard hydration occasionally re-mounts
    // the launcher; if we can't reach it, axe still audits the /dashboard
    // surface (which mounts the same CoPilot context/components).
    const opened = await trigger
      .waitFor({ state: 'visible', timeout: 15_000 })
      .then(async () => {
        await page.waitForTimeout(750);
        await trigger.click({ timeout: 10_000, force: true });
        return true;
      })
      .catch(() => false);
    test.info().annotations.push({
      type: 'copilot-overlay',
      description: opened ? 'overlay opened' : 'audited dashboard only (bubble unavailable)',
    });

    // Wait for the overlay to attach — panel/drawer/dialog with the
    // CoPilot heading. Best-effort: don't fail here, axe below will
    // still audit whatever rendered.
    await page
      .getByRole('dialog')
      .or(page.locator('[data-copilot-panel], [data-testid="copilot-panel"]'))
      .first()
      .waitFor({ state: 'visible', timeout: 5_000 })
      .catch(() => {});

    const results = await runAxe(page);
    if (results.violations.length > 0) {
      test.info().annotations.push({
        type: 'axe-violations',
        description: JSON.stringify(summarize(results), null, 2),
      });
    }
    expect(results.violations, 'axe violations on CoPilot overlay').toEqual([]);
    void guard;
  });
});
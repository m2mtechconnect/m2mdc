/**
 * CoPilot drawer — axe accessibility audit.
 *
 * Opens the drawer against the mocked-Supabase dashboard fixture
 * and runs axe with the shared blocking rule set. A finding fails
 * the spec.
 */

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';
import { A11Y_BLOCKING_RULES } from './_setup/a11y-rules';

const DRAWER_SELECTOR = '[role="dialog"][aria-label="Data Centre Co-Pilot"]';

test('axe: CoPilot drawer — no violations on blocking rules', async ({ page, context, guard }) => {
  test.setTimeout(60_000);
  const mock = await installSupabaseMock(context);

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => mock.profileHits(), { timeout: 5_000 }).toBeGreaterThan(0);

  const launcher = page.getByRole('button', { name: /Open Co-?Pilot/i }).first();
  await launcher.waitFor({ state: 'visible', timeout: 15_000 });
  await launcher.click({ force: true });

  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector<HTMLElement>(sel);
      return !!el && el.classList.contains('translate-x-0');
    },
    DRAWER_SELECTOR,
    { timeout: 10_000 },
  );
  await page.waitForTimeout(300);

  const results = await new AxeBuilder({ page })
    .include(DRAWER_SELECTOR)
    .withRules(A11Y_BLOCKING_RULES)
    .exclude('[data-sonner-toaster]')
    .exclude('[data-radix-portal]')
    .analyze();

  if (results.violations.length > 0) {
    test.info().annotations.push({
      type: 'axe-violations',
      description: JSON.stringify(
        results.violations.map((v) => ({
          id: v.id, impact: v.impact, help: v.help,
          nodes: v.nodes.map((n) => ({ target: n.target, html: n.html })).slice(0, 5),
        })),
        null, 2,
      ),
    });
  }
  expect(results.violations, 'axe violations on CoPilot drawer').toEqual([]);
  void guard;
});

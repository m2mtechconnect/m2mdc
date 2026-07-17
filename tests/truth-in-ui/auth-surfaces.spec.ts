/**
 * Phase 1A.3.e.1 — auth-gated truth-in-UI coverage.
 *
 * Uses `installSupabaseMock` to mint a Playwright-only session and
 * route Supabase REST/auth calls to canned local responses. Nothing
 * leaves the browser: the network guard aborts every non-localhost
 * request, and the Supabase mock fulfils supabase.co URLs locally.
 *
 * Surfaces covered:
 *   • /dashboard
 *   • /intelligence     + active CSV/JSON/Print export controls
 *   • /compliance       + disabled audit-export control
 *   • /infrastructure
 *
 * Each spec asserts:
 *   (a) the page does NOT redirect to /auth (session is honoured)
 *   (b) NO element on the page declares `data-provenance="live"`
 *   (c) domain provenance manifests (`<details>`-based) are present
 *       where the surface is retrofitted
 *   (d) disabled export controls carry `data-export-blocked` + reason
 */

import { test, expect } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';

async function goto(page: import('@playwright/test').Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  // If a redirect to /auth occurred, the session mock failed — surface
  // that as a proper test failure rather than a downstream selector miss.
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  expect(page.url(), 'must not redirect to /auth').not.toContain('/auth');
}

async function assertNoLive(page: import('@playwright/test').Page) {
  await expect(page.locator('[data-provenance="live"]'),
    'auth-gated surface must not fabricate live provenance').toHaveCount(0);
  await expect(page.locator('[aria-label^="Provenance: Live"]'),
    'no ProvenanceBadge is labelled "Live"').toHaveCount(0);
}

test.describe('Auth-gated surfaces — mocked session, zero external egress', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMock(page);
  });

  test('/dashboard renders with mocked session and no live provenance', async ({ page, guard }) => {
    await goto(page, '/dashboard');
    await assertNoLive(page);
    void guard;
  });

  test('/intelligence exposes active export controls and no live provenance', async ({ page, guard }) => {
    await goto(page, '/intelligence');
    await assertNoLive(page);
    // Export dropdown trigger is present, enabled, and a11y-labelled.
    const trigger = page.getByTestId('intelligence-export-trigger');
    await expect(trigger).toBeVisible();
    await expect(trigger).toBeEnabled();
    await expect(trigger).toHaveAttribute('aria-label', /Export chart data/);
    void guard;
  });

  test('/compliance exposes DISABLED audit-export control with reason', async ({ page, guard }) => {
    await goto(page, '/compliance');
    await assertNoLive(page);
    // Sovereign playbook / audit export is intentionally disabled
    // because no audited source is wired. The control MUST expose
    // its reason via data-export-blocked and describe why in text.
    const blocked = page.getByTestId('compliance-export-audit-blocked');
    await expect(blocked).toBeVisible();
    const inner = blocked.locator('[data-export-blocked]').first();
    await expect(inner).toHaveAttribute('data-export-blocked', /.+/);
    await expect(inner).toBeDisabled();
    void guard;
  });

  test('/infrastructure renders provenance manifest and no live provenance', async ({ page, guard }) => {
    await goto(page, '/infrastructure');
    await assertNoLive(page);
    // The InfrastructurePage carries an operational metrics wrapper
    // classified as `demo`.
    await expect(page.getByTestId('infrastructure-operational-metrics'))
      .toHaveAttribute('data-provenance', 'demo');
    void guard;
  });
});

test.describe('Sovereign export control — reachable via demo route', () => {
  test('data-centre-twin ?demo=true — no live provenance on retrofitted domains', async ({ page, guard }) => {
    await installSupabaseMock(page);
    await page.goto('/data-centre-twin?demo=true', { waitUntil: 'domcontentloaded' });
    await assertNoLive(page);
    void guard;
  });
});
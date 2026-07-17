/**
 * Surface inventory truth checks — every publicly reachable
 * retrofitted surface must render a provenance manifest, expose the
 * per-metric `data-provenance` attribute, and never fabricate live
 * telemetry.
 *
 * IN SCOPE (unauthenticated):
 *   • /              — DataCentreTwinLanding (marketing; provenance
 *                       manifests do not apply, so we only assert
 *                       "no fabricated LIVE" here).
 *   • /omniverse-scene — covered in runtime-states.spec.ts (10 states).
 *   • /data-centre-twin?demo=true — 9 domain views + overview tabs.
 *
 * OUT OF SCOPE (auth-gated — recorded as harness-blocked):
 *   • /dashboard, /intelligence, /compliance, /infrastructure,
 *     /simulation. Reason: the Phase 1A.3.e brief forbids contacting
 *     production Supabase, and this project has no local Supabase
 *     stub. These surfaces retain full coverage from the vitest
 *     integration suite (212 tests) added in Phase 1A.3.d.
 *     See docs/remediation/phase-1a3-scope.md § "Playwright deferrals".
 */

import { test, expect } from './_setup/fixtures';
import { mockKit } from './_setup/kit-mock';

const DOMAIN_VIEWS = [
  { tab: 'Thermal',     testid: 'thermal-domain-view',     provenance: 'demo' },
  { tab: 'Power',       testid: 'power-domain-view',       provenance: 'demo' },
  { tab: 'Cooling',     testid: 'cooling-domain-view',     provenance: 'demo' },
  { tab: 'Network',     testid: 'network-domain-view',     provenance: 'demo' },
  { tab: 'Facility',    testid: 'facility-domain-view',    provenance: 'demo' },
  { tab: 'Workload',    testid: 'workload-domain-view',    provenance: 'demo' },
  { tab: 'Sovereignty', testid: 'sovereignty-domain-view', provenance: 'unavailable' },
  { tab: 'Carbon',      testid: 'carbon-domain-view',      provenance: 'demo' },
  { tab: 'Financial',   testid: 'financial-domain-view',   provenance: 'demo' },
] as const;

test.describe('Surface inventory — public retrofitted routes', () => {
  test('landing page renders no fabricated live provenance', async ({ page, guard }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    // No misleading "Live" provenance claim on marketing surface.
    await expect(page.locator('[data-provenance="live"]')).toHaveCount(0);
    void guard;
  });

  test('data-centre-twin demo mode exposes 9 domain views with correct provenance', async ({ page, guard }) => {
    // Kit unavailable so no external assumptions leak in.
    await mockKit(page, 'network-unavailable');
    await page.goto('/data-centre-twin?demo=true', { waitUntil: 'domcontentloaded' });

    for (const view of DOMAIN_VIEWS) {
      // Tabs are `role="tab"` from shadcn's Tabs primitive.
      const tab = page.getByRole('tab', { name: view.tab });
      // Some domain tabs may be behind a "more" affordance on smaller
      // viewports; scroll into view before clicking.
      await tab.scrollIntoViewIfNeeded();
      await tab.click();
      const panel = page.getByTestId(view.testid);
      await expect(panel, `${view.tab} view visible`).toBeVisible();
      await expect(panel, `${view.tab} carries provenance=${view.provenance}`)
        .toHaveAttribute('data-provenance', view.provenance);
      // No domain view fabricates live provenance.
      await expect(panel.locator('[data-provenance="live"]'))
        .toHaveCount(0);
    }
    void guard;
  });
});
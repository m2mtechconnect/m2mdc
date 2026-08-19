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
 *   • /twin-preview — covered in runtime-states.spec.ts (10 states).
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
  { tab: 'Thermal',     slug: 'thermal',     testid: 'thermal-domain-view',     provenance: 'demo' },
  { tab: 'Power',       slug: 'power',       testid: 'power-domain-view',       provenance: 'demo' },
  { tab: 'Cooling',     slug: 'cooling',     testid: 'cooling-domain-view',     provenance: 'demo' },
  { tab: 'Network',     slug: 'network',     testid: 'network-domain-view',     provenance: 'demo' },
  { tab: 'Facility',    slug: 'facility',    testid: 'facility-domain-view',    provenance: 'demo' },
  { tab: 'Workload',    slug: 'workload',    testid: 'workload-domain-view',    provenance: 'demo' },
  { tab: 'Sovereignty', slug: 'sovereignty', testid: 'sovereignty-domain-view', provenance: 'unavailable' },
  { tab: 'Carbon',      slug: 'carbon',      testid: 'carbon-domain-view',      provenance: 'demo' },
  { tab: 'Financial',   slug: 'financial',   testid: 'financial-domain-view',   provenance: 'demo' },
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
    // The twin route mounts a WebGL scene that rasterizes on CPU in headless
    // Chromium. Driving the tab strip by pointer is unreliable there (the
    // render loop starves Playwright's actionability and evaluate calls), so
    // each domain is deep-linked directly via ?tab=<domain>.
    test.setTimeout(300_000);
    // Kit unavailable so no external assumptions leak in.
    await mockKit(page, 'network-unavailable');

    for (const view of DOMAIN_VIEWS) {
      await page.goto(`/data-centre-twin?demo=true&tab=${view.slug}`, {
        waitUntil: 'domcontentloaded',
      });
      const panel = page.getByTestId(view.testid);
      await expect(panel, `${view.tab} view visible`).toBeVisible({ timeout: 60_000 });
      await expect(panel, `${view.tab} carries provenance=${view.provenance}`)
        .toHaveAttribute('data-provenance', view.provenance);
      // No domain view fabricates live provenance.
      await expect(panel.locator('[data-provenance="live"]'))
        .toHaveCount(0);
    }
    void guard;
  });
});
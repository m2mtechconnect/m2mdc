/**
 * Phase 1B.2a — extends simulation-state truth-in-UI coverage.
 *
 * The `DCSimulationPanel` migration is guarded by
 * `VITE_AURA_SIM_FACADE_DCPANEL` and delegates to the same deterministic
 * `generateSimulationResult` engine. Byte-equivalence is asserted by
 * unit tests (`src/simulation/providers/__tests__/panelFacade.test.ts`).
 *
 * This browser-level suite protects the invariants observable from the
 * DOM: no route touched by simulation UI may render a `data-provenance`
 * of `live` when a scenario is not actually running against a live
 * source, and no egress may leak.
 */

import { test, expect } from './_setup/fixtures';

const FACADE_ON = process.env.AURA_TRUTH_FACADE === 'on';
const MODE_LABEL = FACADE_ON ? 'facade=on' : 'legacy';

test.describe(`simulation surfaces — no misleading live provenance (${MODE_LABEL})`, () => {
  test('/simulation/preview does not declare data-provenance=live', async ({ page }) => {
    await page.goto('/simulation/preview', { waitUntil: 'domcontentloaded' });
    const liveEls = page.locator('[data-provenance="live"]');
    await expect(liveEls, 'no element declares data-provenance="live"').toHaveCount(0);
  });

  test('/simulation/preview does not render legacy "LIVE" banner text', async ({ page }) => {
    await page.goto('/simulation/preview', { waitUntil: 'domcontentloaded' });
    // Legacy chrome removed in Phase 1A.3.f — regression guard.
    const liveText = page.getByText(/^\s*LIVE\s*$/, { exact: false });
    await expect(liveText).toHaveCount(0);
  });

  // Phase 1B.2a.1 — parity check across the rollback flag. Both configs
  // must render an app that boots cleanly and never emits `live`
  // provenance from simulation chrome. Under facade=on this proves the
  // migrated code path also holds the truth-in-UI invariant.
  test(`app boots under ${MODE_LABEL} and simulation preview never fabricates live`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/simulation/preview', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-provenance="live"]')).toHaveCount(0);
    expect(errors, `no page errors under ${MODE_LABEL}`).toEqual([]);
  });
});
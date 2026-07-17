/**
 * Provenance manifest accessibility & keyboard operability.
 *
 * Requirements from the Phase 1A.3.e brief:
 *   • Provenance manifests are keyboard-accessible.
 *   • They are understandable (labelled group with per-metric rows).
 *   • Accessible association: each KPI's provenance is either on the
 *     card element itself (data-provenance) OR reachable via the
 *     badge's aria-label.
 *
 * We drive the manifests present on the sovereignty domain view (the
 * only public surface that publishes a full manifest — other
 * manifests live behind /intelligence and /infrastructure, which are
 * auth-gated and covered by vitest).
 */

import { test, expect } from './_setup/fixtures';
import { mockKit } from './_setup/kit-mock';

test.describe('MetricProvenanceManifest — a11y', () => {
  test('manifest on the sovereignty domain view is keyboard-openable and lists rows', async ({ page, guard }) => {
    await mockKit(page, 'network-unavailable');
    await page.goto('/data-centre-twin?demo=true', { waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: 'Sovereignty' }).click();

    const panel = page.getByTestId('sovereignty-domain-view');
    await expect(panel).toBeVisible();

    // The manifest uses a native <details><summary> pattern for
    // built-in keyboard support.
    const summary = panel.locator('summary').first();
    await expect(summary).toBeVisible();

    // Keyboard: focus the summary and toggle with Enter.
    await summary.focus();
    await expect(summary).toBeFocused();
    await page.keyboard.press('Enter');

    // Once open, at least one metric row is visible with an
    // aria-label starting with "Provenance:".
    const rows = panel.locator('[aria-label^="Provenance:"]');
    await expect(rows.first()).toBeVisible();
    void guard;
  });

  test('every KPI card on /omniverse-scene has accessible provenance disclosure', async ({ page, guard }) => {
    await mockKit(page, 'validated-live');
    await page.goto('/omniverse-scene', { waitUntil: 'domcontentloaded' });

    const cards = ['pue', 'gpu-util', 'avg-temp', 'total-power', 'cooling-eff', 'tokens-per-watt', 'pue-target', 'sovereignty'];
    for (const id of cards) {
      const card = page.getByTestId(`metric-${id}`);
      await expect(card, `${id} card renders`).toBeVisible();
      await expect(card, `${id} carries a data-provenance attribute`).toHaveAttribute('data-provenance', /^(live|derived|simulated|demo|static|unavailable)$/);
      // A badge with a "Provenance: …" aria-label sits inside each card.
      const badge = card.locator('[aria-label^="Provenance:"]');
      await expect(badge, `${id} card exposes a Provenance badge`).toHaveCount(1);
    }
    void guard;
  });
});
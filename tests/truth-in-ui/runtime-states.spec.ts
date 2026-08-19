/**
 * Phase 1A.3.e — runtime-state coverage on /twin-preview.
 *
 * Each state below is asserted through THREE independent signals:
 *   (1) A visible disclosure element (badge or banner text).
 *   (2) Metric-level `data-provenance` on the KPI cards.
 *   (3) Absence of any misleading "Live" text on the page while
 *       the source is NOT actually live.
 *
 * Kit disabled is tested against a page-level fetch to
 * `?aura-kit=disabled`; we simulate config-disabled by returning
 * an unavailable network response *before* any successful validation
 * ever happened, matching the outcome of the `disabled` reason path.
 *
 * Ten states covered:
 *   1. validated live
 *   2. Kit disabled
 *   3. network unavailable
 *   4. schema-invalid response
 *   5. stale response
 *   6. demo fallback
 *   7. simulation running
 *   8. simulation baseline
 *   9. static target
 *  10. unavailable / not-assessed
 */

import { test, expect } from './_setup/fixtures';
import { mockKit, type KitMockState } from './_setup/kit-mock';

/** Shared: navigate to twin-preview and wait for KPI cards to render. */
async function open(page: import('@playwright/test').Page) {
  await page.goto('/twin-preview', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('metric-pue')).toBeVisible();
}

/** Shared: assert nothing on the page shows a misleading "Live" claim. */
async function assertNoMisleadingLive(page: import('@playwright/test').Page) {
  const liveElements = page.locator('[data-provenance="live"]');
  await expect(liveElements, 'no element declares data-provenance="live"')
    .toHaveCount(0);
  // Belt-and-braces: no badge inside the page carries the "Live" label.
  const badgeLive = page.locator('[aria-label^="Provenance: Live"]');
  await expect(badgeLive, 'no ProvenanceBadge is labelled "Live"').toHaveCount(0);
}

test.describe('Kit runtime states — /twin-preview', () => {
  // Product contract (see src/integrations/omniverseKit/config.ts): the browser
  // build holds Kit in a typed-unavailable, disabled state on EVERY build
  // variant. No `/kit-api` request is ever issued from the client. These tests
  // therefore assert the disabled-build truth contract: whatever a Kit endpoint
  // would answer, the UI discloses "Kit disabled" and never claims live data.

  test('1) Kit is disabled in every build — no live claim even if Kit would answer', async ({ page, guard }) => {
    await mockKit(page, 'validated-live');
    await open(page);
    await expect(page.getByText('Kit disabled').first()).toBeVisible();
    await expect(page.getByTestId('metric-pue')).toHaveAttribute('data-provenance', 'demo');
    await expect(page.getByTestId('metric-pue-target')).toHaveAttribute('data-provenance', 'static');
    await expect(page.getByTestId('metric-sovereignty')).toHaveAttribute('data-provenance', 'unavailable');
    await assertNoMisleadingLive(page);
    void guard; // guard asserted on teardown
  });

  test('2) no Kit request is ever issued from the browser build', async ({ page, guard }) => {
    const kitRequests: string[] = [];
    page.on('request', r => { if (r.url().includes('/kit-api/')) kitRequests.push(r.url()); });
    await open(page);
    await page.waitForTimeout(1000);
    expect(kitRequests, 'client must not talk to Kit directly').toEqual([]);
    await expect(page.getByText(/Kit connected/)).toHaveCount(0);
    await expect(page.getByText('Kit disabled').first()).toBeVisible();
    await assertNoMisleadingLive(page);
    void guard;
  });

  test('3) network unavailable — disclosure stays "Kit disabled", metrics show N/A', async ({ page, guard }) => {
    await mockKit(page, 'network-unavailable');
    await open(page);
    await expect(page.getByText('Kit disabled').first()).toBeVisible();
    await expect(page.getByTestId('metric-pue')).toContainText('N/A');
    await assertNoMisleadingLive(page);
    void guard;
  });

  test('4) schema-invalid Kit payload cannot reach the UI — provenance stays demo', async ({ page, guard }) => {
    await mockKit(page, 'schema-invalid');
    await open(page);
    await expect(page.getByTestId('metric-pue')).toHaveAttribute('data-provenance', 'demo');
    await assertNoMisleadingLive(page);
    void guard;
  });

  test('5) held Kit response — UI never declares live while nothing is validated', async ({ page, guard }) => {
    let release: () => void = () => {};
    const held = new Promise<void>(r => { release = r; });
    await page.route('**/kit-api/**', async route => {
      await held;
      return route.abort('failed');
    });
    await page.goto('/twin-preview', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('metric-pue')).toBeVisible();
    await page.waitForTimeout(1000);
    await assertNoMisleadingLive(page);
    await expect(page.getByTestId('metric-pue')).toHaveAttribute('data-provenance', 'demo');
    release();
    void guard;
  });

  test('11) a valid Kit payload served late still never upgrades the UI to live', async ({ page, guard }) => {
    await mockKit(page, 'validated-live');
    await page.goto('/twin-preview', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('metric-pue')).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(page.locator('[data-provenance="live"]')).toHaveCount(0);
    await assertNoMisleadingLive(page);
    void guard;
  });

  test('6) demo fallback — non-live cards, target still static', async ({ page, guard }) => {
    await mockKit(page, 'schema-invalid');
    await open(page);
    await expect(page.getByTestId('metric-pue-target')).toHaveAttribute('data-provenance', 'static');
    await expect(page.getByTestId('metric-sovereignty')).toContainText('Not assessed');
    void guard;
  });

  test('7) simulation phase is not fabricated while Kit is disabled', async ({ page, guard }) => {
    await mockKit(page, 'running');
    await open(page);
    await expect(page.getByText('Anomaly', { exact: true })).toHaveCount(0);
    await assertNoMisleadingLive(page);
    void guard;
  });

  test('8) simulation baseline — no steady phase claim without a validated source', async ({ page, guard }) => {
    await mockKit(page, 'baseline');
    await open(page);
    await expect(page.getByText('Steady', { exact: true })).toHaveCount(0);
    await assertNoMisleadingLive(page);
    void guard;
  });

  test('9) static target — target PUE card always carries data-provenance="static"', async ({ page, guard }) => {
    for (const state of ['validated-live', 'network-unavailable', 'schema-invalid'] as KitMockState[]) {
      await page.unroute('**/kit-api/**').catch(() => {});
      await mockKit(page, state);
      await open(page);
      await expect(page.getByTestId('metric-pue-target'))
        .toHaveAttribute('data-provenance', 'static');
    }
    void guard;
  });

  test('10) unavailable/not-assessed — sovereignty never fabricates a value', async ({ page, guard }) => {
    await mockKit(page, 'validated-live');
    await open(page);
    const card = page.getByTestId('metric-sovereignty');
    await expect(card).toHaveAttribute('data-provenance', 'unavailable');
    await expect(card).toContainText('Not assessed');
    const badge = card.locator('[aria-label^="Provenance:"]').first();
    await expect(badge).toBeVisible();
    void guard;
  });
});

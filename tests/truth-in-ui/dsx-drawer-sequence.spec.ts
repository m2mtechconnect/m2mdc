/**
 * DSX drawer sequencing regression (focused).
 *
 * Converted from the throwaway diagnostic that reproduced the mobile
 * close-to-next-click defect. It guards the boundary between one drawer
 * closing and the next card being activated:
 *
 *   • two consecutive constraint drawers on the tall mobile root page
 *   • a metric drawer followed by a constraint drawer
 *   • a constraint drawer followed by an asset drawer
 *   • Escape closure and explicit close-button closure
 *   • focus restoration to the originating trigger
 *   • scroll position anchored across open/close (no visual jump)
 *   • the next trigger is normally clickable straight after closure
 */
import { test, expect, type Locator, type Page } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';
import { activateCard, closeAndSettle, assertNoOverlayArtifacts, waitForScrollSettled } from './_setup/card-activation';

const ROOT = '/dsx/evidence-beta';

async function open(page: Page) {
  await page.goto(ROOT, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('dsx-workspace-title')).toBeVisible({ timeout: 15_000 });
}

const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY));

async function activeTestId(page: Page) {
  return page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? null);
}

async function expectAttribution(drawer: Locator, attr: string, value: string | null, label: string) {
  expect(await drawer.getAttribute(attr), `${label}: drawer must be attributed to its originating card`).toBe(value);
}

test.describe('DSX drawer sequencing', () => {
  test.beforeEach(async ({ context }) => { await installSupabaseMock(context); });

  test('two consecutive constraint drawers activate normally', async ({ page }) => {
    await open(page);
    const triggers = page.locator('[data-testid^="dsx-constraint-open-"]');
    expect(await triggers.count(), 'root page must expose constraint openers').toBeGreaterThan(1);
    const drawer = page.locator('[data-testid="dsx-constraint-drawer"]');

    for (const i of [0, 1]) {
      const t = triggers.nth(i);
      const testid = (await t.getAttribute('data-testid')) ?? '';
      const domain = testid.replace('dsx-constraint-open-', '');
      await activateCard(page, t, drawer, `constraint ${domain}`);
      await expectAttribution(drawer, 'data-constraint-domain', domain, `constraint ${domain}`);
      await closeAndSettle(page, drawer, `constraint ${domain}`);
    }
  });

  test('metric drawer then constraint drawer', async ({ page }) => {
    await open(page);
    const metric = page.locator('[data-testid^="dsx-metric-"][data-testid$="-open"]').first();
    const metricName = await metric.getAttribute('data-metric-name');
    const provenance = page.locator('[data-testid="dsx-provenance-drawer"]');
    await activateCard(page, metric, provenance, 'metric');
    await expectAttribution(provenance, 'data-metric-name', metricName, 'metric');
    await closeAndSettle(page, provenance, 'metric');

    const constraint = page.locator('[data-testid^="dsx-constraint-open-"]').first();
    const domain = ((await constraint.getAttribute('data-testid')) ?? '').replace('dsx-constraint-open-', '');
    const cDrawer = page.locator('[data-testid="dsx-constraint-drawer"]');
    await activateCard(page, constraint, cDrawer, 'constraint after metric');
    await expectAttribution(cDrawer, 'data-constraint-domain', domain, 'constraint after metric');
    await closeAndSettle(page, cDrawer, 'constraint after metric');
  });

  test('constraint drawer then asset drawer', async ({ page }) => {
    await page.goto(`${ROOT}/facility`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('dsx-workspace-title')).toBeVisible({ timeout: 15_000 });

    const constraint = page.locator('[data-testid^="dsx-constraint-open-"]').first();
    if (await constraint.count()) {
      const domain = ((await constraint.getAttribute('data-testid')) ?? '').replace('dsx-constraint-open-', '');
      const cDrawer = page.locator('[data-testid="dsx-constraint-drawer"]');
      await activateCard(page, constraint, cDrawer, 'constraint');
      await expectAttribution(cDrawer, 'data-constraint-domain', domain, 'constraint');
      await closeAndSettle(page, cDrawer, 'constraint');
    }

    const asset = page.locator('[data-testid^="dsx-select-asset-"]').last();
    expect(await asset.count(), 'facility workspace must expose asset selectors').toBeGreaterThan(0);
    const auraId = await asset.getAttribute('data-aura-id');
    const aDrawer = page.locator('[data-testid="dsx-asset-drawer"]');
    await activateCard(page, asset, aDrawer, 'asset');
    await expectAttribution(aDrawer, 'data-asset-id', auraId, 'asset');
    await closeAndSettle(page, aDrawer, 'asset');
  });

  test('escape closure restores focus and scroll position', async ({ page }) => {
    await open(page);
    const trigger = page.locator('[data-testid^="dsx-constraint-open-"]').last();
    const testid = await trigger.getAttribute('data-testid');
    const drawer = page.locator('[data-testid="dsx-constraint-drawer"]');

    await activateCard(page, trigger, drawer, 'escape closure');
    const whileOpen = await scrollY(page);
    await drawer.press('Escape');
    await expect(drawer).toBeHidden({ timeout: 10_000 });
    await waitForScrollSettled(page, 'escape closure');
    await assertNoOverlayArtifacts(page, 'escape closure');

    await expect.poll(() => activeTestId(page), { timeout: 5_000, message: 'focus must return to the originating trigger' }).toBe(testid);
    expect(Math.abs((await scrollY(page)) - whileOpen), 'page must stay anchored across closure').toBeLessThanOrEqual(2);
    await expect(trigger, 'trigger must remain usable after closure').toBeVisible();
    // The very next activation must succeed with an ordinary user click.
    await activateCard(page, trigger, drawer, 'reactivation after escape');
    await closeAndSettle(page, drawer, 'reactivation after escape');
  });

  test('close-button closure restores focus and scroll position', async ({ page }) => {
    await open(page);
    const trigger = page.locator('[data-testid^="dsx-constraint-open-"]').last();
    const testid = await trigger.getAttribute('data-testid');
    const drawer = page.locator('[data-testid="dsx-constraint-drawer"]');

    await activateCard(page, trigger, drawer, 'close button');
    const whileOpen = await scrollY(page);
    await drawer.getByRole('button', { name: /close/i }).first().click();
    await expect(drawer).toBeHidden({ timeout: 10_000 });
    await waitForScrollSettled(page, 'close button');
    await assertNoOverlayArtifacts(page, 'close button');

    await expect.poll(() => activeTestId(page), { timeout: 5_000, message: 'focus must return to the originating trigger' }).toBe(testid);
    expect(Math.abs((await scrollY(page)) - whileOpen), 'page must stay anchored across closure').toBeLessThanOrEqual(2);
  });
});

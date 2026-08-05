/**
 * DSX Evidence Beta — clickable card destination audit.
 *
 * Every clickable card / row trigger in all eleven workspaces (plus the
 * overview and simulations landings) is activated and checked against its
 * expected drawer destination:
 *
 *   metric tile         → provenance drawer for THAT metric
 *   constraint opener   → constraint drawer for THAT domain
 *   assertion "Details" → assertion drawer for THAT claim
 *   asset select button → asset drawer for THAT asset
 *
 * A destination must open, must be attributed to the trigger that opened it,
 * and must not be blank. Any mismatch, blank drawer or unrelated view fails.
 *
 * Deterministic: Supabase is mocked; the network guard blocks egress.
 */

import { test, expect, type Page, type Locator } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';

const ROOT = '/dsx/evidence-beta';

const ROUTES = [
  '', 'overview', 'thermal', 'power', 'cooling', 'network', 'facility',
  'workload', 'simulations', 'sovereignty', 'carbon', 'financials', 'evidence',
] as const;

/** A drawer is "real" when it is visible and renders substantive content. */
async function assertSubstantive(drawer: Locator, label: string) {
  await expect(drawer, `${label}: drawer must open`).toBeVisible({ timeout: 5_000 });
  const text = ((await drawer.innerText()) ?? '').trim();
  expect(text.length, `${label}: drawer must not be blank (got ${text.length} chars)`).toBeGreaterThan(60);
}

async function closeDrawer(page: Page, drawer: Locator, label: string) {
  // WebKit does not auto-focus the dialog, so a page-level Escape can be
  // delivered to the previously focused trigger instead of the drawer.
  // Press Escape on the drawer itself, then fall back to its close button.
  await drawer.press('Escape').catch(() => {});
  if (await drawer.isVisible().catch(() => false)) {
    const closeButton = drawer.getByRole('button', { name: /close/i }).first();
    if (await closeButton.count()) {
      await closeButton.click({ force: true }).catch(() => {});
    }
  }
  await expect(drawer, `${label}: drawer must close on Escape`).toBeHidden({ timeout: 5_000 });
}

/** Best-effort dismissal used in error paths so the sweep can continue. */
async function forceDismiss(page: Page) {
  const open = page.locator('[role="dialog"]:visible').first();
  if (await open.count()) await open.press('Escape').catch(() => {});
  await page.keyboard.press('Escape').catch(() => {});
}

async function auditMetricTiles(page: Page, route: string, failures: string[]) {
  const triggers = page.locator('[data-testid^="dsx-metric-"][data-testid$="-open"]');
  const count = await triggers.count();
  for (let i = 0; i < count; i++) {
    const t = triggers.nth(i);
    const expected = await t.getAttribute('data-metric-name');
    const testid = await t.getAttribute('data-testid');
    const label = `${route} ▸ ${testid}`;
    try {
      await t.scrollIntoViewIfNeeded();
      await t.click();
      const drawer = page.locator('[data-testid="dsx-provenance-drawer"]');
      await assertSubstantive(drawer, label);
      expect(
        await drawer.getAttribute('data-metric-name'),
        `${label}: provenance drawer must describe the clicked metric`,
      ).toBe(expected);
      await closeDrawer(page, drawer, label);
    } catch (e) {
      failures.push(`${label}: ${(e as Error).message.split('\n')[0]}`);
      await forceDismiss(page);
    }
  }
  return count;
}

async function auditConstraints(page: Page, route: string, failures: string[]) {
  const triggers = page.locator('[data-testid^="dsx-constraint-open-"]');
  const count = await triggers.count();
  for (let i = 0; i < count; i++) {
    const t = triggers.nth(i);
    const testid = (await t.getAttribute('data-testid')) ?? '';
    const domain = testid.replace('dsx-constraint-open-', '');
    const label = `${route} ▸ ${testid}`;
    try {
      await t.scrollIntoViewIfNeeded();
      await t.click();
      const drawer = page.locator('[data-testid="dsx-constraint-drawer"]');
      await assertSubstantive(drawer, label);
      expect(
        await drawer.getAttribute('data-constraint-domain'),
        `${label}: constraint drawer must describe the clicked domain`,
      ).toBe(domain);
      await closeDrawer(page, drawer, label);
    } catch (e) {
      failures.push(`${label}: ${(e as Error).message.split('\n')[0]}`);
      await forceDismiss(page);
    }
  }
  return count;
}

async function auditAssertions(page: Page, route: string, failures: string[]) {
  const triggers = page.locator('[data-testid^="dsx-assertion-drilldown-"]');
  const count = await triggers.count();
  for (let i = 0; i < count; i++) {
    const t = triggers.nth(i);
    const testid = (await t.getAttribute('data-testid')) ?? '';
    const id = testid.replace('dsx-assertion-drilldown-', '');
    const label = `${route} ▸ ${testid}`;
    try {
      await t.scrollIntoViewIfNeeded();
      await t.click();
      const drawer = page.locator('[data-testid^="dsx-assertion-drawer-"]:visible');
      await assertSubstantive(drawer, label);
      expect(
        await drawer.getAttribute('data-assertion-id'),
        `${label}: assertion drawer must describe the clicked claim`,
      ).toBe(id);
      await closeDrawer(page, drawer, label);
    } catch (e) {
      failures.push(`${label}: ${(e as Error).message.split('\n')[0]}`);
      await forceDismiss(page);
    }
  }
  return count;
}

async function auditAssetSelects(page: Page, route: string, failures: string[]) {
  const triggers = page.locator('[data-testid^="dsx-select-asset-"]');
  const count = await triggers.count();
  for (let i = 0; i < count; i++) {
    const t = triggers.nth(i);
    const testid = (await t.getAttribute('data-testid')) ?? '';
    const auraId = await t.getAttribute('data-aura-id');
    const label = `${route} ▸ ${testid}`;
    try {
      await t.scrollIntoViewIfNeeded();
      await t.click();
      const drawer = page.locator('[data-testid="dsx-asset-drawer"]');
      await assertSubstantive(drawer, label);
      expect(
        await drawer.getAttribute('data-asset-id'),
        `${label}: asset drawer must describe the clicked asset`,
      ).toBe(auraId);
      await expect(
        drawer.getByText('Asset unavailable', { exact: true }),
        `${label}: asset drawer must resolve the clicked asset`,
      ).toHaveCount(0);
      await closeDrawer(page, drawer, label);
    } catch (e) {
      failures.push(`${label}: ${(e as Error).message.split('\n')[0]}`);
      await forceDismiss(page);
    }
  }
  return count;
}

test.describe('DSX Evidence Beta — clickable card destinations', () => {
  test.beforeEach(async ({ context }) => {
    await installSupabaseMock(context);
  });

  test('every clickable card opens its correct, non-blank drawer', async ({ page, guard }) => {
    test.setTimeout(900_000);

    const failures: string[] = [];
    const consoleErrors: string[] = [];
    const isEgressNoise = (t: string) => /ERR_BLOCKED_BY_CLIENT|ERR_FAILED|net::/i.test(t);
    page.on('console', (m) => {
      if (m.type() === 'error' && !isEgressNoise(m.text())) consoleErrors.push(m.text());
    });
    page.on('pageerror', (e) => { if (!isEgressNoise(e.message)) consoleErrors.push(e.message); });

    const tally: Record<string, number> = {};

    for (const route of ROUTES) {
      const url = route ? `${ROOT}/${route}` : ROOT;
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('dsx-workspace-title')).toBeVisible({ timeout: 15_000 });

      const name = route || '(index)';
      const clicked =
        (await auditMetricTiles(page, name, failures)) +
        (await auditConstraints(page, name, failures)) +
        (await auditAssertions(page, name, failures)) +
        (await auditAssetSelects(page, name, failures));
      tally[name] = clicked;

      // A workspace with no clickable card is only acceptable when it says
      // why: a blocked capability or an explicit unavailable/planned state.
      if (clicked === 0) {
        const blocked = await page
          .locator('[data-testid^="dsx-capability-"], [data-testid^="dsx-unavailable"], [data-testid="dsx-planned"]')
          .count();
        expect(
          blocked,
          `${name}: a workspace with no clickable card must declare a blocked or unavailable capability`,
        ).toBeGreaterThan(0);
      }
    }

    // eslint-disable-next-line no-console
    console.log('clickable cards audited per workspace:', JSON.stringify(tally));

    expect(failures, `card destination failures:\n${failures.join('\n')}`).toEqual([]);
    expect(consoleErrors, 'no console errors while auditing cards').toEqual([]);
    void guard;
  });
});

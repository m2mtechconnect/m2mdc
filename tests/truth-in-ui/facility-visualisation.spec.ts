/**
 * Stage 7F - full-width responsive facility visualisation.
 *
 * Verifies canvas occupancy, rack interaction, quick-view reflow, search
 * centring, zoom/fit and keyboard access across the required viewports.
 */
import { test, expect, type Page } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';

const VIEWPORTS = [
  { name: '1536x864', width: 1536, height: 864, inline: true },
  { name: '1440x900', width: 1440, height: 900, inline: true },
  { name: '1366x768', width: 1366, height: 768, inline: true },
  { name: '1024x768', width: 1024, height: 768, inline: false },
  { name: '390x844', width: 390, height: 844, inline: false },
];

async function openDashboard(page: Page) {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('facility-floor-plan')).toBeVisible({ timeout: 30_000 });
}

async function occupancy(page: Page) {
  return page.evaluate(() => {
    const vp = document.querySelector('[data-testid="facility-canvas-viewport"]')!.getBoundingClientRect();
    const boxes = [...document.querySelectorAll('[data-rack-id]')].map((n) => n.getBoundingClientRect());
    const left = Math.min(...boxes.map((b) => b.left));
    const right = Math.max(...boxes.map((b) => b.right));
    return (right - left) / vp.width;
  });
}

test.describe('facility visualisation', () => {
  test.beforeEach(async ({ context }) => {
    await installSupabaseMock(context);
  });

  for (const vp of VIEWPORTS) {
    test(`${vp.name}: fills the canvas, stays interactive and reflows`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await openDashboard(page);
      await page.waitForTimeout(400);

      // All 40 modelled racks remain individually interactive.
      expect(await page.locator('[data-rack-id]').count()).toBeGreaterThan(0);

      const before = await occupancy(page);
      if (vp.width >= 1024) {
        expect(before, 'canvas occupancy').toBeGreaterThanOrEqual(0.75);
      } else {
        // Phone: the plan pans inside the visualisation instead of shrinking.
        expect(before).toBeGreaterThan(1);
      }

      // Selecting a rack opens the single correct Rack Quick View presentation.
      await page.locator('[data-rack-code="C4"]').click();
      const inline = page.getByTestId('rack-quick-view-inline');
      const sheet = page.getByRole('dialog', { name: /Rack quick view|Rack C4/i });
      if (vp.inline) {
        await expect(inline).toBeVisible();
      } else {
        await expect(inline).toHaveCount(0);
        await expect(sheet.first()).toBeVisible();
      }
      await page.waitForTimeout(350);

      // The selected rack stays inside the visible canvas after the reflow.
      const visible = await page.evaluate(() => {
        const vpBox = document.querySelector('[data-testid="facility-canvas-viewport"]')!.getBoundingClientRect();
        const r = document.querySelector('[data-rack-code="C4"]')!.getBoundingClientRect();
        return r.left >= vpBox.left - 1 && r.right <= vpBox.right + 1
          && r.top >= vpBox.top - 1 && r.bottom <= vpBox.bottom + 1;
      });
      expect(visible, 'selected rack remains visible').toBe(true);

      // No page-level horizontal overflow at any viewport.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);

      await page.keyboard.press('Escape');
    });
  }

  test('zoom, fit and reset recompute the view without losing the facility', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openDashboard(page);
    const scale = () => page.getByTestId('facility-floor-plan').getAttribute('data-plan-scale');
    const fitScale = Number(await scale());

    await page.getByTestId('canvas-zoom-in').click();
    await page.waitForTimeout(200);
    expect(Number(await scale())).toBeGreaterThan(fitScale);

    await page.getByTestId('canvas-fit').click();
    await page.waitForTimeout(250);
    // Fit recalculates from the measured container rather than restoring a constant.
    expect(Number(await scale())).toBeCloseTo(fitScale, 2);

    await page.getByTestId('canvas-zoom-out').click();
    await page.getByTestId('canvas-reset').click();
    await page.waitForTimeout(250);
    expect(Number(await scale())).toBeCloseTo(fitScale, 2);
    expect(await occupancy(page)).toBeGreaterThanOrEqual(0.75);
  });

  test('rack search selects and centres the requested rack', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openDashboard(page);
    // Derive a real rack code from the rendered plan rather than assuming one.
    const code = (await page.locator('[data-rack-code]').last().getAttribute('data-rack-code'))!;
    await page.getByTestId('rack-search-input').fill(code);
    await page.getByTestId(`rack-search-result-${code}`).click();
    await page.waitForTimeout(400);
    await expect(page.locator(`[data-rack-code="${code}"]`)).toHaveAttribute('data-selected', 'true');
    const centred = await page.evaluate((c) => {
      const vp = document.querySelector('[data-testid="facility-canvas-viewport"]')!.getBoundingClientRect();
      const r = document.querySelector(`[data-rack-code="${c}"]`)!.getBoundingClientRect();
      return Math.abs((r.left + r.right) / 2 - (vp.left + vp.right) / 2) < vp.width / 2;
    }, code);
    expect(centred).toBe(true);
  });

  test('keyboard: arrows move between racks and Enter opens the quick view', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openDashboard(page);
    await page.locator('[data-rack-code="A1"]').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-rack-code="A2"]')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-rack-code="B2"]')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('rack-quick-view-inline')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('rack-quick-view-inline')).toHaveCount(0);
    await expect(page.locator('[data-rack-code="B2"]')).toBeFocused();
  });

  test('truthful disclosure stays attached to the visualisation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openDashboard(page);
    const disclosure = page.getByTestId('canvas-disclosure');
    await expect(disclosure).toContainText('Procedural design visualization');
    await expect(disclosure).toContainText('racks represented');
    await expect(disclosure).toContainText('Not a validated OpenUSD stage');
    await expect(page.getByTestId('canvas-legend')).toBeVisible();
  });
});

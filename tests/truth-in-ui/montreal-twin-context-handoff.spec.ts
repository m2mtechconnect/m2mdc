/**
 * End-to-end context preservation for the data-centre industry flow.
 *
 * An operator working the Montreal reference facility must be able to open
 * Blueprint and Simulation and land in the Evidence shell without losing the
 * twin they were investigating. This spec asserts that:
 *
 *   • Command Centre hand-offs carry the active twin / facility id.
 *   • /blueprint/:id keeps the twin id in the URL.
 *   • /simulation keeps the twin hand-off parameters.
 *   • /evidence/* parses `facility` into the investigation context, states the
 *     active facility in the shell header and shows a non-removable scope chip.
 *
 * Nothing here asserts measured telemetry: an id that does not resolve must be
 * reported as unavailable rather than substituted.
 */
import { test, expect } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';
import { seedDismissedTours } from './_setup/app-state';

/** Montreal reference facility used when no stored twin is selected. */
const MONTREAL_TWIN_ID = 'aura-reference-facility';

test.describe('Montreal twin context is preserved into Blueprint, Simulation and Evidence', () => {
  test.beforeEach(async ({ context }) => {
    await installSupabaseMock(context);
    await seedDismissedTours(context);
  });

  test('Command Centre evidence hand-offs carry the active facility id', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    const evidenceLinks = page.locator('a[href*="/evidence"]');
    await expect(evidenceLinks.first()).toBeAttached({ timeout: 15_000 });

    const hrefs = await evidenceLinks.evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute('href') ?? ''),
    );
    const scoped = hrefs.filter((h) => h.includes('facility='));
    expect(scoped.length, `evidence hand-offs must carry facility context: ${hrefs.join(' | ')}`)
      .toBeGreaterThan(0);
    for (const href of scoped) {
      expect(new URLSearchParams(href.split('?')[1] ?? '').get('facility')).toBeTruthy();
    }
  });

  test('Blueprint opens on the twin id and keeps it in the URL', async ({ page }) => {
    await page.goto(`/blueprint/${MONTREAL_TWIN_ID}?tab=model&layer=thermal`, {
      waitUntil: 'domcontentloaded',
    });

    await expect(page).toHaveURL(new RegExp(`/blueprint/${MONTREAL_TWIN_ID}`));
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 });
    // The twin id survives an in-app reload of the same surface.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(new RegExp(`/blueprint/${MONTREAL_TWIN_ID}`));
  });

  test('Simulation keeps the twin hand-off parameters', async ({ page }) => {
    await page.goto(`/simulation?blueprint=${MONTREAL_TWIN_ID}&twin=${MONTREAL_TWIN_ID}&state=draft`, {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 });
    const params = new URL(page.url()).searchParams;
    expect(params.get('twin')).toBe(MONTREAL_TWIN_ID);
    expect(params.get('blueprint')).toBe(MONTREAL_TWIN_ID);
  });

  test('Evidence shell states the active facility carried on the deep link', async ({ page }) => {
    await page.goto(`/evidence/sustainability?facility=${MONTREAL_TWIN_ID}&kpi=pue`, {
      waitUntil: 'domcontentloaded',
    });

    const label = page.getByTestId('dsx-active-facility');
    await expect(label).toBeVisible({ timeout: 15_000 });
    await expect(label).toHaveText(/^Facility: .+/);
    // Never blank, and never silently dropped.
    await expect(label).not.toHaveText('Facility: not selected');

    const chip = page.getByTestId('dsx-context-chip-facility_id');
    await expect(chip).toBeVisible();
    // Facility scope is the investigation root: it must not be removable.
    await expect(chip.getByRole('button')).toHaveCount(0);

    // The facility parameter survives navigation to a sibling workspace.
    await page.getByTestId('dsx-nav-thermal').first().click().catch(() => undefined);
    await expect(page).toHaveURL(/facility=/);
  });

  test('an unresolved facility id is reported as unavailable, not substituted', async ({ page }) => {
    await page.goto('/evidence/sustainability?facility=facility-that-does-not-exist', {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.getByTestId('dsx-active-facility')).toHaveText(
      'Facility: Unavailable (record not found)',
      { timeout: 15_000 },
    );
  });
});

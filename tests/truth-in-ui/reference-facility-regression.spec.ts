/**
 * NVIDIA Reference Facility runtime regression.
 *
 * Proves the verified mounts cannot silently disappear: the spec reads the
 * live runtime coverage store (not the manifest) and compares it against the
 * frozen baseline in `src/validation/referenceFacility/regressionBaseline.ts`.
 */
import { test, expect } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';
import {
  BASELINE_AURA_FACILITY_OBJECTS,
  BASELINE_FACILITY_FAMILIES,
  BASELINE_NVIDIA_OBJECTS,
  BASELINE_NVIDIA_ROLES,
  BASELINE_RACK_CABINETS,
  evaluateRuntimeRegression,
} from '../../src/validation/referenceFacility/regressionBaseline';

const ROUTE = '/data-centre-twin?geometry=nvidia-reference';

test.describe('NVIDIA Reference Facility runtime regression', () => {
  test.setTimeout(180_000);
  test('mounts the verified NVIDIA equipment, 40 cabinets and every AURA facility family', async ({
    context,
    page,
  }, testInfo) => {
    const mock = await installSupabaseMock(context);
    const twinId = '00000000-0000-4000-8000-000000000042';
    const twin = {
      id: twinId,
      location_id: null,
      name: 'Reference Facility Regression Twin',
      city: 'Montreal',
      region_code: 'ca-central-1',
      tier: '4',
      capacity_kw: 5000,
      industry: 'data_centre',
      sovereignty_level: 'sovereign',
      pue_target: 1.2,
      renewable_target_pct: 80,
      carbon_intensity: 25,
      metadata: {},
      blueprint_id: null,
      created_by_user: mock.session.userId,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };
    await context.route('**/rest/v1/data_centre_twins*', async (route) => {
      const wantsSingle = (route.request().headers()['accept'] ?? '').includes('pgrst.object');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(wantsSingle ? twin : [twin]),
      });
    });
    await context.addInitScript((id) => localStorage.setItem('dc_active_twin_id', id), twinId);

    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('twin-visualization-layout')).toBeVisible();

    const read = async () =>
      page.evaluate(() => {
        const coverage = window.__auraRuntimeCoverage?.();
        const families = window.__auraFacilityFamilies?.();
        if (!coverage || !families) return null;
        return {
          roles: coverage.roles,
          rackMounts: coverage.rackMounts,
          auraAuthoredRoles: coverage.auraAuthoredRoles,
          families,
        };
      });

    // Derivatives stream in; poll until the scene reaches the baseline or times out.
    let snapshot: Awaited<ReturnType<typeof read>> = null;
    await expect
      .poll(
        async () => {
          snapshot = await read();
          if (!snapshot) return -1;
          const aura = new Set(snapshot.auraAuthoredRoles);
          return evaluateRuntimeRegression({
            roles: snapshot.roles,
            rackMounts: snapshot.rackMounts,
            families: snapshot.families,
            isAuraAuthored: (id) =>
              Object.entries(snapshot!.roles).some(([key, r]) => r.assetId === id && aura.has(key)),
          }).nvidiaObjects;
        },
        { timeout: 90_000, intervals: [1_000] },
      )
      .toBeGreaterThanOrEqual(BASELINE_NVIDIA_OBJECTS);

    const data = snapshot!;
    const auraRoles = new Set(data.auraAuthoredRoles);
    const result = evaluateRuntimeRegression({
      roles: data.roles,
      rackMounts: data.rackMounts,
      families: data.families,
      isAuraAuthored: (id) =>
        Object.entries(data.roles).some(([key, r]) => r.assetId === id && auraRoles.has(key)),
    });

    testInfo.annotations.push({
      type: 'runtime-regression',
      description: JSON.stringify(result.checks, null, 2),
    });

    expect(result.nvidiaObjects, 'NVIDIA OpenUSD-derived objects').toBeGreaterThanOrEqual(
      BASELINE_NVIDIA_OBJECTS,
    );
    expect(result.cabinetsMounted, 'cabinets on an approved NVIDIA derivative').toBeGreaterThanOrEqual(
      BASELINE_RACK_CABINETS,
    );
    expect(result.nvidiaDerivedRoles, 'NVIDIA roles reporting derived geometry').toBeGreaterThanOrEqual(
      BASELINE_NVIDIA_ROLES,
    );
    expect(result.missingFamilies, 'AURA facility families mounted').toEqual([]);
    expect(Object.keys(data.families).sort()).toEqual([...BASELINE_FACILITY_FAMILIES].sort());
    expect(result.auraFacilityObjects, 'AURA OpenUSD facility objects').toBeGreaterThanOrEqual(
      BASELINE_AURA_FACILITY_OBJECTS,
    );
    expect(result.passed).toBe(true);
  });
});

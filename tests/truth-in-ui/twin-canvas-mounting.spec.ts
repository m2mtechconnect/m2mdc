import { test, expect } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';

test.describe('AURA twin canvas mounting', () => {
  test('route leaves the loading skeleton and reaches a terminal viewport state', async ({ context, page }) => {
    const mock = await installSupabaseMock(context);
    const twinId = '00000000-0000-4000-8000-000000000042';
    const twin = {
      id: twinId,
      location_id: null,
      name: 'Canvas Mount Test Twin',
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
    await page.goto('/data-centre-twin', { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('twin-visualization-layout')).toBeVisible();
    await expect(page.getByText('Loading 3D Twin...', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Loading Digital Twin...', { exact: true })).toHaveCount(0);

    const canvas = page.getByTestId('twin-canvas');
    const fallback = page.getByRole('heading', { name: /3D twin unavailable/i }).first();
    await expect
      .poll(async () => (await canvas.count()) + (await fallback.count()))
      .toBeGreaterThan(0);

    if (await canvas.count()) {
      await expect(canvas).toBeVisible();
      const bounds = await canvas.boundingBox();
      expect(bounds?.width ?? 0).toBeGreaterThan(0);
      expect(bounds?.height ?? 0).toBeGreaterThan(0);
    } else {
      await expect(fallback).toBeVisible();
      await expect(page.getByText('2D FLOOR PLAN (SAME MODELLED DATA)').first()).toBeVisible();
    }
  });
});
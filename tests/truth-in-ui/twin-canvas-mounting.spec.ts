import { test, expect } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';

test.describe('AURA twin canvas mounting', () => {
  test('route leaves the loading skeleton and reaches a terminal viewport state', async ({ context, page }) => {
    await installSupabaseMock(context);
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
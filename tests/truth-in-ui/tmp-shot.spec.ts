import { test, expect } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';
for (const vp of [[1536,864],[1024,768],[390,844]] as const) {
  test(`shot ${vp[0]}`, async ({ page, context }) => {
    await installSupabaseMock(context);
    await page.setViewportSize({ width: vp[0], height: vp[1] });
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('facility-floor-plan')).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(600);
    await page.getByTestId('facility-canvas').screenshot({ path: `/tmp/browser/fs/canvas-${vp[0]}.png` });
  });
}

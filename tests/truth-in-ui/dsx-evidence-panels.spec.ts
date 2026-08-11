/**
 * Evidence workspaces render their evidence-backed panels (rack map, trends,
 * quality bar, exceptions, diagrams) rather than placeholder content.
 */
import { test, expect } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';

const CASES: { path: string; testIds: string[] }[] = [
  { path: '/dsx/evidence-beta/overview', testIds: ['dsx-rack-map-panel', 'dsx-trend-strip', 'dsx-evidence-quality'] },
  { path: '/dsx/evidence-beta/thermal', testIds: ['dsx-rack-map-panel', 'dsx-trend-strip', 'dsx-thermal-queue'] },
  { path: '/dsx/evidence-beta/power', testIds: ['dsx-power-one-line', 'dsx-rack-map-panel'] },
  { path: '/dsx/evidence-beta/cooling', testIds: ['dsx-cooling-loop', 'dsx-trend-strip'] },
  { path: '/dsx/evidence-beta/workload', testIds: ['dsx-workload-missing-source'] },
  { path: '/dsx/evidence-beta/network', testIds: ['dsx-network-missing-source'] },
  { path: '/dsx/evidence-beta/carbon', testIds: ['dsx-trend-strip'] },
  { path: '/dsx/evidence-beta/evidence', testIds: ['dsx-evidence-quality'] },
  { path: '/dsx/evidence-beta/facility', testIds: ['dsx-rack-map-panel'] },
];

for (const c of CASES) {
  test(`evidence panels render on ${c.path}`, async ({ page }) => {
    await installSupabaseMock(page);
    await page.goto(c.path, { waitUntil: 'domcontentloaded' });
    for (const id of c.testIds) {
      await expect(page.getByTestId(id).first()).toBeVisible({ timeout: 15_000 });
    }
  });
}

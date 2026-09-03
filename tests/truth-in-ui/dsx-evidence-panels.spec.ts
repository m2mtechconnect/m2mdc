/**
 * Evidence workspaces render their evidence-backed panels (rack map, trends,
 * quality bar, exceptions, diagrams) rather than placeholder content.
 */
import { test, expect } from './_setup/fixtures';
import { installDsxSupabaseMock } from './_setup/supabase-mock';

const CASES: { path: string; testIds: string[] }[] = [
  { path: '/evidence/overview', testIds: ['dsx-rack-map-panel', 'dsx-trend-strip', 'dsx-evidence-quality'] },
  { path: '/evidence/thermal', testIds: ['dsx-rack-map-panel', 'dsx-trend-strip', 'dsx-thermal-queue'] },
  { path: '/evidence/power', testIds: ['dsx-power-one-line', 'dsx-rack-map-panel'] },
  { path: '/evidence/cooling', testIds: ['dsx-cooling-loop', 'dsx-trend-strip'] },
  { path: '/evidence/workload', testIds: ['dsx-workload-missing-source'] },
  { path: '/evidence/network', testIds: ['dsx-network-missing-source'] },
  { path: '/evidence/carbon', testIds: ['dsx-trend-strip'] },
  { path: '/evidence/evidence', testIds: ['dsx-evidence-quality'] },
  { path: '/evidence/facility', testIds: ['dsx-rack-map-panel'] },
];

for (const c of CASES) {
  test(`evidence panels render on ${c.path}`, async ({ page }) => {
    await installDsxSupabaseMock(page);
    await page.goto(c.path, { waitUntil: 'domcontentloaded' });
    for (const id of c.testIds) {
      await expect(page.getByTestId(id).first()).toBeVisible({ timeout: 15_000 });
    }
  });
}

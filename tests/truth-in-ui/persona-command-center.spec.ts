import { expect, test } from './_setup/fixtures';
import { seedDismissedTours } from './_setup/app-state';
import { installSupabaseMock } from './_setup/supabase-mock';
import type { AnyRole } from '../../src/auth/permissions';
import type { OrganizationRole } from '../../src/auth/organizationAuthorization';

interface DashboardAuthorization {
  withActiveOrganization: boolean;
  platformRole?: AnyRole | null;
  organizationRole?: OrganizationRole;
}

async function openDashboard(
  context: import('@playwright/test').BrowserContext,
  page: import('@playwright/test').Page,
  authorization: DashboardAuthorization,
) {
  await seedDismissedTours(context);
  const mock = await installSupabaseMock(context, authorization);
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => mock.profileHits()).toBeGreaterThan(0);
  await expect(page.getByTestId('persona-priority-panel')).toBeVisible();
  return page.getByTestId('persona-priority-panel');
}

test.describe('persona-prioritized Command Center', () => {
  test('uses active organization scope and exposes only governed owner actions', async ({ context, page, guard }) => {
    const panel = await openDashboard(context, page, { withActiveOrganization: true });

    await expect(panel).toHaveAttribute('data-persona-family', 'owner_admin');
    await expect(panel.getByText(/Owner \/ administrator focus · AURA Truth Organization organization/i)).toBeVisible();
    await expect(panel.getByTestId('persona-action-readiness')).toBeVisible();
    await expect(panel.getByTestId('persona-action-people-access')).toBeVisible();
    await expect(panel.getByTestId('persona-action-connections')).toBeVisible();
    await expect(panel.locator('[data-testid^="persona-action-"]')).toHaveCount(3);

    await page.getByTestId('primary-persona-action').click();
    await expect(page).toHaveURL(/\/readiness\/supervisor$/);
    expect(guard.anyExternalCompleted(), 'no external request may complete').toBe(false);
  });

  test('labels platform scope explicitly when no organization is active', async ({ context, page, guard }) => {
    const panel = await openDashboard(context, page, { withActiveOrganization: false });

    await expect(panel).toHaveAttribute('data-persona-family', 'owner_admin');
    await expect(panel.getByText(/Owner \/ administrator focus · Platform scope/i)).toBeVisible();
    await expect(panel.getByTestId('persona-action-platform-readiness')).toBeVisible();
    await expect(page.getByTestId('primary-persona-action')).toHaveAttribute('href', '/admin/platform-readiness');
    expect(guard.anyExternalCompleted(), 'no external request may complete').toBe(false);
  });

  test('engineer/operator resumes simulation work and cannot enter the platform plane', async ({ context, page, guard }) => {
    const panel = await openDashboard(context, page, {
      withActiveOrganization: true,
      platformRole: null,
      organizationRole: 'engineer',
    });

    await expect(panel).toHaveAttribute('data-persona-family', 'engineer_operator');
    await expect(panel.getByText(/Facility Engineer \/ Operator focus/i)).toBeVisible();
    await expect(panel.getByTestId('persona-action-simulate')).toBeVisible();
    await expect(panel.getByTestId('persona-action-blueprint')).toBeVisible();
    await expect(panel.getByTestId('persona-action-operations')).toBeVisible();

    await panel.getByTestId('persona-action-simulate').click();
    await expect(page).toHaveURL(/\/simulation\?twin=/);
    await expect(page.getByTestId('aura-workspace')).toBeVisible();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('aura-workspace')).toBeVisible();

    await page.goto('/admin/platform-readiness');
    await expect(page).toHaveURL(/\/dashboard$/);
    expect(guard.anyExternalCompleted(), 'no external request may complete').toBe(false);
  });

  test('executive/manager reaches evidence but cannot mutate the twin', async ({ context, page, guard }) => {
    const panel = await openDashboard(context, page, {
      withActiveOrganization: true,
      platformRole: null,
      organizationRole: 'executive',
    });

    await expect(panel).toHaveAttribute('data-persona-family', 'executive_manager');
    await expect(panel.getByText(/Executive \/ Manager focus/i)).toBeVisible();
    await expect(panel.getByTestId('persona-action-decision-queue')).toBeVisible();
    await expect(panel.getByTestId('persona-action-evidence')).toBeVisible();

    await panel.getByTestId('persona-action-evidence').click();
    await expect(page).toHaveURL(/\/evidence\?facility=/);
    await expect(page.getByTestId('dsx-workspace-title')).toBeVisible();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('dsx-workspace-title')).toBeVisible();

    await page.goto('/builder');
    await expect(page).toHaveURL(/\/dashboard$/);
    expect(guard.anyExternalCompleted(), 'no external request may complete').toBe(false);
  });

  test('compliance/analyst follows evidence provenance and cannot edit connections', async ({ context, page, guard }) => {
    const panel = await openDashboard(context, page, {
      withActiveOrganization: true,
      platformRole: null,
      organizationRole: 'compliance',
    });

    await expect(panel).toHaveAttribute('data-persona-family', 'compliance_analyst');
    await expect(panel.getByText(/Compliance \/ Analyst focus/i)).toBeVisible();
    await expect(panel.getByTestId('persona-action-evidence')).toBeVisible();
    await expect(panel.getByTestId('persona-action-readiness')).toBeVisible();

    await panel.getByTestId('persona-action-evidence').click();
    await expect(page).toHaveURL(/\/evidence\?facility=/);
    await expect(page.getByTestId('dsx-workspace-title')).toBeVisible();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('dsx-workspace-title')).toBeVisible();

    await page.goto('/manage/integrations');
    await expect(page).toHaveURL(/\/dashboard$/);
    expect(guard.anyExternalCompleted(), 'no external request may complete').toBe(false);
  });

  test('organization viewer can inspect evidence but cannot enter Builder', async ({ context, page, guard }) => {
    const panel = await openDashboard(context, page, {
      withActiveOrganization: true,
      platformRole: null,
      organizationRole: 'viewer',
    });

    await expect(panel).toHaveAttribute('data-persona-family', 'viewer_pilot');
    await expect(panel.getByText(/Viewer \/ Pilot focus/i)).toBeVisible();
    await expect(panel.getByTestId('persona-action-blueprint')).toBeVisible();
    await expect(panel.getByTestId('persona-action-evidence')).toBeVisible();

    await panel.getByTestId('persona-action-evidence').click();
    await expect(page).toHaveURL(/\/evidence\?facility=/);
    await expect(page.getByTestId('dsx-workspace-title')).toBeVisible();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('dsx-workspace-title')).toBeVisible();

    await page.goto('/builder');
    await expect(page).toHaveURL(/\/dashboard$/);
    expect(guard.anyExternalCompleted(), 'no external request may complete').toBe(false);
  });

  test('tenant-only global viewer receives a recovery action without product-route authority', async ({ context, page, guard }) => {
    const panel = await openDashboard(context, page, {
      withActiveOrganization: false,
      platformRole: 'viewer',
    });

    await expect(panel).toHaveAttribute('data-persona-family', 'viewer_pilot');
    await expect(panel.getByText(/Viewer \/ Pilot focus · Evaluation scope/i)).toBeVisible();
    await expect(panel.getByTestId('persona-action-access-status')).toBeVisible();
    await expect(panel.locator('[data-testid^="persona-action-"]')).toHaveCount(1);

    await panel.getByTestId('persona-action-access-status').click();
    await expect(page).toHaveURL(/\/account\/settings$/);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/account\/settings$/);

    await page.goto('/simulation');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByTestId('persona-action-access-status')).toBeVisible();
    expect(guard.anyExternalCompleted(), 'no external request may complete').toBe(false);
  });

  test('grant-less pilot stays sealed and can refresh an explicit access status', async ({ context, page, guard }) => {
    await seedDismissedTours(context);
    const mock = await installSupabaseMock(context, {
      withActiveOrganization: false,
      platformRole: null,
    });

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => mock.profileHits()).toBeGreaterThan(0);
    await expect(page).toHaveURL(/\/pilot\/overview$/);
    await expect(page.getByTestId('pilot-access-status')).toContainText('read-only pilot');
    await expect(page.getByText(/organization administrator must assign an active membership/i)).toBeVisible();

    await page.getByTestId('pilot-refresh-access').click();
    await expect(page).toHaveURL(/\/pilot\/overview$/);
    await expect(page.getByTestId('pilot-access-status')).toBeVisible();

    await page.goto('/simulation');
    await expect(page).toHaveURL(/\/pilot\/overview$/);
    await expect(page.getByTestId('pilot-access-status')).toBeVisible();
    expect(guard.anyExternalCompleted(), 'no external request may complete').toBe(false);
  });
});

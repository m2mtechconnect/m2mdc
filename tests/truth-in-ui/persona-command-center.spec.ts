import { expect, test } from './_setup/fixtures';
import { seedDismissedTours } from './_setup/app-state';
import { installSupabaseMock } from './_setup/supabase-mock';
import type { AnyRole } from '../../src/auth/permissions';
import type { OrganizationRole } from '../../src/auth/organizationAuthorization';

interface DashboardAuthorization {
  withActiveOrganization: boolean;
  platformRole?: AnyRole | null;
  organizationRole?: OrganizationRole;
  simulationRuns?: unknown[];
  decisionRecords?: unknown[];
}

const HANDOFF_RUN_ID = '00000000-0000-4000-8000-000000000101';
const HANDOFF_RUN_KEY = 'SIM-HANDOFF-001';
const HANDOFF_KPIS = {
  pue: 1.31,
  itLoadKw: 7400,
  gpuUtilization: 82,
  thermalStability: 91,
  coolingEfficiency: 88,
  capacityHeadroom: 18,
  carbonIntensity: 42,
  energyCostPerMwh: 81,
  sovereigntyScore: 96,
};

const HANDOFF_RECOMMENDATIONS = [
  {
    id: 'rec-reviewed',
    title: 'Keep the thermal guardrail',
    rationale: 'The simulated temperature margin narrows during the workload surge.',
    subsystem: 'Cooling',
    signal: 'medium',
  },
  {
    id: 'rec-pending',
    title: 'Escalate capacity planning',
    rationale: 'The simulated headroom is below the facility planning target.',
    subsystem: 'Capacity',
    signal: 'strong',
  },
];

const HANDOFF_RUN = {
  id: HANDOFF_RUN_ID,
  run_key: HANDOFF_RUN_KEY,
  run_label: HANDOFF_RUN_KEY,
  scenario_key: 'ai-training-surge',
  scenario_name: 'AI training surge',
  twin_id: '00000000-0000-4000-8000-000000000201',
  started_at: '2026-09-01T12:00:00.000Z',
  finished_at: '2026-09-01T12:02:00.000Z',
  baseline_kpis: HANDOFF_KPIS,
  final_kpis: { ...HANDOFF_KPIS, capacityHeadroom: 11 },
  events: [],
  input_snapshot: {
    facilityId: '00000000-0000-4000-8000-000000000201',
    facilityName: 'AURA Truth Facility',
    overrides: {
      coolingSetpointC: 24,
      gpuPowerCapPct: 100,
      workloadDensityPct: 82,
      renewableMixPct: 60,
    },
    baseline: HANDOFF_KPIS,
  },
  output_snapshot: {
    result: { ...HANDOFF_KPIS, capacityHeadroom: 11 },
    events: [],
    recommendations: HANDOFF_RECOMMENDATIONS,
  },
  execution_origin: 'client-browser',
  validation_status: 'client-produced-unverified',
  verification_level: 'client-generated-unverified',
};

const HANDOFF_DECISION = {
  id: '00000000-0000-4000-8000-000000000301',
  run_id: HANDOFF_RUN_ID,
  recommendation_id: 'rec-reviewed',
  outcome: 'rejected',
  rationale: 'The recommendation requires a verified thermal model before approval.',
  approver: 'manager@aura.local',
  decided_at: '2026-09-01T12:10:00.000Z',
  snapshot_hash: 'sha256:truth-suite-snapshot',
  decision_hash: 'sha256:truth-suite-decision',
  evidence_schema_version: '2.0.0',
};

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
    await expect(panel.getByText(/Owner \/ administrator focus · AURA Truth Organization/i)).toBeVisible();
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

  test('manager opens the tenant decision queue with durable run evidence intact', async ({ context, page, guard }) => {
    const panel = await openDashboard(context, page, {
      withActiveOrganization: true,
      platformRole: null,
      organizationRole: 'manager',
      simulationRuns: [HANDOFF_RUN],
      decisionRecords: [HANDOFF_DECISION],
    });

    await expect(panel).toHaveAttribute('data-persona-family', 'executive_manager');
    await expect(panel.getByText('1 decision awaiting review')).toBeVisible();
    await expect(panel.getByTestId('persona-action-decision-queue')).toHaveAttribute(
      'href',
      new RegExp(`step=decide&run=${HANDOFF_RUN_KEY}$`),
    );

    await panel.getByTestId('persona-action-decision-queue').click();
    await expect(page).toHaveURL(new RegExp(`/simulation\\?.*step=decide.*run=${HANDOFF_RUN_KEY}`));
    const workspace = page.getByTestId('aura-workspace');
    await expect(workspace).toBeVisible();
    await expect(page.getByTestId('workspace-context-panel').getByText('Review and record')).toBeVisible();
    await expect(page.getByText(`Recommendations for run ${HANDOFF_RUN_KEY}.`)).toBeVisible();
    await expect(page.getByTestId('decision-evidence-rec-reviewed')).toContainText(
      'The recommendation requires a verified thermal model before approval.',
    );
    await expect(page.getByText('Escalate capacity planning')).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(new RegExp(`step=decide.*run=${HANDOFF_RUN_KEY}`));
    await expect(page.getByTestId('decision-evidence-rec-reviewed')).toBeVisible();
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

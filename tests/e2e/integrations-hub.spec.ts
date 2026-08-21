import { test, expect } from '@playwright/test';
import { installSupabaseMock } from '../truth-in-ui/_setup/supabase-mock';

type ConnectorFixture = {
  id: string;
  name: string;
  category: string;
  provider: string;
  version: string;
  implementation_status: 'IMPLEMENTED' | 'IMPLEMENTED_NOT_WIRED' | 'PLANNED' | 'UNSUPPORTED';
  supported_directions: string[];
  supported_auth_methods: string[];
  supported_data_classes: string[];
  supported_protocols: string[];
  configuration_schema: Record<string, unknown>;
  mapping_required: boolean;
  documentation_url: null;
  validation_status: string;
  runtime_adapter: string | null;
  availability: string;
  capability_evidence: Array<{ kind: string; note: string }>;
};

const connector = (
  id: string,
  name: string,
  category: string,
  provider: string,
  over: Partial<ConnectorFixture> = {},
): ConnectorFixture => ({
  id,
  name,
  category,
  provider,
  version: '0.0.0',
  implementation_status: 'PLANNED',
  supported_directions: ['READ'],
  supported_auth_methods: [],
  supported_data_classes: ['telemetry'],
  supported_protocols: [],
  configuration_schema: {},
  mapping_required: false,
  documentation_url: null,
  validation_status: 'UNVALIDATED',
  runtime_adapter: null,
  availability: 'UNAVAILABLE',
  capability_evidence: [],
  ...over,
});

const CATALOGUE: ConnectorFixture[] = [
  connector('redfish', 'Redfish hardware management', 'Facility and OT', 'DMTF', {
    supported_protocols: ['https', 'redfish'],
  }),
  connector('nvidia_dcgm', 'NVIDIA DCGM telemetry', 'Facility and OT', 'NVIDIA', {
    supported_data_classes: ['gpu_telemetry', 'metrics'],
    supported_protocols: ['dcgm'],
  }),
  connector('mqtt_transport', 'MQTT Transport', 'Facility and OT', 'MQTT', {
    implementation_status: 'IMPLEMENTED_NOT_WIRED',
    supported_protocols: ['mqtt'],
  }),
  connector('dsx_ingest_gateway', 'DSX Ingest Gateway', 'DSX Exchange', 'NVIDIA', {
    implementation_status: 'IMPLEMENTED',
    runtime_adapter: 'dsx-ingest-edge-function',
    availability: 'AVAILABLE',
  }),
  connector('dsx_exchange', 'DSX Exchange', 'DSX Exchange', 'NVIDIA', {
    availability: 'NOT_DEPLOYED',
  }),
  connector('openusd_storage', 'OpenUSD Asset Storage', 'Assets and engineering', 'AURA', {
    implementation_status: 'IMPLEMENTED',
    runtime_adapter: 'supabase-storage',
    availability: 'AVAILABLE',
    supported_data_classes: ['asset'],
  }),
  connector('ddn_infinia', 'DDN Infinia object storage', 'Assets and engineering', 'DDN', {
    availability: 'NOT_DEPLOYED',
    supported_data_classes: ['asset', 'evidence'],
    supported_protocols: ['https', 's3'],
  }),
  connector('servicenow', 'ServiceNow ITSM', 'Workflow and enterprise', 'ServiceNow', {
    supported_data_classes: ['work_orders'],
  }),
  connector('prometheus', 'Prometheus / OpenTelemetry', 'Cloud and infrastructure', 'CNCF'),
  connector('aws', 'Amazon Web Services', 'Cloud and infrastructure', 'AWS'),
  connector('rest_api', 'Generic REST API', 'Workflow and enterprise', 'Generic'),

  // Deliberately present in the database but owned elsewhere in the UI.
  connector('search_analytics', 'Search Analytics', 'Workflow and enterprise', 'Search'),
  connector('workspace_documents', 'Workspace Documents', 'Workflow and enterprise', 'Workspace'),
  connector('supabase_platform', 'Application Platform', 'Platform service', 'Platform', {
    implementation_status: 'IMPLEMENTED',
    runtime_adapter: 'supabase-js',
  }),
  connector('kubernetes', 'Kubernetes', 'Cloud and infrastructure', 'CNCF'),
  connector('plm_cad_import', 'PLM / CAD import', 'Assets and engineering', 'Generic'),
  connector('bim_ifc_import', 'BIM / IFC import', 'Assets and engineering', 'buildingSMART'),
  connector('asset_manifest', 'Asset manifest', 'Assets and engineering', 'AURA'),
];

async function openConnections(
  context: import('@playwright/test').BrowserContext,
  page: import('@playwright/test').Page,
  tab = 'overview',
) {
  const mock = await installSupabaseMock(context);
  const { key, value } = mock.storage();
  await context.addInitScript(
    ([storageKey, storageValue]) => {
      localStorage.setItem(storageKey as string, storageValue as string);
    },
    [key, value] as const,
  );

  // Specific catalogue fixture wins over the generic Supabase REST fallback.
  await context.route('**/rest/v1/connector_definitions*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(CATALOGUE),
      headers: {
        'access-control-allow-origin': '*',
        'access-control-expose-headers': 'content-range,content-profile',
      },
    });
  });

  await page.goto(`/manage/integrations?tab=${tab}`, { waitUntil: 'domcontentloaded' });
  await expect.poll(() => mock.profileHits(), { timeout: 5_000 }).toBeGreaterThan(0);
  await expect(page.getByTestId('connections-page')).toBeVisible({ timeout: 10_000 });
}

test.describe('AURA Connections hybrid-stack workspace', () => {
  test('uses the canonical customer-facing tabs and purpose', async ({ context, page }) => {
    await openConnections(context, page);

    await expect(page.getByRole('heading', { name: 'Connections', exact: true })).toBeVisible();
    await expect(page.getByText(/facility systems, edge gateways, twin runtimes, storage and enterprise workflows/i).first()).toBeVisible();

    for (const tab of ['Overview', 'Connected systems', 'Data flows', 'Available connectors', 'Health & audit']) {
      await expect(page.getByRole('tab', { name: tab })).toBeVisible();
    }
    await expect(page.getByRole('tab', { name: 'Catalogue' })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Activity & health' })).toHaveCount(0);
  });

  test('organizes available connectors around the hybrid stack', async ({ context, page }) => {
    await openConnections(context, page, 'catalogue');

    for (const group of [
      'Facility & OT',
      'Edge & Exchange',
      'Digital Twin & Storage',
      'Enterprise Workflow',
      'Observability',
      'Cloud — Optional',
      'Custom',
    ]) {
      await expect(page.getByRole('heading', { name: group, exact: true })).toBeVisible();
    }

    await expect(page.getByText('Redfish hardware management')).toBeVisible();
    await expect(page.getByText('NVIDIA DCGM telemetry')).toBeVisible();
    await expect(page.getByText('DDN Infinia object storage')).toBeVisible();
    await expect(page.getByText(/DDN Infinia.*not deployed or runtime-verified/i)).toBeVisible();
    await expect(page.getByText(/does not prove DDN Infinia is deployed/i)).toBeVisible();
  });

  test('does not expose internal, knowledge or Blueprint-owned definitions as operational connectors', async ({ context, page }) => {
    await openConnections(context, page, 'catalogue');

    for (const hidden of [
      'Search Analytics',
      'Workspace Documents',
      'Application Platform',
      'Kubernetes',
      'PLM / CAD import',
      'BIM / IFC import',
      'Asset manifest',
    ]) {
      await expect(page.getByText(hidden, { exact: true }), hidden).toHaveCount(0);
    }

    await expect(page.getByRole('link', { name: /Design imports in Blueprint/i })).toHaveAttribute('href', '/blueprint/default');
    await expect(page.getByRole('link', { name: /Platform integration readiness/i })).toHaveAttribute('href', '/admin/platform-readiness');
  });

  test('keeps endpoint health distinct from data-flow proof', async ({ context, page }) => {
    await openConnections(context, page, 'catalogue');

    await expect(page.getByText(/Endpoint verification proves reachability and auth behaviour, not that facility data is flowing/i)).toBeVisible();
    await expect(page.getByText(/NVIDIA DSX Exchange is not deployed/i)).toBeVisible();
    await expect(page.getByText(/production runtime wiring is still required/i)).toBeVisible();
  });
});

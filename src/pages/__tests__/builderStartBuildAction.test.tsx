import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';

/**
 * Regression coverage for the dead "Start build" control on /builder.
 *
 * Production reproduction: on
 * `/builder?new=true&twin=<id>&source=facility&type=3d_twin` the start screen
 * rendered after a failed initialization, and its button navigated to a URL
 * byte-identical to the current location. React Router treats that as a no-op,
 * so the control did nothing: no URL change, no state change, no error.
 *
 * The fix retries initialization in place when the target equals the current
 * location, and still navigates (preserving every query parameter) otherwise.
 */

const FACILITY_ID = '7fad266d-dbf5-46c7-8b90-2ec44299f15d';
const CANONICAL = `/builder?new=true&twin=${FACILITY_ID}&source=facility&type=3d_twin`;

const navigateSpy = vi.fn();
const initializeBuilder = vi.fn();
const resetStore = vi.fn();
const setActiveTwin = vi.fn().mockResolvedValue(undefined);
const toastSpy = vi.fn();

let rbacState: { loading: boolean; activeOrgId: string | null } = {
  loading: false,
  activeOrgId: 'org-1',
};
let twinsState: Array<{ id: string; name: string; metadata: Record<string, unknown> }> = [];
let activeTwinId: string | null = FACILITY_ID;

const wizardState = {
  currentStep: 1,
  setCurrentStep: vi.fn(),
  markStepComplete: vi.fn(),
  goal: '',
  industry: '',
  department: '',
  initializeBuilder,
  error: null as string | null,
  lastSaved: null,
  builderId: null as string | null,
  isLoading: false,
  modelConfig: {},
  workflow: { actions: [] },
  type: null,
  reset: resetStore,
  deployBuilder: vi.fn(),
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateSpy };
});

vi.mock('@/stores/wizardBuilderStore', () => {
  const useWizardBuilderStore = Object.assign(
    () => wizardState,
    {
      getState: () => wizardState,
      setState: () => undefined,
      subscribe: () => () => undefined,
    },
  );
  return { useWizardBuilderStore };
});

vi.mock('@/stores/dcTwinBuilderStore', () => {
  const state = {
    currentStep: 1,
    setCurrentStep: vi.fn(),
    markStepComplete: vi.fn(),
    overview: { industries: [], twinName: '' },
    agents: [],
    scenarios: [],
    deployment: {},
    lastSaved: null,
  };
  const useDCTwinBuilderStore = Object.assign(() => state, { getState: () => state });
  return { useDCTwinBuilderStore };
});

vi.mock('@/contexts/RBACContext', () => ({ useRBAC: () => rbacState }));
vi.mock('@/context/ActiveTwinContext', () => ({
  useActiveTwin: () => ({
    twins: twinsState,
    activeTwinId,
    setActiveTwin,
    isLoading: false,
  }),
}));
vi.mock('@/contexts/CoPilotContext', () => ({ useCoPilotContext: () => ({ updateContext: vi.fn() }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastSpy }) }));
vi.mock('@/lib/analytics/analyticsService', () => ({ trackBuilderStep: vi.fn() }));
vi.mock('@/components/builder/BuilderLayout', () => ({ BuilderLayout: () => null }));
vi.mock('@/components/builder/BuilderStarterLists', () => ({ BuilderStarterLists: () => null }));
vi.mock('@/components/builder/steps/Step1Summary', () => ({ Step1Summary: () => null }));
vi.mock('@/components/builder/steps/Step2Intelligence', () => ({ Step2Intelligence: () => null }));
vi.mock('@/components/builder/steps/Step3Tools', () => ({ Step3Tools: () => null }));
vi.mock('@/components/builder/steps/Step4Workflow', () => ({ Step4Workflow: () => null }));
vi.mock('@/components/builder/steps/Step5Deploy', () => ({ Step5Deploy: () => null }));
vi.mock('@/components/builder/dc-steps', () => ({
  DCStep1Summary: () => null,
  DCStep2Blueprint: () => null,
  DCStep3Integrations: () => null,
  DCStep4Scenarios: () => null,
  DCStep5Deploy: () => null,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import Builder from '@/pages/Builder';

function renderBuilder(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Builder />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  rbacState = { loading: false, activeOrgId: 'org-1' };
  twinsState = [{ id: FACILITY_ID, name: 'QA facility', metadata: {} }];
  activeTwinId = FACILITY_ID;
  wizardState.builderId = null;
  wizardState.isLoading = false;
  setActiveTwin.mockResolvedValue(undefined);
  initializeBuilder.mockRejectedValue(new Error('Facility is not available to this user'));
});

describe('Builder start screen action', () => {
  it('shows the start screen with an actionable control after a failed initialization', async () => {
    renderBuilder(CANONICAL);
    expect(await screen.findByRole('button', { name: /build/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('retries initialization in place instead of no-op navigating to the identical URL', async () => {
    renderBuilder(CANONICAL);
    const button = await screen.findByRole('button', { name: /build/i });
    await waitFor(() => expect(initializeBuilder).toHaveBeenCalled());
    const before = initializeBuilder.mock.calls.length;

    await userEvent.click(button);

    await waitFor(() => expect(initializeBuilder.mock.calls.length).toBeGreaterThan(before));
    expect(resetStore).toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('surfaces a visible error on a repeated failure rather than failing silently', async () => {
    renderBuilder(CANONICAL);
    const button = await screen.findByRole('button', { name: /build/i });
    await waitFor(() => expect(initializeBuilder).toHaveBeenCalled());
    const before = initializeBuilder.mock.calls.length;

    await userEvent.click(button);

    await waitFor(() => expect(initializeBuilder.mock.calls.length).toBeGreaterThan(before));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(toastSpy).toHaveBeenCalled();
  });

  it('still navigates from a different Builder URL and preserves every query parameter', async () => {
    renderBuilder('/builder?source=facility');
    const button = await screen.findByRole('button', { name: /build/i });

    await userEvent.click(button);

    await waitFor(() => expect(navigateSpy).toHaveBeenCalledTimes(1));
    const target = navigateSpy.mock.calls[0][0] as string;
    expect(target).toContain('new=true');
    expect(target).toContain(`twin=${FACILITY_ID}`);
    expect(target).toContain('source=facility');
    expect(target).toContain('type=3d_twin');
  });

  it('fails closed without a verified active organization', async () => {
    rbacState = { loading: false, activeOrgId: null };
    renderBuilder(CANONICAL);

    expect(await screen.findByText(/No active organization/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Start build$/i })).not.toBeInTheDocument();
    expect(initializeBuilder).not.toHaveBeenCalled();
  });

  it('routes to facility creation when no configured facility exists', async () => {
    twinsState = [];
    activeTwinId = null;
    renderBuilder(CANONICAL);

    expect(await screen.findByText(/Create your first facility/i)).toBeInTheDocument();
  });
});

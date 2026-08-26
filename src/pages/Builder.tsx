import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Building2, Loader2, Sparkles } from 'lucide-react';
import { BuilderLayout } from '@/components/builder/BuilderLayout';
import { Step1Summary } from '@/components/builder/steps/Step1Summary';
import { Step2Intelligence } from '@/components/builder/steps/Step2Intelligence';
import { Step3Tools } from '@/components/builder/steps/Step3Tools';
import { Step4Workflow } from '@/components/builder/steps/Step4Workflow';
import { Step5Deploy } from '@/components/builder/steps/Step5Deploy';
import {
  DCStep1Summary,
  DCStep2Blueprint,
  DCStep3Integrations,
  DCStep4Scenarios,
  DCStep5Deploy,
} from '@/components/builder/dc-steps';
import { BuilderStarterLists } from '@/components/builder/BuilderStarterLists';
import { Button } from '@/components/ui/button';
import { useWizardBuilderStore } from '@/stores/wizardBuilderStore';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { useToast } from '@/hooks/use-toast';
import { validateStep1 } from '@/lib/validation/builderValidation';
import { trackBuilderStep } from '@/lib/analytics/analyticsService';
import { useCoPilotContext } from '@/contexts/CoPilotContext';
import { useActiveTwin } from '@/context/ActiveTwinContext';
import { useRBAC } from '@/contexts/RBACContext';
import { builderService } from '@/services/builderService';

export default function Builder() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const fromScanner = searchParams.get('from') === 'scanner' ||
    searchParams.get('fromScanner') === 'true' ||
    (location.state as { fromRecommendation?: boolean } | null)?.fromRecommendation === true;

  const dcTwinStore = useDCTwinBuilderStore();
  const {
    currentStep,
    setCurrentStep,
    markStepComplete,
    goal,
    industry,
    department,
    initializeBuilder,
    error,
    lastSaved,
    builderId,
    isLoading,
  } = useWizardBuilderStore();
  const { toast } = useToast();
  const { updateContext } = useCoPilotContext();
  const {
    twins,
    activeTwinId,
    setActiveTwin,
    isLoading: twinLoading,
  } = useActiveTwin();
  const [isInitialized, setIsInitialized] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const requestedTwinId = searchParams.get('twin');
  const configuredTwins = useMemo(
    () => twins.filter((candidate) => candidate.metadata?.provisioned !== 'default_starter_twin'),
    [twins],
  );

  const hasIntent = useMemo(() => {
    if (fromScanner) return true;
    const state = (location.state ?? {}) as Record<string, unknown>;
    if (state.blueprint || state.geminiAnalysis || state.prefilled) return true;
    const intentParams = [
      'draft', 'builderId', 'templateId', 'template', 'session', 'from', 'source',
      'goal', 'industry', 'department', 'type', 'new', 'twin',
    ];
    return intentParams.some((key) => searchParams.get(key));
  }, [fromScanner, location.state, searchParams]);

  const effectiveCurrentStep = fromScanner ? dcTwinStore.currentStep : currentStep;
  const effectiveSetCurrentStep = fromScanner ? dcTwinStore.setCurrentStep : setCurrentStep;
  const effectiveMarkStepComplete = fromScanner ? dcTwinStore.markStepComplete : markStepComplete;

  useEffect(() => {
    const effectiveIndustry = fromScanner ? dcTwinStore.overview.industries[0] : industry;
    const effectiveDepartment = fromScanner ? 'Data Centre Operations' : department;
    updateContext({
      activePage: 'builder',
      builderStep: effectiveCurrentStep,
      industry: effectiveIndustry,
      department: effectiveDepartment,
    });
  }, [effectiveCurrentStep, industry, department, fromScanner, dcTwinStore.overview.industries, updateContext]);

  const dcSteps = useMemo(() => [
    {
      id: 1,
      component: DCStep1Summary,
      validate: () => !!useDCTwinBuilderStore.getState().overview.twinName?.trim(),
    },
    {
      id: 2,
      component: DCStep2Blueprint,
      validate: () => useDCTwinBuilderStore.getState().agents.length > 0,
    },
    { id: 3, component: DCStep3Integrations, validate: () => true },
    {
      id: 4,
      component: DCStep4Scenarios,
      validate: () => useDCTwinBuilderStore.getState().scenarios.length > 0,
    },
    {
      id: 5,
      component: DCStep5Deploy,
      validate: () => !!useDCTwinBuilderStore.getState().deployment.targetDeploymentRegion,
    },
  ], []);

  const wizardSteps = useMemo(() => {
    const getFreshState = () => useWizardBuilderStore.getState();
    return [
      { id: 1, component: Step1Summary, validate: () => true },
      { id: 2, component: Step2Intelligence, validate: () => !!(getFreshState().modelConfig?.response_profile || getFreshState().modelConfig?.model) },
      { id: 3, component: Step3Tools, validate: () => true },
      { id: 4, component: Step4Workflow, validate: () => !!getFreshState().workflow?.actions?.length },
      {
        id: 5,
        component: Step5Deploy,
        validate: () => {
          const state = getFreshState();
          const validation = validateStep1(state.industry, state.department);
          return validation.isValid && !!state.type && !!state.workflow?.actions?.length;
        },
      },
    ];
  }, []);

  const steps = fromScanner ? dcSteps : wizardSteps;

  // Authentication is resolved once by the session shell (AuthenticatedSessionApp)
  // before this route renders. Re-running an independent getSession() here raced
  // hydration and could bounce verified sessions to /login. Tenant authority is
  // the verified RBAC active organization - never browser-side membership guesses.
  const { loading: rbacLoading, activeOrgId } = useRBAC();
  const tenantVerified = !rbacLoading && !!activeOrgId;

  useEffect(() => {
    if (!rbacLoading) setAuthChecked(true);
  }, [rbacLoading]);

  useEffect(() => {
    if (!tenantVerified || !requestedTwinId || twinLoading) return;
    const requested = configuredTwins.find((candidate) => candidate.id === requestedTwinId);
    if (!requested) {
      setInitError('The selected facility is not available or still requires operator setup.');
      return;
    }
    if (activeTwinId !== requested.id) void setActiveTwin(requested.id);
  }, [authChecked, requestedTwinId, twinLoading, configuredTwins, activeTwinId, setActiveTwin]);

  useEffect(() => {
    // Builder creation fails closed before any data access when the
    // server-verified active organization is absent.
    if (!tenantVerified || isInitialized) return;
    if (!hasIntent) {
      setIsInitialized(true);
      return;
    }

    const state = (location.state ?? {}) as {
      geminiAnalysis?: unknown;
      prefilled?: unknown;
      blueprint?: unknown;
    };

    initializeBuilder(searchParams, state.geminiAnalysis, state.prefilled, state.blueprint as never)
      .then(() => {
        const createdId = useWizardBuilderStore.getState().builderId;
        setIsInitialized(true);
        if (searchParams.get('new') === 'true' && createdId) {
          const next = new URLSearchParams();
          next.set('draft', createdId);
          if (requestedTwinId) next.set('twin', requestedTwinId);
          setSearchParams(next, { replace: true });
        }
      })
      .catch((initializationError) => {
        console.error('[Builder] Initialization failed', initializationError);
        setIsInitialized(true);
        const errorMessage = initializationError instanceof Error ? initializationError.message : 'Unknown error';
        setInitError(errorMessage);
        toast({
          title: t('builder.failedToLoad'),
          description: `${errorMessage}. ${t('onboarding.pleaseTryAgain')}`,
          variant: 'destructive',
        });
      });
  }, [
    searchParams,
    location.state,
    initializeBuilder,
    isInitialized,
    authChecked,
    toast,
    hasIntent,
    t,
    requestedTwinId,
    setSearchParams,
  ]);

  useEffect(() => {
    if (error) toast({ title: 'Error', description: error, variant: 'destructive' });
  }, [error, toast]);

  const CurrentStepComponent = steps[effectiveCurrentStep - 1].component;
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    const checkValid = () => {
      try {
        return steps[effectiveCurrentStep - 1].validate();
      } catch (validationError) {
        console.error('[Builder] Validation error', validationError);
        return false;
      }
    };
    setIsValid(checkValid());
    const unsubscribe = useWizardBuilderStore.subscribe(() => setIsValid(checkValid()));
    return () => unsubscribe();
  }, [effectiveCurrentStep, steps]);

  const handleNext = () => {
    if (!steps[effectiveCurrentStep - 1].validate()) {
      toast({
        title: t('builder.incomplete'),
        description: t('builder.completeFields'),
        variant: 'destructive',
      });
      return;
    }
    trackBuilderStep(effectiveCurrentStep, { sessionId: searchParams.get('session') || undefined });
    effectiveMarkStepComplete(effectiveCurrentStep);
    if (effectiveCurrentStep < steps.length) {
      effectiveSetCurrentStep(effectiveCurrentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (effectiveCurrentStep <= 1) return;
    effectiveSetCurrentStep(effectiveCurrentStep - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [effectiveCurrentStep]);

  if (rbacLoading || !authChecked || !isInitialized || twinLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background" role="status" aria-live="polite">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" aria-hidden="true" />
          <div>
            <h1 className="text-base font-medium">{t('builder.loadingTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t('builder.loadingDesc')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!activeOrgId) {
    return (
      <section className="min-h-dvh bg-background section-padding-lg" aria-labelledby="tenant-required-heading">
        <div className="mx-auto max-w-2xl space-y-6 text-center">
          <Building2 className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
          <div className="space-y-2">
            <h1 id="tenant-required-heading" className="text-2xl font-semibold">No active organization</h1>
            <p className="text-sm text-muted-foreground">
              The Builder requires a verified active organization before any facility data is loaded.
              Your account has organization memberships, but none could be verified as active. An
              administrator can set your active organization under People and Access.
            </p>
          </div>
          <Button size="lg" onClick={() => navigate('/teams/access-control')}>
            <Building2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Open People and Access
          </Button>
        </div>
      </section>
    );
  }

  if (!fromScanner && configuredTwins.length === 0) {
    return (
      <section className="min-h-dvh bg-background section-padding-lg" aria-labelledby="facility-required-heading">
        <div className="mx-auto max-w-2xl space-y-6 text-center">
          <Building2 className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
          <div className="space-y-2">
            <h1 id="facility-required-heading" className="text-2xl font-semibold">Create your first facility</h1>
            <p className="text-sm text-muted-foreground">
              Build, Blueprint, Connections, Simulation and deployment share one facility identity. Define that facility before starting configuration.
            </p>
          </div>
          <Button size="lg" onClick={() => window.location.assign('/manage/facilities?create=true&next=builder')}>
            <Building2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Create facility
          </Button>
        </div>
      </section>
    );
  }

  if (!hasIntent || initError || (!isLoading && !builderId)) {
    const startFacilityBuild = async () => {
      const activeConfiguredTwin = configuredTwins.find((candidate) => candidate.id === activeTwinId);
      const facilityId = activeConfiguredTwin?.id ?? configuredTwins[0]?.id;
      if (!facilityId) {
        window.location.assign('/manage/facilities?create=true&next=builder');
        return;
      }
      if (activeTwinId !== facilityId) await setActiveTwin(facilityId);
      navigate(`/builder?new=true&twin=${encodeURIComponent(facilityId)}&source=facility&type=3d_twin`);
    };

    return (
      <section className="min-h-dvh bg-background section-padding-lg" aria-labelledby="builder-start-heading">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="mx-auto max-w-2xl space-y-6 text-center">
            <div className="space-y-2">
              <h1 id="builder-start-heading" className="text-2xl font-semibold">Start a facility build</h1>
              <p className="text-sm text-muted-foreground">
                Configure the current facility through Blueprint, Connections, AI, scenarios and deployment readiness.
              </p>
            </div>
            {initError && (
              <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-left text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{initError}</span>
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={() => void startFacilityBuild()}>
                <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                Start build
              </Button>
              <Button variant="outline" size="lg" onClick={() => window.location.assign('/manage/facilities')}>
                Change facility
              </Button>
            </div>
          </div>
          <BuilderStarterLists />
        </div>
      </section>
    );
  }

  const handleDeploy = async () => {
    const state = useWizardBuilderStore.getState();
    if (!state.builderId) return { success: false, message: 'No builder to activate' };

    if (state.type === '3d_twin' || state.type === 'process_twin') {
      try {
        const { builder } = await builderService.get(state.builderId);
        const boundTwinId = builder.config?.twin_id;
        if (!boundTwinId) {
          return {
            success: false,
            message: 'This build is not bound to a facility. Start the build from the Facilities workspace.',
          };
        }
        const boundTwin = configuredTwins.find((candidate) => candidate.id === boundTwinId);
        if (!boundTwin) {
          return { success: false, message: 'The bound facility is no longer available or still requires operator setup.' };
        }
        if (activeTwinId !== boundTwinId) await setActiveTwin(boundTwinId);
      } catch (bindingError) {
        console.error('[Builder] Facility binding verification failed', bindingError);
        return {
          success: false,
          message: bindingError instanceof Error ? bindingError.message : 'Facility binding could not be verified',
        };
      }
    }

    return state.deployBuilder();
  };

  return (
    <BuilderLayout
      onNext={handleNext}
      onBack={handleBack}
      nextDisabled={!isValid}
      nextLabel={effectiveCurrentStep === 5 ? 'Activate configuration' : undefined}
      lastSaved={fromScanner ? dcTwinStore.lastSaved : lastSaved}
      onDeploy={effectiveCurrentStep === 5 && !fromScanner ? handleDeploy : undefined}
      currentStep={effectiveCurrentStep}
    >
      <CurrentStepComponent />
    </BuilderLayout>
  );
}

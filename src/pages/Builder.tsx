import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { BuilderLayout } from '@/components/builder/BuilderLayout';
import { Step1Summary } from '@/components/builder/steps/Step1Summary';
import { Step2Intelligence } from '@/components/builder/steps/Step2Intelligence';
import { Step3Tools } from '@/components/builder/steps/Step3Tools';
import { Step4Workflow } from '@/components/builder/steps/Step4Workflow';
import { Step5Deploy } from '@/components/builder/steps/Step5Deploy';
import { DCStep1Summary, DCStep2Blueprint, DCStep3Integrations, DCStep4Scenarios, DCStep5Deploy } from '@/components/builder/dc-steps';
import { useWizardBuilderStore } from '@/stores/wizardBuilderStore';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { useToast } from '@/hooks/use-toast';
import { validateStep1 } from '@/lib/validation/builderValidation';
import { supabase } from '@/integrations/supabase/client';
import { DeploymentProgressModal } from '@/components/deployment/DeploymentProgressModal';
import { trackBuilderStep } from '@/lib/analytics/analyticsService';
import { useCoPilotContext } from '@/contexts/CoPilotContext';
import { useActiveTwin } from '@/context/ActiveTwinContext';
import { Button } from '@/components/ui/button';
import { BuilderStarterLists } from '@/components/builder/BuilderStarterLists';

export default function Builder() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const fromScanner = searchParams.get('from') === 'scanner' ||
                      searchParams.get('fromScanner') === 'true' ||
                      (location.state as Record<string, unknown> | null)?.fromRecommendation === true;

  const dcTwinStore = useDCTwinBuilderStore();

  const {
    currentStep,
    setCurrentStep,
    markStepComplete,
    goal,
    industry,
    department,
    type,
    template,
    workflow,
    initializeBuilder,
    error,
    lastSaved,
    builderId,
    isLoading,
  } = useWizardBuilderStore();

  const { toast } = useToast();
  const { updateContext } = useCoPilotContext();
  const { createTwin, setActiveTwin } = useActiveTwin();
  const [isInitialized, setIsInitialized] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [showDeploymentProgress, setShowDeploymentProgress] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const hasIntent = useMemo(() => {
    if (fromScanner) return true;
    const state = (location.state ?? {}) as Record<string, unknown>;
    if (state.blueprint || state.geminiAnalysis || state.prefilled) return true;
    const intentParams = [
      'draft', 'builderId', 'templateId', 'template',
      'session', 'from', 'source', 'goal', 'industry',
      'department', 'type', 'new',
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
      validate: () => {
        const state = useDCTwinBuilderStore.getState();
        return Boolean(state.overview.twinName?.trim());
      },
    },
    {
      id: 2,
      component: DCStep2Blueprint,
      validate: () => useDCTwinBuilderStore.getState().agents.length > 0,
    },
    {
      id: 3,
      component: DCStep3Integrations,
      validate: () => true,
    },
    {
      id: 4,
      component: DCStep4Scenarios,
      validate: () => useDCTwinBuilderStore.getState().scenarios.length > 0,
    },
    {
      id: 5,
      component: DCStep5Deploy,
      validate: () => Boolean(useDCTwinBuilderStore.getState().deployment.targetDeploymentRegion),
    },
  ], []);

  const wizardSteps = useMemo(() => {
    const getFreshState = () => useWizardBuilderStore.getState();
    return [
      { id: 1, component: Step1Summary, validate: () => true },
      { id: 2, component: Step2Intelligence, validate: () => Boolean(getFreshState().modelConfig?.model) },
      { id: 3, component: Step3Tools, validate: () => true },
      {
        id: 4,
        component: Step4Workflow,
        validate: () => Boolean(getFreshState().workflow?.actions?.length),
      },
      {
        id: 5,
        component: Step5Deploy,
        validate: () => {
          const state = getFreshState();
          const validation = validateStep1(state.industry, state.department);
          return validation.isValid && Boolean(state.type) && Boolean(state.workflow?.actions?.length);
        },
      },
    ];
  }, []);

  const steps = fromScanner ? dcSteps : wizardSteps;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          navigate('/auth', { replace: true });
          return;
        }
        setAuthChecked(true);
      } catch {
        navigate('/auth', { replace: true });
      }
    };
    void checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!authChecked || isInitialized) return;
    if (!hasIntent) {
      setIsInitialized(true);
      return;
    }

    const state = (location.state ?? {}) as {
      geminiAnalysis?: unknown;
      prefilled?: unknown;
      blueprint?: Parameters<typeof initializeBuilder>[3];
    };
    const geminiAnalysis = state.geminiAnalysis;
    const prefilled = state.prefilled;
    const blueprint = state.blueprint;

    void initializeBuilder(searchParams, geminiAnalysis, prefilled, blueprint)
      .then(() => setIsInitialized(true))
      .catch((err: unknown) => {
        setIsInitialized(true);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        if (errorMessage.includes('Auth') || errorMessage.includes('session')) {
          navigate('/auth', { replace: true });
          return;
        }
        setInitError(errorMessage);
        toast({
          title: t('builder.failedToLoad'),
          description: `${errorMessage}. ${t('onboarding.pleaseTryAgain')}`,
          variant: 'destructive',
        });
      });
  }, [searchParams, location.state, initializeBuilder, isInitialized, authChecked, navigate, toast, hasIntent, t]);

  useEffect(() => {
    if (error) {
      toast({ title: 'Builder error', description: error, variant: 'destructive' });
    }
  }, [error, toast]);

  const CurrentStepComponent = steps[effectiveCurrentStep - 1].component;
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    const checkValid = () => {
      try {
        return steps[effectiveCurrentStep - 1].validate();
      } catch {
        return false;
      }
    };

    setIsValid(checkValid());
    const unsubscribe = fromScanner
      ? useDCTwinBuilderStore.subscribe(() => setIsValid(checkValid()))
      : useWizardBuilderStore.subscribe(() => setIsValid(checkValid()));
    return () => unsubscribe();
  }, [effectiveCurrentStep, fromScanner, steps]);

  const handleNext = () => {
    const valid = steps[effectiveCurrentStep - 1].validate();
    if (!valid) {
      toast({ title: t('builder.incomplete'), description: t('builder.completeFields'), variant: 'destructive' });
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
    if (effectiveCurrentStep > 1) {
      effectiveSetCurrentStep(effectiveCurrentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [effectiveCurrentStep]);

  if (!authChecked || !isInitialized) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background" role="status" aria-live="polite">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" aria-hidden />
          <div>
            <h1 className="text-base font-medium">{t('builder.loadingTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t('builder.loadingDesc')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasIntent || initError || (!isLoading && !builderId)) {
    const startBlank = async () => {
      if (starting) return;
      setStarting(true);
      setInitError(null);
      try {
        const createParams = new URLSearchParams({ new: 'true' });
        await initializeBuilder(createParams);
        const newId = useWizardBuilderStore.getState().builderId;
        if (!newId) throw new Error('Draft was not created');
        setIsInitialized(true);
        setSearchParams({ draft: newId }, { replace: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create draft';
        setInitError(msg);
        toast({ title: t('builder.failedToLoad', 'Could not start build'), description: msg, variant: 'destructive' });
      } finally {
        setStarting(false);
      }
    };

    return (
      <section className="min-h-dvh bg-background section-padding-lg" aria-labelledby="builder-start-heading">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="mx-auto max-w-2xl space-y-6 text-center">
            <div className="space-y-2">
              <h1 id="builder-start-heading" className="text-2xl font-semibold">{t('builder.startTitle', 'Start a new build')}</h1>
              <p className="text-sm text-muted-foreground">
                {initError
                  ? t('builder.startErrorDesc', 'We could not load a draft. Choose how you want to start.')
                  : t('builder.startDesc', 'Pick a template, resume a saved draft, or begin from scratch.')}
              </p>
            </div>
            {initError && (
              <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-left text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{initError}</span>
              </div>
            )}
            <div className="flex justify-center">
              <Button size="lg" onClick={() => void startBlank()} disabled={starting} aria-busy={starting}>
                {starting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="mr-2 h-4 w-4" aria-hidden />}
                {starting
                  ? t('builder.startingBlank', 'Creating draft…')
                  : initError
                    ? t('builder.retry', 'Retry')
                    : t('builder.startBlank', 'Start blank')}
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
    const { deployBuilder } = state;

    if (state.type === '3d_twin' || state.type === 'process_twin') {
      const newTwin = await createTwin(null, {
        name: state.goal?.trim() || 'Untitled Data Centre Twin',
        industry: state.industry || null,
        metadata: {
          builder_id: state.builderId,
          template: state.template,
          source: 'aura_builder',
        },
      });

      if (!newTwin) {
        const message = 'AURA could not create the twin record. Deployment was not started.';
        toast({ title: 'Deployment blocked', description: message, variant: 'destructive' });
        throw new Error(message);
      }

      setActiveTwin(newTwin.id);
      toast({ title: 'Twin created', description: `Data Centre Twin “${newTwin.name}” was created.` });
    }

    return await deployBuilder();
  };

  const handleDeployClick = async () => {
    setShowDeploymentProgress(true);
  };

  return (
    <>
      <BuilderLayout
        onNext={handleNext}
        onBack={handleBack}
        nextDisabled={!isValid}
        lastSaved={fromScanner ? dcTwinStore.lastSaved : lastSaved}
        onDeploy={effectiveCurrentStep === 5 ? handleDeployClick : undefined}
        currentStep={effectiveCurrentStep}
      >
        <CurrentStepComponent />
      </BuilderLayout>

      <DeploymentProgressModal
        open={showDeploymentProgress}
        onOpenChange={setShowDeploymentProgress}
        agentName={goal || 'Untitled build'}
        onDeploy={handleDeploy}
      />
    </>
  );
}

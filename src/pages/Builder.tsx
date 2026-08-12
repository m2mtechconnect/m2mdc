import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { Loader2 } from 'lucide-react';
import { validateStep1 } from '@/lib/validation/builderValidation';
import { supabase } from '@/integrations/supabase/client';
import { DeploymentProgressModal } from '@/components/deployment/DeploymentProgressModal';
import { trackBuilderStep, trackDeployment, trackAnalytics } from '@/lib/analytics/analyticsService';
import { useCoPilotContext } from '@/contexts/CoPilotContext';
import { useActiveTwin } from '@/context/ActiveTwinContext';
import { Button } from '@/components/ui/button';
import { Sparkles, LayoutTemplate, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Builder() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if coming from scanner (use DC Twin Builder Store)
  const fromScanner = searchParams.get('from') === 'scanner' || 
                      searchParams.get('fromScanner') === 'true' ||
                      (location.state as any)?.fromRecommendation === true;
  
  // Use DC Twin Builder Store when coming from scanner
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
    modelConfig,
    initializeBuilder,
    error,
    lastSaved,
    builderId,
    isLoading,
  } = useWizardBuilderStore();
  const { toast } = useToast();
  const { updateContext } = useCoPilotContext();
  const { twin, activeTwinId, createTwin, setActiveTwin } = useActiveTwin();
  const [isInitialized, setIsInitialized] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [showDeploymentProgress, setShowDeploymentProgress] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  // Detect explicit intent to start/resume a build. Without any intent we must
  // NOT auto-create a draft row on mount (previously every visit to /builder
  // silently invoked `builders-create`, producing empty `agents` rows in prod
  // and a hard error whenever the edge function was unavailable).
  const hasIntent = useMemo(() => {
    if (fromScanner) return true;
    const state = (location.state ?? {}) as Record<string, unknown>;
    if (state.blueprint || state.geminiAnalysis || state.prefilled) return true;
    const intentParams = [
      'draft', 'builderId', 'templateId', 'template',
      'session', 'from', 'source', 'goal', 'industry',
      'department', 'type', 'new',
    ];
    return intentParams.some((k) => searchParams.get(k));
  }, [fromScanner, location.state, searchParams]);
  
  // Use DC Twin Builder Store step when from scanner
  const effectiveCurrentStep = fromScanner ? dcTwinStore.currentStep : currentStep;
  const effectiveSetCurrentStep = fromScanner ? dcTwinStore.setCurrentStep : setCurrentStep;
  const effectiveMarkStepComplete = fromScanner ? dcTwinStore.markStepComplete : markStepComplete;

  // Update Co-Pilot context when step changes
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

  // DC Twin Builder steps - used when coming from scanner
  const dcSteps = useMemo(() => {
    return [
      { 
        id: 1, 
        component: DCStep1Summary, 
        validate: () => {
          const state = useDCTwinBuilderStore.getState();
          return !!state.overview.twinName && state.overview.twinName.length > 0;
        }
      },
      { 
        id: 2, 
        component: DCStep2Blueprint, 
        validate: () => {
          const state = useDCTwinBuilderStore.getState();
          return state.agents.length > 0;
        }
      },
      { 
        id: 3, 
        component: DCStep3Integrations, 
        validate: () => true // Integrations are optional
      },
      { 
        id: 4, 
        component: DCStep4Scenarios, 
        validate: () => {
          const state = useDCTwinBuilderStore.getState();
          return state.scenarios.length > 0;
        }
      },
      { 
        id: 5, 
        component: DCStep5Deploy, 
        validate: () => {
          const state = useDCTwinBuilderStore.getState();
          return !!state.deployment.targetDeploymentRegion;
        }
      },
    ];
  }, []);

  // Standard wizard steps
  const wizardSteps = useMemo(() => {
    const getFreshState = () => useWizardBuilderStore.getState();
    
    return [
      { 
        id: 1, 
        component: Step1Summary, 
        validate: () => true
      },
      { 
        id: 2, 
        component: Step2Intelligence, 
        validate: () => {
          const state = getFreshState();
          return !!state.modelConfig?.model;
        }
      },
      { 
        id: 3, 
        component: Step3Tools, 
        validate: () => true
      },
      { 
        id: 4, 
        component: Step4Workflow, 
        validate: () => {
          const state = getFreshState();
          return !!state.workflow?.actions && state.workflow.actions.length > 0;
        }
      },
      { 
        id: 5, 
        component: Step5Deploy, 
        validate: () => {
          const state = getFreshState();
          const validation = validateStep1(state.industry, state.department);
          return validation.isValid && !!state.type && !!state.workflow?.actions && state.workflow.actions.length > 0;
        }
      },
    ];
  }, []);

  // Use appropriate steps based on mode
  const steps = fromScanner ? dcSteps : wizardSteps;

  // Check auth before initializing
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error('[BUILDER] No valid session, redirecting to auth');
          navigate('/auth', { replace: true });
          return;
        }
        
        setAuthChecked(true);
      } catch (err) {
        console.error('[BUILDER] Auth check error:', err);
        navigate('/auth', { replace: true });
      }
    };

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!authChecked || isInitialized) return;
      // Honest empty state: no intent means "show the starter", don't create.
      if (!hasIntent) {
        setIsInitialized(true);
        return;
      }
      const builderId = searchParams.get('draft') || searchParams.get('builderId');
      const geminiAnalysis = (location.state as any)?.geminiAnalysis;
      const prefilled = (location.state as any)?.prefilled;
      const blueprint = (location.state as any)?.blueprint;
      
      console.log('🏗️ [BUILDER] Initializing...', { 
        builderId, 
        searchParams: Object.fromEntries(searchParams.entries()),
        hasGeminiAnalysis: !!geminiAnalysis,
        hasPrefilled: !!prefilled,
        hasBlueprint: !!blueprint,
        locationState: location.state
      });

      if (geminiAnalysis) {
        console.log('📊 [BUILDER] Gemini analysis detected!', { 
          analysis: geminiAnalysis,
          prefilled 
        });
      }

      if (blueprint) {
        console.log('🎯 [BUILDER] Blueprint detected!', {
          source: blueprint.source,
          name: blueprint.name,
        });
      }

      initializeBuilder(searchParams, geminiAnalysis, prefilled, blueprint)
        .then(() => {
          console.log('✅ [BUILDER] Initialization complete');
          setIsInitialized(true);
        })
        .catch((err) => {
          console.error('❌ [BUILDER] Initialization error:', err);
          setIsInitialized(true); // Set true anyway to stop loading
          
          // Check if it's an auth error
          if (err?.message?.includes('Auth') || err?.message?.includes('session')) {
            console.error('[BUILDER] Auth error during initialization, redirecting to auth');
            navigate('/auth', { replace: true });
            return;
          }
          
          // Show more helpful error message
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          setInitError(errorMsg);
          toast({
            title: t('builder.failedToLoad'),
            description: `${errorMsg}. ${t('onboarding.pleaseTryAgain')}`,
            variant: 'destructive',
          });
        });
  }, [searchParams, location.state, initializeBuilder, isInitialized, authChecked, navigate, toast, hasIntent, t]);

  // Show error toast if any
  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  const CurrentStepComponent = steps[effectiveCurrentStep - 1].component;
  
  // Compute validation on demand to avoid calling during render
  const [isValid, setIsValid] = useState(true);

  // Check validation when dependencies change - use store subscription
  useEffect(() => {
    const checkValid = () => {
      try {
        return steps[effectiveCurrentStep - 1].validate();
      } catch (err) {
        console.error('[Builder] Validation error:', err);
        return false;
      }
    };
    
    // Immediate check
    setIsValid(checkValid());
    
    // Subscribe to store changes for real-time validation
    const unsubscribe = useWizardBuilderStore.subscribe((state) => {
      setIsValid(checkValid());
    });
    
    return () => unsubscribe();
  }, [effectiveCurrentStep, steps]);

  const handleNext = () => {
    // Validate again on button click
    const valid = steps[effectiveCurrentStep - 1].validate();
    
    if (!valid) {
      toast({
        title: t('builder.incomplete'),
        description: t('builder.completeFields'),
        variant: 'destructive',
      });
      return;
    }

    // Track step completion
    trackBuilderStep(effectiveCurrentStep, {
      sessionId: searchParams.get('session') || undefined,
    });

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

  // Show loading state while checking auth or first initialization only
  if (!authChecked || !isInitialized) {
    return (
      <div
        className="flex items-center justify-center min-h-dvh bg-background"
        role="status"
        aria-live="polite"
      >
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" aria-hidden="true" />
          <div>
            <h1 className="text-base font-medium">{t('builder.loadingTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t('builder.loadingDesc')}</p>
          </div>
        </div>
      </main>
    );
  }

  // Honest starter state: no intent OR init failed → don't render the wizard
  // against a phantom draft. Give the user real actions. Note: read
  // builderId/isLoading from the reactive hook so the wizard re-renders when
  // initializeBuilder finishes (getState() alone did not trigger a re-render).
  if (!hasIntent || initError || (!isLoading && !builderId)) {
    // Deterministic user-initiated creation: bypass the effect entirely so
    // there is no race between `setIsInitialized(false)` and the effect deps.
    // Guaranteed to issue exactly one create request; duplicate clicks are
    // blocked by both the local `starting` flag and the store's in-flight
    // guard.
    const startBlank = async () => {
      if (starting) return;
      setStarting(true);
      setInitError(null);
      try {
        const createParams = new URLSearchParams({ new: 'true' });
        await initializeBuilder(createParams);
        const newId = useWizardBuilderStore.getState().builderId;
        if (!newId) {
          throw new Error('Draft was not created');
        }
        // Consume `?new=true` exactly once: replace with `?draft=<id>` so
        // refresh/back reloads the same draft rather than creating another.
        setIsInitialized(true);
        // Use setSearchParams instead of navigate() for a same-path
        // query-only update: it produces a reliable router location
        // sync where a full navigate() to the same pathname can miss
        // an update under concurrent renders.
        setSearchParams({ draft: newId }, { replace: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create draft';
        setInitError(msg);
        toast({
          title: t('builder.failedToLoad', 'Could not start build'),
          description: msg,
          variant: 'destructive',
        });
      } finally {
        setStarting(false);
      }
    };
    return (
      <main className="min-h-dvh bg-background section-padding-lg" aria-labelledby="builder-start-heading">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="space-y-2">
            <h1 id="builder-start-heading" className="text-2xl font-semibold">
              {t('builder.startTitle', 'Start a new build')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {initError
                ? t('builder.startErrorDesc', 'We could not load a draft. Choose how you want to start.')
                : t('builder.startDesc', 'Pick a template from the marketplace, resume a saved draft, or begin from scratch.')}
            </p>
          </div>
          {initError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-left text-sm text-destructive"
            >
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>{initError}</span>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild size="lg" variant="outline" disabled={starting}>
              <Link to="/marketplace">
                <LayoutTemplate className="h-4 w-4 mr-2" aria-hidden="true" />
                {t('builder.chooseTemplate', 'Choose a template')}
              </Link>
            </Button>
            <Button size="lg" onClick={startBlank} disabled={starting} aria-busy={starting}>
              {starting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" aria-hidden="true" />
              )}
              {starting
                ? t('builder.startingBlank', 'Creating draft…')
                : initError
                  ? t('builder.retry', 'Retry')
                  : t('builder.startBlank', 'Start blank')}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const handleDeploy = async () => {
    const state = useWizardBuilderStore.getState();
    const { deployBuilder } = state;
    
    // Create a twin if deploying a DC twin type
    if (state.type === '3d_twin' || state.type === 'process_twin') {
      try {
        // Create twin without location (null for legacy support)
        const newTwin = await createTwin(null, {
          name: state.goal || 'New Data Centre Twin',
          city: 'Montreal',
          region_code: 'QC',
          tier: 'Tier III',
          capacity_kw: 5000,
          industry: state.industry || 'cloud_saas',
          metadata: {
            builder_id: state.builderId,
            template: state.template,
          },
        });
        
        if (newTwin) {
          setActiveTwin(newTwin.id);
          toast({
            title: 'Twin Created',
            description: `Data Centre Twin "${newTwin.name}" created successfully.`,
          });
        }
      } catch (err) {
        console.error('[Builder] Failed to create twin:', err);
        // Continue with deploy even if twin creation fails
      }
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
        nextLabel={effectiveCurrentStep === 5 ? t('builder.deployToProduction') : undefined}
        lastSaved={fromScanner ? dcTwinStore.lastSaved : lastSaved}
        onDeploy={effectiveCurrentStep === 5 ? handleDeployClick : undefined}
        currentStep={effectiveCurrentStep}
      >
        <CurrentStepComponent />
      </BuilderLayout>

      {/* Deployment Progress Modal */}
      <DeploymentProgressModal
        open={showDeploymentProgress}
        onOpenChange={setShowDeploymentProgress}
        agentName={goal || 'AI Agent'}
        onDeploy={handleDeploy}
      />
    </>
  );
}

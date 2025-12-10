import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { BuilderLayout } from '@/components/builder/BuilderLayout';
import { Step1Summary } from '@/components/builder/steps/Step1Summary';
import { Step2Intelligence } from '@/components/builder/steps/Step2Intelligence';
import { Step3Tools } from '@/components/builder/steps/Step3Tools';
import { Step4Workflow } from '@/components/builder/steps/Step4Workflow';
import { Step5Deploy } from '@/components/builder/steps/Step5Deploy';
import { useWizardBuilderStore } from '@/stores/wizardBuilderStore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { validateStep1 } from '@/lib/validation/builderValidation';
import { supabase } from '@/integrations/supabase/client';
import { DeploymentProgressModal } from '@/components/deployment/DeploymentProgressModal';
import { trackBuilderStep, trackDeployment, trackAnalytics } from '@/lib/analytics/analyticsService';
import { useCoPilotContext } from '@/contexts/CoPilotContext';
import { useTwinContext } from '@/contexts/TwinContext';

export default function Builder() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
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
    isLoading,
    error,
    lastSaved
  } = useWizardBuilderStore();
  const { toast } = useToast();
  const { updateContext } = useCoPilotContext();
  const { createTwin, setTwinId } = useTwinContext();
  const [isInitialized, setIsInitialized] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [showDeploymentProgress, setShowDeploymentProgress] = useState(false);

  // Update Co-Pilot context when step changes
  useEffect(() => {
    updateContext({
      activePage: 'builder',
      builderStep: currentStep,
      industry,
      department,
    });
  }, [currentStep, industry, department, updateContext]);

  // Memoize steps to prevent unnecessary re-renders
  // Use useCallback for validation functions to avoid stale closures
  const steps = useMemo(() => {
    // Get fresh state on each validation
    const getFreshState = () => useWizardBuilderStore.getState();
    
    return [
      { 
        id: 1, 
        component: Step1Summary, 
        validate: () => true // Summary is always valid
      },
      { 
        id: 2, 
        component: Step2Intelligence, 
        validate: () => {
          const state = getFreshState();
          return !!state.modelConfig?.model; // Model must be selected
        }
      },
      { 
        id: 3, 
        component: Step3Tools, 
        validate: () => true // Tools are optional
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
  }, []); // Empty deps - validation functions read fresh state

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
          toast({
            title: 'Failed to Load Builder',
            description: `${errorMsg}. Please try again or go back to the dashboard.`,
            variant: 'destructive',
          });
        });
  }, [searchParams, location.state, initializeBuilder, isInitialized, authChecked, navigate, toast]);

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

  const CurrentStepComponent = steps[currentStep - 1].component;
  
  // Compute validation on demand to avoid calling during render
  const [isValid, setIsValid] = useState(true);

  // Check validation when dependencies change - use store subscription
  useEffect(() => {
    const checkValid = () => {
      try {
        return steps[currentStep - 1].validate();
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
  }, [currentStep, steps]);

  const handleNext = () => {
    // Validate again on button click
    const valid = steps[currentStep - 1].validate();
    
    if (!valid) {
      toast({
        title: 'Incomplete',
        description: 'Please complete all required fields before continuing.',
        variant: 'destructive',
      });
      return;
    }

    // Track step completion
    trackBuilderStep(currentStep, {
      sessionId: searchParams.get('session') || undefined,
    });

    markStepComplete(currentStep);

    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // Show loading state while checking auth or initializing
  if (!authChecked || !isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading builder...</p>
        </div>
      </div>
    );
  }

  const handleDeploy = async () => {
    const state = useWizardBuilderStore.getState();
    const { deployBuilder } = state;
    
    // Create a twin if deploying a DC twin type
    if (state.type === '3d_twin' || state.type === 'process_twin') {
      try {
        const twin = await createTwin({
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
        
        if (twin) {
          setTwinId(twin.id);
          toast({
            title: 'Twin Created',
            description: `Data Centre Twin "${twin.name}" created successfully.`,
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
        nextLabel={currentStep === 5 ? 'Deploy to Production' : 'Next'}
        lastSaved={lastSaved}
        onDeploy={currentStep === 5 ? handleDeployClick : undefined}
        currentStep={currentStep}
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

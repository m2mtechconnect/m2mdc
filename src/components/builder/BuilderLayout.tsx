import { ReactNode, useState, useEffect } from 'react';
import { Check, Home, Rocket, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useWizardBuilderStore } from '@/stores/wizardBuilderStore';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { BuilderModeProvider } from './BuilderModeContext';
import { BuilderModeToggle } from './BuilderModeToggle';
import { LastUpdatedBadge } from '@/components/ui/snapshot-indicator';

enum DeployState {
  idle = "idle",
  morphing = "morphing",
  deploying = "deploying",
  success = "success",
  error = "error",
}

interface BuilderLayoutProps {
  children: ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  onDeploy?: () => Promise<any>;
  nextDisabled?: boolean;
  nextLabel?: string;
  lastSaved?: Date | null;
  currentStep?: number;
}

const WIZARD_STEPS = [
  { id: 1, title: 'Business Profile', shortTitle: 'Profile', tooltip: 'Define your organization and twin objectives' },
  { id: 2, title: 'Capabilities', shortTitle: 'Capabilities', tooltip: 'Configure KPIs and monitoring agents' },
  { id: 3, title: 'Connections', shortTitle: 'Connections', tooltip: 'Select approved AI, data and integration capabilities' },
  { id: 4, title: 'Scenarios', shortTitle: 'Scenarios', tooltip: 'Define simulation scenarios for testing' },
  { id: 5, title: 'Deploy', shortTitle: 'Deploy', tooltip: 'Review and deploy your configured build' },
];

const DC_STEPS = [
  { id: 1, title: 'Facility Summary', shortTitle: 'Summary', tooltip: 'Review the facility identity, capacity and twin objectives' },
  { id: 2, title: 'Blueprint', shortTitle: 'Blueprint', tooltip: 'Review the generated agents, KPIs and facility blueprint' },
  { id: 3, title: 'Connections', shortTitle: 'Connections', tooltip: 'Configure approved data sources and facility integrations' },
  { id: 4, title: 'Scenarios & Automation', shortTitle: 'Scenarios', tooltip: 'Review workflows and simulation scenarios' },
  { id: 5, title: 'Review & Deploy', shortTitle: 'Deploy', tooltip: 'Review readiness, choose a sovereign region and deploy the twin' },
];

export function BuilderLayout({
  children,
  onBack,
  onNext,
  onDeploy,
  nextDisabled,
  nextLabel = 'Next',
  lastSaved,
  currentStep: propCurrentStep,
}: BuilderLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const wizardStore = useWizardBuilderStore();
  const dcTwinStore = useDCTwinBuilderStore();
  const [deployState, setDeployState] = useState<DeployState>(DeployState.idle);

  const fromScanner = searchParams.get('from') === 'scanner' ||
    searchParams.get('fromScanner') === 'true' ||
    (location.state as { fromRecommendation?: boolean } | null)?.fromRecommendation === true;

  const activeStep = fromScanner ? dcTwinStore.currentStep : (propCurrentStep ?? wizardStore.currentStep);
  const completedSteps = fromScanner ? dcTwinStore.completedSteps : wizardStore.completedSteps;
  const setActiveStep = fromScanner ? dcTwinStore.setCurrentStep : wizardStore.setCurrentStep;
  const steps = fromScanner ? DC_STEPS : WIZARD_STEPS;
  const isDeployStep = activeStep === steps.length;

  const isStepComplete = (step: number) => completedSteps.includes(step);
  const isStepActive = (step: number) => activeStep === step;
  const isStepAccessible = (step: number) => step <= activeStep || completedSteps.includes(step - 1);

  const dcStepValid = (() => {
    if (!fromScanner) return true;
    switch (activeStep) {
      case 1:
        return Boolean(dcTwinStore.overview.twinName?.trim());
      case 2:
        return dcTwinStore.agents.length > 0;
      case 3:
        return true;
      case 4:
        return dcTwinStore.scenarios.length > 0;
      case 5:
        return Boolean(dcTwinStore.deployment.targetDeploymentRegion);
      default:
        return false;
    }
  })();

  const effectiveNextDisabled = fromScanner ? !dcStepValid : nextDisabled;

  useEffect(() => {
    if (!isDeployStep && deployState !== DeployState.idle) {
      setDeployState(DeployState.idle);
    }
  }, [isDeployStep, deployState]);

  const handleDeployClick = async () => {
    // The scanner/DC flow owns deployment inside DCStep5Deploy. Its persistence,
    // readiness checks and post-deploy navigation are intentionally not routed
    // through the standard wizard deployment contract.
    if (fromScanner || !onDeploy || deployState !== DeployState.idle || effectiveNextDisabled) return;

    const state = useWizardBuilderStore.getState();
    if (!state.workflow?.actions || state.workflow.actions.length === 0) {
      console.error('[BuilderLayout] Deployment blocked: No workflow actions found');
      setDeployState(DeployState.error);
      setTimeout(() => {
        setDeployState(DeployState.idle);
      }, 3000);
      return;
    }

    console.log('[BuilderLayout] Workflow validation passed, proceeding with deployment');

    setDeployState(DeployState.morphing);
    await new Promise(resolve => setTimeout(resolve, 350));

    setDeployState(DeployState.deploying);
    const deployStartTime = Date.now();
    const MIN_DEPLOY_DURATION = 1200;

    try {
      const deployPromise = onDeploy();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Deployment timeout")), 15000)
      );

      const result = await Promise.race([deployPromise, timeoutPromise]) as any;

      const elapsed = Date.now() - deployStartTime;
      const remainingTime = MIN_DEPLOY_DURATION - elapsed;
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }

      if (result.success) {
        setDeployState(DeployState.success);
        setTimeout(() => {
          navigate(result.agentUrl || '/dashboard');
        }, 1800);
      } else {
        throw new Error(result.message || 'Deployment failed');
      }
    } catch (error: any) {
      console.error("Deploy error:", error);

      const elapsed = Date.now() - deployStartTime;
      const remainingTime = MIN_DEPLOY_DURATION - elapsed;
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }

      setDeployState(DeployState.error);
      setTimeout(() => {
        setDeployState(DeployState.idle);
      }, 3000);
    }
  };

  return (
    <BuilderModeProvider>
      <div className="min-h-screen flex w-full min-w-0 max-w-full overflow-x-hidden bg-background">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-[260px] border-r bg-muted/30 flex-col">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">Data Centre Twin</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="h-8 px-2"
                title="Back to Dashboard"
              >
                <Home className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Configure your data centre twin</p>
          </div>

          {/* Mode Toggle - hidden from sidebar, available on mobile only */}

          {lastSaved && (
            <div className="px-4 py-2 border-b">
              <LastUpdatedBadge timestamp={lastSaved} prefix="Saved" />
            </div>
          )}

          <nav className="flex-1 p-4">
            <ul className="space-y-1">
              {steps.map((step) => (
                <li key={step.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => isStepAccessible(step.id) && setActiveStep(step.id)}
                        disabled={!isStepAccessible(step.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left',
                          isStepActive(step.id) && 'bg-primary text-primary-foreground font-medium',
                          !isStepActive(step.id) && isStepComplete(step.id) && 'text-foreground hover:bg-muted',
                          !isStepActive(step.id) && !isStepComplete(step.id) && 'text-muted-foreground',
                          !isStepAccessible(step.id) && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <div
                          className={cn(
                            'flex items-center justify-center w-6 h-6 rounded-full border-2 text-xs font-medium',
                            isStepActive(step.id) && 'border-primary-foreground bg-primary-foreground text-primary',
                            isStepComplete(step.id) && !isStepActive(step.id) && 'border-primary bg-primary text-primary-foreground',
                            !isStepComplete(step.id) && !isStepActive(step.id) && 'border-muted-foreground'
                          )}
                        >
                          {isStepComplete(step.id) ? <Check className="w-3.5 h-3.5" /> : step.id}
                        </div>
                        <span>{step.title}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[200px]">
                      <p className="text-xs">{step.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Mobile Top Stepper. Every flex boundary is explicitly shrinkable so
            a 375px phone never expands the page to the stepper's min-content width. */}
        <div className="lg:hidden fixed inset-x-0 top-0 max-w-full overflow-x-hidden bg-background border-b z-50">
          <div className="flex min-w-0 max-w-full items-center gap-2 px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="h-8 px-2 flex-shrink-0"
              title="Back to Dashboard"
            >
              <Home className="h-4 w-4" />
            </Button>
            <div className="flex min-w-0 flex-1 items-center justify-between overflow-x-auto overscroll-x-contain">
              {steps.map((step, idx) => (
                <div key={step.id} className="flex shrink-0 items-center">
                  <button
                    onClick={() => isStepAccessible(step.id) && setActiveStep(step.id)}
                    disabled={!isStepAccessible(step.id)}
                    className={cn(
                      'flex flex-col items-center gap-1',
                      !isStepAccessible(step.id) && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-medium',
                        isStepActive(step.id) && 'border-primary bg-primary text-primary-foreground',
                        isStepComplete(step.id) && !isStepActive(step.id) && 'border-primary bg-primary text-primary-foreground',
                        !isStepComplete(step.id) && !isStepActive(step.id) && 'border-muted-foreground'
                      )}
                    >
                      {isStepComplete(step.id) ? <Check className="w-4 h-4" /> : step.id}
                    </div>
                    <span className="text-xs hidden sm:block">{step.shortTitle}</span>
                  </button>
                  {idx < steps.length - 1 && (
                    <div className="w-4 h-0.5 bg-muted-foreground/30 mx-1" />
                  )}
                </div>
              ))}
            </div>
            <div className="ml-2 max-w-[40px] flex-shrink-0 sm:max-w-none">
              <BuilderModeToggle />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 min-w-0 max-w-full flex flex-col overflow-x-hidden">
          <div className="flex-1 min-w-0 max-w-full overflow-y-auto overflow-x-hidden pt-16 lg:pt-0">
            <div className="w-full min-w-0 max-w-[880px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </div>
          </div>

          {/* Sticky Bottom Navigation */}
          <div className="sticky bottom-0 left-0 right-0 max-w-full overflow-x-hidden border-t bg-background p-4">
            <div className="w-full min-w-0 max-w-[880px] mx-auto flex items-center justify-between gap-4">
              <Button
                variant="outline"
                onClick={onBack}
                disabled={activeStep === 1}
                className="min-w-[100px]"
              >
                Back
              </Button>

              <div className="min-w-0 flex-1 text-center text-sm text-muted-foreground">
                Step {activeStep} of {steps.length}
              </div>

              {isDeployStep && fromScanner ? (
                <div className="min-w-[100px]" aria-hidden="true" />
              ) : isDeployStep && onDeploy ? (
                <Button
                  onClick={handleDeployClick}
                  disabled={effectiveNextDisabled || deployState !== DeployState.idle}
                  className="min-w-[100px] gap-2"
                >
                  {deployState === DeployState.idle && (
                    <>
                      <Rocket className="w-4 h-4" />
                      {nextLabel}
                    </>
                  )}
                  {(deployState === DeployState.morphing || deployState === DeployState.deploying) && (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deploying...
                    </>
                  )}
                  {deployState === DeployState.success && (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Deployed!
                    </>
                  )}
                  {deployState === DeployState.error && (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      Add actions
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={onNext}
                  disabled={effectiveNextDisabled}
                  className="min-w-[100px]"
                >
                  {nextLabel}
                </Button>
              )}
            </div>
          </div>
        </main>
      </div>
    </BuilderModeProvider>
  );
}

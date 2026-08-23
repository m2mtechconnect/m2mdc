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
      <div className="min-h-screen flex w-full min-w-0 max-w-full overflow-x-hidden v2-canvas" data-testid="builder-layout">
        {/* Desktop step rail */}
        <aside className="v2-rail hidden w-64 shrink-0 flex-col lg:flex">
          <div className="border-b border-[hsl(var(--v2-line))] p-4">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <h2 className="v2-section-title">Data Centre Twin</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="h-9 w-9 p-0"
                aria-label="Back to Command Center"
                title="Back to Command Center"
              >
                <Home className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            <p className="text-[13px] text-muted-foreground">Configure and deploy the twin in five guided steps.</p>
          </div>

          {lastSaved && (
            <div className="border-b border-[hsl(var(--v2-line))] px-4 py-2.5">
              <LastUpdatedBadge timestamp={lastSaved} prefix="Saved" />
            </div>
          )}

          <nav className="flex-1 p-3" aria-label="Builder steps">
            <ul className="space-y-1">
              {steps.map((step) => {
                const active = isStepActive(step.id);
                const complete = isStepComplete(step.id);
                const accessible = isStepAccessible(step.id);
                return (
                  <li key={step.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => accessible && setActiveStep(step.id)}
                          disabled={!accessible}
                          aria-current={active ? 'step' : undefined}
                          className={cn(
                            'flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                            active && 'bg-[hsl(var(--v2-tech)/0.10)] font-semibold text-[hsl(var(--v2-tech-strong))]',
                            !active && complete && 'text-foreground hover:bg-[hsl(var(--v2-canvas-deep)/0.75)]',
                            !active && !complete && 'text-muted-foreground hover:bg-[hsl(var(--v2-canvas-deep)/0.55)]',
                            !accessible && 'cursor-not-allowed opacity-45 hover:bg-transparent',
                          )}
                        >
                          <span
                            className={cn(
                              'v2-mono flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                              active && 'border-[hsl(var(--v2-tech-strong))] bg-[hsl(var(--v2-tech-strong))] text-primary-foreground',
                              complete && !active && 'border-[hsl(var(--v2-verified))] bg-[hsl(var(--v2-verified)/0.10)] text-[hsl(var(--v2-verified))]',
                              !complete && !active && 'border-[hsl(var(--v2-line-strong))] bg-[hsl(var(--v2-panel))] text-muted-foreground',
                            )}
                          >
                            {complete ? <Check className="h-3.5 w-3.5" aria-hidden /> : step.id}
                          </span>
                          <span className="min-w-0 truncate">{step.title}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p className="text-xs">{step.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Mobile stepper */}
        <div className="v2-appbar fixed inset-x-0 top-0 z-50 max-w-full overflow-x-hidden border-b lg:hidden">
          <div className="flex min-w-0 max-w-full items-center gap-2 px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="h-11 w-11 shrink-0 p-0"
              aria-label="Back to Command Center"
              title="Back to Command Center"
            >
              <Home className="h-4 w-4" aria-hidden />
            </Button>
            <div className="flex min-w-0 flex-1 items-center justify-between overflow-x-auto overscroll-x-contain py-0.5">
              {steps.map((step, idx) => {
                const active = isStepActive(step.id);
                const complete = isStepComplete(step.id);
                const accessible = isStepAccessible(step.id);
                return (
                  <div key={step.id} className="flex shrink-0 items-center">
                    <button
                      onClick={() => accessible && setActiveStep(step.id)}
                      disabled={!accessible}
                      aria-current={active ? 'step' : undefined}
                      aria-label={`${step.title}${active ? ', current step' : complete ? ', completed' : ''}`}
                      className={cn(
                        'flex min-h-11 flex-col items-center justify-center gap-1 rounded-md px-1.5',
                        !accessible && 'cursor-not-allowed opacity-45',
                      )}
                    >
                      <span
                        className={cn(
                          'v2-mono flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold',
                          active && 'border-[hsl(var(--v2-tech-strong))] bg-[hsl(var(--v2-tech-strong))] text-primary-foreground',
                          complete && !active && 'border-[hsl(var(--v2-verified))] bg-[hsl(var(--v2-verified)/0.10)] text-[hsl(var(--v2-verified))]',
                          !complete && !active && 'border-[hsl(var(--v2-line-strong))] bg-[hsl(var(--v2-panel))] text-muted-foreground',
                        )}
                      >
                        {complete ? <Check className="h-4 w-4" aria-hidden /> : step.id}
                      </span>
                      <span className="hidden text-xs sm:block">{step.shortTitle}</span>
                    </button>
                    {idx < steps.length - 1 && (
                      <div className="mx-1 h-px w-4 bg-[hsl(var(--v2-line-strong))]" aria-hidden />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="ml-1 max-w-10 shrink-0 sm:max-w-none">
              <BuilderModeToggle />
            </div>
          </div>
        </div>

        {/* Main task surface */}
        <main className="flex min-w-0 max-w-full flex-1 flex-col overflow-x-hidden">
          <div className="flex-1 min-w-0 max-w-full overflow-y-auto overflow-x-hidden pt-16 lg:pt-0">
            <div className="mx-auto w-full min-w-0 max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
              {children}
            </div>
          </div>

          {/* One enterprise task footer; DC deploy step owns its own deploy action. */}
          <div className="sticky bottom-0 left-0 right-0 max-w-full overflow-x-hidden border-t border-[hsl(var(--v2-line))] bg-[hsl(var(--v2-panel))] p-3 sm:p-4">
            <div className="mx-auto flex w-full min-w-0 max-w-4xl items-center justify-between gap-3 sm:gap-4">
              <Button
                variant="outline"
                onClick={onBack}
                disabled={activeStep === 1}
                className="min-h-10 min-w-24"
              >
                Back
              </Button>

              <div className="v2-mono min-w-0 flex-1 text-center text-xs text-muted-foreground">
                Step {activeStep} of {steps.length}
              </div>

              {isDeployStep && fromScanner ? (
                <div className="min-w-24" aria-hidden="true" />
              ) : isDeployStep && onDeploy ? (
                <Button
                  onClick={handleDeployClick}
                  disabled={effectiveNextDisabled || deployState !== DeployState.idle}
                  className="min-h-10 min-w-24 gap-2"
                >
                  {deployState === DeployState.idle && (
                    <>
                      <Rocket className="h-4 w-4" aria-hidden />
                      {nextLabel}
                    </>
                  )}
                  {(deployState === DeployState.morphing || deployState === DeployState.deploying) && (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Deploying…
                    </>
                  )}
                  {deployState === DeployState.success && (
                    <>
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                      Deployed
                    </>
                  )}
                  {deployState === DeployState.error && (
                    <>
                      <AlertCircle className="h-4 w-4" aria-hidden />
                      Add actions
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={onNext}
                  disabled={effectiveNextDisabled}
                  className="min-h-10 min-w-24"
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

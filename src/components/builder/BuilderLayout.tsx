import { ReactNode, useMemo, useState } from 'react';
import { Check, Home, Rocket, Loader2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useWizardBuilderStore } from '@/stores/wizardBuilderStore';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { BuilderModeProvider } from './BuilderModeContext';
import { LastUpdatedBadge } from '@/components/ui/snapshot-indicator';

interface BuilderLayoutProps {
  children: ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  onDeploy?: () => Promise<unknown>;
  nextDisabled?: boolean;
  nextLabel?: string;
  lastSaved?: Date | null;
  currentStep?: number;
}

const STANDARD_STEPS = [
  { id: 1, title: 'Overview', shortTitle: 'Overview', tooltip: 'Review the goal, business context and build summary' },
  { id: 2, title: 'Intelligence', shortTitle: 'Intelligence', tooltip: 'Choose the AURA Intelligence profile, knowledge and guardrails' },
  { id: 3, title: 'Connections', shortTitle: 'Connections', tooltip: 'Select approved capabilities and connections for this design' },
  { id: 4, title: 'Workflow', shortTitle: 'Workflow', tooltip: 'Define triggers, actions and operational workflow behavior' },
  { id: 5, title: 'Review & Deploy', shortTitle: 'Deploy', tooltip: 'Review the configuration and open deployment controls' },
] as const;

const DC_STEPS = [
  { id: 1, title: 'Overview', shortTitle: 'Overview', tooltip: 'Review the data-centre twin identity and objectives' },
  { id: 2, title: 'Blueprint', shortTitle: 'Blueprint', tooltip: 'Configure the data-centre agents, systems and blueprint' },
  { id: 3, title: 'Connections', shortTitle: 'Connections', tooltip: 'Select the systems and integrations used by this twin' },
  { id: 4, title: 'Scenarios', shortTitle: 'Scenarios', tooltip: 'Configure the operational scenarios to evaluate' },
  { id: 5, title: 'Review & Deploy', shortTitle: 'Deploy', tooltip: 'Review the twin configuration and open deployment controls' },
] as const;

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
  const standardStore = useWizardBuilderStore();
  const dcStore = useDCTwinBuilderStore();
  const [launchingDeploy, setLaunchingDeploy] = useState(false);

  const isDataCentreFlow = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const state = (location.state ?? {}) as Record<string, unknown>;
    return params.get('from') === 'scanner' || params.get('fromScanner') === 'true' || state.fromRecommendation === true;
  }, [location.search, location.state]);

  const steps = isDataCentreFlow ? DC_STEPS : STANDARD_STEPS;
  const storeCurrentStep = isDataCentreFlow ? dcStore.currentStep : standardStore.currentStep;
  const activeStep = propCurrentStep ?? storeCurrentStep;
  const completedSteps = isDataCentreFlow
    ? steps.filter((step) => step.id < activeStep).map((step) => step.id)
    : standardStore.completedSteps;
  const setStep = isDataCentreFlow ? dcStore.setCurrentStep : standardStore.setCurrentStep;
  const isDeployStep = activeStep === 5;

  const isStepComplete = (step: number) => completedSteps.includes(step);
  const isStepActive = (step: number) => activeStep === step;
  const isStepAccessible = (step: number) => step <= activeStep || completedSteps.includes(step - 1);

  const handleDeployClick = async () => {
    if (!onDeploy || launchingDeploy || nextDisabled) return;
    setLaunchingDeploy(true);
    try {
      await onDeploy();
    } finally {
      setLaunchingDeploy(false);
    }
  };

  const flowTitle = isDataCentreFlow ? 'Data Centre Twin Builder' : 'AURA Builder';
  const flowSubtitle = isDataCentreFlow
    ? 'Design and configure a governed data-centre twin'
    : 'Design intelligence, connections and workflow behavior';

  return (
    <BuilderModeProvider>
      <div className="flex min-h-dvh w-full bg-background" data-builder-flow={isDataCentreFlow ? 'data-centre-twin' : 'standard'}>
        <aside className="hidden w-[260px] flex-col border-r bg-muted/30 lg:flex">
          <div className="border-b p-6">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">{flowTitle}</h2>
                <Badge variant="outline" className="mt-2 text-[10px]">
                  {isDataCentreFlow ? 'Data Centre Twin' : 'AI & Automation'}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="h-10 w-10 shrink-0 p-0"
                aria-label="Back to dashboard"
              >
                <Home className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{flowSubtitle}</p>
          </div>

          {lastSaved && (
            <div className="border-b px-4 py-2">
              <LastUpdatedBadge timestamp={lastSaved} prefix="Saved" />
            </div>
          )}

          <nav className="flex-1 p-4" aria-label={`${flowTitle} steps`}>
            <ul className="space-y-1">
              {steps.map((step) => (
                <li key={step.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => isStepAccessible(step.id) && setStep(step.id)}
                        disabled={!isStepAccessible(step.id)}
                        aria-current={isStepActive(step.id) ? 'step' : undefined}
                        aria-label={`${step.id}. ${step.title}. ${step.tooltip}`}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                          isStepActive(step.id) && 'bg-primary text-primary-foreground font-medium',
                          !isStepActive(step.id) && isStepComplete(step.id) && 'text-foreground hover:bg-muted',
                          !isStepActive(step.id) && !isStepComplete(step.id) && 'text-muted-foreground',
                          !isStepAccessible(step.id) && 'cursor-not-allowed opacity-50',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium',
                            isStepActive(step.id) && 'border-primary-foreground bg-primary-foreground text-primary',
                            isStepComplete(step.id) && !isStepActive(step.id) && 'border-primary bg-primary text-primary-foreground',
                            !isStepComplete(step.id) && !isStepActive(step.id) && 'border-muted-foreground',
                          )}
                        >
                          {isStepComplete(step.id) ? <Check className="h-3.5 w-3.5" aria-hidden /> : step.id}
                        </span>
                        <span>{step.title}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[220px]">
                      <p className="text-xs">{step.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="fixed left-0 right-0 top-0 z-50 border-b bg-background lg:hidden">
          <div className="flex items-center gap-2 px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="h-10 w-10 shrink-0 p-0"
              aria-label="Back to dashboard"
            >
              <Home className="h-4 w-4" aria-hidden />
            </Button>
            <div className="min-w-0 flex-1 overflow-x-auto">
              <div className="flex w-max items-center gap-1 pr-2">
                {steps.map((step, idx) => (
                  <div key={step.id} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => isStepAccessible(step.id) && setStep(step.id)}
                      disabled={!isStepAccessible(step.id)}
                      aria-current={isStepActive(step.id) ? 'step' : undefined}
                      aria-label={`${step.id}. ${step.title}`}
                      className={cn('flex min-w-14 flex-col items-center gap-1', !isStepAccessible(step.id) && 'cursor-not-allowed opacity-50')}
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-medium',
                          isStepActive(step.id) && 'border-primary bg-primary text-primary-foreground',
                          isStepComplete(step.id) && !isStepActive(step.id) && 'border-primary bg-primary text-primary-foreground',
                          !isStepComplete(step.id) && !isStepActive(step.id) && 'border-muted-foreground',
                        )}
                      >
                        {isStepComplete(step.id) ? <Check className="h-4 w-4" aria-hidden /> : step.id}
                      </span>
                      <span className="hidden text-xs sm:block">{step.shortTitle}</span>
                    </button>
                    {idx < steps.length - 1 && <span className="mx-1 h-0.5 w-4 bg-muted-foreground/30" aria-hidden />}
                  </div>
                ))}
              </div>
            </div>
            <Badge variant="outline" className="shrink-0 text-[10px]">
              {isDataCentreFlow ? 'Twin' : 'Builder'}
            </Badge>
          </div>
        </div>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto pt-16 lg:pt-0">
            <div className="mx-auto max-w-[920px] px-4 py-8 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>

          <div className="sticky bottom-0 left-0 right-0 border-t bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/85">
            <div className="mx-auto flex max-w-[920px] items-center justify-between gap-4">
              <Button variant="outline" onClick={onBack} disabled={activeStep === 1} className="min-w-[100px]">
                Back
              </Button>

              <div className="flex-1 text-center text-sm text-muted-foreground">
                Step {activeStep} of {steps.length} · {steps[activeStep - 1]?.title}
              </div>

              {isDeployStep && onDeploy ? (
                <Button
                  onClick={() => void handleDeployClick()}
                  disabled={nextDisabled || launchingDeploy}
                  className="min-w-[140px] gap-2"
                >
                  {launchingDeploy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Rocket className="h-4 w-4" aria-hidden />}
                  {launchingDeploy ? 'Opening review…' : 'Review & Deploy'}
                </Button>
              ) : (
                <Button onClick={onNext} disabled={nextDisabled} className="min-w-[100px]">
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

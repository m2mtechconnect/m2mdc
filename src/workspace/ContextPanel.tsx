/**
 * Context panel. One panel, one active tool. It changes what it shows based
 * on the selected tool and the current asset selection, and it is the only
 * place workspace actions live.
 */
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InspectorPanel } from './panels/InspectorPanel';
import { ConfigurePanel } from './panels/ConfigurePanel';
import { SimulatePanel, SimulateFooterAction } from './panels/SimulatePanel';
import { ComparePanel } from './panels/ComparePanel';
import { DecidePanel } from './panels/DecidePanel';
import { AssistPanel } from './panels/AssistPanel';
import { WORKFLOW_STEPS, useWorkspaceStore } from './workspaceStore';
import { deriveKpis, type ConfigOverrides, type FacilityAsset, type FacilityDefinition } from './facilityModel';

const TITLES: Record<string, string> = {
  inspect: 'Inspect asset',
  configure: 'Configure model',
  simulate: 'Simulate scenario',
  compare: 'Compare runs',
  decide: 'Review and record',
  assist: 'AURA assistant',
};

interface Props {
  facility: FacilityDefinition;
  assets: FacilityAsset[];
  overrides: ConfigOverrides;
  onClose?: () => void;
}

export function ContextPanel({ facility, assets, overrides, onClose }: Props) {
  const activeTool = useWorkspaceStore((s) => s.activeTool);
  const setTool = useWorkspaceStore((s) => s.setTool);
  const kpis = deriveKpis(facility, overrides);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [wide, setWide] = useState(false);

  // Step names are only shown when the inspector is wide enough for them.
  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setWide(entry.contentRect.width >= 420));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stepIndex = WORKFLOW_STEPS.findIndex((s) => s.tool === activeTool);
  const currentStep = WORKFLOW_STEPS[stepIndex];
  const previousStep = stepIndex > 0 ? WORKFLOW_STEPS[stepIndex - 1] : null;

  return (
    <aside
      className="v2-inspector flex h-full min-h-0 w-full min-w-0 flex-col"
      aria-label="Workspace context panel"
      data-testid="workspace-context-panel"
      ref={headerRef}
    >
      {/* Fixed header */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[hsl(var(--v2-line))] bg-[hsl(var(--v2-canvas-deep))] px-3 py-2">
        <h2 className="v2-label min-w-0 truncate">{TITLES[activeTool]}</h2>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label="Close context panel" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden />
          </Button>
        )}
      </div>

      {/* Guided workflow: position, current step title, compact indicator. */}
      <nav aria-label="Guided workflow" className="shrink-0 border-b border-border px-3 py-2">
        {wide ? (
          <div className="flex items-center gap-1">
            {WORKFLOW_STEPS.map((step, i) => (
              <button
                key={step.tool}
                type="button"
                onClick={() => setTool(step.tool)}
                aria-current={step.tool === activeTool ? 'step' : undefined}
                className={cn(
                  'min-w-0 flex-1 truncate rounded-sm px-1.5 py-1.5 text-xs font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  step.tool === activeTool
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {i + 1}. {step.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                Step {stepIndex + 1} of {WORKFLOW_STEPS.length}
              </p>
              <p className="truncate text-sm font-medium text-foreground">{currentStep?.label}</p>
            </div>
            <ol className="flex shrink-0 items-center gap-1.5" aria-hidden>
              {WORKFLOW_STEPS.map((step, i) => (
                <li
                  key={step.tool}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === stepIndex ? 'w-5 bg-primary' : i < stepIndex ? 'w-1.5 bg-primary/50' : 'w-1.5 bg-border',
                  )}
                />
              ))}
            </ol>
          </div>
        )}
      </nav>

      {/* Independently scrollable body */}
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-3">
        {activeTool === 'inspect' && <InspectorPanel facility={facility} assets={assets} />}
        {activeTool === 'configure' && <ConfigurePanel facility={facility} overrides={overrides} />}
        {activeTool === 'simulate' && <SimulatePanel facility={facility} />}
        {activeTool === 'compare' && <ComparePanel />}
        {activeTool === 'decide' && <DecidePanel />}
        {activeTool === 'assist' && <AssistPanel facility={facility} kpis={kpis} />}
      </div>

      {/* Sticky action footer: the primary action never scrolls out of view. */}
      <div className="flex shrink-0 items-center gap-2 border-t border-border bg-card px-3 py-2">
        <Button
          variant="outline"
          size="sm"
          className="h-9 shrink-0"
          disabled={!previousStep}
          onClick={() => previousStep && setTool(previousStep.tool)}
        >
          <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
          Back
        </Button>
        <div className="min-w-0 flex-1">
          {activeTool === 'simulate' ? (
            <SimulateFooterAction facility={facility} />
          ) : (
            <Button
              size="sm"
              className="h-9 w-full"
              disabled={stepIndex < 0 || stepIndex >= WORKFLOW_STEPS.length - 1}
              onClick={() => {
                const next = WORKFLOW_STEPS[stepIndex + 1];
                if (next) setTool(next.tool);
              }}
            >
              Continue
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
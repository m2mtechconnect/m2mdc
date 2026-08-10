/**
 * Context panel. One panel, one active tool. It changes what it shows based
 * on the selected tool and the current asset selection, and it is the only
 * place workspace actions live.
 */
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InspectorPanel } from './panels/InspectorPanel';
import { ConfigurePanel } from './panels/ConfigurePanel';
import { SimulatePanel } from './panels/SimulatePanel';
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
  decide: 'Decide and record',
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
  const runs = useWorkspaceStore((s) => s.runs);
  const kpis = deriveKpis(facility, overrides);

  const stepIndex = WORKFLOW_STEPS.findIndex((s) => s.tool === activeTool);

  return (
    <aside
      className="flex h-full min-h-0 w-full flex-col border-l border-border bg-card"
      aria-label="Workspace context panel"
      data-testid="workspace-context-panel"
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="text-sm font-semibold text-foreground">{TITLES[activeTool]}</h2>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Close context panel" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden />
          </Button>
        )}
      </div>

      {/* Guided workflow */}
      <nav aria-label="Guided workflow" className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        {WORKFLOW_STEPS.map((step, i) => {
          const done = stepIndex > i || (step.tool === 'simulate' && runs.length > 0 && stepIndex > i);
          const current = step.tool === activeTool;
          return (
            <button
              key={step.tool}
              type="button"
              onClick={() => setTool(step.tool)}
              aria-current={current ? 'step' : undefined}
              className={cn(
                'flex-1 rounded-sm px-1 py-1 text-[10px] font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                current
                  ? 'bg-primary/10 text-primary'
                  : done
                    ? 'text-foreground hover:bg-muted'
                    : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {i + 1}. {step.label}
            </button>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {activeTool === 'inspect' && <InspectorPanel facility={facility} assets={assets} />}
        {activeTool === 'configure' && <ConfigurePanel facility={facility} overrides={overrides} />}
        {activeTool === 'simulate' && <SimulatePanel facility={facility} />}
        {activeTool === 'compare' && <ComparePanel />}
        {activeTool === 'decide' && <DecidePanel />}
        {activeTool === 'assist' && <AssistPanel facility={facility} kpis={kpis} />}
      </div>
    </aside>
  );
}
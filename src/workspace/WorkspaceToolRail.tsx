/**
 * Persistent tool rail. Tools change what the context panel does; they never
 * navigate away from the facility model.
 */
import { Crosshair, GitCompare, MessageSquare, PlayCircle, Scale, SlidersHorizontal } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useWorkspaceStore, type WorkspaceTool } from './workspaceStore';

const TOOLS: Array<{ tool: WorkspaceTool; label: string; hint: string; icon: typeof Crosshair }> = [
  { tool: 'inspect', label: 'Inspect', hint: 'Select an asset and read its modelled attributes', icon: Crosshair },
  { tool: 'configure', label: 'Configure', hint: 'Change modelled setpoints and capacity assumptions', icon: SlidersHorizontal },
  { tool: 'simulate', label: 'Simulate', hint: 'Run a scenario against the current configuration', icon: PlayCircle },
  { tool: 'compare', label: 'Compare', hint: 'Compare runs and read KPI deltas', icon: GitCompare },
  { tool: 'decide', label: 'Review', hint: 'Review a completed run: accept, reject or defer each recommendation', icon: Scale },
  { tool: 'assist', label: 'Assistant', hint: 'Ask the AURA assistant about this facility', icon: MessageSquare },
];

interface Props {
  orientation?: 'vertical' | 'horizontal';
}

/** Steps that only make sense once at least one run exists. */
const gatedTools = new Set<WorkspaceTool>(['compare', 'decide']);

export function WorkspaceToolRail({ orientation = 'vertical' }: Props) {
  const activeTool = useWorkspaceStore((s) => s.activeTool);
  const setTool = useWorkspaceStore((s) => s.setTool);
  const hasRun = useWorkspaceStore((s) => s.runs.length > 0);
  const isVertical = orientation === 'vertical';

  return (
    <TooltipProvider delayDuration={200}>
      <div
        role="toolbar"
        aria-orientation={isVertical ? 'vertical' : 'horizontal'}
        aria-label="Workspace tools"
        data-testid="workspace-tool-rail"
        className={cn(
          'flex bg-card',
          isVertical
            ? 'h-full w-14 flex-col items-center gap-1 border-r border-border py-2'
            : 'w-full items-center justify-around gap-1 border-t border-border px-1 py-1',
        )}
      >
        {TOOLS.map(({ tool, label, hint, icon: Icon }) => {
          const isActive = activeTool === tool;
          const isGated = gatedTools.has(tool) && !hasRun;
          const reasonId = `workspace-tool-${tool}-reason`;
          return (
            <Tooltip key={tool}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-pressed={isActive}
                  aria-label={label}
                  aria-disabled={isGated}
                  aria-describedby={isGated ? reasonId : undefined}
                  data-testid={`workspace-tool-${tool}`}
                  onClick={() => {
                    if (isGated) return;
                    setTool(tool);
                  }}
                  className={cn(
                    'flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-md transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                    isGated && 'opacity-40',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                  <span className="text-[10px] leading-none">{label}</span>
                  {isGated && (
                    <span id={reasonId} className="sr-only">
                      {label} is unavailable until a scenario run has completed.
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side={isVertical ? 'right' : 'top'} className="text-xs">
                {isGated ? 'Run a scenario first to unlock this step' : hint}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
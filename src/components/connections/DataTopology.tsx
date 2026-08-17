import { ArrowRight, Building2, Boxes, CircuitBoard, Cloud } from 'lucide-react';
import type { TopologyEdge, TopologyNode } from '@/connections/presentation';

const ICON = {
  sources: Building2,
  gateway: CircuitBoard,
  twin: Boxes,
  destinations: Cloud,
} as const;

const STATE_STYLE: Record<TopologyNode['state'], string> = {
  active: 'border-emerald-500/50 bg-emerald-500/5',
  partial: 'border-amber-500/50 bg-amber-500/5',
  inactive: 'border-border bg-muted/40',
};

const STATE_LABEL: Record<TopologyNode['state'], string> = {
  active: 'Data flowing',
  partial: 'Configured, no flow',
  inactive: 'Not configured',
};

/**
 * Data topology. Every node and edge is derived from configured connections,
 * persisted event counts and active mappings — never from a fixture.
 */
export function DataTopology({ nodes, edges }: { nodes: TopologyNode[]; edges: TopologyEdge[] }) {
  return (
    <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
      {nodes.map((node, index) => {
        const Icon = ICON[node.id];
        const edge = edges[index];
        return (
          <div key={node.id} className="contents">
            <div className={`min-w-0 rounded-lg border p-4 ${STATE_STYLE[node.state]}`}>
              <div className="flex items-start gap-3">
                <span className="rounded-md bg-background p-2 text-foreground" aria-hidden>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{node.title}</p>
                  <p className="text-xs text-muted-foreground">{node.subtitle}</p>
                </div>
              </div>
              <p className="mt-3 text-2xl font-semibold tabular-nums">{node.count}</p>
              <p className="text-sm text-muted-foreground">{node.detail}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {STATE_LABEL[node.state]}
              </p>
            </div>
            {edge && (
              <div className="flex items-center justify-center gap-2 py-1 lg:flex-col lg:px-1">
                <ArrowRight
                  className={`h-4 w-4 rotate-90 lg:rotate-0 ${edge.state === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}
                  aria-hidden
                />
                <span className="text-xs text-muted-foreground lg:max-w-[7rem] lg:text-center">{edge.label}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

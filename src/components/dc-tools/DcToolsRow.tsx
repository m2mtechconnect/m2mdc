/**
 * DcToolsRow - Row of DC Tool Cards for dashboard placement
 */

import { DcToolCard } from './DcToolCard';
import { dcToolRegistry, DcToolDefinition, getSimulationTools } from '@/data/dcToolRegistry';

interface DcToolsRowProps {
  twinId?: string;
  title?: string;
  subtitle?: string;
  compact?: boolean;
  simulationMode?: boolean;
  simulationContext?: {
    scenarioId?: string;
    currentTime?: number;
  };
  onOpenTool?: (tool: DcToolDefinition) => void;
}

export function DcToolsRow({
  twinId = 'default',
  title = 'Data Centre Tools',
  subtitle = 'Quick access to specialized monitoring and analysis tools',
  compact = false,
  simulationMode = false,
  simulationContext,
  onOpenTool,
}: DcToolsRowProps) {
  const tools = simulationMode ? getSimulationTools() : dcToolRegistry;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {/* Tools Grid */}
      <div className={compact 
        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3"
        : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4"
      }>
        {tools.map((tool) => (
          <DcToolCard
            key={tool.id}
            tool={tool}
            twinId={twinId}
            compact={compact}
            simulationContext={simulationContext}
            onOpenTool={onOpenTool}
          />
        ))}
      </div>
    </div>
  );
}

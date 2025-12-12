/**
 * Compact Data Centre Tools Panel - Chip-based layout
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Cpu, Zap, Wind, Globe, Leaf, 
  AlertTriangle, CheckCircle, ChevronRight, Settings
} from 'lucide-react';
import { CollapsibleSection } from '@/components/shared/CollapsibleSection';
import { cn } from '@/lib/utils';

interface DCTool {
  id: string;
  name: string;
  shortName: string;
  icon: React.ReactNode;
  status: 'healthy' | 'warning' | 'alert';
}

interface CompactDCToolsPanelProps {
  twinId?: string;
  onOpenTool?: (toolId: string) => void;
  maxVisible?: number;
}

const tools: DCTool[] = [
  {
    id: 'gpu-telemetry',
    name: 'GPU Telemetry Explorer',
    shortName: 'GPU Telemetry',
    icon: <Cpu className="h-3.5 w-3.5" />,
    status: 'warning',
  },
  {
    id: 'power-quality',
    name: 'Power Quality Monitor',
    shortName: 'Power Monitor',
    icon: <Zap className="h-3.5 w-3.5" />,
    status: 'healthy',
  },
  {
    id: 'cooling-optimizer',
    name: 'Cooling Optimizer',
    shortName: 'Cooling',
    icon: <Wind className="h-3.5 w-3.5" />,
    status: 'healthy',
  },
  {
    id: 'sovereignty-inspector',
    name: 'Sovereignty & Compliance Inspector',
    shortName: 'Sovereignty',
    icon: <Globe className="h-3.5 w-3.5" />,
    status: 'warning',
  },
  {
    id: 'carbon-analyzer',
    name: 'Carbon & Cost Analyzer',
    shortName: 'Carbon',
    icon: <Leaf className="h-3.5 w-3.5" />,
    status: 'healthy',
  },
];

const statusStyles = {
  healthy: {
    icon: <CheckCircle className="h-2.5 w-2.5" />,
    className: 'bg-success/10 text-success border-success/30 hover:bg-success/20',
  },
  warning: {
    icon: <AlertTriangle className="h-2.5 w-2.5" />,
    className: 'bg-warning/10 text-warning border-warning/30 hover:bg-warning/20',
  },
  alert: {
    icon: <AlertTriangle className="h-2.5 w-2.5" />,
    className: 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20',
  },
};

export function CompactDCToolsPanel({ twinId, onOpenTool, maxVisible = 6 }: CompactDCToolsPanelProps) {
  const visibleTools = tools.slice(0, maxVisible);
  const hasMore = tools.length > maxVisible;

  return (
    <CollapsibleSection
      title="Data Centre Tools"
      badge={`${tools.length} tools`}
      defaultOpen={false}
      icon={<Settings className="h-4 w-4 text-primary" />}
    >
      <div className="flex flex-wrap gap-2">
        {visibleTools.map((tool) => {
          const status = statusStyles[tool.status];
          
          return (
            <button
              key={tool.id}
              onClick={() => onOpenTool?.(tool.id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer',
                status.className
              )}
              title={tool.name}
            >
              {tool.icon}
              <span className="truncate max-w-[100px]">{tool.shortName}</span>
              {tool.status !== 'healthy' && status.icon}
            </button>
          );
        })}
        
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground gap-1"
            onClick={() => onOpenTool?.('all')}
          >
            +{tools.length - maxVisible} more
            <ChevronRight className="h-3 w-3" />
          </Button>
        )}
      </div>
    </CollapsibleSection>
  );
}

/**
 * DcToolCard - Reusable Data Centre Tool Card Component
 * Uses existing Studio card and button styles
 */

import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Cpu,
  Zap,
  Wind,
  Shield,
  Leaf,
  ArrowRight,
  LucideIcon,
} from 'lucide-react';
import {
  DcToolDefinition,
  getTwinRoute,
  getDomainBadgeVariant,
  getDomainDisplayName,
} from '@/data/dcToolRegistry';

const iconMap: Record<string, LucideIcon> = {
  Cpu,
  Zap,
  Wind,
  Shield,
  Leaf,
};

interface DcToolCardProps {
  tool: DcToolDefinition;
  twinId?: string;
  compact?: boolean;
  simulationContext?: {
    scenarioId?: string;
    currentTime?: number;
  };
  onOpenTool?: (tool: DcToolDefinition) => void;
}

export function DcToolCard({
  tool,
  twinId = 'default',
  compact = false,
  simulationContext,
  onOpenTool,
}: DcToolCardProps) {
  const navigate = useNavigate();
  const IconComponent = iconMap[tool.icon] || Cpu;

  const handleClick = () => {
    if (onOpenTool) {
      onOpenTool(tool);
      return;
    }

    if (tool.openMode === 'navigate' && tool.tabTarget) {
      let route = getTwinRoute(twinId, tool.tabTarget);
      
      // Preserve simulation context if present
      if (simulationContext?.scenarioId) {
        route += `&scenarioId=${simulationContext.scenarioId}`;
      }
      if (simulationContext?.currentTime !== undefined) {
        route += `&simTime=${simulationContext.currentTime}`;
      }
      
      navigate(route);
    }
  };

  if (compact) {
    return (
      <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer group" onClick={handleClick}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <IconComponent className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{tool.name}</p>
            <Badge variant={getDomainBadgeVariant(tool.domain)} className="text-[10px] mt-1">
              {getDomainDisplayName(tool.domain)}
            </Badge>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="p-2 rounded-lg bg-primary/10">
            <IconComponent className="h-5 w-5 text-primary" />
          </div>
          <Badge variant={getDomainBadgeVariant(tool.domain)} className="text-xs">
            {getDomainDisplayName(tool.domain)}
          </Badge>
        </div>

        {/* Content */}
        <div>
          <h4 className="font-medium text-sm mb-1">{tool.name}</h4>
          <p className="text-xs text-muted-foreground line-clamp-2">{tool.description}</p>
        </div>

        {/* Action */}
        <Button
          size="sm"
          className="w-full gap-2"
          onClick={handleClick}
        >
          {tool.primaryActionLabel}
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </Card>
  );
}

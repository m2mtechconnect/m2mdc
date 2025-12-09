/**
 * DcToolsStrip - Horizontal compact strip of DC Tools for Telemetry page
 */

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Cpu,
  Zap,
  Wind,
  Shield,
  Leaf,
  LucideIcon,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { dcToolRegistry, getTwinRoute, DcToolDefinition } from '@/data/dcToolRegistry';

const iconMap: Record<string, LucideIcon> = {
  Cpu,
  Zap,
  Wind,
  Shield,
  Leaf,
};

interface DcToolsStripProps {
  twinId?: string;
  onToolClick?: (tool: DcToolDefinition) => void;
}

export function DcToolsStrip({ twinId = 'default', onToolClick }: DcToolsStripProps) {
  const navigate = useNavigate();

  const handleClick = (tool: DcToolDefinition) => {
    if (onToolClick) {
      onToolClick(tool);
      return;
    }

    if (tool.tabTarget) {
      navigate(getTwinRoute(twinId, tool.tabTarget));
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground mr-2">Quick Tools:</span>
      {dcToolRegistry.map((tool) => {
        const IconComponent = iconMap[tool.icon] || Cpu;
        return (
          <TooltipProvider key={tool.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 h-8"
                  onClick={() => handleClick(tool)}
                >
                  <IconComponent className="h-3 w-3" />
                  <span className="hidden sm:inline text-xs">{tool.name.split(' ')[0]}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{tool.name}</p>
                <p className="text-xs text-muted-foreground">{tool.description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}

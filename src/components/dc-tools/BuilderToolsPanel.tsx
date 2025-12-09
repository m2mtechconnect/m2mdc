/**
 * BuilderToolsPanel - Recommended Tools panel for Builder Step 2
 */

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Cpu,
  Zap,
  Wind,
  Shield,
  Leaf,
  Settings,
  LucideIcon,
} from 'lucide-react';
import { dcToolRegistry, getDomainDisplayName } from '@/data/dcToolRegistry';

const iconMap: Record<string, LucideIcon> = {
  Cpu,
  Zap,
  Wind,
  Shield,
  Leaf,
};

interface BuilderToolsPanelProps {
  onConfigureIntegration?: (integrationName: string) => void;
}

export function BuilderToolsPanel({ onConfigureIntegration }: BuilderToolsPanelProps) {
  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-sm">Recommended Tools</h4>
          <p className="text-xs text-muted-foreground">
            Tools available based on your integrations
          </p>
        </div>

        <div className="space-y-3">
          {dcToolRegistry.map((tool) => {
            const IconComponent = iconMap[tool.icon] || Cpu;
            return (
              <div
                key={tool.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
              >
                <div className="p-1.5 rounded bg-primary/10">
                  <IconComponent className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium">{tool.name}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {getDomainDisplayName(tool.domain)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                    {tool.description}
                  </p>
                  {tool.requiredIntegrations && tool.requiredIntegrations.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-muted-foreground">Requires:</span>
                      {tool.requiredIntegrations.slice(0, 3).map((integration) => (
                        <Badge
                          key={integration}
                          variant="secondary"
                          className="text-[10px] cursor-pointer hover:bg-secondary/80"
                          onClick={() => onConfigureIntegration?.(integration)}
                        >
                          {integration}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => onConfigureIntegration?.(tool.requiredIntegrations?.[0] || '')}
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

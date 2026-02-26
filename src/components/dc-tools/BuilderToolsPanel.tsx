/**
 * BuilderToolsPanel - Recommended Tools panel for Builder Step 2
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Cpu,
  Zap,
  Wind,
  Shield,
  Leaf,
  Info,
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

export function BuilderToolsPanel() {
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
                          className="text-[10px]"
                        >
                          {integration}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                    >
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="left" className="w-64 text-sm space-y-2">
                    <p className="font-medium">{tool.name}</p>
                    <p className="text-xs text-muted-foreground">{tool.description}</p>
                    <div className="pt-1 border-t border-border space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Domain</p>
                      <Badge variant="outline" className="text-[10px]">{getDomainDisplayName(tool.domain)}</Badge>
                    </div>
                    {tool.requiredIntegrations && tool.requiredIntegrations.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Required Integrations</p>
                        <div className="flex flex-wrap gap-1">
                          {tool.requiredIntegrations.map((i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">{i}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

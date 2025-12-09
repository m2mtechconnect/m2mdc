/**
 * DC Scenario Selector Component
 * Carousel/grid of simulation scenarios with domain badges and severity indicators
 * Uses Studio design system tokens
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, Clock, AlertTriangle, Thermometer, Zap, Wind, 
  Network, Shield, Cpu, Globe, DollarSign, Sparkles
} from 'lucide-react';
import type { ScenarioDefinition } from '@/simulation/types';
import { cn } from '@/lib/utils';

interface DCScenarioSelectorProps {
  presetScenarios: ScenarioDefinition[];
  customScenarios: ScenarioDefinition[];
  activeScenarioId: string | null;
  onSelectScenario: (scenarioId: string) => void;
  onCreateCustom?: () => void;
  isRunning?: boolean;
}

const domainIcons: Record<string, React.ElementType> = {
  thermal: Thermometer,
  power: Zap,
  cooling: Wind,
  network: Network,
  facility: Shield,
  workload: Cpu,
  sovereignty: Globe,
  financial: DollarSign,
};

const domainColors: Record<string, string> = {
  thermal: 'bg-destructive/10 text-destructive border-destructive/30',
  power: 'bg-warning/10 text-warning border-warning/30',
  cooling: 'bg-info/10 text-info border-info/30',
  network: 'bg-info/10 text-info border-info/30',
  facility: 'bg-accent/10 text-accent border-accent/30',
  workload: 'bg-success/10 text-success border-success/30',
  sovereignty: 'bg-primary/10 text-primary border-primary/30',
  financial: 'bg-success/10 text-success border-success/30',
};

const severityColors: Record<string, string> = {
  low: 'bg-info/10 text-info',
  medium: 'bg-warning/10 text-warning',
  high: 'bg-destructive/10 text-destructive',
  critical: 'bg-destructive/20 text-destructive',
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

function ScenarioCard({ 
  scenario, 
  isActive, 
  isRunning,
  onSelect 
}: { 
  scenario: ScenarioDefinition; 
  isActive: boolean;
  isRunning: boolean;
  onSelect: () => void;
}) {
  const primaryDomain = scenario.domainsInvolved[0] || 'thermal';
  const PrimaryIcon = domainIcons[primaryDomain] || AlertTriangle;
  
  return (
    <Card 
      className={cn(
        'min-w-[280px] max-w-[320px] cursor-pointer transition-all duration-200 hover:scale-[1.02]',
        'bg-card border-border hover:border-primary/50',
        isActive && 'border-primary ring-2 ring-primary/20'
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={cn('p-2 rounded-lg', domainColors[primaryDomain])}>
              <PrimaryIcon className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-medium text-sm leading-tight text-card-foreground">{scenario.name}</h4>
              {scenario.isCustom && (
                <Badge variant="outline" className="text-[10px] h-4 mt-1">
                  <Sparkles className="h-2 w-2 mr-1" />
                  Custom
                </Badge>
              )}
            </div>
          </div>
          <Badge className={cn('text-[10px]', severityColors[scenario.severity])}>
            {scenario.severity}
          </Badge>
        </div>
        
        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2">
          {scenario.description}
        </p>
        
        {/* Domain badges */}
        <div className="flex flex-wrap gap-1">
          {scenario.domainsInvolved.slice(0, 3).map((domain) => {
            const Icon = domainIcons[domain] || AlertTriangle;
            return (
              <Badge 
                key={domain} 
                variant="outline" 
                className={cn('text-[10px] gap-1', domainColors[domain])}
              >
                <Icon className="h-2.5 w-2.5" />
                {domain}
              </Badge>
            );
          })}
          {scenario.domainsInvolved.length > 3 && (
            <Badge variant="outline" className="text-[10px]">
              +{scenario.domainsInvolved.length - 3}
            </Badge>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDuration(scenario.durationSeconds)}
          </div>
          <Button 
            size="sm" 
            variant={isActive ? 'default' : 'outline'}
            className="h-7 text-xs gap-1"
            disabled={isRunning && !isActive}
          >
            <Play className="h-3 w-3" />
            {isActive ? 'Selected' : 'Select'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function DCScenarioSelector({
  presetScenarios,
  customScenarios,
  activeScenarioId,
  onSelectScenario,
  onCreateCustom,
  isRunning = false,
}: DCScenarioSelectorProps) {
  const [filter, setFilter] = useState<'all' | 'preset' | 'custom'>('all');
  
  const allScenarios = [...presetScenarios, ...customScenarios];
  const filteredScenarios = filter === 'all' 
    ? allScenarios 
    : filter === 'preset' 
      ? presetScenarios 
      : customScenarios;
  
  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex items-center justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs h-6 px-3">
              All ({allScenarios.length})
            </TabsTrigger>
            <TabsTrigger value="preset" className="text-xs h-6 px-3">
              Preset ({presetScenarios.length})
            </TabsTrigger>
            <TabsTrigger value="custom" className="text-xs h-6 px-3">
              Custom ({customScenarios.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {onCreateCustom && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onCreateCustom}
            className="gap-1 text-xs"
          >
            <Sparkles className="h-3 w-3" />
            Create Custom
          </Button>
        )}
      </div>
      
      {/* Scenario carousel */}
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {filteredScenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              isActive={scenario.id === activeScenarioId}
              isRunning={isRunning}
              onSelect={() => onSelectScenario(scenario.id)}
            />
          ))}
          
          {filteredScenarios.length === 0 && (
            <div className="w-full py-8 text-center text-muted-foreground text-sm">
              No scenarios found. {filter === 'custom' && onCreateCustom && (
                <Button variant="link" onClick={onCreateCustom} className="px-1">
                  Create your first custom scenario
                </Button>
              )}
            </div>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

/**
 * DC Scenario Selector Component
 * Carousel/grid of simulation scenarios with domain badges and severity indicators
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
  thermal: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  power: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  cooling: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  network: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  facility: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  workload: 'bg-green-500/20 text-green-400 border-green-500/30',
  sovereignty: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  financial: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

const severityColors: Record<string, string> = {
  low: 'bg-blue-500/20 text-blue-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  high: 'bg-orange-500/20 text-orange-400',
  critical: 'bg-red-500/20 text-red-400',
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
        'bg-dc-surface border-dc-border hover:border-dc-primary/50',
        isActive && 'border-dc-primary ring-2 ring-dc-primary/20'
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
              <h4 className="font-medium text-sm leading-tight">{scenario.name}</h4>
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
        <div className="flex items-center justify-between pt-2 border-t border-dc-border">
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
          <TabsList className="h-8 bg-dc-surface">
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

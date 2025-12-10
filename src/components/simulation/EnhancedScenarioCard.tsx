/**
 * Enhanced Scenario Card with severity borders, preview flyout, and sparklines
 */

import { useState, memo, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Play, Clock, AlertTriangle, Thermometer, Zap, Wind, 
  Network, Shield, Cpu, Globe, DollarSign, Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { ScenarioDefinition } from '@/simulation/types';
import { cn } from '@/lib/utils';

interface EnhancedScenarioCardProps {
  scenario: ScenarioDefinition;
  isActive: boolean;
  isRunning: boolean;
  onSelect: () => void;
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
  network: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  facility: 'bg-accent/10 text-accent border-accent/30',
  workload: 'bg-success/10 text-success border-success/30',
  sovereignty: 'bg-primary/10 text-primary border-primary/30',
  financial: 'bg-success/10 text-success border-success/30',
};

const severityConfig: Record<string, { border: string; badge: string }> = {
  info: { border: 'border-info/30 hover:border-info/50', badge: 'bg-info/10 text-info' },
  warning: { border: 'border-warning/30 hover:border-warning/50', badge: 'bg-warning/10 text-warning' },
  emergency: { border: 'border-destructive/50 hover:border-destructive/70', badge: 'bg-destructive/20 text-destructive' },
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

export const EnhancedScenarioCard = memo(function EnhancedScenarioCard({ 
  scenario, 
  isActive, 
  isRunning,
  onSelect 
}: EnhancedScenarioCardProps) {
  const primaryDomain = scenario.domainsInvolved[0] || 'thermal';
  const PrimaryIcon = domainIcons[primaryDomain] || AlertTriangle;
  const severity = severityConfig[scenario.severity] || severityConfig.warning;

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <Card 
        className={cn(
          'min-w-[280px] max-w-[320px] cursor-pointer transition-all duration-200',
          'bg-card border-2 shadow-sm hover:shadow-lg',
          severity.border,
          isActive && 'ring-2 ring-primary/30 border-primary'
        )}
        onClick={onSelect}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={cn('p-2 rounded-lg', domainColors[primaryDomain])}>
                <PrimaryIcon className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-semibold text-sm leading-tight">{scenario.name}</h4>
                {scenario.isCustom && (
                  <Badge variant="outline" className="text-[10px] h-4 mt-1">
                    <Sparkles className="h-2 w-2 mr-1" />Custom
                  </Badge>
                )}
              </div>
            </div>
            <Badge className={cn('text-[10px]', severity.badge)}>{scenario.severity}</Badge>
          </div>
          
          <p className="text-xs text-muted-foreground line-clamp-2">{scenario.description}</p>
          
          <div className="flex flex-wrap gap-1">
            {scenario.domainsInvolved.slice(0, 3).map((domain) => {
              const Icon = domainIcons[domain] || AlertTriangle;
              return (
                <Badge key={domain} variant="outline" className={cn('text-[10px] gap-1', domainColors[domain])}>
                  <Icon className="h-2.5 w-2.5" />{domain}
                </Badge>
              );
            })}
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />{formatDuration(scenario.durationSeconds)}
            </div>
            <Button size="sm" variant={isActive ? 'default' : 'outline'} className="h-7 text-xs gap-1" disabled={isRunning && !isActive}>
              <Play className="h-3 w-3" />{isActive ? 'Selected' : 'Select'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

/**
 * Domain Health Map
 * 3x3 grid showing domain health with Green/Yellow/Red/Gray indicators
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Thermometer,
  Zap,
  Wind,
  Network,
  Building2,
  Cpu,
  Globe,
  DollarSign,
  Activity,
} from 'lucide-react';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { cn } from '@/lib/utils';

type HealthStatus = 'healthy' | 'degraded' | 'critical' | 'no_data';

interface DomainHealth {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  status: HealthStatus;
  metric: string;
  value: string;
  agentCount: number;
  kpiCount: number;
}

export function DomainHealthMap({ className }: { className?: string }) {
  const { agents, kpis } = useDCTwinBuilderStore();

  // Calculate domain health based on agent and KPI status
  const getDomainHealth = (domain: string): HealthStatus => {
    const domainAgents = agents.filter(a => a.domain === domain);
    const enabledAgents = domainAgents.filter(a => a.enabled);
    
    if (domainAgents.length === 0) return 'no_data';
    if (enabledAgents.length === 0) return 'critical';
    if (enabledAgents.length < domainAgents.length * 0.5) return 'degraded';
    return 'healthy';
  };

  const domains: DomainHealth[] = [
    {
      id: 'thermal',
      name: 'Thermal',
      icon: Thermometer,
      status: getDomainHealth('thermal'),
      metric: 'Avg Temp',
      value: '24.2°C',
      agentCount: agents.filter(a => a.domain === 'thermal').length,
      kpiCount: kpis.filter(k => k.domain === 'thermal').length,
    },
    {
      id: 'power',
      name: 'Power',
      icon: Zap,
      status: getDomainHealth('power'),
      metric: 'Utilization',
      value: '78%',
      agentCount: agents.filter(a => a.domain === 'power').length,
      kpiCount: kpis.filter(k => k.domain === 'power').length,
    },
    {
      id: 'cooling',
      name: 'Cooling',
      icon: Wind,
      status: getDomainHealth('cooling'),
      metric: 'Efficiency',
      value: '92%',
      agentCount: agents.filter(a => a.domain === 'cooling').length,
      kpiCount: kpis.filter(k => k.domain === 'cooling').length,
    },
    {
      id: 'network',
      name: 'Network',
      icon: Network,
      status: getDomainHealth('network'),
      metric: 'Throughput',
      value: '8.2 Gbps',
      agentCount: agents.filter(a => a.domain === 'network').length,
      kpiCount: kpis.filter(k => k.domain === 'network').length,
    },
    {
      id: 'workload',
      name: 'Workload',
      icon: Cpu,
      status: getDomainHealth('workload'),
      metric: 'GPU Load',
      value: '85%',
      agentCount: agents.filter(a => a.domain === 'workload').length,
      kpiCount: kpis.filter(k => k.domain === 'workload').length,
    },
    {
      id: 'facility',
      name: 'Facility',
      icon: Building2,
      status: 'healthy',
      metric: 'Safety',
      value: 'All Clear',
      agentCount: agents.filter(a => a.domain === 'incidents').length,
      kpiCount: kpis.filter(k => k.domain === 'incidents').length,
    },
    {
      id: 'sovereignty',
      name: 'Sovereignty',
      icon: Globe,
      status: getDomainHealth('sovereignty'),
      metric: 'Compliance',
      value: '100%',
      agentCount: agents.filter(a => a.domain === 'sovereignty').length,
      kpiCount: kpis.filter(k => k.domain === 'sovereignty').length,
    },
    {
      id: 'financial',
      name: 'Financial',
      icon: DollarSign,
      status: getDomainHealth('financial'),
      metric: 'Budget',
      value: 'On Track',
      agentCount: agents.filter(a => a.domain === 'financial').length,
      kpiCount: kpis.filter(k => k.domain === 'financial').length,
    },
  ];

  const getStatusStyles = (status: HealthStatus) => {
    switch (status) {
      case 'healthy':
        return {
          bg: 'bg-success/10',
          border: 'border-success/30',
          text: 'text-success',
          indicator: 'bg-success',
          label: 'Healthy',
        };
      case 'degraded':
        return {
          bg: 'bg-warning/10',
          border: 'border-warning/30',
          text: 'text-warning',
          indicator: 'bg-warning',
          label: 'Degraded',
        };
      case 'critical':
        return {
          bg: 'bg-destructive/10',
          border: 'border-destructive/30',
          text: 'text-destructive',
          indicator: 'bg-destructive',
          label: 'Critical',
        };
      case 'no_data':
        return {
          bg: 'bg-muted',
          border: 'border-border',
          text: 'text-muted-foreground',
          indicator: 'bg-muted-foreground',
          label: 'No Data',
        };
    }
  };

  // Calculate overall health
  const healthCounts = {
    healthy: domains.filter(d => d.status === 'healthy').length,
    degraded: domains.filter(d => d.status === 'degraded').length,
    critical: domains.filter(d => d.status === 'critical').length,
    no_data: domains.filter(d => d.status === 'no_data').length,
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Domain Health Overview
          </CardTitle>
          <div className="flex items-center gap-2">
            {healthCounts.healthy > 0 && (
              <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                {healthCounts.healthy} Healthy
              </Badge>
            )}
            {healthCounts.degraded > 0 && (
              <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
                {healthCounts.degraded} Degraded
              </Badge>
            )}
            {healthCounts.critical > 0 && (
              <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">
                {healthCounts.critical} Critical
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="grid grid-cols-4 gap-3">
            {domains.map((domain, index) => {
              const styles = getStatusStyles(domain.status);
              const Icon = domain.icon;

              return (
                <Tooltip key={domain.id}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'relative p-3 rounded-lg border cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] animate-fade-in group',
                        styles.bg,
                        styles.border
                      )}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      {/* Status Indicator */}
                      <div
                        className={cn(
                          'absolute top-2 right-2 w-2.5 h-2.5 rounded-full transition-transform group-hover:scale-125',
                          styles.indicator,
                          domain.status === 'healthy' && 'animate-pulse shadow-sm',
                          domain.status === 'critical' && 'animate-pulse'
                        )}
                      />

                      <div className="flex flex-col items-center text-center gap-2">
                        <div className={cn(
                          'p-2.5 rounded-xl transition-all duration-300 group-hover:shadow-md',
                          styles.bg,
                          'group-hover:scale-110'
                        )}>
                          <Icon className={cn('h-5 w-5 transition-colors', styles.text)} />
                        </div>
                        <div>
                          <p className="text-xs font-medium group-hover:text-foreground transition-colors">{domain.name}</p>
                          <p className={cn('text-[10px] font-medium', styles.text)}>{styles.label}</p>
                        </div>
                      </div>
                      
                      {/* Hover glow effect */}
                      <div className={cn(
                        'absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none',
                        domain.status === 'healthy' && 'shadow-[inset_0_0_20px_rgba(34,197,94,0.1)]',
                        domain.status === 'critical' && 'shadow-[inset_0_0_20px_rgba(239,68,68,0.1)]',
                        domain.status === 'degraded' && 'shadow-[inset_0_0_20px_rgba(245,158,11,0.1)]'
                      )} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1.5">
                      <p className="font-medium">{domain.name} Domain</p>
                      <p className="text-xs text-muted-foreground">
                        {domain.metric}: <span className="font-medium text-foreground">{domain.value}</span>
                      </p>
                      <div className="flex gap-2 text-xs">
                        <Badge variant="outline" className="text-[10px]">{domain.agentCount} agents</Badge>
                        <Badge variant="outline" className="text-[10px]">{domain.kpiCount} KPIs</Badge>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-[10px] text-muted-foreground">Healthy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-warning" />
            <span className="text-[10px] text-muted-foreground">Degraded</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-destructive" />
            <span className="text-[10px] text-muted-foreground">Critical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">No Data</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

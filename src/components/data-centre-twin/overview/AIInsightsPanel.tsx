/**
 * AI Insights Panel - Cross-domain AI recommendations
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Brain, Lightbulb, AlertTriangle, PlayCircle, CheckCircle,
  Thermometer, Zap, Wind, Cpu, Globe, Leaf
} from 'lucide-react';
import { CollapsibleSection } from '@/components/shared/CollapsibleSection';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

interface AIInsightsPanelProps {
  facility: DataCentreFacility;
  onApplyFix?: (insightId: string) => void;
  onSimulateFix?: (insightId: string) => void;
}

interface Insight {
  id: string;
  domain: string;
  icon: React.ReactNode;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  impact?: string;
  actions: Array<{
    label: string;
    type: 'apply' | 'simulate';
  }>;
}

export function AIInsightsPanel({ facility, onApplyFix, onSimulateFix }: AIInsightsPanelProps) {
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());
  
  const insights: Insight[] = generateInsights(facility);
  const activeInsights = insights.filter(i => !dismissedInsights.has(i.id));
  
  const handleDismiss = (id: string) => {
    setDismissedInsights(prev => new Set([...prev, id]));
  };
  
  const domainColors: Record<string, string> = {
    thermal: 'bg-destructive/10 text-destructive border-destructive/20',
    power: 'bg-warning/10 text-warning border-warning/20',
    cooling: 'bg-info/10 text-info border-info/20',
    workload: 'bg-accent/10 text-accent border-accent/20',
    sovereignty: 'bg-primary/10 text-primary border-primary/20',
    carbon: 'bg-success/10 text-success border-success/20',
    financial: 'bg-warning/10 text-warning border-warning/20',
  };
  
  const severityBorder: Record<string, string> = {
    info: 'border-border hover:border-primary/30',
    warning: 'border-warning/30 hover:border-warning/50',
    critical: 'border-destructive/30 hover:border-destructive/50',
  };
  
  return (
    <CollapsibleSection
      title="AI Insights & Recommendations"
      badge={`${activeInsights.length} active`}
      defaultOpen={true}
      icon={<Brain className="h-5 w-5 text-primary" />}
    >
      <ScrollArea className="h-[400px] pr-2">
        <div className="space-y-3">
          {activeInsights.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <div className="p-3 rounded-full bg-success/10 mb-3">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <p className="text-sm font-medium">All systems optimized</p>
              <p className="text-xs">No actionable insights at this time</p>
            </div>
          ) : (
            activeInsights.map((insight) => (
              <Card 
                key={insight.id} 
                className={`bg-card transition-all ${severityBorder[insight.severity]}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      {insight.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className={domainColors[insight.domain]}>
                          {insight.domain}
                        </Badge>
                        {insight.severity === 'critical' && (
                          <Badge variant="destructive" className="text-[10px]">
                            <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                            Critical
                          </Badge>
                        )}
                        {insight.severity === 'warning' && (
                          <Badge className="text-[10px] bg-warning/10 text-warning border-warning/30">
                            Warning
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm font-medium mb-1">{insight.title}</p>
                      <p className="text-xs text-muted-foreground mb-2">{insight.description}</p>
                      
                      {insight.impact && (
                        <div className="flex items-center gap-2 mb-3 text-xs">
                          <Lightbulb className="h-3 w-3 text-warning" />
                          <span className="text-muted-foreground">{insight.impact}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        {insight.actions.map((action, idx) => (
                          <Button
                            key={idx}
                            variant={action.type === 'apply' ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => action.type === 'apply' 
                              ? onApplyFix?.(insight.id) 
                              : onSimulateFix?.(insight.id)
                            }
                          >
                            {action.type === 'simulate' && <PlayCircle className="h-3 w-3" />}
                            {action.type === 'apply' && <CheckCircle className="h-3 w-3" />}
                            {action.label}
                          </Button>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground"
                          onClick={() => handleDismiss(insight.id)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </CollapsibleSection>
  );
}

function generateInsights(facility: DataCentreFacility): Insight[] {
  const insights: Insight[] = [];
  
  // Thermal insights
  if (facility.thermalHardware.kpis.hotspotRiskProbability > 15) {
    insights.push({
      id: 'thermal-hotspot-risk',
      domain: 'thermal',
      icon: <Thermometer className="h-4 w-4 text-destructive" />,
      severity: 'warning',
      title: 'GPU cluster showing rising heat due to training workloads',
      description: 'Rack R17 showing rising ΔT trend; airflow obstruction likely.',
      impact: 'May cause thermal throttling in 2-4 hours',
      actions: [
        { label: 'Simulate Fix', type: 'simulate' },
        { label: 'Apply Fix', type: 'apply' },
      ],
    });
  }
  
  // Cooling insights
  if (facility.cooling.kpis.coolingEfficiencyIndex < 75) {
    insights.push({
      id: 'cooling-imbalance',
      domain: 'cooling',
      icon: <Wind className="h-4 w-4 text-info" />,
      severity: 'warning',
      title: 'Zone B airflow imbalance detected',
      description: 'Cooling Zone C imbalance causing 9% increased energy spend.',
      impact: 'Suggested action: increase CRAC B fan speed by 8%',
      actions: [
        { label: 'Simulate Fix', type: 'simulate' },
        { label: 'Adjust Setpoint', type: 'apply' },
      ],
    });
  }
  
  // Power insights
  if (facility.powerUps.kpis.upsHealthIndex < 85) {
    insights.push({
      id: 'ups-degradation',
      domain: 'power',
      icon: <Zap className="h-4 w-4 text-warning" />,
      severity: 'critical',
      title: 'UPS redundancy degrading — N+1 at risk',
      description: 'Battery resistance increasing on UPS Bank B. Schedule maintenance.',
      impact: 'Risk of losing N+1 redundancy within 72 hours',
      actions: [
        { label: 'Schedule Maintenance', type: 'apply' },
        { label: 'View Details', type: 'simulate' },
      ],
    });
  }
  
  // Workload insights
  if (facility.workloadGpu.kpis.avgGpuUtilization < 65) {
    insights.push({
      id: 'gpu-underutilization',
      domain: 'workload',
      icon: <Cpu className="h-4 w-4 text-accent" />,
      severity: 'info',
      title: 'GPU cluster underutilization detected',
      description: 'Cluster A running at 58% capacity. Consider consolidating workloads.',
      impact: 'Potential savings of $2,400/day with workload consolidation',
      actions: [
        { label: 'Optimize Placement', type: 'apply' },
        { label: 'Simulate Migration', type: 'simulate' },
      ],
    });
  }
  
  // Sovereignty insights
  if (facility.sovereignty.kpis.sovereigntyRiskScore > 5) {
    insights.push({
      id: 'sovereignty-drift',
      domain: 'sovereignty',
      icon: <Globe className="h-4 w-4 text-primary" />,
      severity: 'warning',
      title: 'Sovereignty compliance drift detected',
      description: '3 data flows routed through US-East region. Policy violation.',
      impact: 'Compliance score dropped 4% in last 24 hours',
      actions: [
        { label: 'Reroute Flows', type: 'apply' },
        { label: 'View Flows', type: 'simulate' },
      ],
    });
  }
  
  // Carbon insights
  insights.push({
    id: 'carbon-forecast',
    domain: 'carbon',
    icon: <Leaf className="h-4 w-4 text-success" />,
    severity: 'info',
    title: 'Projected carbon cost increase over next 6 hours',
    description: 'Grid carbon intensity expected to rise during peak hours.',
    impact: 'Shift flexible workloads to off-peak for 12% carbon reduction',
    actions: [
      { label: 'Simulate Shift', type: 'simulate' },
      { label: 'Apply Schedule', type: 'apply' },
    ],
  });
  
  return insights;
}

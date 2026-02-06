/**
 * Compact AI Insights Panel - Max 3 insights with view all link
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Brain, Lightbulb, AlertTriangle, PlayCircle, CheckCircle,
  Thermometer, Zap, Wind, Cpu, Globe, Leaf, ChevronRight
} from 'lucide-react';
import { CollapsibleSection } from '@/components/shared/CollapsibleSection';
import type { DataCentreFacility } from '@/types/dataCenterTwin';
import { cn } from '@/lib/utils';

interface CompactAIInsightsPanelProps {
  facility: DataCentreFacility;
  maxVisible?: number;
  onApplyFix?: (insightId: string) => void;
  onSimulateFix?: (insightId: string) => void;
  onViewAllInsights?: () => void;
}

interface Insight {
  id: string;
  domain: string;
  icon: React.ReactNode;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  impact?: string;
}

export function CompactAIInsightsPanel({ 
  facility, 
  maxVisible = 3,
  onApplyFix, 
  onSimulateFix,
  onViewAllInsights
}: CompactAIInsightsPanelProps) {
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());
  
  const insights: Insight[] = generateInsights(facility);
  const activeInsights = insights.filter(i => !dismissedInsights.has(i.id));
  const visibleInsights = activeInsights.slice(0, maxVisible);
  const hasMore = activeInsights.length > maxVisible;
  
  const handleDismiss = (id: string) => {
    setDismissedInsights(prev => new Set([...prev, id]));
  };
  
  const domainColors: Record<string, string> = {
    thermal: 'bg-destructive/10 text-destructive border-destructive/20',
    power: 'bg-warning/10 text-warning border-warning/20',
    cooling: 'bg-info/10 text-info border-info/20',
    workload: 'bg-accent/10 text-accent border-accent/20',
    sovereignty: 'bg-accent/10 text-accent border-accent/20',
    carbon: 'bg-success/10 text-success border-success/20',
  };
  
  return (
    <CollapsibleSection
      title="AI Insights & Recommendations"
      badge={`${activeInsights.length} active`}
      defaultOpen={true}
      icon={<Brain className="h-4 w-4 text-accent" />}
    >
      {activeInsights.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
          <div className="p-2.5 rounded-full bg-success/10 mb-2">
            <CheckCircle className="h-5 w-5 text-success" />
          </div>
          <p className="text-xs font-medium">All systems optimized</p>
          <p className="text-[10px]">No actionable insights</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleInsights.map((insight) => (
            <Card key={insight.id} className="bg-card border-border overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <div className="p-1.5 rounded-lg bg-accent/10 shrink-0">
                    {insight.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <Badge variant="outline" className={cn('text-[10px]', domainColors[insight.domain])}>
                        {insight.domain}
                      </Badge>
                      {insight.severity !== 'info' && (
                        <Badge 
                          variant={insight.severity === 'critical' ? 'destructive' : 'outline'}
                          className={cn('text-[10px]', insight.severity === 'warning' && 'bg-warning/10 text-warning border-warning/30')}
                        >
                          {insight.severity}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-xs font-medium truncate">{insight.title}</p>
                    
                    {insight.impact && (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                        <Lightbulb className="h-2.5 w-2.5 text-warning shrink-0" />
                        <span className="truncate">{insight.impact}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1.5 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] gap-1"
                        onClick={() => onSimulateFix?.(insight.id)}
                      >
                        <PlayCircle className="h-2.5 w-2.5" />
                        Simulate
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="h-6 text-[10px] gap-1"
                        onClick={() => onApplyFix?.(insight.id)}
                      >
                        <CheckCircle className="h-2.5 w-2.5" />
                        Apply
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] text-muted-foreground"
                        onClick={() => handleDismiss(insight.id)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground gap-1"
              onClick={onViewAllInsights}
            >
              View all {activeInsights.length} insights
              <ChevronRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </CollapsibleSection>
  );
}

function generateInsights(facility: DataCentreFacility): Insight[] {
  const insights: Insight[] = [];
  
  if (facility.thermalHardware.kpis.hotspotRiskProbability > 15) {
    insights.push({
      id: 'thermal-hotspot-risk',
      domain: 'thermal',
      icon: <Thermometer className="h-3.5 w-3.5 text-destructive" />,
      severity: 'warning',
      title: 'GPU cluster showing rising heat',
      description: 'Rack R17 showing rising ΔT trend',
      impact: 'May cause throttling in 2-4 hours',
    });
  }
  
  if (facility.cooling.kpis.coolingEfficiencyIndex < 75) {
    insights.push({
      id: 'cooling-imbalance',
      domain: 'cooling',
      icon: <Wind className="h-3.5 w-3.5 text-info" />,
      severity: 'warning',
      title: 'Zone B airflow imbalance',
      description: 'Cooling zone imbalance detected',
      impact: 'Increase CRAC B fan speed by 8%',
    });
  }
  
  if (facility.powerUps.kpis.upsHealthIndex < 85) {
    insights.push({
      id: 'ups-degradation',
      domain: 'power',
      icon: <Zap className="h-3.5 w-3.5 text-warning" />,
      severity: 'critical',
      title: 'UPS redundancy degrading',
      description: 'Battery resistance increasing on UPS Bank B',
      impact: 'Risk of losing N+1 redundancy',
    });
  }
  
  if (facility.sovereignty.kpis.sovereigntyRiskScore > 5) {
    insights.push({
      id: 'sovereignty-drift',
      domain: 'sovereignty',
      icon: <Globe className="h-3.5 w-3.5 text-accent" />,
      severity: 'warning',
      title: 'Sovereignty compliance drift',
      description: '3 data flows routed through US-East',
      impact: 'Compliance score dropped 4%',
    });
  }
  
  insights.push({
    id: 'carbon-forecast',
    domain: 'carbon',
    icon: <Leaf className="h-3.5 w-3.5 text-success" />,
    severity: 'info',
    title: 'Carbon cost increase forecast',
    description: 'Grid carbon intensity expected to rise',
    impact: 'Shift workloads for 12% reduction',
  });
  
  return insights;
}

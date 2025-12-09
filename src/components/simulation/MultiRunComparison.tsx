/**
 * Multi-Run Comparison Panel
 * Displays comparative analysis across multiple simulation runs
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, TrendingUp, TrendingDown, Minus, 
  Activity, Target, ChevronDown
} from 'lucide-react';
import { 
  type SimulationSummary, 
  type MultiRunComparison as MultiRunComparisonType,
  compareMultipleRuns,
  SOVEREIGN_DC_KPI_GROUPS
} from '@/twins/sovereignDataCenter/enhancedSimulationEngine';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';

interface MultiRunComparisonProps {
  runHistory: SimulationSummary[];
  maxDisplayRuns?: number;
}

const trendConfig = {
  improving: { icon: TrendingUp, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  degrading: { icon: TrendingDown, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  stable: { icon: Minus, color: 'text-muted-foreground', bgColor: 'bg-muted' },
};

export function MultiRunComparison({ 
  runHistory,
  maxDisplayRuns = 5 
}: MultiRunComparisonProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['composite']);

  if (runHistory.length < 2) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground">
            Run the simulation multiple times to see comparative analysis
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {runHistory.length}/2 runs completed
          </p>
        </CardContent>
      </Card>
    );
  }

  const comparison = compareMultipleRuns(runHistory.slice(-maxDisplayRuns));
  if (!comparison) return null;

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  // Get KPI details for display
  const getKPIDetails = (key: string) => {
    for (const group of SOVEREIGN_DC_KPI_GROUPS) {
      const kpi = group.kpis.find(k => k.key === key);
      if (kpi) return { kpi, groupId: group.id, groupName: group.name };
    }
    return null;
  };

  // Group KPIs by category
  const groupedKpis: Record<string, Array<{ key: string; avgDelta: number; variance: number; trend: string }>> = {};
  
  Object.entries(comparison.kpiAverages).forEach(([key, avgDelta]) => {
    const details = getKPIDetails(key);
    if (details) {
      if (!groupedKpis[details.groupId]) {
        groupedKpis[details.groupId] = [];
      }
      groupedKpis[details.groupId].push({
        key,
        avgDelta,
        variance: comparison.kpiVariance[key] || 0,
        trend: comparison.trends[key] || 'stable'
      });
    }
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Multi-Run Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Comparing {comparison.runIds.length} simulation runs
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {Math.round(comparison.consistencyScore)}% Consistent
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {comparison.scenario.name}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Overview Stats */}
        <div className="grid grid-cols-3 gap-3 pb-3 border-b">
          <div className="text-center p-3 rounded-lg bg-green-500/10">
            <div className="text-xl font-bold text-green-500">
              {Object.values(comparison.trends).filter(t => t === 'improving').length}
            </div>
            <div className="text-xs text-muted-foreground">Improving</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted">
            <div className="text-xl font-bold">
              {Object.values(comparison.trends).filter(t => t === 'stable').length}
            </div>
            <div className="text-xs text-muted-foreground">Stable</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-red-500/10">
            <div className="text-xl font-bold text-red-500">
              {Object.values(comparison.trends).filter(t => t === 'degrading').length}
            </div>
            <div className="text-xs text-muted-foreground">Degrading</div>
          </div>
        </div>

        {/* KPI Groups */}
        {SOVEREIGN_DC_KPI_GROUPS.map(group => {
          const groupData = groupedKpis[group.id];
          if (!groupData || groupData.length === 0) return null;

          const isExpanded = expandedGroups.includes(group.id);
          const improvingCount = groupData.filter(k => k.trend === 'improving').length;
          const degradingCount = groupData.filter(k => k.trend === 'degrading').length;

          return (
            <Collapsible 
              key={group.id} 
              open={isExpanded}
              onOpenChange={() => toggleGroup(group.id)}
            >
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{group.name}</span>
                    <div className="flex items-center gap-1">
                      {improvingCount > 0 && (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-500 text-xs">
                          {improvingCount} ↑
                        </Badge>
                      )}
                      {degradingCount > 0 && (
                        <Badge variant="secondary" className="bg-red-500/10 text-red-500 text-xs">
                          {degradingCount} ↓
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ChevronDown className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    isExpanded && 'rotate-180'
                  )} />
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="pl-10 pr-3 pb-3 space-y-2">
                  {groupData.map(({ key, avgDelta, variance, trend }) => {
                    const details = getKPIDetails(key);
                    if (!details) return null;

                    const { kpi } = details;
                    const TrendIcon = trendConfig[trend as keyof typeof trendConfig]?.icon || Minus;
                    const trendColor = trendConfig[trend as keyof typeof trendConfig]?.color || 'text-muted-foreground';

                    return (
                      <div 
                        key={key}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/30"
                      >
                        <div className="flex items-center gap-2">
                          <TrendIcon className={cn('h-3.5 w-3.5', trendColor)} />
                          <span className="text-sm">{kpi.label}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className={cn(
                            'font-mono',
                            avgDelta > 0 ? 'text-green-500' : avgDelta < 0 ? 'text-red-500' : 'text-muted-foreground'
                          )}>
                            {avgDelta > 0 ? '+' : ''}{avgDelta.toFixed(2)}{kpi.unit}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ±{Math.sqrt(variance).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}

        {/* Run History */}
        <div className="pt-3 border-t">
          <h4 className="text-sm font-medium mb-2">Recent Runs</h4>
          <div className="space-y-1">
            {runHistory.slice(-maxDisplayRuns).reverse().map((run, idx) => (
              <div 
                key={run.runId}
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">
                    {runHistory.length - idx}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(run.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <Badge 
                  variant="secondary"
                  className={cn(
                    'text-xs',
                    run.overallImpact === 'positive' ? 'bg-green-500/10 text-green-500' :
                    run.overallImpact === 'negative' ? 'bg-red-500/10 text-red-500' :
                    'bg-muted'
                  )}
                >
                  {run.overallImpact}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

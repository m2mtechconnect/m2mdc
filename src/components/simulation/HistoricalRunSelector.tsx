import React from 'react';
import { useHistoricalSimulationRuns } from '@/hooks/useHistoricalSimulationRuns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { History, RefreshCw, Play, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface HistoricalRunSelectorProps {
  onSelectRun?: (runId: string) => void;
  selectedRunId?: string;
  maxHeight?: string;
  limit?: number;
}

export const HistoricalRunSelector: React.FC<HistoricalRunSelectorProps> = ({
  onSelectRun,
  selectedRunId,
  maxHeight = '400px',
  limit = 20
}) => {
  const { runs, isLoading, error, refetch } = useHistoricalSimulationRuns({ limit });

  // Calculate KPI deltas for a run
  const getKpiDeltas = (run: typeof runs[0]) => {
    const deltas: Record<string, number> = {};
    Object.keys(run.finalKpis).forEach(kpiId => {
      const baseline = run.baselineKpis[kpiId] || 0;
      const final = run.finalKpis[kpiId] || 0;
      if (baseline !== 0) {
        deltas[kpiId] = ((final - baseline) / Math.abs(baseline)) * 100;
      }
    });
    return deltas;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" />
            Historical Runs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" />
            Historical Runs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-destructive">{error}</div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (runs.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" />
            Historical Runs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-4">
            No completed simulation runs yet.
            <br />
            Run a simulation to see history here.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4" />
          Historical Runs ({runs.length})
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea style={{ maxHeight }}>
          <div className="space-y-1 p-3 pt-0">
            {runs.map((run) => {
              const isSelected = selectedRunId === run.id;
              const kpiDeltas = getKpiDeltas(run);
              const hasImprovement = run.overallImpactScore > 0;
              
              return (
                <div
                  key={run.id}
                  className={`p-3 rounded-md border cursor-pointer transition-colors ${
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                  onClick={() => onSelectRun?.(run.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Play className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium truncate">
                          {run.scenarioName || run.scenarioId}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(run.createdAt, { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant={hasImprovement ? 'default' : 'secondary'} className="text-xs">
                        {hasImprovement ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {hasImprovement ? 'Improved' : 'Degraded'}
                      </Badge>
                    </div>
                  </div>
                  
                  {Object.keys(kpiDeltas).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.entries(kpiDeltas).slice(0, 3).map(([kpi, delta]) => (
                        <Badge key={kpi} variant="outline" className="text-xs">
                          {kpi}: {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                        </Badge>
                      ))}
                      {Object.keys(kpiDeltas).length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{Object.keys(kpiDeltas).length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default HistoricalRunSelector;

/**
 * Simulation KPI Card Component
 * Displays baseline vs simulated KPI comparison with visual delta
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SimulationKPI } from '@/lib/simulationTemplates';
import { isLowerBetterMetric, kpiTrendTone, KPI_TREND_TEXT_CLASS } from '@/components/kpi/kpiSemantics';

interface SimulationKPICardProps {
  kpi: SimulationKPI;
  isSampleData?: boolean;
}

export function SimulationKPICard({ kpi, isSampleData = false }: SimulationKPICardProps) {
  const delta = kpi.simulated - kpi.baseline;
  const percentChange = kpi.baseline !== 0 
    ? Math.round((delta / kpi.baseline) * 100) 
    : delta > 0 ? 100 : 0;
  
  // Direction of improvement comes from the shared KPI semantics module.
  const trendTone = kpiTrendTone(delta, { lowerIsBetter: isLowerBetterMetric(kpi.code) });
  const isImprovement = trendTone === 'improving';
  const displayDelta = Math.abs(delta);
  const displayPercent = Math.abs(percentChange);

  return (
    <Card className="relative overflow-hidden">
      {isSampleData && (
        <Badge 
          variant="secondary" 
          className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground"
        >
          Sample
        </Badge>
      )}
      <CardContent className="p-4">
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground leading-tight pr-12">
            {kpi.label}
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Before Twin</span>
              <p className="text-lg font-semibold text-muted-foreground">
                {kpi.baseline.toLocaleString()}{kpi.unit === '%' || kpi.unit === 'x/year' ? kpi.unit : ` ${kpi.unit}`}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">With Twin</span>
              <p className="text-lg font-semibold text-foreground">
                {kpi.simulated.toLocaleString()}{kpi.unit === '%' || kpi.unit === 'x/year' ? kpi.unit : ` ${kpi.unit}`}
              </p>
            </div>
          </div>

          <div className={cn(
            "flex items-center gap-1.5 text-sm font-medium",
            KPI_TREND_TEXT_CLASS[trendTone]
          )}>
            {delta > 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : delta < 0 ? (
              <TrendingDown className="h-4 w-4" />
            ) : (
              <Minus className="h-4 w-4" />
            )}
            <span>
              {delta === 0 ? 'No change' : (
                <>
                  {delta > 0 ? '+' : '-'}
                  {displayDelta.toLocaleString()}{kpi.unit === '%' ? 'pp' : ` ${kpi.unit}`}
                  {displayPercent > 0 && ` (${delta > 0 ? '+' : '-'}${displayPercent}%)`}
                </>
              )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

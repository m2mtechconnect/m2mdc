import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPI {
  name?: string;
  label?: string;
  unit?: string;
  target?: string;
  direction?: 'higher' | 'lower';
  current_value?: number;
  target_value?: number;
}

interface KPIMetricCardsProps {
  kpis: (KPI | string)[];
}

export function KPIMetricCards({ kpis }: KPIMetricCardsProps) {
  if (!kpis || kpis.length === 0) {
    return null;
  }
  
  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="text-xl font-semibold mb-4 text-foreground">KPIs Improved</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {kpis.map((kpi: KPI | string, idx: number) => {
          // Handle both object and string formats
          const kpiData: KPI = typeof kpi === 'string' 
            ? { name: kpi } 
            : kpi;
          
          const kpiName = kpiData.label || kpiData.name || 'KPI';
          const unit = kpiData.unit || '';
          const target = kpiData.target || '';
          const direction = kpiData.direction;
          const currentValue = kpiData.current_value;
          const targetValue = kpiData.target_value;
          
          // Calculate progress if we have both values
          const progress = currentValue && targetValue 
            ? Math.min((currentValue / targetValue) * 100, 100)
            : null;
          
          return (
            <Card key={idx} className="p-4 bg-card border-border border-l-4 border-l-primary/50">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-base mb-1">{kpiName}</p>
                    {unit && (
                      <p className="text-xs text-muted-foreground">Unit: {unit}</p>
                    )}
                  </div>
                  {direction && (
                    <Badge 
                      variant="outline" 
                      className="text-xs shrink-0"
                    >
                      {direction === 'higher' ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {direction === 'higher' ? 'Higher' : 'Lower'} is better
                    </Badge>
                  )}
                </div>
                
                {target && (
                  <p className="text-sm text-muted-foreground">
                    Target: <span className="font-medium text-foreground">{target}</span>
                  </p>
                )}
                
                {/* Mini progress bar */}
                {progress !== null && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium text-foreground">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
}

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { ProvenanceBadge } from '@/components/provenance/ProvenanceBadge';
import type { DataProvenance } from '@/lib/provenance/types';

interface KPI {
  name?: string;
  label?: string;
  unit?: string;
  target?: string;
  direction?: 'higher' | 'lower';
  current_value?: number;
  target_value?: number;
  /** Optional metric-level provenance for the current_value field. */
  current_provenance?: DataProvenance;
  /** Optional metric-level provenance for the target field (defaults to static). */
  target_provenance?: DataProvenance;
  /** Source identifier for the current_value observation. */
  source?: string;
}

interface KPIMetricCardsProps {
  kpis: (KPI | string)[];
}

// Industry-reference default KPIs for the demo data-centre template.
// Phase 1A.1 §2: current_value fields are DEMONSTRATION fixtures, not
// measured values — every card renders a `demo` provenance badge so users
// are never misled. Target values render a `static` badge.
const DEFAULT_DC_KPIS: KPI[] = [
  {
    name: 'Power Usage Effectiveness (PUE)',
    unit: 'ratio',
    target: '1.20 - 1.25',
    direction: 'lower',
    current_value: 1.25,
    target_value: 1.20,
    current_provenance: 'demo',
    target_provenance: 'static',
    source: 'template-fixture',
  },
  {
    name: 'Carbon Intensity',
    unit: 'gCO₂/kWh',
    target: '< 35 (Quebec Hydro)',
    direction: 'lower',
    current_value: 28,
    target_value: 20,
    current_provenance: 'demo',
    target_provenance: 'static',
    source: 'template-fixture',
  },
  {
    name: 'GPU Utilization',
    unit: '%',
    target: '70% - 85%',
    direction: 'higher',
    current_value: 76,
    target_value: 85,
    current_provenance: 'demo',
    target_provenance: 'static',
    source: 'template-fixture',
  },
  {
    name: 'Sovereign Compute Ratio',
    unit: '%',
    target: '100% (PIPEDA applicable)',
    direction: 'higher',
    current_value: 97,
    target_value: 100,
    current_provenance: 'demo',
    target_provenance: 'static',
    source: 'template-fixture',
  },
  {
    name: 'Renewable Energy Mix',
    unit: '%',
    target: '> 95%',
    direction: 'higher',
    current_value: 98,
    target_value: 100,
    current_provenance: 'demo',
    target_provenance: 'static',
    source: 'template-fixture',
  },
  {
    name: 'Thermal Stability Score',
    unit: 'score',
    target: '> 90 (ASHRAE A1)',
    direction: 'higher',
    current_value: 92,
    target_value: 95,
    current_provenance: 'demo',
    target_provenance: 'static',
    source: 'template-fixture',
  },
];

export function KPIMetricCards({ kpis }: KPIMetricCardsProps) {
  // Use industry defaults if no KPIs provided
  const displayKpis = kpis && kpis.length > 0 ? kpis : DEFAULT_DC_KPIS;
  
  if (displayKpis.length === 0) {
    return null;
  }
  
  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="text-xl font-semibold mb-4 text-foreground">KPIs Improved</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayKpis.map((kpi: KPI | string, idx: number) => {
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
          // Phase 1A.1 §2: never default to `live` — missing provenance
          // means the caller did not source the value, which we treat as
          // demo when a value is present and unavailable when it is not.
          const currentProvenance: DataProvenance = kpiData.current_provenance
            ?? (currentValue !== undefined ? 'demo' : 'unavailable');
          const targetProvenance: DataProvenance = kpiData.target_provenance ?? 'static';
          const source = kpiData.source ?? 'template-fixture';
          
          // Calculate progress if we have both values
          const progress = currentValue && targetValue 
            ? Math.min((currentValue / targetValue) * 100, 100)
            : null;
          const testId = (kpiData.label || kpiData.name || `kpi-${idx}`)
            .toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          
          return (
            <Card
              key={idx}
              className="p-4 bg-card border-border border-l-4 border-l-primary/50"
              data-testid={`kpi-metric-${testId}`}
              data-provenance={currentProvenance}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-base mb-1">{kpiName}</p>
                    {unit && (
                      <p className="text-xs text-muted-foreground">Unit: {unit}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <ProvenanceBadge
                      meta={{ provenance: currentProvenance, source }}
                      compact
                    />
                    {direction && (
                      <Badge variant="outline" className="text-xs">
                        {direction === 'higher' ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {direction === 'higher' ? 'Higher' : 'Lower'} is better
                      </Badge>
                    )}
                  </div>
                </div>
                
                {target && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Target: <span className="font-medium text-foreground">{target}</span></span>
                    <ProvenanceBadge
                      meta={{ provenance: targetProvenance, source: 'user-config' }}
                      compact
                    />
                  </div>
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

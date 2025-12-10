/**
 * KPI Threshold Editor
 * Allows customers to edit KPI targets and thresholds
 */

import { useState } from 'react';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Target, AlertTriangle, AlertCircle, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { DCKPIConfig } from '@/types/dcTwinBuilder';

interface KPIThresholdEditorProps {
  kpi: DCKPIConfig;
  onUpdate: (kpiId: string, updates: Partial<DCKPIConfig>) => void;
}

export function KPIThresholdEditor({ kpi, onUpdate }: KPIThresholdEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const isLowerBetter = kpi.direction === 'lower_is_better';
  const DirectionIcon = isLowerBetter ? TrendingDown : TrendingUp;
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border p-3 transition-colors hover:bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{kpi.name}</span>
              <Badge variant="outline" className="text-xs">{kpi.unit}</Badge>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="inline-flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted h-4 w-4 text-xs">
                    <DirectionIcon className={`h-3 w-3 ${isLowerBetter ? 'text-success' : 'text-info'}`} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="font-medium">{isLowerBetter ? 'Lower is better' : 'Higher is better'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isLowerBetter 
                      ? 'Set your target below your current average. Reducing this metric improves performance.'
                      : 'Set your target above your current baseline. Increasing this metric improves performance.'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{kpi.description}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono">{kpi.target}{kpi.unit === '%' ? '%' : ` ${kpi.unit}`}</span>
            </div>
            
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>
        
        <CollapsibleContent className="mt-4">
          <div className="grid gap-4 md:grid-cols-3 pt-3 border-t">
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <Target className="h-3 w-3 text-primary" />
                Target Value
              </Label>
              <Input
                type="number"
                step={kpi.unit === '%' ? 1 : 0.1}
                value={kpi.target}
                onChange={(e) => onUpdate(kpi.id, { target: parseFloat(e.target.value) || 0 })}
                className="h-8 text-sm"
              />
              <p className="text-xs text-muted-foreground">Your ideal goal</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 text-warning" />
                Warning Threshold
              </Label>
              <Input
                type="number"
                step={kpi.unit === '%' ? 1 : 0.1}
                value={kpi.warningThreshold}
                onChange={(e) => onUpdate(kpi.id, { warningThreshold: parseFloat(e.target.value) || 0 })}
                className="h-8 text-sm"
              />
              <p className="text-xs text-muted-foreground">Triggers warnings</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3 text-destructive" />
                Critical Threshold
              </Label>
              <Input
                type="number"
                step={kpi.unit === '%' ? 1 : 0.1}
                value={kpi.criticalThreshold}
                onChange={(e) => onUpdate(kpi.id, { criticalThreshold: parseFloat(e.target.value) || 0 })}
                className="h-8 text-sm"
              />
              <p className="text-xs text-muted-foreground">Triggers alerts</p>
            </div>
          </div>
          
          <div className="mt-3 p-2 rounded bg-muted/50">
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              {isLowerBetter 
                ? `Values above ${kpi.warningThreshold}${kpi.unit === '%' ? '%' : ''} trigger warnings, above ${kpi.criticalThreshold}${kpi.unit === '%' ? '%' : ''} trigger critical alerts.`
                : `Values below ${kpi.warningThreshold}${kpi.unit === '%' ? '%' : ''} trigger warnings, below ${kpi.criticalThreshold}${kpi.unit === '%' ? '%' : ''} trigger critical alerts.`
              }
            </p>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// Full KPI Grid with threshold editing
export function KPIThresholdGrid() {
  const { kpis, updateKPIs, toggleKPI } = useDCTwinBuilderStore();
  
  const handleUpdateKPI = (kpiId: string, updates: Partial<DCKPIConfig>) => {
    const updatedKpis = kpis.map((k) =>
      k.id === kpiId ? { ...k, ...updates } : k
    );
    updateKPIs(updatedKpis);
  };

  // Group by domain
  const groupedKPIs = kpis.reduce((acc, kpi) => {
    const domain = kpi.domain || 'general';
    if (!acc[domain]) acc[domain] = [];
    acc[domain].push(kpi);
    return acc;
  }, {} as Record<string, DCKPIConfig[]>);

  const enabledCount = kpis.filter(k => k.enabled).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {enabledCount} of {kpis.length} KPIs enabled • Click to expand and edit thresholds
        </p>
      </div>
      
      {Object.entries(groupedKPIs).map(([domain, domainKPIs]) => (
        <div key={domain} className="space-y-2">
          <h4 className="text-sm font-medium capitalize flex items-center gap-2">
            {domain} KPIs
            <Badge variant="secondary" className="text-xs">
              {domainKPIs.filter(k => k.enabled).length}/{domainKPIs.length}
            </Badge>
          </h4>
          <div className="space-y-2">
            {domainKPIs.filter(k => k.enabled).map((kpi) => (
              <KPIThresholdEditor
                key={kpi.id}
                kpi={kpi}
                onUpdate={handleUpdateKPI}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

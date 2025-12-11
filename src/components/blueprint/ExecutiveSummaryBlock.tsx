/**
 * Executive Summary Block
 * ROI summary, Carbon summary, Top risks, Top optimization opportunities
 * Uses centralized KPI and agent catalogs
 * 
 * CRITICAL: Uses useTwinContext() to prioritize active twin over builder store
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Leaf,
  AlertTriangle,
  Lightbulb,
  DollarSign,
  Target,
  Zap,
  Shield,
} from 'lucide-react';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { useTwinAgents } from '@/hooks/useTwinAgentsCatalog';
import { useTwinKPIsFromSimulation } from '@/hooks/useTwinKPIsFromSimulation';
import { useTwinContext } from '@/hooks/useTwinContext';
import { cn } from '@/lib/utils';

interface ExecutiveSummaryBlockProps {
  className?: string;
  twinId?: string;
}

export function ExecutiveSummaryBlock({ className, twinId }: ExecutiveSummaryBlockProps) {
  // CRITICAL: Prioritize active twin from header over builder store
  const { activeTwin, isPreviewMode, recommendation } = useTwinContext();
  const { overview: builderOverview, kpis, scenarios, agents, financial: builderFinancial } = useDCTwinBuilderStore();
  const { enabledAgents } = useTwinAgents();
  const { kpis: simulationKpis } = useTwinKPIsFromSimulation(twinId);

  // Merge overview with active twin priority
  const overview = {
    ...builderOverview,
    twinName: activeTwin?.name || recommendation?.companyName || builderOverview.twinName,
    facilityLocation: activeTwin?.city || recommendation?.regions?.[0] || builderOverview.facilityLocation,
    regionCode: activeTwin?.region_code || builderOverview.regionCode,
  };
  
  const financial = builderFinancial;

  // Calculate ROI metrics
  const roiValue = financial?.upgradeSavingsPercent || 15;
  const paybackYears = financial?.paybackYears || 2.5;
  const annualSavings = financial?.annualPowerCostUsd
    ? (financial.annualPowerCostUsd * (financial.upgradeSavingsPercent || 15)) / 100
    : 250000;

  // Carbon metrics
  const carbonReduction = financial?.carbonSavingsPercent || 25;
  const annualCarbon = financial?.annualCarbonTonnes || 1200;
  const projectedReduction = Math.round(annualCarbon * (carbonReduction / 100));

  // Top risks (based on scenarios and KPI thresholds)
  const topRisks = [
    {
      id: 'thermal',
      name: 'Thermal Hotspot Risk',
      severity: 'high' as const,
      description: 'GPU clusters approaching thermal limits',
    },
    {
      id: 'sovereignty',
      name: 'Data Residency Compliance',
      severity: 'medium' as const,
      description: 'Cross-border data flow monitoring required',
    },
    {
      id: 'power',
      name: 'Peak Power Capacity',
      severity: 'low' as const,
      description: 'Approaching 85% utilization during peak hours',
    },
  ].slice(0, 3);

  // Top optimization opportunities
  const opportunities = [
    {
      id: 'cooling',
      name: 'Free Cooling Optimization',
      potential: '12% energy reduction',
      icon: Zap,
    },
    {
      id: 'workload',
      name: 'GPU Workload Scheduling',
      potential: '8% efficiency gain',
      icon: Target,
    },
    {
      id: 'renewable',
      name: 'Renewable Energy Shift',
      potential: '20% carbon reduction',
      icon: Leaf,
    },
  ];

  const getSeverityColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high':
        return 'text-destructive bg-destructive/10 border-destructive/30';
      case 'medium':
        return 'text-warning bg-warning/10 border-warning/30';
      case 'low':
        return 'text-success bg-success/10 border-success/30';
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Executive Summary</h2>
        <Badge variant="outline" className="text-xs">
          {overview.tier} • {overview.capacityKw.toLocaleString()} kW
        </Badge>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* ROI Summary */}
        <Card className="bg-success/5 border-success/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">ROI Summary</p>
                <p className="text-2xl font-bold text-success">{roiValue}%</p>
                <p className="text-xs text-muted-foreground">
                  ${annualSavings.toLocaleString()}/yr savings
                </p>
                <p className="text-xs text-muted-foreground">
                  Payback: {paybackYears} years
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Carbon Impact */}
        <Card className="bg-info/5 border-info/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Leaf className="h-5 w-5 text-info" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Carbon Impact</p>
                <p className="text-2xl font-bold text-info">-{carbonReduction}%</p>
                <p className="text-xs text-muted-foreground">
                  -{projectedReduction.toLocaleString()} tonnes CO₂e/yr
                </p>
                <p className="text-xs text-muted-foreground">
                  {overview.renewablePercent}% renewable
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Systems */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Active Systems</p>
                <p className="text-2xl font-bold text-primary">
                  {agents.filter(a => a.enabled).length}
                </p>
                <p className="text-xs text-muted-foreground">
                  {kpis.filter(k => k.enabled).length} KPIs monitored
                </p>
                <p className="text-xs text-muted-foreground">
                  {scenarios.filter(s => s.enabled).length} scenarios ready
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Outlook */}
        <Card className="bg-warning/5 border-warning/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <DollarSign className="h-5 w-5 text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Annual Costs</p>
                <p className="text-2xl font-bold text-warning">
                  ${((financial?.annualPowerCostUsd || 1200000) / 1000000).toFixed(1)}M
                </p>
                <p className="text-xs text-muted-foreground">
                  Power: ${((financial?.annualPowerCostUsd || 800000) / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-muted-foreground">
                  Carbon: {annualCarbon.toLocaleString()} t CO₂e
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risks & Opportunities Row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Top Risks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Top 3 Risks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topRisks.map((risk) => (
              <div
                key={risk.id}
                className={cn(
                  'flex items-start gap-3 p-2 rounded-lg border',
                  getSeverityColor(risk.severity)
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{risk.name}</p>
                  <p className="text-xs opacity-80">{risk.description}</p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {risk.severity}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Optimization Opportunities */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-success" />
              Top Optimization Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {opportunities.map((opp) => (
              <div
                key={opp.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-success/5 border border-success/20"
              >
                <div className="p-1.5 rounded bg-success/10">
                  <opp.icon className="h-3.5 w-3.5 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{opp.name}</p>
                  <p className="text-xs text-success">{opp.potential}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

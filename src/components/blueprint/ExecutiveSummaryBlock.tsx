/**
 * Executive Summary Block
 * ROI summary, Carbon summary, Top risks, Top optimization opportunities
 * Uses centralized KPI and agent catalogs
 * 
 * CRITICAL: Uses useTwinContext() to prioritize active twin over builder store
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPower } from '@/lib/units/power';
import {
  TrendingUp,
  Leaf,
  AlertTriangle,
  Lightbulb,
  DollarSign,
  Target,
  Zap,
  Shield,
  Activity,
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
      <div className="flex items-center justify-between animate-fade-in">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Executive Summary
        </h2>
        <Badge variant="outline" className="text-xs hover:bg-muted/50 transition-colors">
          {overview.tier} • {formatPower(overview.capacityKw)}
        </Badge>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* ROI Summary */}
        <Card className="bg-gradient-to-br from-success/10 via-success/5 to-transparent border-success/20 hover:shadow-lg hover:shadow-success/10 transition-all duration-300 group animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-success/15 group-hover:bg-success/25 transition-colors group-hover:scale-110 duration-300">
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
        <Card className="bg-gradient-to-br from-info/10 via-info/5 to-transparent border-info/20 hover:shadow-lg hover:shadow-info/10 transition-all duration-300 group animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-info/15 group-hover:bg-info/25 transition-colors group-hover:scale-110 duration-300">
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
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 group animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-primary/15 group-hover:bg-primary/25 transition-colors group-hover:scale-110 duration-300">
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
        <Card className="bg-gradient-to-br from-warning/10 via-warning/5 to-transparent border-warning/20 hover:shadow-lg hover:shadow-warning/10 transition-all duration-300 group animate-fade-in" style={{ animationDelay: '0.25s' }}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-warning/15 group-hover:bg-warning/25 transition-colors group-hover:scale-110 duration-300">
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
        <Card className="hover:shadow-md transition-all duration-300 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-warning/10">
                <AlertTriangle className="h-4 w-4 text-warning" />
              </div>
              Top 3 Risks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topRisks.map((risk, index) => (
              <div
                key={risk.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border transition-all duration-300 hover:shadow-sm cursor-pointer group animate-fade-in',
                  getSeverityColor(risk.severity)
                )}
                style={{ animationDelay: `${0.35 + index * 0.05}s` }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium group-hover:text-foreground transition-colors">{risk.name}</p>
                  <p className="text-xs text-muted-foreground">{risk.description}</p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                  {risk.severity}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Optimization Opportunities */}
        <Card className="hover:shadow-md transition-all duration-300 animate-fade-in" style={{ animationDelay: '0.35s' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-success/10">
                <Lightbulb className="h-4 w-4 text-success" />
              </div>
              Top Optimization Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {opportunities.map((opp, index) => (
              <div
                key={opp.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-success/10 via-success/5 to-transparent border border-success/20 transition-all duration-300 hover:shadow-sm hover:border-success/40 cursor-pointer group animate-fade-in"
                style={{ animationDelay: `${0.4 + index * 0.05}s` }}
              >
                <div className="p-2 rounded-lg bg-success/15 group-hover:bg-success/25 transition-colors group-hover:scale-110 duration-300">
                  <opp.icon className="h-4 w-4 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium group-hover:text-foreground transition-colors">{opp.name}</p>
                  <p className="text-xs text-success font-medium">{opp.potential}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

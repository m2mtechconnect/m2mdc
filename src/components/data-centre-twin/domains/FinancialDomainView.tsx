/**
 * Financial & Carbon Domain View
 * Powered by Carbon Engine and Financial Engine
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DollarSign, Leaf, TrendingUp, TrendingDown, Zap, BarChart3, Gauge, Activity } from 'lucide-react';
import type { DataCentreFacility } from '@/types/dataCenterTwin';
import { useCarbonEngine } from '@/hooks/useCarbonEngine';
import { useFinancialEngine } from '@/hooks/useFinancialEngine';

interface FinancialDomainViewProps {
  facility: DataCentreFacility;
}

export function FinancialDomainView({ facility }: FinancialDomainViewProps) {
  // Use engines for real metrics
  const { metrics: carbonMetrics, regionalFeed } = useCarbonEngine(facility);
  const { metrics: financialMetrics, assumptions } = useFinancialEngine(facility);
  
  return (
    <div className="space-y-6">
      {/* Top KPI Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Cost per GPU-hour"
          value={`$${financialMetrics.costPerGpuHour.toFixed(2)}`}
          status={financialMetrics.costPerGpuHour < 3 ? 'good' : financialMetrics.costPerGpuHour < 4.5 ? 'warning' : 'critical'}
          icon={DollarSign}
          subtitle="All-in cost"
        />
        <MetricCard
          title="Carbon Efficiency"
          value={`${carbonMetrics.carbonEfficiencyScore}%`}
          status={carbonMetrics.carbonEfficiencyScore > 70 ? 'good' : carbonMetrics.carbonEfficiencyScore > 50 ? 'warning' : 'critical'}
          icon={Leaf}
          subtitle={`${carbonMetrics.carbonPerGpuHour} g/GPU-hr`}
        />
        <MetricCard
          title="Financial Health"
          value={`${financialMetrics.financialHealthScore}/100`}
          status={financialMetrics.financialHealthScore > 70 ? 'good' : financialMetrics.financialHealthScore > 50 ? 'warning' : 'critical'}
          icon={Gauge}
          subtitle={`ROI: ${financialMetrics.roiYears.toFixed(1)} years`}
        />
        <MetricCard
          title="Renewable Energy"
          value={`${facility.renewablePercent}%`}
          status={facility.renewablePercent > 70 ? 'good' : facility.renewablePercent > 40 ? 'warning' : 'critical'}
          icon={Zap}
          subtitle={`${regionalFeed.region} grid`}
        />
      </div>

      {/* Cost Breakdown & Carbon Impact */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              OPEX Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Daily</p>
                  <p className="text-xl font-bold">${(financialMetrics.opexPerDay / 1000).toFixed(0)}k</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Monthly</p>
                  <p className="text-xl font-bold">${(financialMetrics.opexPerMonth / 1000000).toFixed(1)}M</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Annual</p>
                  <p className="text-xl font-bold">${(financialMetrics.opexPerYear / 1000000).toFixed(0)}M</p>
                </div>
              </div>
              
              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span>Electricity ($/hr)</span>
                  <span className="font-medium">${financialMetrics.electricityCostPerHour.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Cooling ($/hr)</span>
                  <span className="font-medium">${financialMetrics.coolingCostPerHour.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Carbon Cost ($/hr)</span>
                  <span className="font-medium text-amber-600">${financialMetrics.carbonCostPerHour.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                  <span>Total OPEX ($/hr)</span>
                  <span>${financialMetrics.totalOpexPerHour.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Leaf className="h-4 w-4" />
              Carbon Footprint
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <p className="text-sm font-medium">Daily Emissions</p>
                  <p className="text-xs text-muted-foreground">Based on current load</p>
                </div>
                <p className="text-2xl font-bold">{carbonMetrics.dailyEmissionsKg.toLocaleString()} kg</p>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Carbon per GPU-hour</span>
                  <span className="font-medium">{carbonMetrics.carbonPerGpuHour} gCO₂</span>
                </div>
                <Progress 
                  value={Math.min((carbonMetrics.carbonPerGpuHour / 150) * 100, 100)} 
                  className="h-2" 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Baseline: 150 gCO₂/GPU-hr
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Carbon Price</p>
                  <p className="text-lg font-bold">${assumptions.carbonPricePerTon}/tonne</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Annual Carbon Cost</p>
                  <p className="text-lg font-bold">${(financialMetrics.carbonCostImpactPerYear / 1000).toFixed(0)}k</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <span>Carbon % of OPEX:</span>
                <Badge 
                  variant={financialMetrics.carbonCostPctOfOpex < 5 ? 'default' : 'destructive'}
                >
                  {financialMetrics.carbonCostPctOfOpex.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Energy Mix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Energy Mix & Grid Carbon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    Renewable
                  </span>
                  <span>{facility.renewablePercent}%</span>
                </div>
                <Progress value={facility.renewablePercent} className="h-3 bg-muted" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    Natural Gas / Grid
                  </span>
                  <span>{100 - facility.renewablePercent}%</span>
                </div>
                <Progress value={100 - facility.renewablePercent} className="h-3 bg-muted" />
              </div>
              
              <div className="pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span>Grid Carbon Intensity</span>
                  <Badge variant={regionalFeed.carbonIntensityGPerKwh < 50 ? 'default' : 'outline'}>
                    {regionalFeed.carbonIntensityGPerKwh} gCO₂/kWh
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Region: {regionalFeed.region} ({regionalFeed.renewablePercentage}% renewable grid)
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Renewable Target 2025</span>
                  <Badge variant="default">75%</Badge>
                </div>
                <Progress value={(facility.renewablePercent / 75) * 100} className="h-2 mt-2" />
              </div>
              
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between text-sm">
                  <span>Effective Carbon Intensity</span>
                  <span className="font-medium">{carbonMetrics.effectiveCarbonIntensity} gCO₂/kWh</span>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between text-sm">
                  <span>Annual Emissions Projection</span>
                  <span className="font-medium">{carbonMetrics.projectedAnnualEmissionsTons.toLocaleString()} tonnes</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Investment Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Investment Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground mb-1">NPV (10yr)</p>
              <p className={`text-2xl font-bold ${financialMetrics.npv > 0 ? 'text-green-500' : 'text-destructive'}`}>
                ${(financialMetrics.npv / 1000000).toFixed(1)}M
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground mb-1">IRR</p>
              <p className={`text-2xl font-bold ${financialMetrics.irr > 10 ? 'text-green-500' : 'text-amber-500'}`}>
                {financialMetrics.irr.toFixed(1)}%
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground mb-1">Payback Period</p>
              <p className={`text-2xl font-bold ${financialMetrics.roiYears < 5 ? 'text-green-500' : 'text-amber-500'}`}>
                {financialMetrics.roiYears.toFixed(1)} yrs
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground mb-1">Cost per MWh</p>
              <p className="text-2xl font-bold">${financialMetrics.costPerMwh.toFixed(0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  status: 'good' | 'warning' | 'critical';
  icon: React.ElementType;
  subtitle?: string;
}

function MetricCard({ title, value, status, icon: Icon, subtitle }: MetricCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'good': return 'text-green-500';
      case 'warning': return 'text-amber-500';
      case 'critical': return 'text-destructive';
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-muted ${getStatusColor()}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={`text-xl font-bold ${getStatusColor()}`}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

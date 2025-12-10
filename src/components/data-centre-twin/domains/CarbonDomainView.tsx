/**
 * Carbon Emissions Domain View
 * Dedicated view for carbon tracking, emissions monitoring, and sustainability metrics
 * Part of the 9-domain Data Centre Digital Twin
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Leaf, TrendingUp, TrendingDown, Zap, Globe, Target, Activity, BarChart3 } from 'lucide-react';
import type { DataCentreFacility } from '@/types/dataCenterTwin';
import { useCarbonEngine } from '@/hooks/useCarbonEngine';

interface CarbonDomainViewProps {
  facility: DataCentreFacility;
}

export function CarbonDomainView({ facility }: CarbonDomainViewProps) {
  const { metrics, regionalFeed, compareToRegion, calculateBudget } = useCarbonEngine(facility);
  
  // Calculate budget status (assuming 5000 tonnes annual budget, 180 days elapsed)
  const budgetStatus = calculateBudget(5000, 180);
  
  // Compare to Alberta (high carbon grid)
  const albertaComparison = compareToRegion('CA-AB');
  
  return (
    <div className="space-y-6">
      {/* Carbon KPI Hero Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <CarbonMetricCard
          title="Carbon Efficiency Score"
          value={`${metrics.carbonEfficiencyScore}%`}
          status={metrics.carbonEfficiencyScore > 70 ? 'excellent' : metrics.carbonEfficiencyScore > 50 ? 'good' : 'warning'}
          icon={Leaf}
          subtitle="vs 150g baseline"
        />
        <CarbonMetricCard
          title="Emissions per GPU-hour"
          value={`${metrics.carbonPerGpuHour}g`}
          status={metrics.carbonPerGpuHour < 80 ? 'excellent' : metrics.carbonPerGpuHour < 120 ? 'good' : 'warning'}
          icon={Activity}
          subtitle="gCO₂/GPU-hr"
        />
        <CarbonMetricCard
          title="Daily Emissions"
          value={`${(metrics.dailyEmissionsKg / 1000).toFixed(1)}t`}
          status={budgetStatus.onTrack ? 'excellent' : 'warning'}
          icon={BarChart3}
          subtitle="tonnes CO₂"
        />
        <CarbonMetricCard
          title="Renewable Mix"
          value={`${facility.renewablePercent}%`}
          status={facility.renewablePercent > 70 ? 'excellent' : facility.renewablePercent > 40 ? 'good' : 'warning'}
          icon={Zap}
          subtitle={regionalFeed.region}
        />
      </div>

      {/* Carbon Budget & Projections */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Carbon Budget Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Annual Budget</span>
                <span className="font-bold">{budgetStatus.annualBudgetTons.toLocaleString()} tonnes</span>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Used: {budgetStatus.usedTons.toLocaleString()}t</span>
                  <span>Remaining: {budgetStatus.remainingTons.toLocaleString()}t</span>
                </div>
                <Progress 
                  value={(budgetStatus.usedTons / budgetStatus.annualBudgetTons) * 100} 
                  className="h-3" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Run Rate</p>
                  <p className="text-lg font-bold">{budgetStatus.runRateTonsPerDay.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">t/day</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Projected Total</p>
                  <p className={`text-lg font-bold ${budgetStatus.onTrack ? 'text-green-500' : 'text-destructive'}`}>
                    {budgetStatus.projectedTotalTons.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">tonnes/year</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <span className="text-sm">Budget Status</span>
                <Badge variant={budgetStatus.onTrack ? 'default' : 'destructive'}>
                  {budgetStatus.onTrack ? 'On Track' : `${Math.abs(budgetStatus.variance)}t Over`}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Regional Grid Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Current Region: {regionalFeed.region}</span>
                  <Badge variant="default" className="bg-green-500">
                    {regionalFeed.carbonIntensityGPerKwh} g/kWh
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {regionalFeed.renewablePercentage}% renewable grid
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/30 border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">If in Alberta (CA-AB)</span>
                  <Badge variant="destructive">
                    {albertaComparison.to.metrics.carbonPerGpuHour} g/GPU-hr
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-destructive" />
                  <span className="text-destructive">
                    +{Math.abs(albertaComparison.emissionsDelta).toLocaleString()} tonnes/year
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Carbon Savings vs Alberta</p>
                  <p className="text-lg font-bold text-green-500">
                    {albertaComparison.savings.toLocaleString()} t/yr
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Efficiency Advantage</p>
                  <p className="text-lg font-bold text-green-500">
                    +{Math.abs(albertaComparison.efficiencyDelta)}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Emissions Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Emissions Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Hourly Metrics</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Hourly Emissions</span>
                  <span className="font-medium">{metrics.hourlyEmissionsKg} kg</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Effective Intensity</span>
                  <span className="font-medium">{metrics.effectiveCarbonIntensity} g/kWh</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Scope 2 Emissions</span>
                  <span className="font-medium">{metrics.scope2EmissionsKg} kg/hr</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Daily Metrics</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Daily Emissions</span>
                  <span className="font-medium">{metrics.dailyEmissionsKg.toLocaleString()} kg</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Per GPU-hour</span>
                  <span className="font-medium">{metrics.carbonPerGpuHour} g</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Renewable Offset</span>
                  <span className="font-medium text-green-500">{metrics.renewableOffsetPct}%</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Annual Projections</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Projected Annual</span>
                  <span className="font-medium">{metrics.projectedAnnualEmissionsTons.toLocaleString()} t</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Efficiency Score</span>
                  <Badge variant={metrics.carbonEfficiencyScore > 70 ? 'default' : 'secondary'}>
                    {metrics.carbonEfficiencyScore}/100
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Net Zero Target</span>
                  <Badge variant="outline">2035</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sustainability Initiatives */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Leaf className="h-4 w-4" />
            Sustainability Initiatives
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg border bg-green-500/5 border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-green-500" />
                <span className="font-medium">Hydro Power PPA</span>
              </div>
              <p className="text-sm text-muted-foreground">
                95% of power from Quebec hydro grid
              </p>
              <Badge variant="default" className="mt-2 bg-green-500">Active</Badge>
            </div>
            
            <div className="p-4 rounded-lg border bg-blue-500/5 border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Carbon Offsetting</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Verified carbon credits for remaining emissions
              </p>
              <Badge variant="outline" className="mt-2 border-blue-500 text-blue-500">Enrolled</Badge>
            </div>
            
            <div className="p-4 rounded-lg border bg-amber-500/5 border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4 text-amber-500" />
                <span className="font-medium">SBTi Commitment</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Science-based targets for 2030
              </p>
              <Badge variant="outline" className="mt-2 border-amber-500 text-amber-500">Pending</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface CarbonMetricCardProps {
  title: string;
  value: string;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  icon: React.ElementType;
  subtitle?: string;
}

function CarbonMetricCard({ title, value, status, icon: Icon, subtitle }: CarbonMetricCardProps) {
  const statusColors = {
    excellent: 'text-green-500',
    good: 'text-emerald-500',
    warning: 'text-amber-500',
    critical: 'text-destructive',
  };

  const statusBg = {
    excellent: 'bg-green-500/10',
    good: 'bg-emerald-500/10',
    warning: 'bg-amber-500/10',
    critical: 'bg-destructive/10',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${statusBg[status]} ${statusColors[status]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={`text-xl font-bold ${statusColors[status]}`}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

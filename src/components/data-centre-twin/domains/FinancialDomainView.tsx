/**
 * Financial & Carbon Domain View
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DollarSign, Leaf, TrendingUp, TrendingDown, Zap, BarChart3 } from 'lucide-react';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

interface FinancialDomainViewProps {
  facility: DataCentreFacility;
}

export function FinancialDomainView({ facility }: FinancialDomainViewProps) {
  // Calculate financial metrics
  const dailyPowerCost = facility.currentPowerDrawKw * 24 * facility.costPerKwh;
  const monthlyPowerCost = dailyPowerCost * 30;
  const annualPowerCost = dailyPowerCost * 365;
  
  const dailyCarbonKg = (facility.currentPowerDrawKw * 24 * facility.carbonIntensityGCo2Kwh) / 1000;
  const annualCarbonTonnes = (dailyCarbonKg * 365) / 1000;
  
  const carbonPrice = 65; // $/tonne CO2
  const annualCarbonCost = annualCarbonTonnes * carbonPrice;
  
  const renewablePercent = facility.renewablePercent || 45;
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Daily Power Cost"
          value={`$${dailyPowerCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          status="good"
          icon={DollarSign}
        />
        <MetricCard
          title="Carbon Intensity"
          value={`${facility.carbonIntensityGCo2Kwh} g/kWh`}
          status={facility.carbonIntensityGCo2Kwh < 200 ? 'good' : facility.carbonIntensityGCo2Kwh < 400 ? 'warning' : 'critical'}
          icon={Leaf}
        />
        <MetricCard
          title="Renewable Energy"
          value={`${renewablePercent}%`}
          status={renewablePercent > 50 ? 'good' : renewablePercent > 25 ? 'warning' : 'critical'}
          icon={Zap}
        />
        <MetricCard
          title="Annual Carbon"
          value={`${annualCarbonTonnes.toFixed(0)} tonnes`}
          status={annualCarbonTonnes < 1000 ? 'good' : 'warning'}
          icon={Leaf}
        />
      </div>

      {/* Cost Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Daily</p>
                  <p className="text-xl font-bold">${dailyPowerCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Monthly</p>
                  <p className="text-xl font-bold">${(monthlyPowerCost / 1000).toFixed(0)}k</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Annual</p>
                  <p className="text-xl font-bold">${(annualPowerCost / 1000000).toFixed(1)}M</p>
                </div>
              </div>
              
              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span>Power Cost ($/kWh)</span>
                  <span className="font-medium">${facility.costPerKwh.toFixed(3)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Cost per GPU-hour</span>
                  <span className="font-medium">${(facility.costPerKwh * facility.pue * 0.5).toFixed(3)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>PUE Overhead Cost</span>
                  <span className="font-medium">${(dailyPowerCost * (facility.pue - 1)).toFixed(0)}/day</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Carbon Footprint</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <p className="text-sm font-medium">Daily Emissions</p>
                  <p className="text-xs text-muted-foreground">Based on current load</p>
                </div>
                <p className="text-2xl font-bold">{dailyCarbonKg.toFixed(0)} kg</p>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Emissions per GPU-hour</span>
                  <span className="font-medium">{(facility.carbonIntensityGCo2Kwh * 0.5).toFixed(0)} g CO₂</span>
                </div>
                <Progress value={Math.min((facility.carbonIntensityGCo2Kwh / 500) * 100, 100)} className="h-2" />
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Carbon Price</p>
                  <p className="text-lg font-bold">${carbonPrice}/tonne</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Annual Carbon Cost</p>
                  <p className="text-lg font-bold">${(annualCarbonCost / 1000).toFixed(0)}k</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Energy Mix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Energy Mix</CardTitle>
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
                  <span>{renewablePercent}%</span>
                </div>
                <Progress value={renewablePercent} className="h-3 bg-muted" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    Natural Gas
                  </span>
                  <span>{100 - renewablePercent - 10}%</span>
                </div>
                <Progress value={100 - renewablePercent - 10} className="h-3 bg-muted" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-500" />
                    Grid (Other)
                  </span>
                  <span>10%</span>
                </div>
                <Progress value={10} className="h-3 bg-muted" />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Renewable Target 2025</span>
                  <Badge variant="default">75%</Badge>
                </div>
                <Progress value={(renewablePercent / 75) * 100} className="h-2 mt-2" />
              </div>
              
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between text-sm">
                  <span>PPA Contracts</span>
                  <span className="font-medium">3 active</span>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between text-sm">
                  <span>RECs Purchased (YTD)</span>
                  <span className="font-medium">12,500 MWh</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ROI Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Investment Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground mb-1">NPV (10yr)</p>
              <p className="text-2xl font-bold text-green-500">$24.5M</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground mb-1">IRR</p>
              <p className="text-2xl font-bold text-green-500">18.2%</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground mb-1">Payback Period</p>
              <p className="text-2xl font-bold">4.2 yrs</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground mb-1">ROIC</p>
              <p className="text-2xl font-bold text-green-500">22.8%</p>
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
}

function MetricCard({ title, value, status, icon: Icon }: MetricCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'good': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

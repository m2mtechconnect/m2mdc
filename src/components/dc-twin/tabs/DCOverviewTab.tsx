/**
 * DC Twin Overview Tab
 * Renders overview content from DC Twin Builder Store
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Server, Zap, Cpu, Globe, Shield, Leaf, Users, Target,
  TrendingUp, Clock, Download, CheckCircle2
} from 'lucide-react';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';

export function DCOverviewTab() {
  const { overview, kpis } = useDCTwinBuilderStore();
  
  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <Server className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{overview.twinName}</h1>
            <p className="text-muted-foreground">{overview.facilityLocation} • {overview.regionCode}</p>
          </div>
        </div>
        
        <p className="text-base text-muted-foreground leading-relaxed max-w-3xl">
          {overview.twinSummary || overview.description}
        </p>
        
        {/* Industry Tags */}
        <div className="flex flex-wrap gap-2">
          {overview.industries.map((industry) => (
            <Badge key={industry} variant="secondary">{industry}</Badge>
          ))}
        </div>
      </div>
      
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overview.displayRoi}</p>
              <p className="text-xs text-muted-foreground">Expected ROI</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overview.displayTimeSaved}</p>
              <p className="text-xs text-muted-foreground">Time Saved</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/10">
              <Download className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overview.displayDownloads}</p>
              <p className="text-xs text-muted-foreground">Downloads</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <Zap className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overview.capacityKw.toLocaleString()} kW</p>
              <p className="text-xs text-muted-foreground">IT Capacity</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Facility Specs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Server className="h-5 w-5" />
            Facility Specifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Tier</p>
              <p className="font-semibold">{overview.tier}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cooling Type</p>
              <p className="font-semibold capitalize">{overview.coolingType.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Power Topology</p>
              <p className="font-semibold">{overview.powerTopology}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">GPU Fleet</p>
              <p className="font-semibold">{overview.gpuFleet}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Renewable Energy</p>
              <p className="font-semibold">{overview.renewablePercent}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sovereignty</p>
              <p className="font-semibold flex items-center gap-1">
                {overview.sovereignCompliance ? (
                  <><CheckCircle2 className="h-4 w-4 text-success" /> Compliant</>
                ) : 'Not Configured'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Key Capabilities */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Key Capabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {overview.keyCapabilities.map((cap, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  {cap}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              KPIs Improved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {overview.kpisImproved.map((kpi, i) => (
                <Badge key={i} variant="outline">{kpi}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Key Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Leaf className="h-5 w-5" />
            Key Benefits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {overview.keyBenefits.map((benefit, i) => (
              <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                <span className="text-sm">{benefit}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Who Is This For */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Who Is This For
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {overview.targetAudience.map((audience, i) => (
              <Badge key={i} variant="secondary">{audience}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* How It Works */}
      {overview.howItWorks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {overview.howItWorks.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-semibold shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

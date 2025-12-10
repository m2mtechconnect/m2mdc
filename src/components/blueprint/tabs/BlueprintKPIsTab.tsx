/**
 * Blueprint KPIs Tab - All KPIs defined in the blueprint with enhancement panel
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Target,
  Thermometer,
  Zap,
  Wind,
  Network,
  Building2,
  Cpu,
  Globe,
  DollarSign
} from 'lucide-react';
import type { KpiBlueprint } from '@/types/dataCentreBlueprint';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KPIEnhancementsPanel } from '../KPIEnhancementsPanel';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';

interface BlueprintKPIsTabProps {
  kpis: KpiBlueprint[];
}

const domainIcons: Record<string, React.ReactNode> = {
  thermal: <Thermometer className="h-4 w-4 text-orange-500" />,
  power: <Zap className="h-4 w-4 text-yellow-500" />,
  cooling: <Wind className="h-4 w-4 text-blue-500" />,
  network: <Network className="h-4 w-4 text-purple-500" />,
  facility: <Building2 className="h-4 w-4 text-gray-500" />,
  workload: <Cpu className="h-4 w-4 text-pink-500" />,
  sovereignty: <Globe className="h-4 w-4 text-green-500" />,
  financial: <DollarSign className="h-4 w-4 text-emerald-500" />,
};

export function BlueprintKPIsTab({ kpis }: BlueprintKPIsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKPI, setSelectedKPI] = useState<KpiBlueprint | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>('all');

  // Get unique domains
  const domains = [...new Set(kpis.map(k => k.domain))];

  // Filter KPIs
  const filteredKPIs = kpis.filter(kpi => {
    const matchesSearch = kpi.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         kpi.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDomain = selectedDomain === 'all' || kpi.domain === selectedDomain;
    return matchesSearch && matchesDomain;
  });

  // Group by domain
  const kpisByDomain = filteredKPIs.reduce((acc, kpi) => {
    if (!acc[kpi.domain]) {
      acc[kpi.domain] = [];
    }
    acc[kpi.domain].push(kpi);
    return acc;
  }, {} as Record<string, KpiBlueprint[]>);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            KPI Registry ({kpis.length} total, {filteredKPIs.length} shown)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search KPIs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedDomain} onValueChange={setSelectedDomain}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Domains</SelectItem>
                {domains.map(domain => (
                  <SelectItem key={domain} value={domain} className="capitalize">
                    {domain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KPIs by Domain */}
      {Object.entries(kpisByDomain).map(([domain, domainKPIs]) => (
        <Card key={domain}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {domainIcons[domain]}
              <span className="capitalize">{domain}</span>
              <Badge variant="secondary">{domainKPIs.length} KPIs</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {domainKPIs.map((kpi) => (
                <div 
                  key={kpi.id}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedKPI(kpi)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <p className="font-medium text-sm">{kpi.name}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">{kpi.unit}</Badge>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setSelectedKPI(kpi); }}>
                        <Info className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{kpi.description}</p>
                  
                  <div className="space-y-2 text-xs">
                    {kpi.targetRange && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Target Range:</span>
                        <span className="font-mono">
                          {kpi.targetRange.min !== undefined && `${kpi.targetRange.min} - `}
                          {kpi.targetRange.max !== undefined && kpi.targetRange.max}
                          {kpi.targetRange.ideal !== undefined && ` (ideal: ${kpi.targetRange.ideal})`}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Owner:</span>
                      <span>{kpi.ownerRole}</span>
                    </div>
                    {kpi.inputs.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Inputs:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {kpi.inputs.slice(0, 3).map((input, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {input}
                            </Badge>
                          ))}
                          {kpi.inputs.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{kpi.inputs.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* KPI Enhancement Dialog */}
      <Dialog open={!!selectedKPI} onOpenChange={(open) => !open && setSelectedKPI(null)}>
        <DialogContent className="max-w-lg">
          <KPIEnhancementsPanel 
            kpi={selectedKPI ? {
              id: selectedKPI.id,
              name: selectedKPI.name,
              value: selectedKPI.targetRange?.ideal || 0,
              unit: selectedKPI.unit,
              target: selectedKPI.targetRange?.ideal || 0,
              warningThreshold: selectedKPI.targetRange?.min || 0,
              criticalThreshold: (selectedKPI.targetRange?.min || 0) * 0.8,
              trend: 'stable',
              trendValue: 0,
              why: `${selectedKPI.name} is critical for ${selectedKPI.domain} operations. ${selectedKPI.description}`,
              impacts: selectedKPI.inputs || [],
              workflows: [],
              forecast: [],
              autoRecommendations: [],
            } : undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

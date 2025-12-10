/**
 * Builder-Driven Recommendation Panel
 * Displays DC twin recommendations from the builder store (single source of truth)
 * All fields read from useDCTwinBuilderStore - no archetype/rec.* fields
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { useDCTwinBuilderStore } from "@/stores/dcTwinBuilderStore";
import { useActiveTwin } from "@/context/ActiveTwinContext";
import { 
  Leaf, Server, Zap, Thermometer, Shield, DollarSign, Play, 
  ChevronDown, ChevronUp, Target, Globe, Building2, CheckCircle2, Loader2, Plus 
} from "lucide-react";

interface Props {
  onTwinCreated?: (twinId: string) => void;
  onOpenBlueprint?: () => void;
  onOpenSimulation?: () => void;
}

const industryLabels: Record<string, string> = {
  finance: "Finance & Banking",
  government: "Government",
  retail: "Retail & E-Commerce",
  saas: "SaaS / Cloud",
  healthcare: "Healthcare",
  telecom: "Telecom",
  manufacturing: "Manufacturing",
  energy: "Energy & Utilities",
  education: "Education & Research",
  generic: "Enterprise",
  Government: "Government",
  Technology: "Technology",
  Retail: "Retail",
  Logistics: "Logistics",
  "Supply Chain": "Supply Chain",
  "Edge Computing": "Edge Computing",
};

// Check if this is a mega-retailer based on archetypeId or store count
const isMegaRetailer = (archetypeId: string | undefined, storeCount: number | undefined) => {
  return archetypeId === 'retail_hyperscale_green_twin' || (storeCount && storeCount > 1000);
};

export function BuilderRecommendationPanel({ onTwinCreated, onOpenBlueprint, onOpenSimulation }: Props) {
  const navigate = useNavigate();
  const [showAgents, setShowAgents] = useState(true);
  const [showScenarios, setShowScenarios] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const { createLocation, createTwin, setActiveTwin } = useActiveTwin();
  
  // Read ALL data from the builder store - single source of truth
  const overview = useDCTwinBuilderStore((s) => s.overview);
  const agents = useDCTwinBuilderStore((s) => s.agents);
  const scenarios = useDCTwinBuilderStore((s) => s.scenarios);
  const kpis = useDCTwinBuilderStore((s) => s.kpis);
  const financial = useDCTwinBuilderStore((s) => s.financial);
  const sourceRecommendation = useDCTwinBuilderStore((s) => s.sourceRecommendation);

  // Derived values from builder state
  const enabledAgents = agents.filter(a => a.enabled);
  const enabledScenarios = scenarios.filter(s => s.enabled);
  const primaryIndustry = overview.industries[0] || 'Enterprise';
  
  // Get KPI values from builder
  const pueKpi = kpis.find(k => k.id === 'effective-ai-pue');
  const sovereigntyKpi = kpis.find(k => k.id === 'sovereign-compute-ratio');
  const carbonKpi = kpis.find(k => k.id === 'gco2-per-gpu-hour');
  const uptimeKpi = kpis.find(k => k.id === 'uptime');

  const getCapacityLabel = (kw: number) => {
    if (kw < 1000) return "Small (<1MW)";
    if (kw < 5000) return "Medium (1-5MW)";
    if (kw < 20000) return "Large (5-20MW)";
    return "Hyperscale (20MW+)";
  };

  const handleCreateTwin = async () => {
    setIsCreating(true);
    try {
      const city = overview.facilityLocation.includes('Toronto') ? 'Toronto' :
                   overview.facilityLocation.includes('Montreal') ? 'Montreal' :
                   overview.facilityLocation.includes('Vancouver') ? 'Vancouver' : 'Montreal';
      
      const location = await createLocation({
        name: `${overview.twinName} - ${city}`,
        city,
        province: city === 'Montreal' ? 'Quebec' : city === 'Vancouver' ? 'BC' : 'Ontario',
        country: 'Canada',
        cloud_region: overview.regionCode,
        provider_type: 'Hybrid',
        industry: primaryIndustry,
        capacity_kw: overview.capacityKw,
        tier: overview.tier,
        tags: overview.primaryUseCases || [],
      });
      
      if (!location) {
        throw new Error('Failed to create location');
      }
      
      const twin = await createTwin(location.id, {
        name: overview.twinName,
        city,
        region_code: overview.regionCode,
        tier: overview.tier,
        capacity_kw: overview.capacityKw,
        industry: primaryIndustry,
        sovereignty_level: overview.sovereignCompliance ? 'sovereign' : 'standard',
        pue_target: pueKpi?.target || 1.3,
        renewable_target_pct: overview.renewablePercent,
        carbon_intensity: carbonKpi?.target || 70,
        metadata: {
          sourceUrl: sourceRecommendation?.url,
          agents: enabledAgents.map(a => a.id),
          scenarios: enabledScenarios.map(s => s.id),
          objectives: overview.primaryUseCases,
          financialModel: financial,
        },
      });
      
      if (!twin) {
        throw new Error('Failed to create twin');
      }
      
      setActiveTwin(twin.id);
      toast.success('Green Data Centre Twin created successfully!');
      onTwinCreated?.(twin.id);
      navigate(`/builder?twinId=${twin.id}`);
    } catch (error) {
      console.error('Failed to create twin:', error);
      toast.error('Failed to create Data Centre Twin');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRunSimulation = () => {
    if (onOpenSimulation) {
      onOpenSimulation();
    } else {
      const scenarioIds = enabledScenarios.slice(0, 3).map(s => s.id).join(',');
      navigate(`/data-centre-twin?view=simulation&scenarios=${encodeURIComponent(scenarioIds)}`);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value}`;
  };

  return (
    <Card className="border-primary/20 bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-green-600" />
              <CardTitle className="text-xl">Green Data Centre Twin Recommendation</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Automatically generated for{" "}
              <span className="font-semibold text-foreground">{overview.customerName || overview.twinName.replace(' Sovereign Green AI Data Centre Twin', '')}</span>
              {overview.industry && (
                <span className="ml-1">({industryLabels[overview.industry] || overview.industry})</span>
              )}
            </p>
          </div>
          <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">
            {industryLabels[overview.industry || primaryIndustry] || primaryIndustry}
          </Badge>
        </div>

        {/* Quick chips from builder state */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Badge variant="secondary" className="text-xs">
            <Building2 className="h-3 w-3 mr-1" />
            {getCapacityLabel(overview.capacityKw)}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            <Globe className="h-3 w-3 mr-1" />
            {overview.regionCode}
          </Badge>
          {overview.sovereignCompliance && (
            <Badge variant="outline" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Sovereignty
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Objectives from builder */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-foreground">
            <Target className="h-4 w-4 text-primary" />
            Objectives
          </h4>
          <ul className="space-y-1">
            {overview.primaryUseCases.map((obj, i) => (
              <li key={i} className="text-sm text-studio-body flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                {obj}
              </li>
            ))}
          </ul>
        </div>

        {/* KPI Targets from builder KPIs */}
        <div className="grid grid-cols-5 gap-3">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Zap className="h-4 w-4 mx-auto text-amber-500 mb-1" />
            <div className="text-lg font-semibold text-foreground">{pueKpi?.target || 1.3}</div>
            <div className="text-xs text-studio-muted">PUE Target</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Leaf className="h-4 w-4 mx-auto text-green-500 mb-1" />
            <div className="text-lg font-semibold text-foreground">{overview.renewablePercent}%</div>
            <div className="text-xs text-studio-muted">Renewable</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Shield className="h-4 w-4 mx-auto text-blue-500 mb-1" />
            <div className="text-lg font-semibold text-foreground">{sovereigntyKpi?.target || 80}%</div>
            <div className="text-xs text-studio-muted">Sovereignty</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Thermometer className="h-4 w-4 mx-auto text-orange-500 mb-1" />
            <div className="text-lg font-semibold text-foreground">{carbonKpi?.target || 70}</div>
            <div className="text-xs text-studio-muted">g CO₂/kWh</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Server className="h-4 w-4 mx-auto text-purple-500 mb-1" />
            <div className="text-lg font-semibold text-foreground">{uptimeKpi?.target || 99.9}%</div>
            <div className="text-xs text-studio-muted">Uptime</div>
          </div>
        </div>

        {/* Agents from builder - Collapsible */}
        <Collapsible open={showAgents} onOpenChange={setShowAgents}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full text-foreground">
            <Server className="h-4 w-4 text-primary" />
            Agents to Deploy ({enabledAgents.length})
            {showAgents ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="flex flex-wrap gap-2">
              {enabledAgents.map(agent => (
                <Badge key={agent.id} variant="secondary" className="text-xs">
                  {agent.name}
                </Badge>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Scenarios from builder - Collapsible */}
        <Collapsible open={showScenarios} onOpenChange={setShowScenarios}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full text-foreground">
            <Play className="h-4 w-4 text-primary" />
            Simulation Scenarios ({enabledScenarios.length})
            {showScenarios ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="flex flex-wrap gap-2">
              {enabledScenarios.map(scenario => (
                <Badge 
                  key={scenario.id} 
                  variant="outline" 
                  className={`text-xs ${
                    scenario.severity === "critical" ? "border-red-500/50 text-red-700" :
                    scenario.severity === "warning" ? "border-orange-500/50 text-orange-700" :
                    "border-muted-foreground/30"
                  }`}
                >
                  {scenario.name}
                </Badge>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Financial Summary from builder */}
        <div className="p-4 rounded-lg bg-muted/30 border">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-foreground">
            <DollarSign className="h-4 w-4 text-primary" />
            Carbon & Cost Model
            {isMegaRetailer(sourceRecommendation?.blueprintProfile, financial.multiStoreAggregationCount) && (
              <Badge variant="outline" className="ml-2 text-xs">Hyperscale Retail</Badge>
            )}
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-studio-muted">Est. Annual Power Cost</div>
              <div className="font-semibold text-foreground">{formatCurrency(financial.annualPowerCostUsd)}</div>
            </div>
            <div>
              <div className="text-studio-muted">Est. Annual Carbon</div>
              <div className="font-semibold text-foreground">{financial.annualCarbonTonnes.toLocaleString()} tonnes</div>
            </div>
            <div>
              <div className="text-studio-muted">Green Upgrade Savings</div>
              <div className="font-semibold text-green-600">
                ~{financial.upgradeSavingsPercent}% cost, ~{financial.carbonSavingsPercent}% carbon
              </div>
            </div>
            <div>
              <div className="text-studio-muted">Payback Period</div>
              <div className="font-semibold text-foreground">~{financial.paybackYears} years</div>
            </div>
            {/* Retail-specific financial fields */}
            {financial.annualColdChainEnergyCostUsd && (
              <div>
                <div className="text-studio-muted">Cold Chain Energy</div>
                <div className="font-semibold text-foreground">{formatCurrency(financial.annualColdChainEnergyCostUsd)}</div>
              </div>
            )}
            {financial.multiStoreAggregationCount && (
              <div>
                <div className="text-studio-muted">Sites Aggregated</div>
                <div className="font-semibold text-foreground">{financial.multiStoreAggregationCount.toLocaleString()}+</div>
              </div>
            )}
          </div>
        </div>

        {/* CTAs */}
        <div className="flex gap-3 pt-2">
          <Button onClick={handleCreateTwin} className="flex-1" disabled={isCreating}>
            {isCreating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            {isCreating ? 'Creating...' : 'Create Green DC Twin'}
          </Button>
          <Button onClick={handleRunSimulation} variant="outline" className="flex-1">
            <Play className="h-4 w-4 mr-2" />
            Preview Simulation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

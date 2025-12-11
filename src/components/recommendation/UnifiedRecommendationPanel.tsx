/**
 * Unified Recommendation Panel
 * Single canonical component for displaying DC Twin recommendations
 * Consolidates GreenDcRecommendationPanel and BuilderRecommendationPanel
 * 
 * CRITICAL: This component displays PREVIEW recommendations.
 * Twin creation is an EXPLICIT action triggered by "Create Green DC Twin" button.
 * The recommendation store is cleared after successful twin creation.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { useActiveTwin } from "@/context/ActiveTwinContext";
import { useRecommendationStore } from "@/stores/recommendationStore";
import { useDCTwinBuilderStore } from "@/stores/dcTwinBuilderStore";
import { 
  Leaf, Server, Zap, Thermometer, Shield, DollarSign, Play, 
  ChevronDown, ChevronUp, Target, Globe, Building2, CheckCircle2, Loader2, Plus, Eye
} from "lucide-react";

// Normalized recommendation type that works with both sources
export interface NormalizedRecommendation {
  // Identity
  companyName: string;
  twinName: string;
  industry: string;
  industryLabel: string;
  
  // Capacity & Location
  capacityKw: number;
  capacityTier: 'small' | 'medium' | 'large' | 'hyperscale';
  regions: string[];
  tier: string;
  
  // Objectives & Use Cases
  objectives: string[];
  
  // KPI Targets
  pueTarget: number;
  renewablePercent: number;
  sovereigntyScore: number;
  carbonIntensity: number;
  uptimeTarget: number;
  
  // Agents & Scenarios
  agents: Array<{ id: string; name: string; enabled: boolean }>;
  scenarios: Array<{ id: string; name: string; severity?: string; enabled: boolean }>;
  
  // Financial
  annualPowerCostUsd: number;
  annualCarbonTonnes: number;
  savingsPercent: number;
  carbonSavingsPercent: number;
  paybackYears: number;
  
  // Retail-specific (optional)
  isHyperscaleRetail?: boolean;
  storeCount?: number;
  coldChainCost?: number;
  
  // Source info
  sourceUrl?: string;
  notes?: string[];
}

interface UnifiedRecommendationPanelProps {
  recommendation: NormalizedRecommendation;
  onTwinCreated?: (twinId: string) => void;
  onOpenBlueprint?: () => void;
  onOpenSimulation?: () => void;
  variant?: 'full' | 'compact';
}

const INDUSTRY_LABELS: Record<string, string> = {
  finance: "Finance & Banking",
  financial_services: "Finance & Banking",
  government: "Government",
  public_sector: "Public Sector",
  retail: "Retail & E-Commerce",
  saas: "SaaS / Cloud",
  technology_saas: "Technology / SaaS",
  enterprise_consulting: "Professional Services",
  healthcare: "Healthcare",
  telecom: "Telecom",
  manufacturing: "Manufacturing",
  energy: "Energy & Utilities",
  education: "Education & Research",
  ai_compute: "AI / Compute",
  generic: "Enterprise",
};

const CAPACITY_LABELS: Record<string, string> = {
  small: "Small (<1MW)",
  medium: "Medium (1-5MW)",
  large: "Large (5-20MW)",
  hyperscale: "Hyperscale (20MW+)",
};

export function UnifiedRecommendationPanel({ 
  recommendation: rec, 
  onTwinCreated, 
  onOpenBlueprint, 
  onOpenSimulation,
  variant = 'full',
}: UnifiedRecommendationPanelProps) {
  const navigate = useNavigate();
  const [showAgents, setShowAgents] = useState(variant === 'full');
  const [showScenarios, setShowScenarios] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const { createLocation, createTwin, setActiveTwin } = useActiveTwin();
  
  // Access recommendation store to clear after twin creation
  const { recommendation: rawRecommendation, clearRecommendation } = useRecommendationStore();
  
  // Access builder store for initializing from recommendation
  const initializeFromGreenDcRecommendation = useDCTwinBuilderStore(
    (s) => s.initializeFromGreenDcRecommendation
  );

  /**
   * EXPLICIT twin creation action
   * This is the ONLY way to create a twin from a recommendation
   */
  const handleCreateTwin = async () => {
    setIsCreating(true);
    console.log('[UnifiedRecommendationPanel] Creating twin from recommendation (EXPLICIT action)');
    
    try {
      const region = rec.regions[0] || 'ca-central-1';
      const city = region.includes('central') ? 'Montreal' : 
                   region.includes('west') ? 'Vancouver' : 
                   region.includes('east') ? 'Toronto' : 'Montreal';
      
      const location = await createLocation({
        name: `${rec.companyName} - ${city}`,
        city,
        province: city === 'Montreal' ? 'Quebec' : city === 'Vancouver' ? 'BC' : 'Ontario',
        country: 'Canada',
        cloud_region: region,
        provider_type: 'Hybrid',
        industry: rec.industry,
        capacity_kw: rec.capacityKw,
        tier: rec.tier,
        tags: rec.objectives.slice(0, 3),
      });
      
      if (!location) throw new Error('Failed to create location');
      
      const twin = await createTwin(location.id, {
        name: rec.twinName,
        city,
        region_code: region,
        tier: rec.tier,
        capacity_kw: rec.capacityKw,
        industry: rec.industry,
        sovereignty_level: rec.sovereigntyScore >= 90 ? 'sovereign' : 'standard',
        pue_target: rec.pueTarget,
        renewable_target_pct: rec.renewablePercent,
        carbon_intensity: rec.carbonIntensity,
        metadata: {
          sourceUrl: rec.sourceUrl,
          companyName: rec.companyName,
          agents: rec.agents.filter(a => a.enabled).map(a => a.id),
          scenarios: rec.scenarios.filter(s => s.enabled).map(s => s.id),
          objectives: rec.objectives,
          financialModel: {
            annualPowerCostUsd: rec.annualPowerCostUsd,
            annualCarbonTonnes: rec.annualCarbonTonnes,
            savingsPercent: rec.savingsPercent,
            paybackYears: rec.paybackYears,
          },
        },
      });
      
      if (!twin) throw new Error('Failed to create twin');
      
      // Now that twin is created, initialize the builder store
      // This is the ONLY place where initializeFromGreenDcRecommendation should be called
      if (rawRecommendation) {
        initializeFromGreenDcRecommendation(rawRecommendation, twin.id);
        console.log('[UnifiedRecommendationPanel] Builder store initialized for twin:', twin.id);
      }
      
      // Set the active twin (this updates the dropdown)
      setActiveTwin(twin.id);
      
      // Clear the recommendation preview (no longer in sandbox mode)
      clearRecommendation();
      
      toast.success('Green Data Centre Twin created successfully!');
      console.log('[UnifiedRecommendationPanel] Twin created and activated:', twin.id);
      
      onTwinCreated?.(twin.id);
      navigate(`/builder?twinId=${twin.id}`);
    } catch (error) {
      console.error('[UnifiedRecommendationPanel] Failed to create twin:', error);
      toast.error('Failed to create Data Centre Twin');
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Preview simulation - opens preview page WITHOUT creating a twin
   */
  const handlePreviewSimulation = () => {
    if (onOpenSimulation) {
      onOpenSimulation();
    } else {
      // Navigate to preview mode - does NOT create or select any twin
      navigate('/simulation/preview', { state: { mode: 'preview' } });
    }
  };
  
  /**
   * Preview blueprint - opens preview page WITHOUT creating a twin
   */
  const handlePreviewBlueprint = () => {
    if (onOpenBlueprint) {
      onOpenBlueprint();
    } else {
      // Navigate to preview mode - does NOT create or select any twin
      navigate('/blueprint/preview', { state: { mode: 'preview' } });
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value}`;
  };

  const enabledAgents = rec.agents.filter(a => a.enabled);
  const enabledScenarios = rec.scenarios.filter(s => s.enabled);

  return (
    <Card className="border-primary/20 bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-success" />
              <CardTitle className="text-xl">Sovereign Green AI Data Centre Twin</CardTitle>
            </div>
            <p className="text-base">
              <span className="text-muted-foreground">Recommendation for </span>
              <span className="font-semibold text-foreground">{rec.companyName}</span>
            </p>
          </div>
          <Badge variant="outline" className="bg-success/10 text-success border-success/30 hidden sm:inline-flex">
            {INDUSTRY_LABELS[rec.industry] || rec.industryLabel}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Badge variant="secondary" className="text-xs">
            <Building2 className="h-3 w-3 mr-1" />
            {CAPACITY_LABELS[rec.capacityTier]}
          </Badge>
          {rec.regions.slice(0, 2).map(r => (
            <Badge key={r} variant="secondary" className="text-xs">
              <Globe className="h-3 w-3 mr-1" />
              {r}
            </Badge>
          ))}
          {rec.sovereigntyScore >= 90 && (
            <Badge variant="outline" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Sovereignty
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Objectives */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-foreground">
            <Target className="h-4 w-4 text-primary" />
            Objectives
          </h4>
          <ul className="space-y-1">
            {rec.objectives.slice(0, 4).map((obj, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 flex-shrink-0" />
                {obj}
              </li>
            ))}
          </ul>
        </div>

        {/* KPI Targets */}
        <div className="grid grid-cols-5 gap-3">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Zap className="h-4 w-4 mx-auto text-warning mb-1" />
            <div className="text-lg font-semibold text-foreground">{rec.pueTarget}</div>
            <div className="text-xs text-muted-foreground">PUE Target</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Leaf className="h-4 w-4 mx-auto text-success mb-1" />
            <div className="text-lg font-semibold text-foreground">{rec.renewablePercent}%</div>
            <div className="text-xs text-muted-foreground">Renewable</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Shield className="h-4 w-4 mx-auto text-info mb-1" />
            <div className="text-lg font-semibold text-foreground">{rec.sovereigntyScore}%</div>
            <div className="text-xs text-muted-foreground">Sovereignty</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Thermometer className="h-4 w-4 mx-auto text-warning mb-1" />
            <div className="text-lg font-semibold text-foreground">{rec.carbonIntensity}</div>
            <div className="text-xs text-muted-foreground">g CO₂/kWh</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Server className="h-4 w-4 mx-auto text-accent mb-1" />
            <div className="text-lg font-semibold text-foreground">{rec.uptimeTarget}%</div>
            <div className="text-xs text-muted-foreground">Uptime</div>
          </div>
        </div>

        {/* Agents */}
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

        {/* Scenarios */}
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
                    scenario.severity === "critical" ? "border-destructive/50 text-destructive" :
                    scenario.severity === "warning" ? "border-warning/50 text-warning" :
                    "border-muted-foreground/30"
                  }`}
                >
                  {scenario.name}
                </Badge>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Financial Summary */}
        <div className="p-4 rounded-lg bg-muted/30 border">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-foreground">
            <DollarSign className="h-4 w-4 text-primary" />
            Carbon & Cost Model
            {rec.isHyperscaleRetail && (
              <Badge variant="outline" className="ml-2 text-xs">Hyperscale Retail</Badge>
            )}
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Est. Annual Power Cost</div>
              <div className="font-semibold text-foreground">{formatCurrency(rec.annualPowerCostUsd)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Est. Annual Carbon</div>
              <div className="font-semibold text-foreground">{rec.annualCarbonTonnes.toLocaleString()} tonnes</div>
            </div>
            <div>
              <div className="text-muted-foreground">Green Upgrade Savings</div>
              <div className="font-semibold text-success">
                ~{rec.savingsPercent}% cost, ~{rec.carbonSavingsPercent}% carbon
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Payback Period</div>
              <div className="font-semibold text-foreground">~{rec.paybackYears} years</div>
            </div>
            {rec.coldChainCost && (
              <div>
                <div className="text-muted-foreground">Cold Chain Energy</div>
                <div className="font-semibold text-foreground">{formatCurrency(rec.coldChainCost)}</div>
              </div>
            )}
            {rec.storeCount && (
              <div>
                <div className="text-muted-foreground">Sites Aggregated</div>
                <div className="font-semibold text-foreground">{rec.storeCount.toLocaleString()}+</div>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {rec.notes && rec.notes.length > 0 && (
          <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
            {rec.notes.map((note, i) => (
              <p key={i}>• {note}</p>
            ))}
          </div>
        )}

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
        </div>
        <div className="flex gap-3">
          <Button onClick={handlePreviewBlueprint} variant="outline" className="flex-1">
            <Eye className="h-4 w-4 mr-2" />
            Preview Blueprint
          </Button>
          <Button onClick={handlePreviewSimulation} variant="outline" className="flex-1">
            <Play className="h-4 w-4 mr-2" />
            Preview Simulation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Helper to convert GreenDcTwinRecommendation directly to NormalizedRecommendation
 * Used for PREVIEW mode where recommendation is NOT yet saved as a twin
 */
export function normalizeFromRecommendation(
  rec: import('@/types/greenDcTwin').GreenDcTwinRecommendation
): NormalizedRecommendation {
  const getCapacityTier = (tier: string): 'small' | 'medium' | 'large' | 'hyperscale' => {
    if (tier === 'small' || tier === 'medium' || tier === 'large' || tier === 'hyperscale') {
      return tier;
    }
    return 'medium';
  };

  const capacityMap: Record<string, number> = {
    small: 500,
    medium: 2500,
    large: 10000,
    hyperscale: 50000,
  };

  return {
    companyName: rec.companyName || 'Organization',
    twinName: `${rec.companyName || 'Organization'} Sovereign Green AI Data Centre Twin`,
    industry: rec.industry || 'generic',
    industryLabel: rec.industryId || rec.industry || 'Enterprise',
    capacityKw: capacityMap[rec.capacityTier] || 5000,
    capacityTier: getCapacityTier(rec.capacityTier),
    regions: rec.regions || ['ca-central-1'],
    tier: rec.kpiTargets?.uptimeTargetPct >= 99.99 ? 'Tier IV' : 'Tier III',
    objectives: rec.objectives || [],
    pueTarget: rec.kpiTargets?.pueTarget || 1.3,
    renewablePercent: rec.kpiTargets?.renewableShareTargetPct || 80,
    sovereigntyScore: rec.kpiTargets?.sovereigntyScoreTargetPct || 80,
    carbonIntensity: rec.kpiTargets?.carbonIntensityTargetGPerKwh || 70,
    uptimeTarget: rec.kpiTargets?.uptimeTargetPct || 99.9,
    agents: (rec.agents || []).map((id, i) => ({ 
      id, 
      name: formatAgentName(id), 
      enabled: true 
    })),
    scenarios: (rec.scenarios || []).map((id, i) => ({ 
      id, 
      name: formatScenarioName(id), 
      severity: 'warning',
      enabled: true 
    })),
    annualPowerCostUsd: rec.financialModel?.baselineAnnualCostUsd || 0,
    annualCarbonTonnes: rec.financialModel?.baselineAnnualCarbonTonnes || 0,
    savingsPercent: rec.financialModel?.greenVariantSavingsCostPct || 0,
    carbonSavingsPercent: rec.financialModel?.greenVariantSavingsCarbonPct || 0,
    paybackYears: rec.financialModel?.estimatedPaybackYears || 3,
    isHyperscaleRetail: rec.isMegaRetailer || rec.archetypeId === 'retail_hyperscale_green_twin',
    storeCount: rec.financialModel?.multiStoreAggregationCount,
    coldChainCost: rec.financialModel?.annualColdChainEnergyCostUsd,
    sourceUrl: rec.domain ? `https://${rec.domain}` : undefined,
    notes: [],
  };
}

/** Format agent ID to human-readable name */
function formatAgentName(id: string): string {
  return id
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Format scenario ID to human-readable name */
function formatScenarioName(id: string): string {
  return id
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Helper to convert builder store state to NormalizedRecommendation
 */
export function normalizeFromBuilderStore(
  overview: any,
  agents: any[],
  scenarios: any[],
  kpis: any[],
  financial: any,
  sourceRecommendation?: any
): NormalizedRecommendation {
  const pueKpi = kpis.find(k => k.id === 'effective-ai-pue');
  const sovereigntyKpi = kpis.find(k => k.id === 'sovereign-compute-ratio');
  const carbonKpi = kpis.find(k => k.id === 'gco2-per-gpu-hour');
  const uptimeKpi = kpis.find(k => k.id === 'uptime');

  const getCapacityTier = (kw: number): 'small' | 'medium' | 'large' | 'hyperscale' => {
    if (kw < 1000) return 'small';
    if (kw < 5000) return 'medium';
    if (kw < 20000) return 'large';
    return 'hyperscale';
  };

  return {
    companyName: overview.customerName || 'Organization',
    twinName: overview.twinName || 'Data Centre Twin',
    industry: overview.industry || overview.industries?.[0] || 'generic',
    industryLabel: overview.industry || 'Enterprise',
    capacityKw: overview.capacityKw || 5000,
    capacityTier: getCapacityTier(overview.capacityKw || 5000),
    regions: [overview.regionCode || 'ca-central-1'],
    tier: overview.tier || 'Tier III',
    objectives: overview.primaryUseCases || [],
    pueTarget: pueKpi?.target || 1.3,
    renewablePercent: overview.renewablePercent || 80,
    sovereigntyScore: sovereigntyKpi?.target || 80,
    carbonIntensity: carbonKpi?.target || 70,
    uptimeTarget: uptimeKpi?.target || 99.9,
    agents: agents.map(a => ({ id: a.id, name: a.name, enabled: a.enabled })),
    scenarios: scenarios.map(s => ({ id: s.id, name: s.name, severity: s.severity, enabled: s.enabled })),
    annualPowerCostUsd: financial.annualPowerCostUsd || 0,
    annualCarbonTonnes: financial.annualCarbonTonnes || 0,
    savingsPercent: financial.upgradeSavingsPercent || 0,
    carbonSavingsPercent: financial.carbonSavingsPercent || 0,
    paybackYears: financial.paybackYears || 3,
    isHyperscaleRetail: sourceRecommendation?.blueprintProfile === 'retail_hyperscale_green_twin',
    storeCount: financial.multiStoreAggregationCount,
    coldChainCost: financial.annualColdChainEnergyCostUsd,
    sourceUrl: sourceRecommendation?.url || overview.siteUrl,
    notes: [],
  };
}

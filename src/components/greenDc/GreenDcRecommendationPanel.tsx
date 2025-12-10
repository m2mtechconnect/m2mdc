/**
 * Green DC Twin Recommendation Panel
 * Displays industry-specific DC twin recommendations from URL scanning
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import type { GreenDcTwinRecommendation } from "@/types/greenDcTwin";
import { AGENT_DISPLAY_NAMES, SCENARIO_DISPLAY_INFO } from "@/domain/greenDc/archetypes";
import { 
  Leaf, Server, Zap, Thermometer, Shield, DollarSign, Play, FileText, 
  ChevronDown, ChevronUp, Target, Globe, Building2, CheckCircle2 
} from "lucide-react";

interface Props {
  rec: GreenDcTwinRecommendation;
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
  generic: "Enterprise"
};

const capacityLabels: Record<string, string> = {
  small: "Small (<1MW)",
  medium: "Medium (1-5MW)",
  large: "Large (5-20MW)",
  hyperscale: "Hyperscale (20MW+)"
};

export function GreenDcRecommendationPanel({ rec, onOpenBlueprint, onOpenSimulation }: Props) {
  const navigate = useNavigate();
  const [showAgents, setShowAgents] = useState(true);
  const [showScenarios, setShowScenarios] = useState(false);

  const handleOpenBlueprint = () => {
    if (onOpenBlueprint) {
      onOpenBlueprint();
    } else {
      navigate(`/builder?template=data-centre-twin&industry=${rec.industry}&capacity=${rec.capacityTier}`);
    }
  };

  const handleRunSimulation = () => {
    if (onOpenSimulation) {
      onOpenSimulation();
    } else {
      navigate(`/data-centre-twin?view=simulation&scenarios=${rec.scenarios.join(",")}`);
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
              Automatically generated for <span className="font-medium text-foreground">{rec.companyName || rec.domain}</span>
            </p>
          </div>
          <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">
            {industryLabels[rec.industry]}
          </Badge>
        </div>

        {/* Quick chips */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Badge variant="secondary" className="text-xs text-foreground bg-secondary">
            <Building2 className="h-3 w-3 mr-1" />
            {capacityLabels[rec.capacityTier]}
          </Badge>
          {rec.regions.map(r => (
            <Badge key={r} variant="secondary" className="text-xs text-foreground bg-secondary">
              <Globe className="h-3 w-3 mr-1" />
              {r}
            </Badge>
          ))}
          {rec.detectedConstraints?.slice(0, 3).map(c => (
            <Badge key={c} variant="outline" className="text-xs text-foreground border-border">
              <Shield className="h-3 w-3 mr-1" />
              {c}
            </Badge>
          ))}
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
            {rec.objectives.map((obj, i) => (
              <li key={i} className="text-sm text-studio-body flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                {obj}
              </li>
            ))}
          </ul>
        </div>

        {/* KPI Targets */}
        <div className="grid grid-cols-5 gap-3">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Zap className="h-4 w-4 mx-auto text-amber-500 mb-1" />
            <div className="text-lg font-semibold text-foreground">{rec.kpiTargets.pueTarget}</div>
            <div className="text-xs text-studio-muted">PUE Target</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Leaf className="h-4 w-4 mx-auto text-green-500 mb-1" />
            <div className="text-lg font-semibold text-foreground">{rec.kpiTargets.renewableShareTargetPct}%</div>
            <div className="text-xs text-studio-muted">Renewable</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Shield className="h-4 w-4 mx-auto text-blue-500 mb-1" />
            <div className="text-lg font-semibold text-foreground">{rec.kpiTargets.sovereigntyScoreTargetPct}%</div>
            <div className="text-xs text-studio-muted">Sovereignty</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Thermometer className="h-4 w-4 mx-auto text-orange-500 mb-1" />
            <div className="text-lg font-semibold text-foreground">{rec.kpiTargets.carbonIntensityTargetGPerKwh}</div>
            <div className="text-xs text-studio-muted">g CO₂/kWh</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Server className="h-4 w-4 mx-auto text-purple-500 mb-1" />
            <div className="text-lg font-semibold text-foreground">{rec.kpiTargets.uptimeTargetPct}%</div>
            <div className="text-xs text-studio-muted">Uptime</div>
          </div>
        </div>

        {/* Agents - Collapsible */}
        <Collapsible open={showAgents} onOpenChange={setShowAgents}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full text-foreground">
            <Server className="h-4 w-4 text-primary" />
            Agents to Deploy ({rec.agents.length})
            {showAgents ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="flex flex-wrap gap-2">
              {rec.agents.map(agentId => (
                <Badge key={agentId} variant="secondary" className="text-xs text-foreground bg-secondary">
                  {AGENT_DISPLAY_NAMES[agentId] || agentId}
                </Badge>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Scenarios - Collapsible */}
        <Collapsible open={showScenarios} onOpenChange={setShowScenarios}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full text-foreground">
            <Play className="h-4 w-4 text-primary" />
            Simulation Scenarios ({rec.scenarios.length})
            {showScenarios ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="flex flex-wrap gap-2">
              {rec.scenarios.map(scenarioId => {
                const info = SCENARIO_DISPLAY_INFO[scenarioId];
                return (
                  <Badge 
                    key={scenarioId} 
                    variant="outline" 
                    className={`text-xs ${
                      info?.severity === "critical" ? "border-red-500/50 text-red-700" :
                      info?.severity === "high" ? "border-orange-500/50 text-orange-700" :
                      "border-muted-foreground/30"
                    }`}
                  >
                    {info?.name || scenarioId}
                  </Badge>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Financial Summary */}
        <div className="p-4 rounded-lg bg-muted/30 border">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-foreground">
            <DollarSign className="h-4 w-4 text-primary" />
            Carbon & Cost Model
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-studio-muted">Est. Annual Power Cost</div>
              <div className="font-semibold text-foreground">{formatCurrency(rec.financialModel.baselineAnnualCostUsd)}</div>
            </div>
            <div>
              <div className="text-studio-muted">Est. Annual Carbon</div>
              <div className="font-semibold text-foreground">{rec.financialModel.baselineAnnualCarbonTonnes.toLocaleString()} tonnes</div>
            </div>
            <div>
              <div className="text-studio-muted">Green Upgrade Savings</div>
              <div className="font-semibold text-green-600">
                ~{rec.financialModel.greenVariantSavingsCostPct}% cost, ~{rec.financialModel.greenVariantSavingsCarbonPct}% carbon
              </div>
            </div>
            <div>
              <div className="text-studio-muted">Payback Period</div>
              <div className="font-semibold text-foreground">~{rec.financialModel.estimatedPaybackYears} years</div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {rec.notes.length > 0 && (
          <div className="text-xs text-studio-muted space-y-1 border-t pt-3">
            {rec.notes.map((note, i) => (
              <p key={i}>• {note}</p>
            ))}
          </div>
        )}

        {/* CTAs */}
        <div className="flex gap-3 pt-2">
          <Button onClick={handleOpenBlueprint} className="flex-1">
            <FileText className="h-4 w-4 mr-2" />
            Open Twin Blueprint
          </Button>
          <Button onClick={handleRunSimulation} variant="outline" className="flex-1">
            <Play className="h-4 w-4 mr-2" />
            Run Simulation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

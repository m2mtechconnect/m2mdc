/**
 * Enhanced DC Scan Recommendation Card
 * Executive-ready layout with industry-specific insights, KPI benchmarks, and agent rationale
 * 
 * Industry Sources:
 * - Uptime Institute Tier Standards
 * - The Green Grid PUE Benchmarks
 * - GHG Protocol Scope 2 Guidelines
 * - ASHRAE TC 9.9 Thermal Guidelines
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Building2, 
  Leaf, 
  Shield, 
  Zap, 
  Server,
  ArrowRight,
  Settings,
  Target,
  TrendingUp,
  Globe,
  Play,
  AlertTriangle,
  CheckCircle2,
  Info
} from "lucide-react";
import type { EnhancedDCRecommendation, KPIInsight, AgentRecommendation, ScenarioRecommendation } from "@/types/enhancedRecommendation";
import { INDUSTRY_LABELS } from "@/types/dcScan";

interface EnhancedRecommendationCardProps {
  recommendation: EnhancedDCRecommendation;
  onCreateTwin: () => void;
  onPreviewBlueprint: () => void;
  onPreviewSimulation: () => void;
  isCreating?: boolean;
}

// KPI Insight Block Component
function KPIInsightBlock({ insight }: { insight: KPIInsight }) {
  const statusColors = {
    excellent: 'bg-success/10 border-success/30 text-success',
    good: 'bg-info/10 border-info/30 text-info',
    warning: 'bg-warning/10 border-warning/30 text-warning',
    critical: 'bg-destructive/10 border-destructive/30 text-destructive'
  };

  return (
    <div className={`p-4 rounded-lg border ${statusColors[insight.status]}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-medium text-foreground">{insight.name}</p>
          <p className="text-2xl font-bold">{insight.value} <span className="text-sm font-normal opacity-70">{insight.unit}</span></p>
        </div>
        {insight.status === 'excellent' && <CheckCircle2 className="h-5 w-5" />}
        {insight.status === 'warning' && <AlertTriangle className="h-5 w-5" />}
      </div>
      <div className="space-y-1 text-xs">
        <p className="opacity-80">Target: {insight.target} {insight.unit}</p>
        <p className="opacity-60">vs Industry: {insight.industryBenchmark} {insight.unit}</p>
      </div>
      <p className="mt-2 text-xs text-foreground/80">{insight.interpretation}</p>
    </div>
  );
}

// Agent Card Component
function AgentCard({ agent }: { agent: AgentRecommendation }) {
  const priorityColors = {
    critical: 'border-destructive/50 bg-destructive/5',
    high: 'border-warning/50 bg-warning/5',
    recommended: 'border-primary/50 bg-primary/5',
    optional: 'border-muted-foreground/30 bg-muted/30'
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`p-3 rounded-lg border cursor-help ${priorityColors[agent.priority]}`}>
            <div className="flex items-center gap-2 mb-1">
              <Server className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">{agent.name}</span>
              {agent.priority === 'critical' && (
                <Badge variant="destructive" className="text-xs px-1 py-0">Required</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{agent.purpose}</p>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-medium mb-1">{agent.name}</p>
          <p className="text-xs mb-2">{agent.purpose}</p>
          <p className="text-xs text-primary">{agent.rationale}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Scenario Card Component
function ScenarioCard({ scenario }: { scenario: ScenarioRecommendation }) {
  const severityColors = {
    critical: 'border-destructive/50 text-destructive',
    high: 'border-warning/50 text-warning',
    medium: 'border-info/50 text-info',
    low: 'border-muted-foreground/50 text-muted-foreground'
  };

  return (
    <div className={`p-3 rounded-lg border bg-card ${severityColors[scenario.severity]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-sm text-foreground">{scenario.name}</span>
        <Badge variant="outline" className="text-xs">{scenario.duration}</Badge>
      </div>
      <p className="text-xs text-muted-foreground mb-2">{scenario.description}</p>
      <div className="flex flex-wrap gap-1">
        {scenario.industryRelevance.slice(0, 3).map((tag, i) => (
          <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
        ))}
      </div>
    </div>
  );
}

export function EnhancedRecommendationCard({
  recommendation,
  onCreateTwin,
  onPreviewBlueprint,
  onPreviewSimulation,
  isCreating = false
}: EnhancedRecommendationCardProps) {
  const industryLabel = INDUSTRY_LABELS[recommendation.detectedIndustry];
  const companyDisplay = recommendation.companyName || 'This company';

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-muted/30 overflow-hidden">
      {/* Top Header Section */}
      <CardHeader className="pb-4 border-b border-border/50">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>Sovereign Green AI Data Centre Twin</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              Recommendation for {companyDisplay}
            </h2>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{industryLabel}</Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {recommendation.headerMetrics?.sovereignty || 'CA-Central'}
              </Badge>
              <Badge variant="outline">
                {recommendation.suggestedTier} • {recommendation.suggestedCapacityKw.toLocaleString()} kW
              </Badge>
            </div>
          </div>
          
          {/* Quick Metrics Strip */}
          <div className="flex flex-wrap gap-3">
            <div className="text-center px-3 py-2 bg-success/10 rounded-lg border border-success/30">
              <p className="text-lg font-bold text-success">{recommendation.headerMetrics?.roi || `${Math.round(recommendation.financialModel.projectedOpexReductionPct)}%`}</p>
              <p className="text-xs text-muted-foreground">Projected ROI</p>
            </div>
            <div className="text-center px-3 py-2 bg-info/10 rounded-lg border border-info/30">
              <p className="text-lg font-bold text-info">{recommendation.headerMetrics?.renewable || `${100 - Math.round(recommendation.financialModel.gridCarbonIntensity / 5)}%`}</p>
              <p className="text-xs text-muted-foreground">Renewable</p>
            </div>
            <div className="text-center px-3 py-2 bg-primary/10 rounded-lg border border-primary/30">
              <p className="text-lg font-bold text-primary">{recommendation.suggestedCapacityKw.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">kW Capacity</p>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-8">
        {/* Objectives Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Scan-Derived Objectives</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendation.objectives.map((objective, index) => (
              <div 
                key={index}
                className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border/50"
              >
                <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">{objective.text}</p>
                  <Badge variant="outline" className="text-xs mt-1">{objective.category}</Badge>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* KPI Insights Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Key Performance Insights</h3>
            <Badge variant="outline" className="text-xs">vs Industry Benchmarks</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recommendation.kpiInsights.slice(0, 4).map((insight, index) => (
              <KPIInsightBlock key={index} insight={insight} />
            ))}
          </div>
        </section>

        {/* Agents Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Server className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Recommended Subsystem Agents</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Hover over agents to see why they're recommended for {companyDisplay}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recommendation.agents.slice(0, 6).map((agent, index) => (
              <AgentCard key={index} agent={agent} />
            ))}
          </div>
        </section>

        {/* Scenarios Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Priority Simulation Scenarios</h3>
            <Badge variant="outline" className="text-xs">Industry-Prioritized</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recommendation.scenarios.slice(0, 4).map((scenario, index) => (
              <ScenarioCard key={index} scenario={scenario} />
            ))}
          </div>
        </section>

        {/* Carbon & Cost Executive Narrative */}
        <section className="p-4 bg-gradient-to-r from-success/5 to-info/5 rounded-lg border border-success/20">
          <div className="flex items-center gap-2 mb-3">
            <Leaf className="h-5 w-5 text-success" />
            <h3 className="font-semibold">Carbon & Financial Impact</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-2xl font-bold text-foreground">${(recommendation.financialModel.annualPowerCostUsd / 1000).toFixed(0)}K</p>
              <p className="text-xs text-muted-foreground">Annual Power Cost</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{recommendation.financialModel.annualCarbonTonnes.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Tonnes CO₂e/yr</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-success">{recommendation.financialModel.paybackYears} yrs</p>
              <p className="text-xs text-muted-foreground">Payback Period</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-info">{recommendation.financialModel.projectedCarbonReductionPct}%</p>
              <p className="text-xs text-muted-foreground">Carbon Reduction</p>
            </div>
          </div>
          
          <p className="text-sm text-foreground/90 leading-relaxed">
            {recommendation.financialModel.executiveNarrative}
          </p>
        </section>

        {/* Compliance & Sustainability */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-info" />
              <span className="font-medium text-sm">Compliance Focus</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {recommendation.complianceFocus.map((item, index) => (
                <Badge key={index} variant="secondary" className="text-xs">{item}</Badge>
              ))}
            </div>
          </div>
          
          <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="h-4 w-4 text-success" />
              <span className="font-medium text-sm">Sustainability Focus</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {recommendation.sustainabilityFocus.map((item, index) => (
                <Badge key={index} variant="secondary" className="text-xs">{item}</Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/50">
          <Button 
            onClick={onCreateTwin} 
            disabled={isCreating}
            className="flex-1"
            size="lg"
          >
            {isCreating ? (
              <>Creating Twin...</>
            ) : (
              <>
                Create Green Data Centre Twin
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
          <Button 
            variant="secondary" 
            onClick={onPreviewSimulation}
            disabled={isCreating}
            size="lg"
          >
            <Play className="h-4 w-4 mr-2" />
            Preview Simulation
          </Button>
          <Button 
            variant="outline" 
            onClick={onPreviewBlueprint}
            disabled={isCreating}
            size="lg"
          >
            <Settings className="h-4 w-4 mr-2" />
            Preview Blueprint
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * DC Scan Recommendation Card
 * Displays the recommended Green DC Twin based on scan results
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Leaf, 
  Shield, 
  Cpu, 
  Zap, 
  Server,
  ArrowRight,
  Settings,
  CheckCircle2
} from "lucide-react";
import type { DCRecommendation } from "@/types/dcScan";
import { INDUSTRY_LABELS } from "@/types/dcScan";

interface DCScanRecommendationCardProps {
  recommendation: DCRecommendation;
  onCreateTwin: () => void;
  onAdjustBlueprint: () => void;
  isCreating?: boolean;
}

export function DCScanRecommendationCard({
  recommendation,
  onCreateTwin,
  onAdjustBlueprint,
  isCreating = false
}: DCScanRecommendationCardProps) {
  const industryLabel = INDUSTRY_LABELS[recommendation.detectedIndustry];

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-muted/30">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>Recommended Green Data Centre Twin</span>
            </div>
            <CardTitle className="text-2xl">{recommendation.blueprintName}</CardTitle>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Badge variant="secondary" className="text-xs">
              {industryLabel}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {recommendation.suggestedTier} • {recommendation.suggestedCapacityKw.toLocaleString()} kW
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Summary */}
        <p className="text-muted-foreground leading-relaxed">
          {recommendation.summary}
        </p>

        {/* KPI Chips */}
        <div className="flex flex-wrap gap-2">
          {recommendation.mainKPIs.map((kpi, index) => (
            <Badge 
              key={index} 
              variant="outline" 
              className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"
            >
              <Leaf className="h-3 w-3 mr-1" />
              {kpi}
            </Badge>
          ))}
        </div>

        {/* Compliance & Sustainability */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Shield className="h-4 w-4 text-blue-500" />
              Compliance Focus
            </div>
            <div className="flex flex-wrap gap-1">
              {recommendation.complianceFocus.map((item, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Leaf className="h-4 w-4 text-green-500" />
              Sustainability Focus
            </div>
            <div className="flex flex-wrap gap-1">
              {recommendation.sustainabilityFocus.map((item, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Carbon Target */}
        <div className="p-3 bg-green-500/5 rounded-lg border border-green-500/20">
          <div className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-green-500" />
            <span className="font-medium">Carbon Target:</span>
            <span className="text-muted-foreground">{recommendation.carbonTarget}</span>
          </div>
        </div>

        {/* Cost Focus */}
        <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
          <div className="flex items-center gap-2 text-sm">
            <Cpu className="h-4 w-4 text-blue-500" />
            <span className="font-medium">Cost Optimization:</span>
            <span className="text-muted-foreground">{recommendation.costFocus}</span>
          </div>
        </div>

        {/* Core Agents */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Server className="h-4 w-4" />
            Core Subsystem Agents
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {recommendation.coreAgents.map((agent, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded-md"
              >
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                <span className="truncate">{agent}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button 
            onClick={onCreateTwin} 
            disabled={isCreating}
            className="flex-1"
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
            variant="outline" 
            onClick={onAdjustBlueprint}
            disabled={isCreating}
          >
            <Settings className="h-4 w-4 mr-2" />
            Adjust Blueprint
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

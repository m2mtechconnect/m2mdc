/**
 * Sovereignty Risk Overview - Displays sovereignty metrics in the Risk Overview panel
 */

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SovereigntyEngineResult } from "@/sovereignty";

interface SovereigntyRiskOverviewProps {
  result: SovereigntyEngineResult;
  onClick?: () => void;
}

interface RiskCategory {
  name: string;
  score: number;
  issues: number;
  trend: 'up' | 'down' | 'neutral';
  lastIssue: string;
  description: string;
}

export function SovereigntyRiskOverview({ result, onClick }: SovereigntyRiskOverviewProps) {
  const riskCategories: RiskCategory[] = [
    {
      name: 'Sovereign Compliance Score',
      score: result.sovereigntyScore,
      issues: result.violations.filter(v => v.severity === 'high' || v.severity === 'critical').length,
      trend: result.violations.length > 0 ? 'down' : 'up',
      lastIssue: result.violations[0]?.description || 'No violations detected',
      description: 'Data residency and sovereignty compliance across all workloads',
    },
    {
      name: 'Cross-Border Flow Risk',
      score: Math.max(0, 100 - (result.crossBorderFlowCount * 5)),
      issues: result.crossBorderFlowCount,
      trend: result.crossBorderFlowCount > 5 ? 'down' : 'neutral',
      lastIssue: result.crossBorderFlowCount > 0 ? `${result.crossBorderFlowCount} active cross-border flows` : 'No cross-border flows',
      description: 'Risk assessment of data flows crossing jurisdictional boundaries',
    },
    {
      name: 'Audit Readiness',
      score: result.auditReadinessScore,
      issues: result.frameworkSummary.inProgress,
      trend: result.auditReadinessScore >= 90 ? 'up' : 'neutral',
      lastIssue: result.frameworkSummary.certified > 0 
        ? `${result.frameworkSummary.certified} frameworks certified` 
        : 'No certified frameworks',
      description: 'Readiness for compliance audits based on framework certifications',
    },
    {
      name: 'Data Classification Coverage',
      score: result.dataClassificationDistribution.public < 30 ? 95 : 80,
      issues: Math.round(result.dataClassificationDistribution.public),
      trend: result.dataClassificationDistribution.sovereign > 50 ? 'up' : 'neutral',
      lastIssue: `${Math.round(result.dataClassificationDistribution.sovereign)}% sovereign data`,
      description: 'Coverage and accuracy of data classification across assets',
    },
  ];

  return (
    <div className="space-y-4">
      {riskCategories.map((risk) => {
        const isHighRisk = risk.score < 90;
        return (
          <Tooltip key={risk.name}>
            <TooltipTrigger asChild>
              <div
                className="cursor-pointer hover:bg-muted/50 p-3 rounded-lg transition-colors border border-transparent hover:border-border"
                onClick={onClick}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{risk.name}</span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          isHighRisk
                            ? "border-amber-500 text-amber-600"
                            : "border-green-500 text-green-600"
                        }`}
                      >
                        {risk.issues > 0 ? `${risk.issues} issues` : "Clean"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {risk.lastIssue}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold ml-2">
                    {risk.score}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      isHighRisk ? "bg-amber-500" : "bg-green-500"
                    }`}
                    style={{ width: `${risk.score}%` }}
                  />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p>{risk.description}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

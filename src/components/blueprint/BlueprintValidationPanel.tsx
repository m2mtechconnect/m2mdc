/**
 * Blueprint Validation Panel
 * Shows validation warnings, readiness score, and configuration issues
 * DESIGNER MODE ONLY - not shown in Simulation Snapshot
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Shield,
  Zap,
  Target,
  GitBranch,
  Bot,
  RefreshCw,
} from 'lucide-react';
import { useBlueprintView } from '@/context/BlueprintViewContext';
import { cn } from '@/lib/utils';
import type { DataCentreBlueprint } from '@/types/dataCentreBlueprint';

interface ValidationIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: 'structure' | 'agents' | 'kpis' | 'workflows' | 'scenarios' | 'compliance' | 'performance';
  message: string;
  suggestion?: string;
  affectedEntity?: string;
}

interface BlueprintValidationPanelProps {
  blueprint: DataCentreBlueprint;
  className?: string;
}

/**
 * Validate blueprint and return issues
 */
function validateBlueprint(blueprint: DataCentreBlueprint): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  // Structure validation
  if (!blueprint.name || blueprint.name.length < 3) {
    issues.push({
      id: 'name-missing',
      type: 'error',
      category: 'structure',
      message: 'Blueprint name is missing or too short',
      suggestion: 'Add a descriptive name (minimum 3 characters)',
    });
  }
  
  if (!blueprint.location) {
    issues.push({
      id: 'location-missing',
      type: 'warning',
      category: 'structure',
      message: 'Location is not specified',
      suggestion: 'Specify the data centre location for compliance tracking',
    });
  }
  
  // Agent validation
  if (blueprint.agents.length === 0) {
    issues.push({
      id: 'no-agents',
      type: 'error',
      category: 'agents',
      message: 'No agents configured',
      suggestion: 'Add at least one monitoring agent for each critical domain',
    });
  }
  
  const activeAgents = blueprint.agents.filter(a => a.status === 'active');
  if (activeAgents.length < 3) {
    issues.push({
      id: 'few-active-agents',
      type: 'warning',
      category: 'agents',
      message: `Only ${activeAgents.length} active agents configured`,
      suggestion: 'Recommended minimum of 3 active agents for basic coverage',
    });
  }
  
  // Check for critical domain coverage
  const agentDomainStrings = blueprint.agents.map(a => a.domain as string);
  const criticalDomains = ['thermal_hardware', 'power_ups', 'cooling'];
  criticalDomains.forEach(domain => {
    if (!agentDomainStrings.includes(domain)) {
      issues.push({
        id: `missing-domain-${domain}`,
        type: 'warning',
        category: 'agents',
        message: `No agent for critical domain: ${domain.replace('_', ' ')}`,
        suggestion: `Add a monitoring agent for ${domain.replace('_', ' ')}`,
        affectedEntity: domain,
      });
    }
  });
  
  // KPI validation
  if (blueprint.kpis.length === 0) {
    issues.push({
      id: 'no-kpis',
      type: 'error',
      category: 'kpis',
      message: 'No KPIs configured',
      suggestion: 'Add KPIs to track operational performance',
    });
  }
  
  const kpisWithoutThresholds = blueprint.kpis.filter(
    k => !k.warningThreshold || !k.criticalThreshold
  );
  if (kpisWithoutThresholds.length > 0) {
    issues.push({
      id: 'kpis-no-thresholds',
      type: 'warning',
      category: 'kpis',
      message: `${kpisWithoutThresholds.length} KPIs missing threshold configuration`,
      suggestion: 'Set warning and critical thresholds for all KPIs',
    });
  }
  
  // Workflow validation
  if (blueprint.workflows.length === 0) {
    issues.push({
      id: 'no-workflows',
      type: 'warning',
      category: 'workflows',
      message: 'No automated workflows configured',
      suggestion: 'Add workflows for automated incident response',
    });
  }
  
  const enabledWorkflows = blueprint.workflows.filter(w => w.enabled);
  if (enabledWorkflows.length === 0 && blueprint.workflows.length > 0) {
    issues.push({
      id: 'no-enabled-workflows',
      type: 'warning',
      category: 'workflows',
      message: 'All workflows are disabled',
      suggestion: 'Enable at least one critical workflow',
    });
  }
  
  // Scenario validation
  if (blueprint.simulationScenarios.length === 0) {
    issues.push({
      id: 'no-scenarios',
      type: 'info',
      category: 'scenarios',
      message: 'No simulation scenarios configured',
      suggestion: 'Add scenarios to test system resilience',
    });
  }
  
  const emergencyScenarios = blueprint.simulationScenarios.filter(
    s => s.severity === 'emergency' || s.severity === 'critical'
  );
  if (emergencyScenarios.length === 0 && blueprint.simulationScenarios.length > 0) {
    issues.push({
      id: 'no-critical-scenarios',
      type: 'info',
      category: 'scenarios',
      message: 'No emergency/critical scenarios configured',
      suggestion: 'Add critical scenarios to test worst-case responses',
    });
  }
  
  // Compliance validation
  if (!blueprint.jurisdiction) {
    issues.push({
      id: 'no-jurisdiction',
      type: 'warning',
      category: 'compliance',
      message: 'Data jurisdiction not specified',
      suggestion: 'Set jurisdiction for sovereignty compliance',
    });
  }
  
  // Performance validation
  if (blueprint.capacityKw > 50 && activeAgents.length < 5) {
    issues.push({
      id: 'capacity-agent-mismatch',
      type: 'warning',
      category: 'performance',
      message: 'Large facility with limited agent coverage',
      suggestion: `${blueprint.capacityKw}kW facility should have more monitoring agents`,
    });
  }
  
  return issues;
}

/**
 * Calculate readiness score from validation issues
 */
function calculateReadinessScore(issues: ValidationIssue[]): number {
  const errors = issues.filter(i => i.type === 'error').length;
  const warnings = issues.filter(i => i.type === 'warning').length;
  const infos = issues.filter(i => i.type === 'info').length;
  
  // Base score of 100, subtract for issues
  let score = 100;
  score -= errors * 15; // Errors are severe
  score -= warnings * 5; // Warnings are moderate
  score -= infos * 1; // Info is minor
  
  return Math.max(0, Math.min(100, score));
}

export function BlueprintValidationPanel({ blueprint, className }: BlueprintValidationPanelProps) {
  const { mode, canShow } = useBlueprintView();

  const issues = useMemo(() => validateBlueprint(blueprint), [blueprint]);
  const readinessScore = useMemo(() => calculateReadinessScore(issues), [issues]);

  // Only show in designer mode. Checked after the hooks so hook order stays
  // stable across renders.
  const visible = canShow('showValidationWarnings');

  const errors = issues.filter(i => i.type === 'error');
  const warnings = issues.filter(i => i.type === 'warning');
  const infos = issues.filter(i => i.type === 'info');
  
  const getScoreColor = () => {
    if (readinessScore >= 90) return 'text-success';
    if (readinessScore >= 70) return 'text-warning';
    return 'text-destructive';
  };
  
  const getScoreLabel = () => {
    if (readinessScore >= 90) return 'Excellent';
    if (readinessScore >= 70) return 'Good';
    if (readinessScore >= 50) return 'Needs Improvement';
    return 'Critical Issues';
  };
  
  const getIssueIcon = (type: ValidationIssue['type']) => {
    switch (type) {
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'info': return <Info className="h-4 w-4 text-info" />;
    }
  };
  
  const getCategoryIcon = (category: ValidationIssue['category']) => {
    switch (category) {
      case 'structure': return <Shield className="h-3 w-3" />;
      case 'agents': return <Bot className="h-3 w-3" />;
      case 'kpis': return <Target className="h-3 w-3" />;
      case 'workflows': return <GitBranch className="h-3 w-3" />;
      case 'scenarios': return <Zap className="h-3 w-3" />;
      case 'compliance': return <Shield className="h-3 w-3" />;
      case 'performance': return <Zap className="h-3 w-3" />;
    }
  };
  
  if (!visible) return null;

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Blueprint Validation
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 px-2">
            <RefreshCw className="h-3 w-3 mr-1" />
            Revalidate
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Readiness Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Readiness Score</span>
            <div className="flex items-center gap-2">
              <span className={cn('text-2xl font-bold', getScoreColor())}>
                {readinessScore}
              </span>
              <Badge variant="outline" className="text-xs">
                {getScoreLabel()}
              </Badge>
            </div>
          </div>
          <Progress 
            value={readinessScore} 
            className={cn(
              'h-2',
              readinessScore >= 90 ? '[&>div]:bg-success' :
              readinessScore >= 70 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive'
            )}
          />
        </div>
        
        {/* Issue Summary */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <XCircle className="h-4 w-4 text-destructive" />
            <span className="text-muted-foreground">Errors:</span>
            <span className="font-medium">{errors.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-muted-foreground">Warnings:</span>
            <span className="font-medium">{warnings.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Info className="h-4 w-4 text-info" />
            <span className="text-muted-foreground">Info:</span>
            <span className="font-medium">{infos.length}</span>
          </div>
        </div>
        
        {/* Issue List */}
        {issues.length > 0 ? (
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className={cn(
                    'p-3 rounded-lg border',
                    issue.type === 'error' ? 'bg-destructive/5 border-destructive/20' :
                    issue.type === 'warning' ? 'bg-warning/5 border-warning/20' :
                    'bg-info/5 border-info/20'
                  )}
                >
                  <div className="flex items-start gap-2">
                    {getIssueIcon(issue.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{issue.message}</span>
                        <Badge variant="outline" className="text-[10px] gap-1">
                          {getCategoryIcon(issue.category)}
                          {issue.category}
                        </Badge>
                      </div>
                      {issue.suggestion && (
                        <p className="text-xs text-muted-foreground">{issue.suggestion}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-success mb-3" />
            <p className="text-sm font-medium">All checks passed!</p>
            <p className="text-xs text-muted-foreground">Blueprint is ready for deployment</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Deployment Warnings Panel
 * Shows warnings for missing configurations
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, GitBranch, Database, Play, Target, 
  Brain, ChevronRight
} from 'lucide-react';

interface Warning {
  id: string;
  message: string;
  severity: 'critical' | 'warning';
  fixStep: number;
  icon: any;
}

interface DeploymentWarningsProps {
  builderState: any;
  simulationHistory: any[];
  onNavigateToStep: (step: number) => void;
}

export function DeploymentWarnings({
  builderState,
  simulationHistory,
  onNavigateToStep
}: DeploymentWarningsProps) {
  const warnings: Warning[] = [];

  // Check for missing workflows
  if (!builderState?.workflow?.actions?.length) {
    warnings.push({
      id: 'no-workflows',
      message: 'No workflows configured. Your agent needs at least one workflow to function.',
      severity: 'critical',
      fixStep: 4,
      icon: GitBranch
    });
  }

  // Check for missing data sources
  if (!builderState?.workflow?.integrations?.length && !builderState?.connectors?.length) {
    warnings.push({
      id: 'no-datasources',
      message: 'No data sources connected. Consider adding integrations for richer functionality.',
      severity: 'warning',
      fixStep: 3,
      icon: Database
    });
  }

  // Check for no simulations
  if (simulationHistory.length === 0) {
    warnings.push({
      id: 'no-simulation',
      message: 'No simulation runs yet. Testing before deployment is recommended.',
      severity: 'warning',
      fixStep: 5,
      icon: Play
    });
  }

  // Check for missing KPIs
  if (!builderState?.kpis?.length) {
    warnings.push({
      id: 'no-kpis',
      message: 'No KPIs defined. Add KPIs to track agent performance over time.',
      severity: 'warning',
      fixStep: 5,
      icon: Target
    });
  }

  // Check for missing model or instructions
  if (!builderState?.modelConfig?.model) {
    warnings.push({
      id: 'no-model',
      message: 'No AI model selected. Configure intelligence settings to proceed.',
      severity: 'critical',
      fixStep: 2,
      icon: Brain
    });
  }

  if (warnings.length === 0) {
    return null;
  }

  const criticalCount = warnings.filter(w => w.severity === 'critical').length;
  const warningCount = warnings.filter(w => w.severity === 'warning').length;

  return (
    <Card className="border-yellow-500/50 bg-yellow-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <CardTitle className="text-lg">Deployment Warnings</CardTitle>
          <span className="text-sm text-muted-foreground ml-auto">
            {criticalCount > 0 && <span className="text-destructive font-medium">{criticalCount} critical</span>}
            {criticalCount > 0 && warningCount > 0 && ' · '}
            {warningCount > 0 && <span className="text-yellow-600">{warningCount} warning</span>}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {warnings.map((warning) => {
          const Icon = warning.icon;
          return (
            <div
              key={warning.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                warning.severity === 'critical'
                  ? 'bg-destructive/10 border-destructive/30'
                  : 'bg-yellow-500/10 border-yellow-500/30'
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                <Icon className={`h-4 w-4 ${
                  warning.severity === 'critical' ? 'text-destructive' : 'text-yellow-600'
                }`} />
                <span className={`text-sm ${
                  warning.severity === 'critical' ? 'text-destructive' : 'text-yellow-700 dark:text-yellow-300'
                }`}>
                  {warning.message}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateToStep(warning.fixStep)}
                className="shrink-0 gap-1"
              >
                Fix
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

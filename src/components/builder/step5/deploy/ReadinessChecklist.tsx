/**
 * Deployment Readiness Checklist
 * Auto-evaluates twin configuration and shows pass/fail status
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { 
  Check, X, AlertTriangle, ChevronDown, 
  Brain, Plug, GitBranch, Play, Target, Tag, Shield, FileText
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export interface ReadinessItem {
  id: string;
  label: string;
  status: 'ok' | 'warning' | 'missing';
  tooltip: string;
  fixStep?: number;
  icon: any;
}

interface ReadinessChecklistProps {
  builderState: any;
  simulationHistory: any[];
  versionHistory: any[];
  governanceConfig: any;
  onNavigateToStep: (step: number) => void;
}

export function ReadinessChecklist({
  builderState,
  simulationHistory,
  versionHistory,
  governanceConfig,
  onNavigateToStep
}: ReadinessChecklistProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [items, setItems] = useState<ReadinessItem[]>([]);

  useEffect(() => {
    const checkItems: ReadinessItem[] = [
      {
        id: 'intelligence',
        label: 'Intelligence configured',
        status: builderState?.modelConfig?.model ? 'ok' : 'missing',
        tooltip: builderState?.modelConfig?.model 
          ? `Model: ${builderState.modelConfig.model}` 
          : 'Select an AI model in Step 2',
        fixStep: 2,
        icon: Brain
      },
      {
        id: 'tools',
        label: 'Tools & integrations connected',
        status: (builderState?.workflow?.integrations?.length > 0) ? 'ok' : 'warning',
        tooltip: builderState?.workflow?.integrations?.length > 0
          ? `${builderState.workflow.integrations.length} integration(s) connected`
          : 'No integrations configured - agent may have limited capabilities',
        fixStep: 3,
        icon: Plug
      },
      {
        id: 'workflows',
        label: 'At least 1 workflow enabled',
        status: (builderState?.workflow?.actions?.length > 0) ? 'ok' : 'missing',
        tooltip: builderState?.workflow?.actions?.length > 0
          ? `${builderState.workflow.actions.length} workflow action(s) configured`
          : 'Create at least one workflow in Step 4',
        fixStep: 4,
        icon: GitBranch
      },
      {
        id: 'simulation',
        label: 'Simulation run at least once',
        status: simulationHistory.length > 0 ? 'ok' : 'warning',
        tooltip: simulationHistory.length > 0
          ? `${simulationHistory.length} simulation run(s) completed`
          : 'Running a simulation before deployment is recommended',
        fixStep: undefined,
        icon: Play
      },
      {
        id: 'kpis',
        label: 'KPIs configured',
        status: builderState?.kpis?.length > 0 ? 'ok' : 'warning',
        tooltip: builderState?.kpis?.length > 0
          ? `${builderState.kpis.length} KPI(s) defined`
          : 'Consider adding KPIs to track agent performance',
        fixStep: undefined,
        icon: Target
      },
      {
        id: 'version',
        label: 'Version snapshot created',
        status: versionHistory.length > 0 ? 'ok' : 'warning',
        tooltip: versionHistory.length > 0
          ? `Version ${versionHistory[0]?.version || '1.0.0'} ready`
          : 'A version snapshot will be created on deploy',
        fixStep: undefined,
        icon: FileText
      },
      {
        id: 'governance',
        label: 'Governance tags applied',
        status: governanceConfig?.tags?.length > 0 ? 'ok' : 'warning',
        tooltip: governanceConfig?.tags?.length > 0
          ? `${governanceConfig.tags.length} governance tag(s) applied`
          : 'Consider adding governance tags for compliance tracking',
        fixStep: undefined,
        icon: Shield
      }
    ];

    setItems(checkItems);
  }, [builderState, simulationHistory, versionHistory, governanceConfig]);

  const okCount = items.filter(i => i.status === 'ok').length;
  const warningCount = items.filter(i => i.status === 'warning').length;
  const missingCount = items.filter(i => i.status === 'missing').length;
  const allPassed = missingCount === 0;

  const statusIcon = (status: ReadinessItem['status']) => {
    switch (status) {
      case 'ok':
        return <Check className="h-4 w-4 text-success" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'missing':
        return <X className="h-4 w-4 text-destructive" />;
    }
  };

  const statusBg = (status: ReadinessItem['status']) => {
    switch (status) {
      case 'ok':
        return 'bg-success/10 border-success/20';
      case 'warning':
        return 'bg-warning/10 border-warning/20';
      case 'missing':
        return 'bg-destructive/10 border-destructive/20';
    }
  };

  return (
    <TooltipProvider>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">Deployment Readiness</CardTitle>
                  <div className="flex gap-2">
                    {okCount > 0 && (
                      <Badge variant="secondary" className="bg-success/10 text-success">
                        {okCount} OK
                      </Badge>
                    )}
                    {warningCount > 0 && (
                      <Badge variant="secondary" className="bg-warning/10 text-warning">
                        {warningCount} Warning
                      </Badge>
                    )}
                    {missingCount > 0 && (
                      <Badge variant="destructive">
                        {missingCount} Missing
                      </Badge>
                    )}
                  </div>
                </div>
                <ChevronDown className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform",
                  isOpen && "rotate-180"
                )} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>
                        <div className={cn(
                          "flex items-center justify-between p-3 rounded-lg border transition-colors",
                          statusBg(item.status)
                        )}>
                          <div className="flex items-center gap-3">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{item.label}</span>
                            {statusIcon(item.status)}
                          </div>
                          {item.status !== 'ok' && item.fixStep && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigateToStep(item.fixStep!);
                              }}
                              className="text-xs"
                            >
                              Fix in Step {item.fixStep}
                            </Button>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p>{item.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>

              {allPassed && (
                <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded-lg">
                  <div className="flex items-center gap-2 text-success">
                    <Check className="h-5 w-5" />
                    <span className="font-medium">All critical checks passed! Ready for deployment.</span>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </TooltipProvider>
  );
}

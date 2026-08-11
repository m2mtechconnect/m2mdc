/**
 * Workflow structure validation (Stage 7H, item 6).
 *
 * Replaces the former "Simulation Preview" inside Blueprint. This is a purely
 * structural, local check of a modelled workflow definition. It creates no
 * simulation record, starts no solver, applies no control action and changes
 * no facility state.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, Info, ListChecks } from 'lucide-react';
import type { WorkflowBlueprint } from '@/types/dataCentreBlueprint';

interface Props {
  workflow?: WorkflowBlueprint | null;
  className?: string;
}

interface CheckResult {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'unavailable';
  detail: string;
}

/** Local, deterministic structural checks. No execution of any kind. */
export function validateWorkflowStructure(workflow?: WorkflowBlueprint | null): CheckResult[] {
  if (!workflow) {
    return [
      {
        id: 'selection',
        label: 'Workflow selected',
        status: 'unavailable',
        detail: 'Select a workflow in the registry to validate its structure.',
      },
    ];
  }

  const actions = workflow.actions ?? [];
  const mitigations = workflow.recommendedMitigation ?? [];

  return [
    {
      id: 'trigger',
      label: 'Trigger defined',
      status: workflow.triggerCondition ? 'pass' : 'warn',
      detail: workflow.triggerCondition || 'No trigger condition is modelled.',
    },
    {
      id: 'actions',
      label: 'Action sequence',
      status: actions.length > 0 ? 'pass' : 'warn',
      detail: actions.length > 0 ? `${actions.length} modelled action(s).` : 'No actions are modelled.',
    },
    {
      id: 'mitigation',
      label: 'Recommended mitigation',
      status: mitigations.length > 0 ? 'pass' : 'warn',
      detail: mitigations.length > 0 ? mitigations.join(', ') : 'No mitigation steps declared.',
    },
    {
      id: 'domain',
      label: 'Domain assignment',
      status: workflow.domain ? 'pass' : 'warn',
      detail: workflow.domain ? String(workflow.domain) : 'Workflow is not assigned to a domain.',
    },
  ];
}

const STATUS_STYLE: Record<CheckResult['status'], string> = {
  pass: 'border-success/30 bg-success/5',
  warn: 'border-warning/30 bg-warning/5',
  unavailable: 'border-border bg-muted/30',
};

export function WorkflowStructureValidation({ workflow, className }: Props) {
  const checks = validateWorkflowStructure(workflow);
  const passing = checks.filter((c) => c.status === 'pass').length;

  return (
    <Card className={className} data-testid="workflow-structure-validation">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4 text-primary" aria-hidden />
            Structure validation
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Preview only
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {workflow ? workflow.name : 'Select a workflow'}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          {passing}/{checks.length} structural checks pass.
        </p>

        <ul className="space-y-1.5">
          {checks.map((check) => (
            <li key={check.id} className={`rounded-lg border p-3 ${STATUS_STYLE[check.status]}`}>
              <div className="flex items-start gap-2">
                {check.status === 'pass' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{check.label}</p>
                  <p className="text-xs text-muted-foreground break-words">{check.detail}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Structural validation only. It does not execute the workflow, does not create a
            simulation run and does not change facility state. Sample values shown in the registry
            are modelled inputs, not measurements. Run scenarios in the Simulation workspace.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

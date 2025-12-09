import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, AlertTriangle, ChevronDown } from 'lucide-react';
import { validateBuilderForDeploy } from '@/lib/validation/builderValidation';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';

interface DeploymentReadinessChecklistProps {
  template: any;
  builderState?: any;
  onFixIssue?: (step: number) => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  check: boolean;
  fixStep?: number;
  fixLabel?: string;
}

export function DeploymentReadinessChecklist({ 
  template, 
  builderState,
  onFixIssue 
}: DeploymentReadinessChecklistProps) {
  const [isOpen, setIsOpen] = useState(true);
  const config = template.default_config || {};
  const blueprintJson = config.blueprint_json || {};
  const workflows = Array.isArray(config.workflows) ? config.workflows : [];
  
  // Perform validation checks
  const intelligenceConfigured = !!config.model_config?.model;
  const dataSourcesConnected = Array.isArray(blueprintJson.data_sources) && 
    blueprintJson.data_sources.some((ds: any) => ds.required);
  const integrationsConnected = Array.isArray(blueprintJson.integrations) && 
    blueprintJson.integrations.length > 0;
  const workflowsValid = workflows.length > 0 && 
    workflows.every((w: any) => w.triggers?.length > 0 && w.actions?.length > 0);
  const ragConfigured = config.rag?.provider ? true : !config.requires_rag;
  const schemaValid = !!template.id && !!template.name;
  
  // Check builder state if provided
  let builderValid = true;
  if (builderState) {
    const validation = validateBuilderForDeploy(builderState);
    builderValid = validation.isValid;
  }
  
  const checklist: ChecklistItem[] = [
    {
      id: 'intelligence',
      label: 'Intelligence settings configured',
      check: intelligenceConfigured,
      fixStep: 2,
      fixLabel: 'Configure Intelligence'
    },
    {
      id: 'datasources',
      label: 'Required data sources connected',
      check: dataSourcesConnected,
      fixStep: 3,
      fixLabel: 'Connect Data Sources'
    },
    {
      id: 'integrations',
      label: 'Required integrations connected',
      check: integrationsConnected,
      fixStep: 3,
      fixLabel: 'Connect Integrations'
    },
    {
      id: 'workflows',
      label: 'All workflows have valid triggers/actions',
      check: workflowsValid,
      fixStep: 4,
      fixLabel: 'Configure Workflows'
    },
    {
      id: 'rag',
      label: 'RAG / vector DB configured (if needed)',
      check: ragConfigured,
      fixStep: 2,
      fixLabel: 'Configure RAG'
    },
    {
      id: 'schema',
      label: 'Template passes schema validation',
      check: schemaValid,
      fixStep: 1,
      fixLabel: 'Fix Template'
    },
    {
      id: 'builder',
      label: 'No missing fields in Step 1–5 builder prepopulation',
      check: builderValid,
      fixStep: 1,
      fixLabel: 'Complete Builder'
    }
  ];
  
  const allValid = checklist.every(item => item.check);
  const failedChecks = checklist.filter(item => !item.check);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="p-6">
        <CollapsibleTrigger className="flex items-center justify-between w-full group">
          <h3 className="text-xl font-semibold">Deployment Readiness Checklist</h3>
          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-4">
          {!allValid && (
        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                {failedChecks.length} issue{failedChecks.length !== 1 ? 's' : ''} found
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Please address the issues below before deploying
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        {checklist.map((item) => (
          <div 
            key={item.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              item.check 
                ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900' 
                : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              {item.check ? (
                <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
              ) : (
                <X className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
              )}
              <span className={`text-sm ${
                item.check 
                  ? 'text-green-900 dark:text-green-100' 
                  : 'text-red-900 dark:text-red-100'
              }`}>
                {item.label}
              </span>
            </div>
            
            {!item.check && onFixIssue && item.fixStep && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFixIssue(item.fixStep!)}
                className="shrink-0"
              >
                {item.fixLabel || 'Fix'}
              </Button>
            )}
          </div>
        ))}
      </div>
      
          {allValid && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  All checks passed! Ready to deploy.
                </p>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

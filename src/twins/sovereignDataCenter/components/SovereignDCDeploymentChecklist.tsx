/**
 * Sovereign DC Twin - Deployment Readiness Checklist
 * Twin-specific validation for sovereign, green AI data centre deployments
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, AlertTriangle, ChevronDown, Shield, Zap, Activity, Leaf } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface SovereignDCDeploymentChecklistProps {
  template: any;
  onFixIssue?: (step: number) => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  check: boolean;
  category: 'intelligence' | 'data' | 'workflow' | 'compliance' | 'simulation';
  fixStep?: number;
  fixLabel?: string;
}

export function SovereignDCDeploymentChecklist({ 
  template, 
  onFixIssue 
}: SovereignDCDeploymentChecklistProps) {
  const [isOpen, setIsOpen] = useState(true);
  const config = template?.default_config || {};
  const blueprintJson = config.blueprint_json || config.preview_sections?.blueprint || {};
  const workflows = Array.isArray(config.workflows) ? config.workflows : [];
  const kpiBlock = config.kpi_block || {};
  const simulationConfig = config.simulation_preview_config || {};
  
  // Twin-specific validation checks
  const checklist: ChecklistItem[] = [
    // Intelligence & Optimization Models
    {
      id: 'intelligence-model',
      label: 'AI model configured for optimization + emissions + risk',
      description: 'Gemini/GPT model set for multi-objective optimization across efficiency, emissions, and risk domains',
      check: !!config.model && (typeof config.model === 'string' ? config.model.includes('gemini') : true),
      category: 'intelligence',
      fixStep: 2,
      fixLabel: 'Configure Model'
    },
    {
      id: 'intelligence-prompt',
      label: 'System prompt includes sovereign DC domain context',
      description: 'Prompt references PUE, emissions, sovereignty, and Canadian regulations',
      check: config.system_prompt?.toLowerCase().includes('sovereign') || 
             config.system_prompt?.toLowerCase().includes('pue') ||
             config.system_prompt?.toLowerCase().includes('carbon'),
      category: 'intelligence',
      fixStep: 2,
      fixLabel: 'Update Prompt'
    },
    
    // Data Sources
    {
      id: 'data-gpu-clusters',
      label: 'GPU cluster telemetry source connected',
      description: 'HPC/GPU utilization, job queues, tenant allocations from Slurm/K8s',
      check: blueprintJson.data_sources?.some((ds: any) => 
        ds.name?.toLowerCase().includes('gpu') || ds.name?.toLowerCase().includes('hpc')
      ) ?? false,
      category: 'data',
      fixStep: 3,
      fixLabel: 'Connect GPU Data'
    },
    {
      id: 'data-energy',
      label: 'Energy & DCIM telemetry source connected',
      description: 'Power draw, cooling temps, PUE metrics from DCIM/BMS',
      check: blueprintJson.data_sources?.some((ds: any) => 
        ds.name?.toLowerCase().includes('dcim') || ds.name?.toLowerCase().includes('energy')
      ) ?? false,
      category: 'data',
      fixStep: 3,
      fixLabel: 'Connect Energy Data'
    },
    {
      id: 'data-carbon',
      label: 'Carbon intensity feed connected',
      description: 'Grid carbon intensity, renewable %, emissions factors',
      check: blueprintJson.data_sources?.some((ds: any) => 
        ds.name?.toLowerCase().includes('carbon') || 
        ds.name?.toLowerCase().includes('energy provider') ||
        ds.description?.toLowerCase().includes('carbon')
      ) ?? false,
      category: 'data',
      fixStep: 3,
      fixLabel: 'Connect Carbon Feed'
    },
    {
      id: 'data-compliance',
      label: 'Policy & compliance sources configured',
      description: 'Data residency rules, PIPEDA requirements, tenant SLAs',
      check: blueprintJson.data_sources?.some((ds: any) => 
        ds.name?.toLowerCase().includes('policy') || ds.name?.toLowerCase().includes('compliance')
      ) ?? false,
      category: 'data',
      fixStep: 3,
      fixLabel: 'Connect Compliance Data'
    },
    
    // Workflows
    {
      id: 'workflow-gpu-saturation',
      label: 'GPU saturation workflow defined',
      description: 'Triggers when GPU utilization exceeds threshold, initiates workload balancing',
      check: workflows.some((w: any) => 
        w.name?.toLowerCase().includes('gpu') || w.trigger?.toLowerCase().includes('gpu')
      ),
      category: 'workflow',
      fixStep: 4,
      fixLabel: 'Add GPU Workflow'
    },
    {
      id: 'workflow-pue-spike',
      label: 'PUE spike / cooling alert workflow defined',
      description: 'Triggers on PUE degradation or cooling anomalies',
      check: workflows.some((w: any) => 
        w.name?.toLowerCase().includes('cooling') || 
        w.name?.toLowerCase().includes('pue') ||
        w.trigger?.toLowerCase().includes('temperature')
      ),
      category: 'workflow',
      fixStep: 4,
      fixLabel: 'Add Cooling Workflow'
    },
    {
      id: 'workflow-sovereignty',
      label: 'Sovereignty violation workflow defined',
      description: 'Triggers when data flow detected to non-Canadian jurisdiction',
      check: workflows.some((w: any) => 
        w.name?.toLowerCase().includes('sovereign') || w.trigger?.toLowerCase().includes('sovereign')
      ),
      category: 'workflow',
      fixStep: 4,
      fixLabel: 'Add Sovereignty Workflow'
    },
    {
      id: 'workflow-carbon',
      label: 'Carbon price shock workflow defined',
      description: 'Triggers on carbon price threshold, updates financial models',
      check: workflows.some((w: any) => 
        w.name?.toLowerCase().includes('carbon') || w.trigger?.toLowerCase().includes('carbon')
      ),
      category: 'workflow',
      fixStep: 4,
      fixLabel: 'Add Carbon Workflow'
    },
    
    // Compliance & RAG
    {
      id: 'rag-policies',
      label: 'RAG configured for policies & regulatory docs',
      description: 'Vector store includes PIPEDA, provincial data laws, internal policies',
      check: config.rag?.provider ? true : false,
      category: 'compliance',
      fixStep: 2,
      fixLabel: 'Configure RAG'
    },
    {
      id: 'canadian-regions',
      label: 'Deployment restricted to Canadian regions',
      description: 'AWS ca-central-1, Azure canadacentral, GCP northamerica-northeast1',
      check: config.cloud_metadata?.aws?.region?.includes('ca-') || 
             config.cloud_metadata?.azure?.region?.includes('canada') ||
             config.cloud_metadata?.gcp?.region?.includes('northamerica'),
      category: 'compliance',
      fixStep: 5,
      fixLabel: 'Set Canadian Region'
    },
    
    // Simulation & KPIs
    {
      id: 'kpis-configured',
      label: 'Twin KPIs populated (PUE, gCO₂e, Sovereign Ratio)',
      description: 'All core KPIs defined with targets and thresholds',
      check: (kpiBlock.kpis?.length > 0) || (Object.keys(simulationConfig.baseline_metrics || {}).length > 5),
      category: 'simulation',
      fixStep: 1,
      fixLabel: 'Configure KPIs'
    },
    {
      id: 'simulation-scenarios',
      label: 'Simulation scenarios configured',
      description: 'GPU overload, cooling failure, carbon shock, sovereignty scenarios ready',
      check: (simulationConfig.scenarios?.length > 0),
      category: 'simulation',
      fixStep: 5,
      fixLabel: 'Add Scenarios'
    },
  ];
  
  const categoryIcons = {
    intelligence: Zap,
    data: Activity,
    workflow: Shield,
    compliance: Shield,
    simulation: Leaf,
  };
  
  const categoryLabels = {
    intelligence: 'Intelligence & Optimization',
    data: 'Data Sources & Telemetry',
    workflow: 'Operational Workflows',
    compliance: 'Sovereignty & Compliance',
    simulation: 'KPIs & Simulation',
  };
  
  const allValid = checklist.every(item => item.check);
  const failedChecks = checklist.filter(item => !item.check);
  const passedCount = checklist.filter(item => item.check).length;
  
  // Group by category
  const groupedChecklist = checklist.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="p-6">
        <CollapsibleTrigger className="flex items-center justify-between w-full group">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold">Sovereign Deployment Readiness</h3>
            <Badge variant={allValid ? 'default' : 'secondary'}>
              {passedCount}/{checklist.length} passed
            </Badge>
          </div>
          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-4">
          {/* Summary Banner */}
          {!allValid ? (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                    {failedChecks.length} configuration{failedChecks.length !== 1 ? 's' : ''} required for sovereign deployment
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Complete all checks to ensure data sovereignty, emissions tracking, and operational workflows are properly configured.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Sovereign deployment ready
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    All sovereignty, emissions, and operational checks passed.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Grouped Checklist */}
          <div className="space-y-6">
            {Object.entries(groupedChecklist).map(([category, items]) => {
              const CategoryIcon = categoryIcons[category as keyof typeof categoryIcons];
              const categoryPassed = items.every(item => item.check);
              
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <CategoryIcon className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {categoryLabels[category as keyof typeof categoryLabels]}
                    </h4>
                    {categoryPassed && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div 
                        key={item.id}
                        className={`flex items-start justify-between p-3 rounded-lg border ${
                          item.check 
                            ? 'bg-green-50/50 dark:bg-green-950/10 border-green-200/50 dark:border-green-900/50' 
                            : 'bg-red-50/50 dark:bg-red-950/10 border-red-200/50 dark:border-red-900/50'
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-1">
                          {item.check ? (
                            <Check className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                          ) : (
                            <X className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm font-medium ${
                              item.check 
                                ? 'text-green-900 dark:text-green-100' 
                                : 'text-red-900 dark:text-red-100'
                            }`}>
                              {item.label}
                            </span>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {item.description}
                            </p>
                          </div>
                        </div>
                        
                        {!item.check && onFixIssue && item.fixStep && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onFixIssue(item.fixStep!)}
                            className="shrink-0 text-xs h-7"
                          >
                            {item.fixLabel || 'Fix'}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
/**
 * Blueprint Workflows Tab - All workflows and triggers
 * Enhanced with Version Control and Simulation Preview
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  GitBranch, 
  Play,
  Pause,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Eye,
  History
} from 'lucide-react';
import { WORKFLOWS, getWorkflowDescription } from '@/ux';
import type { WorkflowBlueprint } from '@/types/dataCentreBlueprint';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { WorkflowVersionControl } from '../WorkflowVersionControl';
import { WorkflowStructureValidation } from '../WorkflowStructureValidation';

interface BlueprintWorkflowsTabProps {
  workflows: WorkflowBlueprint[];
}

export function BlueprintWorkflowsTab({ workflows }: BlueprintWorkflowsTabProps) {
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowBlueprint | null>(null);
  const [showVersionControl, setShowVersionControl] = useState(false);
  const [showSimulationPreview, setShowSimulationPreview] = useState(false);

  // Group workflows by domain
  const workflowsByDomain = workflows.reduce((acc, workflow) => {
    const domain = workflow.domain;
    if (!acc[domain]) {
      acc[domain] = [];
    }
    acc[domain].push(workflow);
    return acc;
  }, {} as Record<string, WorkflowBlueprint[]>);

  const handleOpenVersionControl = (workflow: WorkflowBlueprint) => {
    setSelectedWorkflow(workflow);
    setShowVersionControl(true);
  };

  const handleOpenSimulationPreview = (workflow: WorkflowBlueprint) => {
    setSelectedWorkflow(workflow);
    setShowSimulationPreview(true);
  };

  return (
    <div className="space-y-6">
      {/* Section Intro */}
      <div className="text-sm text-muted-foreground">
        {WORKFLOWS.SECTION_INTRO}
      </div>

      {/* Enhanced Controls Panel */}
      <div className="grid md:grid-cols-2 gap-4">
        <WorkflowVersionControl 
          workflowName={selectedWorkflow?.id.replace(/-/g, ' ').replace(/wf /i, '') || 'Select a workflow'}
          onRollback={(versionId) => console.log('Rollback to:', versionId)}
        />
        <WorkflowStructureValidation workflow={selectedWorkflow} />
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-4 w-4" />
            Workflow Registry ({workflows.length} workflows)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead>Auto</TableHead>
                <TableHead className="text-right">Tools</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows.map((workflow) => (
                <TableRow 
                  key={workflow.id}
                  className={selectedWorkflow?.id === workflow.id ? 'bg-primary/5' : ''}
                  onClick={() => setSelectedWorkflow(workflow)}
                >
                  <TableCell>
                    <p className="font-medium">{workflow.id.replace(/-/g, ' ').replace(/wf /i, '')}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{workflow.domain}</Badge>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-muted-foreground line-clamp-1 max-w-[200px]">
                      {workflow.triggerCondition}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {workflow.actions.slice(0, 2).map((action, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {action}
                        </Badge>
                      ))}
                      {workflow.actions.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{workflow.actions.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {workflow.autoRun ? (
                      <div className="flex items-center gap-1 text-success">
                        <Play className="h-3 w-3" />
                        <span className="text-xs">Auto</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Pause className="h-3 w-3" />
                        <span className="text-xs">Manual</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenSimulationPreview(workflow);
                        }}
                        aria-label={`Validate structure of ${workflow.id}`}
                        title="Validate workflow structure"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenVersionControl(workflow);
                        }}
                        aria-label={`Version history for ${workflow.id}`}
                        title="Version History"
                      >
                        <History className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detailed View by Domain */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflow Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {Object.entries(workflowsByDomain).map(([domain, domainWorkflows]) => (
              <AccordionItem key={domain} value={domain}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span className="capitalize font-medium">{domain}</span>
                    <Badge variant="secondary">{domainWorkflows.length}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    {domainWorkflows.map((workflow) => (
                      <div 
                        key={workflow.id}
                        className="p-4 rounded-lg border bg-muted/30"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium">{workflow.id.replace(/-/g, ' ').replace(/wf /i, '')}</p>
                            <p className="text-xs text-muted-foreground">Agent: {workflow.agentId}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-xs"
                              onClick={() => handleOpenSimulationPreview(workflow)}
                            >
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              Validate
                            </Button>
                            {workflow.autoRun ? (
                              <Badge className="bg-success/10 text-success border-success/30">
                                <Play className="h-3 w-3 mr-1" />
                                Auto-run
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <Pause className="h-3 w-3 mr-1" />
                                Manual
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Trigger Condition</p>
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-warning" />
                              <p className="text-sm">{workflow.triggerCondition}</p>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Actions</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {workflow.actions.map((action, idx) => (
                                <div key={idx} className="flex items-center gap-1">
                                  <Badge variant="secondary">{action}</Badge>
                                  {idx < workflow.actions.length - 1 && (
                                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Recommended Mitigation</p>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-success" />
                              <p className="text-sm">{workflow.recommendedMitigation}</p>
                            </div>
                          </div>

                          {workflow.rootCauseFields.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Root Cause Fields</p>
                              <div className="flex flex-wrap gap-1">
                                {workflow.rootCauseFields.map((field, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {field}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Version Control Dialog */}
      <Dialog open={showVersionControl} onOpenChange={setShowVersionControl}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
          </DialogHeader>
          <WorkflowVersionControl 
            workflowName={selectedWorkflow?.id.replace(/-/g, ' ').replace(/wf /i, '')}
            onRollback={(versionId) => {
              console.log('Rollback to:', versionId);
              setShowVersionControl(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Structure Validation Dialog (no execution) */}
      <Dialog open={showSimulationPreview} onOpenChange={setShowSimulationPreview}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Workflow structure validation</DialogTitle>
          </DialogHeader>
          <WorkflowStructureValidation workflow={selectedWorkflow} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
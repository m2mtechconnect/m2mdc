import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Play, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Brain,
  TrendingUp,
  Clock,
  Target
} from "lucide-react";
import { DigitalTwinBlueprint } from "@/lib/templateLoader";
import { useToast } from "@/hooks/use-toast";

interface TemplateSimulationProps {
  template: DigitalTwinBlueprint;
}

interface SimulationStep {
  id: string;
  type: string;
  label: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  duration?: number;
  output?: any;
}

export function TemplateSimulation({ template }: TemplateSimulationProps) {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<'normal' | 'stress' | 'custom'>('normal');
  const [customInput, setCustomInput] = useState('');
  const [simulationSteps, setSimulationSteps] = useState<SimulationStep[]>([]);
  const [results, setResults] = useState<any>(null);

  const runSimulation = async () => {
    setIsRunning(true);
    setResults(null);
    
    // Initialize steps from workflow
    const steps: SimulationStep[] = template.workflow.nodes.map(node => ({
      id: node.id,
      type: node.type,
      label: node.label,
      status: 'pending'
    }));
    setSimulationSteps(steps);

    try {
      // Simulate each workflow step
      for (let i = 0; i < steps.length; i++) {
        setSimulationSteps(prev => prev.map((step, idx) => 
          idx === i ? { ...step, status: 'running' } : step
        ));

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

        // Generate step output based on type
        const output = generateStepOutput(steps[i], template, selectedScenario);

        setSimulationSteps(prev => prev.map((step, idx) => 
          idx === i ? { ...step, status: 'complete', duration: Math.floor(500 + Math.random() * 1500), output } : step
        ));
      }

      // Generate final results
      const finalResults = {
        status: 'success',
        workflow_path: steps.map(s => s.label),
        decisions: generateDecisions(template, selectedScenario),
        kpis: calculateKPIs(template, selectedScenario),
        rag_citations: generateRAGCitations(template),
        confidence: 0.85 + Math.random() * 0.12,
        recommendation: generateRecommendation(template, selectedScenario)
      };

      setResults(finalResults);
      
      toast({
        title: "Simulation Complete",
        description: `${steps.length} steps executed successfully`,
      });
    } catch (error) {
      toast({
        title: "Simulation Error",
        description: "An error occurred during simulation",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={selectedScenario} onValueChange={(v) => setSelectedScenario(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="normal">Normal Scenario</TabsTrigger>
          <TabsTrigger value="stress">Stress Test</TabsTrigger>
          <TabsTrigger value="custom">Custom Input</TabsTrigger>
        </TabsList>

        <TabsContent value="normal" className="space-y-4">
          <Card className="p-4">
            <h4 className="font-semibold mb-2">Normal Operations</h4>
            <p className="text-sm text-muted-foreground">
              Simulates typical business conditions with standard input parameters
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="stress" className="space-y-4">
          <Card className="p-4">
            <h4 className="font-semibold mb-2">Stress Test</h4>
            <p className="text-sm text-muted-foreground">
              Tests system behavior under high load or edge case conditions
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <Card className="p-4">
            <h4 className="font-semibold mb-2">Custom Input</h4>
            <Textarea
              placeholder="Enter custom JSON input for simulation..."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="min-h-[100px] font-mono text-sm"
            />
          </Card>
        </TabsContent>
      </Tabs>

      <Button 
        onClick={runSimulation} 
        disabled={isRunning}
        className="w-full"
        size="lg"
      >
        {isRunning ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Running Simulation...
          </>
        ) : (
          <>
            <Play className="h-5 w-5 mr-2" />
            Run Simulation
          </>
        )}
      </Button>

      {/* Workflow Execution Steps */}
      {simulationSteps.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Workflow Execution
          </h3>
          <div className="space-y-3">
            {simulationSteps.map((step, idx) => (
              <div key={step.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex-shrink-0">
                  {step.status === 'complete' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                  {step.status === 'running' && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
                  {step.status === 'pending' && <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />}
                  {step.status === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{step.label}</p>
                    {step.duration && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {step.duration}ms
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">{step.type}</p>
                  {step.output && (
                    <div className="mt-2 p-2 rounded bg-background/50 text-xs font-mono">
                      {typeof step.output === 'string' ? step.output : JSON.stringify(step.output, null, 2)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Simulation Results */}
      {results && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-accent" />
              KPI Projections
            </h3>
            <div className="space-y-3">
              {results.kpis.map((kpi: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{kpi.name}</span>
                  <Badge variant={kpi.met ? "default" : "secondary"}>
                    {kpi.value} {kpi.unit}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              RAG Citations
            </h3>
            <div className="space-y-2">
              {results.rag_citations.map((citation: any, idx: number) => (
                <div key={idx} className="p-2 rounded bg-muted/50 text-sm">
                  <div className="font-medium">{citation.source}</div>
                  <div className="text-xs text-muted-foreground">{citation.relevance}% relevance</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 md:col-span-2">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Final Decision
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Confidence Score</span>
                <Badge variant="default">{(results.confidence * 100).toFixed(1)}%</Badge>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm">{results.recommendation}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {results.decisions.map((decision: any, idx: number) => (
                  <div key={idx} className="p-3 rounded bg-background border border-border">
                    <div className="text-xs text-muted-foreground mb-1">{decision.type}</div>
                    <div className="text-sm font-medium">{decision.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// Helper functions for simulation
function generateStepOutput(step: SimulationStep, template: DigitalTwinBlueprint, scenario: string): any {
  const outputs: Record<string, string> = {
    trigger: `Event detected: ${template.blueprint.event_triggers[0]}`,
    integration: `Fetched data from ${template.blueprint.integrations[0] || 'external system'}`,
    llm: `Generated recommendation using ${template.llm.model}`,
    ml_model: `Prediction completed with 92% confidence`,
    rag: `Retrieved ${template.rag.top_k} relevant documents`,
    decision: `Decision: Proceed with recommended action`,
    human: `Routed to manager for approval`,
    notification: `Alerts sent to stakeholders`,
    audit: `Logged to compliance system`
  };
  
  return outputs[step.type] || `${step.type} completed successfully`;
}

function generateDecisions(template: DigitalTwinBlueprint, scenario: string): any[] {
  return [
    { type: "Action", value: "Approved" },
    { type: "Priority", value: scenario === 'stress' ? "High" : "Medium" },
    { type: "Approval Required", value: template.blueprint.human_approval_points.length > 0 ? "Yes" : "No" }
  ];
}

function calculateKPIs(template: DigitalTwinBlueprint, scenario: string): any[] {
  return template.blueprint.kpis.map(kpi => ({
    name: kpi.name,
    value: scenario === 'stress' ? kpi.target * 0.85 : kpi.target * 1.05,
    unit: kpi.metric,
    met: scenario !== 'stress'
  }));
}

function generateRAGCitations(template: DigitalTwinBlueprint): any[] {
  return template.knowledge.map(k => ({
    source: k.ref || k.type,
    relevance: 85 + Math.floor(Math.random() * 12)
  }));
}

function generateRecommendation(template: DigitalTwinBlueprint, scenario: string): string {
  if (scenario === 'stress') {
    return `Under stress conditions, the system identified potential bottlenecks and recommends scaling ${template.blueprint.integrations[0]} capacity by 30% to maintain SLAs.`;
  }
  return `Based on normal operating conditions, the ${template.name} recommends proceeding with the workflow as configured. All KPIs are projected to meet or exceed targets.`;
}

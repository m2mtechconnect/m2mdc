import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, Rect, Text, Line, Group, FabricObject } from "fabric";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Save, 
  Play, 
  CheckCircle2, 
  Download, 
  Upload,
  Undo,
  Redo,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2
} from "lucide-react";
import { WorkflowPalette } from "./WorkflowPalette";
import { NodeConfigDrawer } from "./NodeConfigDrawer";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface WorkflowNode {
  id: string;
  type: 'analyze' | 'classify' | 'mcp_tool' | 'notify_teams' | 'create_ticket_jira' | 'write_salesforce' | 'generate_report';
  x: number;
  y: number;
  config: Record<string, any>;
  fabricObject?: FabricObject;
}

export interface WorkflowEdge {
  id: string;
  fromNodeId: string;
  fromPort: string;
  toNodeId: string;
  toPort: string;
  fabricLine?: Line;
}

interface WorkflowEditorProps {
  systemId?: string;
  workflowId?: string;
}

export function WorkflowEditor({ systemId, workflowId }: WorkflowEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | undefined>(workflowId);
  const { toast } = useToast();
  const nodesRef = useRef<WorkflowNode[]>([]);

  // Keep ref in sync
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const containerWidth = canvasRef.current.parentElement?.clientWidth || 1200;
    const canvasWidth = Math.min(containerWidth - 32, 1400);
    const canvasHeight = Math.min(Math.max(window.innerHeight - 400, 500), 700);

    const canvas = new FabricCanvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: "hsl(0, 0%, 12%)",
      selection: true,
    });

    // Grid
    const gridSize = 24;
    const gridColor = 'hsl(0, 0%, 18%)';
    for (let i = 0; i < canvas.width! / gridSize; i++) {
      canvas.add(new Line([i * gridSize, 0, i * gridSize, canvas.height!], {
        stroke: gridColor, strokeWidth: 1, selectable: false, evented: false,
      }));
    }
    for (let i = 0; i < canvas.height! / gridSize; i++) {
      canvas.add(new Line([0, i * gridSize, canvas.width!, i * gridSize], {
        stroke: gridColor, strokeWidth: 1, selectable: false, evented: false,
      }));
    }

    // Handle node moving - update positions in state
    canvas.on('object:moving', (e) => {
      const obj = e.target;
      if (obj && (obj as any).nodeId) {
        const nodeId = (obj as any).nodeId;
        setNodes(prev => prev.map(n => 
          n.id === nodeId ? { ...n, x: obj.left || n.x, y: obj.top || n.y } : n
        ));
        setIsDirty(true);
      }
    });

    // Handle selection to open config drawer
    canvas.on('selection:created', (e) => {
      const selected = e.selected?.[0];
      if (selected && (selected as any).nodeId) {
        const nodeId = (selected as any).nodeId;
        const node = nodesRef.current.find(n => n.id === nodeId);
        if (node) setSelectedNode(node);
      }
    });

    canvas.on('selection:cleared', () => {
      setSelectedNode(null);
    });

    setFabricCanvas(canvas);

    if (workflowId) {
      loadWorkflow(workflowId, canvas);
    }

    const handleResize = () => {
      const newContainerWidth = canvasRef.current?.parentElement?.clientWidth || 1200;
      const newWidth = Math.min(newContainerWidth - 32, 1400);
      const newHeight = Math.min(Math.max(window.innerHeight - 400, 500), 700);
      canvas.setWidth(newWidth);
      canvas.setHeight(newHeight);
      canvas.renderAll();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
    };
  }, [workflowId]);

  // Auto-save
  useEffect(() => {
    if (!isDirty || !currentWorkflowId) return;
    const timeoutId = setTimeout(() => { handleSave(); }, 1500);
    return () => clearTimeout(timeoutId);
  }, [nodes, edges, isDirty, currentWorkflowId]);

  const loadWorkflow = async (wfId: string, canvas: FabricCanvas) => {
    try {
      const { data: nodesData, error: nodesError } = await supabase
        .from('workflow_nodes').select('*').eq('workflow_id', wfId);
      const { data: edgesData, error: edgesError } = await supabase
        .from('workflow_edges').select('*').eq('workflow_id', wfId);

      if (nodesError) throw nodesError;
      if (edgesError) throw edgesError;

      const loadedNodes: WorkflowNode[] = [];
      for (const nodeData of nodesData || []) {
        const fabricObj = createNodeObject(nodeData.type as WorkflowNode['type'], nodeData.x as number, nodeData.y as number, nodeData.id);
        canvas.add(fabricObj);
        loadedNodes.push({
          id: nodeData.id,
          type: nodeData.type as WorkflowNode['type'],
          x: nodeData.x as number,
          y: nodeData.y as number,
          config: (nodeData.config as Record<string, any>) || {},
          fabricObject: fabricObj,
        });
      }

      setNodes(loadedNodes);
      canvas.renderAll();
    } catch (error: any) {
      console.error('Load workflow error:', error);
      toast({ title: "Failed to load workflow", description: error.message, variant: "destructive" });
    }
  };

  const createNodeObject = (type: string, x: number, y: number, nodeId: string): FabricObject => {
    const colors: Record<string, string> = {
      analyze: "hsl(227, 100%, 65%)",
      classify: "hsl(250, 75%, 60%)",
      mcp_tool: "hsl(170, 70%, 45%)",
      notify_teams: "hsl(51, 100%, 50%)",
      create_ticket_jira: "hsl(227, 100%, 65%)",
      write_salesforce: "hsl(250, 75%, 60%)",
      generate_report: "hsl(51, 100%, 50%)",
    };

    const labels: Record<string, string> = {
      analyze: "Analyze",
      classify: "Classify",
      mcp_tool: "MCP Tool",
      notify_teams: "Notify Teams",
      create_ticket_jira: "Create Jira Ticket",
      write_salesforce: "Write Salesforce",
      generate_report: "Generate Report",
    };

    const rect = new Rect({
      width: 160,
      height: 80,
      fill: colors[type] || "hsl(227, 100%, 65%)",
      stroke: "hsl(0, 0%, 100%)",
      strokeWidth: 2,
      rx: 8,
      ry: 8,
      originX: 'center',
      originY: 'center',
    });

    const text = new Text(labels[type] || type, {
      fontSize: 14,
      fill: "hsl(0, 0%, 100%)",
      fontFamily: "Inter",
      fontWeight: "600",
      originX: "center",
      originY: "center",
    });

    const group = new Group([rect, text], {
      left: x,
      top: y,
      selectable: true,
      hasControls: false,
      hasBorders: true,
      lockRotation: true,
      hoverCursor: 'grab',
      moveCursor: 'grabbing',
    });

    (group as any).nodeId = nodeId;
    (group as any).nodeType = type;

    return group;
  };

  const handleAddNode = useCallback((type: WorkflowNode['type']) => {
    if (!fabricCanvas) return;

    const nodeId = crypto.randomUUID();
    const x = 100 + nodes.length * 50;
    const y = 100 + nodes.length * 30;

    const fabricObj = createNodeObject(type, x, y, nodeId);
    fabricCanvas.add(fabricObj);
    fabricCanvas.renderAll();

    const defaultConfigs: Record<string, any> = {
      analyze: { model: 'google/gemini-2.5-flash' },
      classify: { labels: [] },
      notify_teams: {},
      create_ticket_jira: {},
      write_salesforce: {},
      generate_report: {},
    };

    const newNode: WorkflowNode = {
      id: nodeId, type, x, y,
      config: defaultConfigs[type] || {},
      fabricObject: fabricObj,
    };

    setNodes(prev => [...prev, newNode]);
    setIsDirty(true);
    toast({ title: "Node added", description: `${type} node added to canvas` });
  }, [fabricCanvas, nodes]);

  const handleSave = async () => {
    if (!currentWorkflowId && !systemId) {
      toast({ title: "Cannot save", description: "No workflow or system ID provided", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      let wfId = currentWorkflowId;
      if (!wfId) {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required to save workflow');

        const { data: workflow, error: workflowError } = await supabase
          .from('workflows')
          .insert({ system_id: systemId, name: `Workflow ${new Date().toLocaleString()}`, status: 'draft', created_by: user.id })
          .select().maybeSingle();
        if (workflowError) throw workflowError;
        if (!workflow) throw new Error('Failed to create workflow');
        wfId = workflow.id;
        setCurrentWorkflowId(wfId);
      }

      await supabase.from('workflow_nodes').delete().eq('workflow_id', wfId);
      await supabase.from('workflow_edges').delete().eq('workflow_id', wfId);

      const nodesToInsert = nodes.map(node => ({
        id: node.id, workflow_id: wfId, type: node.type, x: node.x, y: node.y, config: node.config,
      }));
      if (nodesToInsert.length > 0) {
        const { error: nodesError } = await supabase.from('workflow_nodes').insert(nodesToInsert);
        if (nodesError) throw nodesError;
      }

      const edgesToInsert = edges.map(edge => ({
        id: edge.id, workflow_id: wfId, from_node_id: edge.fromNodeId, from_port: edge.fromPort,
        to_node_id: edge.toNodeId, to_port: edge.toPort,
      }));
      if (edgesToInsert.length > 0) {
        const { error: edgesError } = await supabase.from('workflow_edges').insert(edgesToInsert);
        if (edgesError) throw edgesError;
      }

      setIsDirty(false);
      toast({ title: "Workflow saved", description: `${nodes.length} nodes saved successfully` });
    } catch (error: any) {
      console.error('Save workflow error:', error);
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidate = async () => {
    const errors: string[] = [];
    if (nodes.length === 0) errors.push("Workflow has no nodes");
    if (nodes.length > 1 && edges.length === 0) errors.push("Nodes are not connected");
    const nodesWithIncoming = new Set(edges.map(e => e.toNodeId));
    const entryNodes = nodes.filter(n => !nodesWithIncoming.has(n.id));
    if (nodes.length > 0 && entryNodes.length === 0) errors.push("No entry point found (circular dependency)");
    nodes.forEach(node => {
      if (node.type === 'analyze' && !node.config?.model) errors.push(`Analyze node missing model configuration`);
      if (node.type === 'classify' && (!node.config?.labels || node.config.labels.length === 0)) errors.push(`Classify node missing classification labels`);
    });
    if (errors.length === 0) {
      toast({ title: "Validation passed", description: "Workflow structure is valid" });
      return true;
    } else {
      toast({ title: "Validation failed", description: errors.join('; '), variant: "destructive" });
      return false;
    }
  };

  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [showTestResults, setShowTestResults] = useState(false);

  const handleTestRun = async () => {
    // Run a local mock simulation based on current nodes (no edge function required)
    if (nodes.length === 0) {
      toast({ title: "No nodes", description: "Add nodes to the workflow before testing", variant: "destructive" });
      return;
    }

    setIsTestRunning(true);
    setTestResult(null);
    setShowTestResults(true);

    try {
      // Always use local simulation (no backend dependency required)
      // Local mock simulation
      const startTime = Date.now();
      const trace = nodes.map((node, idx) => {
        const nodeStart = Date.now();
        return {
          node_id: node.id,
          node_type: node.type,
          status: 'success' as const,
          duration_ms: 10 + Math.floor(Math.random() * 90),
          result: { output: `[Mock] ${node.type} executed successfully`, step: idx + 1 },
        };
      });

      // Simulate async delay
      await new Promise(r => setTimeout(r, 500 + Math.random() * 500));

      const result = {
        execution_trace: trace,
        summary: {
          total_nodes: nodes.length,
          total_edges: edges.length,
          duration_ms: Date.now() - startTime,
          successful_nodes: trace.length,
          failed_nodes: 0,
        },
      };

      setTestResult(result);
      toast({ title: "Simulation complete", description: `${result.summary.total_nodes} nodes executed in ${result.summary.duration_ms}ms` });
    } catch (error: any) {
      console.error('Test run error:', error);
      toast({ title: "Test run failed", description: error.message || "Failed to execute test run", variant: "destructive" });
    } finally {
      setIsTestRunning(false);
    }
  };

  const handleClear = () => {
    if (!fabricCanvas) return;
    fabricCanvas.clear();
    setNodes([]);
    setEdges([]);
    setIsDirty(true);
    toast({ title: "Canvas cleared", description: "All nodes removed" });
  };

  return (
    <div className="space-y-4 p-4">
      {/* Toolbar */}
      <Card className="glass-panel p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="default" size="sm" onClick={handleSave} disabled={!isDirty || isSaving} className="gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleValidate} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Validate
            </Button>
            <Button variant="outline" size="sm" onClick={handleTestRun} disabled={isTestRunning} className="gap-2">
              {isTestRunning ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Testing...</>
              ) : (
                <><Play className="h-4 w-4" />Test Run</>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {isDirty && <Badge variant="outline" className="bg-primary/20">Unsaved changes</Badge>}
            <Badge variant="secondary">{nodes.length} nodes</Badge>
            {testResult && (
              <Badge variant={testResult.summary?.failed_nodes === 0 ? "default" : "destructive"}>
                {testResult.summary?.failed_nodes === 0 ? "✓ Test passed" : "✗ Test failed"}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleClear} className="gap-2">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Canvas */}
      <Card className="glass-panel overflow-hidden relative" style={{ backgroundColor: 'hsl(0, 0%, 12%)', minHeight: '500px' }}>
        <canvas ref={canvasRef} className="w-full" />
        
        {nodes.length === 0 && fabricCanvas && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto rounded-xl border-2 border-dashed border-muted-foreground/30 bg-background/80 backdrop-blur-sm p-8 text-center max-w-md">
              <div className="mb-4 flex justify-center">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-3xl">
                  🔧
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Build Your Workflow</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Drag and drop nodes from the palette below to create your automation workflow. Connect nodes to define the execution flow.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button size="sm" variant="outline" onClick={() => handleAddNode('analyze')} className="gap-2">
                  <span className="text-xs">➕</span> Add Analyze
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleAddNode('classify')} className="gap-2">
                  <span className="text-xs">➕</span> Add Classify
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Palette */}
      <WorkflowPalette onAddNode={handleAddNode} />

      {/* Test Results */}
      {testResult && (
        <Collapsible open={showTestResults} onOpenChange={setShowTestResults}>
          <Card className="glass-panel p-4">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="font-medium text-sm">Simulation Results — {testResult.summary?.total_nodes} nodes, {testResult.summary?.duration_ms}ms</span>
                <Badge variant={testResult.summary?.failed_nodes === 0 ? "default" : "destructive"}>
                  {testResult.summary?.failed_nodes === 0 ? `${testResult.summary?.successful_nodes} passed` : `${testResult.summary?.failed_nodes} failed`}
                </Badge>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-2">
              {testResult.execution_trace?.map((trace: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    trace.status === 'success' ? 'bg-success/20' : 'bg-destructive/20'
                  }`}>
                    <span className="text-sm font-mono font-medium">{idx + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{trace.node_type}</p>
                    <p className="text-xs text-muted-foreground">{trace.result?.output || trace.error}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{trace.duration_ms}ms</Badge>
                </div>
              ))}
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Node Config Drawer */}
      {selectedNode && (
        <NodeConfigDrawer
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onUpdate={(config) => {
            setNodes(prev => prev.map(n => 
              n.id === selectedNode.id ? { ...n, config } : n
            ));
            setIsDirty(true);
          }}
        />
      )}
    </div>
  );
}

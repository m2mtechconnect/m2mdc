import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, Rect, Text, Line, Group, Circle, Path, FabricObject } from "fabric";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Save, Play, CheckCircle2, Trash2, Loader2
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
  fabricPath?: FabricObject;
}

interface WorkflowEditorProps {
  systemId?: string;
  workflowId?: string;
}

const NODE_WIDTH = 160;
const NODE_HEIGHT = 80;
const PORT_RADIUS = 7;

const NODE_COLORS: Record<string, string> = {
  analyze: "hsl(227, 100%, 65%)",
  classify: "hsl(250, 75%, 60%)",
  mcp_tool: "hsl(170, 70%, 45%)",
  notify_teams: "hsl(51, 100%, 50%)",
  create_ticket_jira: "hsl(210, 80%, 55%)",
  write_salesforce: "hsl(200, 85%, 50%)",
  generate_report: "hsl(35, 95%, 55%)",
};

const NODE_LABELS: Record<string, string> = {
  analyze: "Analyze",
  classify: "Classify",
  mcp_tool: "MCP Tool",
  notify_teams: "Notify Teams",
  create_ticket_jira: "Create Jira Ticket",
  write_salesforce: "Write Salesforce",
  generate_report: "Generate Report",
};

const isValidUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

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
  const edgesRef = useRef<WorkflowEdge[]>([]);
  const connectingRef = useRef<{ nodeId: string; x: number; y: number; tempLine: Line | null } | null>(null);
  const canvasObjRef = useRef<FabricCanvas | null>(null);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  // ─── Bezier edge helpers ───
  const getNodePortPosition = useCallback((nodeId: string, portType: 'input' | 'output') => {
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return portType === 'output'
      ? { x: node.x + NODE_WIDTH + PORT_RADIUS, y: node.y + NODE_HEIGHT / 2 }
      : { x: node.x - PORT_RADIUS, y: node.y + NODE_HEIGHT / 2 };
  }, []);

  const makeBezierPath = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.abs(x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  }, []);

  const redrawEdges = useCallback((canvas: FabricCanvas, currentEdges: WorkflowEdge[], currentNodes: WorkflowNode[]) => {
    // Remove old edge paths
    currentEdges.forEach(edge => {
      if (edge.fabricPath) {
        canvas.remove(edge.fabricPath);
      }
    });

    const updatedEdges = currentEdges.map(edge => {
      const fromNode = currentNodes.find(n => n.id === edge.fromNodeId);
      const toNode = currentNodes.find(n => n.id === edge.toNodeId);
      if (!fromNode || !toNode) return edge;

      const fromPos = {
        x: fromNode.x + NODE_WIDTH + PORT_RADIUS,
        y: fromNode.y + NODE_HEIGHT / 2,
      };
      const toPos = {
        x: toNode.x - PORT_RADIUS,
        y: toNode.y + NODE_HEIGHT / 2,
      };

      const pathStr = makeBezierPath(fromPos.x, fromPos.y, toPos.x, toPos.y);
      const pathObj = new Path(pathStr, {
        fill: '',
        stroke: 'hsl(210, 100%, 70%)',
        strokeWidth: 2.5,
        selectable: true,
        evented: true,
        hoverCursor: 'pointer',
        perPixelTargetFind: true,
        strokeLineCap: 'round',
      });
      (pathObj as any).edgeId = edge.id;
      canvas.add(pathObj);
      // Send edges behind nodes
      canvas.sendObjectToBack(pathObj);

      return { ...edge, fabricPath: pathObj };
    });

    // Re-send grid lines to very back
    canvas.getObjects().forEach(obj => {
      if ((obj as any).isGridLine) canvas.sendObjectToBack(obj);
    });
    canvas.renderAll();
    return updatedEdges;
  }, [makeBezierPath]);

  // ─── Canvas init ───
  useEffect(() => {
    if (!canvasRef.current) return;

    const containerWidth = canvasRef.current.parentElement?.clientWidth || 1200;
    const canvasWidth = Math.min(containerWidth - 32, 1400);
    const canvasHeight = Math.min(Math.max(window.innerHeight - 400, 500), 700);

    const canvas = new FabricCanvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: "hsl(222, 20%, 10%)",
      selection: true,
    });
    canvasObjRef.current = canvas;

    // Grid
    const gridSize = 24;
    const gridColor = 'hsl(222, 15%, 16%)';
    for (let i = 0; i < canvas.width! / gridSize; i++) {
      const l = new Line([i * gridSize, 0, i * gridSize, canvas.height!], {
        stroke: gridColor, strokeWidth: 1, selectable: false, evented: false,
      });
      (l as any).isGridLine = true;
      canvas.add(l);
    }
    for (let i = 0; i < canvas.height! / gridSize; i++) {
      const l = new Line([0, i * gridSize, canvas.width!, i * gridSize], {
        stroke: gridColor, strokeWidth: 1, selectable: false, evented: false,
      });
      (l as any).isGridLine = true;
      canvas.add(l);
    }

    // ─── Node moving → update ports + edges ───
    canvas.on('object:moving', (e) => {
      const obj = e.target;
      if (obj && (obj as any).nodeId) {
        const nodeId = (obj as any).nodeId;
        const gLeft = obj.left || 0;
        const gTop = obj.top || 0;

        // Move ports with the node
        const ports = portMapRef.current.get(nodeId);
        if (ports) {
          ports.input.set({ left: gLeft - PORT_RADIUS * 2, top: gTop + NODE_HEIGHT / 2 - PORT_RADIUS });
          ports.output.set({ left: gLeft + NODE_WIDTH, top: gTop + NODE_HEIGHT / 2 - PORT_RADIUS });
        }

        const updatedNodes = nodesRef.current.map(n =>
          n.id === nodeId ? { ...n, x: gLeft, y: gTop } : n
        );
        nodesRef.current = updatedNodes;
        setNodes(updatedNodes);
        setIsDirty(true);
        // Redraw edges
        const newEdges = redrawEdges(canvas, edgesRef.current, updatedNodes);
        edgesRef.current = newEdges;
        setEdges(newEdges);
      }
    });

    // ─── Connection: mouse:down on output port ───
    canvas.on('mouse:down', (opt) => {
      const target = opt.target;
      if (target && (target as any).portType === 'output' && (target as any).parentNodeId) {
        const nodeId = (target as any).parentNodeId;
        const node = nodesRef.current.find(n => n.id === nodeId);
        if (!node) return;
        const fromX = node.x + NODE_WIDTH + PORT_RADIUS;
        const fromY = node.y + NODE_HEIGHT / 2;
        const tempLine = new Line([fromX, fromY, fromX, fromY], {
          stroke: 'hsl(210, 100%, 80%)',
          strokeWidth: 2.5,
          strokeDashArray: [8, 5],
          selectable: false,
          evented: false,
        });
        canvas.add(tempLine);
        canvas.bringObjectToFront(tempLine);
        connectingRef.current = { nodeId, x: fromX, y: fromY, tempLine };
        canvas.selection = false;
      }
    });

    canvas.on('mouse:move', (opt) => {
      if (!connectingRef.current?.tempLine) return;
      const pointer = canvas.getScenePoint(opt.e);
      connectingRef.current.tempLine.set({ x2: pointer.x, y2: pointer.y });
      canvas.renderAll();
    });

    canvas.on('mouse:up', (opt) => {
      if (!connectingRef.current) return;
      const fromInfo = connectingRef.current;
      // Remove temp line
      if (fromInfo.tempLine) canvas.remove(fromInfo.tempLine);
      canvas.selection = true;
      connectingRef.current = null;

      const target = opt.target;
      if (target && (target as any).portType === 'input' && (target as any).parentNodeId) {
        const toNodeId = (target as any).parentNodeId;
        if (toNodeId === fromInfo.nodeId) return; // no self-connection
        // Check for duplicates
        if (edgesRef.current.some(e => e.fromNodeId === fromInfo.nodeId && e.toNodeId === toNodeId)) return;

        const newEdge: WorkflowEdge = {
          id: crypto.randomUUID(),
          fromNodeId: fromInfo.nodeId,
          fromPort: 'output',
          toNodeId,
          toPort: 'input',
        };
        const newEdges = [...edgesRef.current, newEdge];
        const drawnEdges = redrawEdges(canvas, newEdges, nodesRef.current);
        edgesRef.current = drawnEdges;
        setEdges(drawnEdges);
        setIsDirty(true);
        toast({ title: "Edge connected", description: "Nodes linked successfully" });
      }
      canvas.renderAll();
    });

    // ─── Delete edge on selection + Delete key ───
    canvas.on('selection:created', (e) => {
      const selected = e.selected?.[0];
      if (selected && (selected as any).nodeId) {
        const nodeId = (selected as any).nodeId;
        const node = nodesRef.current.find(n => n.id === nodeId);
        if (node) setSelectedNode(node);
      }
    });
    canvas.on('selection:cleared', () => setSelectedNode(null));

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = canvas.getActiveObject();
        if (active && (active as any).edgeId) {
          const edgeId = (active as any).edgeId;
          canvas.remove(active);
          const newEdges = edgesRef.current.filter(ed => ed.id !== edgeId);
          edgesRef.current = newEdges;
          setEdges(newEdges);
          setIsDirty(true);
          canvas.discardActiveObject();
          canvas.renderAll();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    setFabricCanvas(canvas);

    if (workflowId) loadWorkflow(workflowId, canvas);

    const handleResize = () => {
      const newW = Math.min((canvasRef.current?.parentElement?.clientWidth || 1200) - 32, 1400);
      const newH = Math.min(Math.max(window.innerHeight - 400, 500), 700);
      canvas.setWidth(newW);
      canvas.setHeight(newH);
      canvas.renderAll();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('keydown', handleKeyDown);
      canvas.dispose();
    };
  }, [workflowId]);

  // ─── NO auto-save (removed). Only explicit Save Draft. ───

  const loadWorkflow = async (wfId: string, canvas: FabricCanvas) => {
    try {
      const { data: nodesData, error: nodesError } = await supabase
        .from('workflow_nodes').select('*').eq('workflow_id', wfId);
      const { data: edgesData, error: edgesError } = await supabase
        .from('workflow_edges').select('*').eq('workflow_id', wfId);

      if (nodesError) throw nodesError;
      if (edgesError) throw edgesError;

      const loadedNodes: WorkflowNode[] = [];
      for (const nd of nodesData || []) {
        const fabricObj = createNodeGroup(nd.type as WorkflowNode['type'], nd.x as number, nd.y as number, nd.id, canvas);
        loadedNodes.push({
          id: nd.id, type: nd.type as WorkflowNode['type'],
          x: nd.x as number, y: nd.y as number,
          config: (nd.config as Record<string, any>) || {},
          fabricObject: fabricObj,
        });
      }
      nodesRef.current = loadedNodes;
      setNodes(loadedNodes);

      const loadedEdges: WorkflowEdge[] = (edgesData || []).map((ed: any) => ({
        id: ed.id,
        fromNodeId: ed.from_node_id,
        fromPort: ed.from_port || 'output',
        toNodeId: ed.to_node_id,
        toPort: ed.to_port || 'input',
      }));
      const drawnEdges = redrawEdges(canvas, loadedEdges, loadedNodes);
      edgesRef.current = drawnEdges;
      setEdges(drawnEdges);
    } catch (error: any) {
      console.error('Load workflow error:', error);
      toast({ title: "Failed to load workflow", description: error.message, variant: "destructive" });
    }
  };

  // ─── Port refs for cleanup ───
  const portMapRef = useRef<Map<string, { input: Circle; output: Circle }>>(new Map());

  // ─── Create node group with ports ───
  const createNodeGroup = (type: string, x: number, y: number, nodeId: string, canvas: FabricCanvas): FabricObject => {
    const color = NODE_COLORS[type] || "hsl(227, 100%, 65%)";
    const label = NODE_LABELS[type] || type;

    // Use left/top origin so node.x/y = top-left corner (matches edge math)
    const rect = new Rect({
      width: NODE_WIDTH, height: NODE_HEIGHT,
      fill: color, stroke: "hsl(0, 0%, 90%)", strokeWidth: 2,
      rx: 10, ry: 10,
      shadow: { color: 'rgba(0,0,0,0.35)', blur: 12, offsetX: 0, offsetY: 4 } as any,
    });

    const text = new Text(label, {
      fontSize: 13, fill: "hsl(0, 0%, 100%)", fontFamily: "Inter",
      fontWeight: "600",
      left: NODE_WIDTH / 2, top: NODE_HEIGHT / 2,
      originX: "center", originY: "center",
    });

    const group = new Group([rect, text], {
      left: x, top: y,
      selectable: true, hasControls: false, hasBorders: true,
      lockRotation: true, hoverCursor: 'grab', moveCursor: 'grabbing',
      subTargetCheck: false,
      originX: 'left', originY: 'top',
    });
    (group as any).nodeId = nodeId;
    (group as any).nodeType = type;
    canvas.add(group);

    // ─── Input port (left center) ───
    const inputPort = new Circle({
      radius: PORT_RADIUS,
      fill: 'hsl(222, 20%, 18%)',
      stroke: 'hsl(210, 100%, 70%)',
      strokeWidth: 2.5,
      left: x - PORT_RADIUS * 2,
      top: y + NODE_HEIGHT / 2 - PORT_RADIUS,
      selectable: false,
      evented: true,
      hoverCursor: 'crosshair',
      originX: 'left', originY: 'top',
    });
    (inputPort as any).portType = 'input';
    (inputPort as any).parentNodeId = nodeId;
    canvas.add(inputPort);

    // ─── Output port (right center) ───
    const outputPort = new Circle({
      radius: PORT_RADIUS,
      fill: 'hsl(222, 20%, 18%)',
      stroke: 'hsl(140, 70%, 50%)',
      strokeWidth: 2.5,
      left: x + NODE_WIDTH,
      top: y + NODE_HEIGHT / 2 - PORT_RADIUS,
      selectable: false,
      evented: true,
      hoverCursor: 'crosshair',
      originX: 'left', originY: 'top',
    });
    (outputPort as any).portType = 'output';
    (outputPort as any).parentNodeId = nodeId;
    canvas.add(outputPort);

    portMapRef.current.set(nodeId, { input: inputPort, output: outputPort });

    canvas.renderAll();
    return group;
  };

  const handleAddNode = useCallback((type: WorkflowNode['type']) => {
    if (!fabricCanvas) return;

    const nodeId = crypto.randomUUID();
    const x = 80 + (nodesRef.current.length % 4) * 200;
    const y = 80 + Math.floor(nodesRef.current.length / 4) * 120;

    const fabricObj = createNodeGroup(type, x, y, nodeId, fabricCanvas);

    const newNode: WorkflowNode = {
      id: nodeId, type, x, y,
      config: type === 'analyze' ? { model: 'google/gemini-2.5-flash' } : {},
      fabricObject: fabricObj,
    };

    const updated = [...nodesRef.current, newNode];
    nodesRef.current = updated;
    setNodes(updated);
    setIsDirty(true);
    toast({ title: "Node added", description: `${NODE_LABELS[type] || type} node added to canvas` });
  }, [fabricCanvas]);

  // ─── Save (explicit only, with auth guard + UUID validation) ───
  const handleSave = async () => {
    if (!systemId && !currentWorkflowId) {
      toast({ title: "Cannot save", description: "No system context available", variant: "destructive" });
      return;
    }

    // Auth guard
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      toast({ title: "Please log in to save", description: "Authentication required", variant: "destructive" });
      return;
    }

    // UUID validation
    if (systemId && !isValidUUID(systemId)) {
      toast({ title: "Cannot save to database", description: "System ID is not a valid identifier. Workflow is stored locally only.", variant: "default" });
      setIsDirty(false);
      return;
    }

    setIsSaving(true);
    try {
      let wfId = currentWorkflowId;
      if (!wfId) {
        const { data: workflow, error: wfError } = await supabase
          .from('workflows')
          .insert({ system_id: systemId, name: `Workflow ${new Date().toLocaleString()}`, status: 'draft', created_by: user.id })
          .select().maybeSingle();
        if (wfError) throw wfError;
        if (!workflow) throw new Error('Failed to create workflow');
        wfId = workflow.id;
        setCurrentWorkflowId(wfId);
      }

      // Guarded deletes
      try { await supabase.from('workflow_nodes').delete().eq('workflow_id', wfId); } catch { /* node rows may not exist yet */ }
      try { await supabase.from('workflow_edges').delete().eq('workflow_id', wfId); } catch { /* edge rows may not exist yet */ }

      if (nodes.length > 0) {
        const { error } = await supabase.from('workflow_nodes').insert(
          nodes.map(n => ({ id: n.id, workflow_id: wfId, type: n.type, x: n.x, y: n.y, config: n.config }))
        );
        if (error) throw error;
      }

      if (edges.length > 0) {
        const { error } = await supabase.from('workflow_edges').insert(
          edges.map(e => ({ id: e.id, workflow_id: wfId, from_node_id: e.fromNodeId, from_port: e.fromPort, to_node_id: e.toNodeId, to_port: e.toPort }))
        );
        if (error) throw error;
      }

      setIsDirty(false);
      toast({ title: "Workflow saved", description: `${nodes.length} nodes, ${edges.length} edges saved` });
    } catch (error: any) {
      console.error('Save error:', error);
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
    if (errors.length === 0) {
      toast({ title: "Validation passed ✓", description: "Workflow structure is valid" });
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
    if (nodes.length === 0) {
      toast({ title: "No nodes", description: "Add nodes before testing", variant: "destructive" });
      return;
    }
    setIsTestRunning(true); setTestResult(null); setShowTestResults(true);
    try {
      const startTime = Date.now();
      const trace = nodes.map((node, idx) => ({
        node_id: node.id, node_type: node.type, status: 'success' as const,
        duration_ms: 10 + Math.floor(Math.random() * 90),
        result: { output: `[Mock] ${node.type} executed`, step: idx + 1 },
      }));
      await new Promise(r => setTimeout(r, 400 + Math.random() * 400));
      const result = {
        execution_trace: trace,
        summary: { total_nodes: nodes.length, total_edges: edges.length, duration_ms: Date.now() - startTime, successful_nodes: trace.length, failed_nodes: 0 },
      };
      setTestResult(result);
      toast({ title: "Simulation complete", description: `${result.summary.total_nodes} nodes in ${result.summary.duration_ms}ms` });
    } catch (error: any) {
      toast({ title: "Test run failed", description: error.message, variant: "destructive" });
    } finally { setIsTestRunning(false); }
  };

  const handleClear = () => {
    if (!fabricCanvas) return;
    fabricCanvas.clear();
    // Redraw grid
    const gridSize = 24;
    const gridColor = 'hsl(222, 15%, 16%)';
    for (let i = 0; i < fabricCanvas.width! / gridSize; i++) {
      const l = new Line([i * gridSize, 0, i * gridSize, fabricCanvas.height!], { stroke: gridColor, strokeWidth: 1, selectable: false, evented: false });
      (l as any).isGridLine = true;
      fabricCanvas.add(l);
    }
    for (let i = 0; i < fabricCanvas.height! / gridSize; i++) {
      const l = new Line([0, i * gridSize, fabricCanvas.width!, i * gridSize], { stroke: gridColor, strokeWidth: 1, selectable: false, evented: false });
      (l as any).isGridLine = true;
      fabricCanvas.add(l);
    }
    fabricCanvas.backgroundColor = "hsl(222, 20%, 10%)";
    fabricCanvas.renderAll();
    nodesRef.current = [];
    edgesRef.current = [];
    setNodes([]); setEdges([]); setIsDirty(true);
    toast({ title: "Canvas cleared" });
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
              <CheckCircle2 className="h-4 w-4" />Validate
            </Button>
            <Button variant="outline" size="sm" onClick={handleTestRun} disabled={isTestRunning} className="gap-2">
              {isTestRunning ? <><Loader2 className="h-4 w-4 animate-spin" />Testing...</> : <><Play className="h-4 w-4" />Test Run</>}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {isDirty && <Badge variant="outline" className="bg-primary/20">Unsaved changes</Badge>}
            <Badge variant="secondary">{nodes.length} nodes</Badge>
            <Badge variant="secondary">{edges.length} edges</Badge>
            {testResult && (
              <Badge variant={testResult.summary?.failed_nodes === 0 ? "default" : "destructive"}>
                {testResult.summary?.failed_nodes === 0 ? "✓ Passed" : "✗ Failed"}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleClear}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      </Card>

      {/* Connection hint */}
      <div className="text-xs text-muted-foreground px-1">
        💡 Drag from a <span className="text-green-400 font-medium">green port</span> (right) to a <span className="text-blue-400 font-medium">blue port</span> (left) to connect nodes. Press Delete to remove selected edges.
      </div>

      {/* Canvas */}
      <Card className="glass-panel overflow-hidden relative" style={{ backgroundColor: 'hsl(222, 20%, 10%)', minHeight: '500px' }}>
        <canvas ref={canvasRef} className="w-full" />
        
        {nodes.length === 0 && fabricCanvas && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto rounded-xl border-2 border-dashed border-muted-foreground/30 bg-background/80 backdrop-blur-sm p-8 text-center max-w-md">
              <div className="mb-4 flex justify-center">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-3xl">🔧</div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Build Your Workflow</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Add nodes from the palette below, then drag between ports to connect them into an automation pipeline.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button size="sm" variant="outline" onClick={() => handleAddNode('analyze')}>➕ Analyze</Button>
                <Button size="sm" variant="outline" onClick={() => handleAddNode('classify')}>➕ Classify</Button>
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
                <span className="font-medium text-sm">Simulation — {testResult.summary?.total_nodes} nodes, {testResult.summary?.duration_ms}ms</span>
                <Badge variant={testResult.summary?.failed_nodes === 0 ? "default" : "destructive"}>
                  {testResult.summary?.failed_nodes === 0 ? `${testResult.summary?.successful_nodes} passed` : `${testResult.summary?.failed_nodes} failed`}
                </Badge>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-2">
              {testResult.execution_trace?.map((trace: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${trace.status === 'success' ? 'bg-green-500/20' : 'bg-destructive/20'}`}>
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
            const updated = nodesRef.current.map(n => n.id === selectedNode.id ? { ...n, config } : n);
            nodesRef.current = updated;
            setNodes(updated);
            setIsDirty(true);
          }}
        />
      )}
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, Rect, Text, Line, FabricObject, Circle as FabricCircle } from "fabric";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/hooks/useEdgeFunction";
import { useToast } from "@/hooks/use-toast";
import { 
  Save, 
  Play, 
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
  ChevronDown,
  History,
  Share2,
  FileJson
} from "lucide-react";
import { EnhancedWorkflowPalette } from "./EnhancedWorkflowPalette";
import { NodeInspector } from "./NodeInspector";
import { ValidationModal } from "./ValidationModal";
import { TestRunModal } from "./TestRunModal";
import { WorkflowOnboardingHeader } from "./WorkflowOnboardingHeader";
import { WorkflowExamplesDropdown, WorkflowExample } from "./WorkflowExamplesDropdown";
import { WorkflowHelpPanel } from "./WorkflowHelpPanel";
import { WorkflowOnboardingTour } from "./WorkflowOnboardingTour";
import { EmptyCanvasPlaceholder } from "./EmptyCanvasPlaceholder";
import { EnhancedValidationFeedback, getValidationResult } from "./EnhancedValidationFeedback";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { WorkflowNode, WorkflowEdge } from "./WorkflowEditor";
import { WorkflowAISuggestions } from "./WorkflowAISuggestions";
import { useWorkflowSuggestions } from "@/hooks/useWorkflowSuggestions";

interface EnhancedWorkflowEditorProps {
  systemId?: string;
  workflowId?: string;
}

export function EnhancedWorkflowEditor({ systemId, workflowId }: EnhancedWorkflowEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | undefined>(workflowId);
  const [validationOpen, setValidationOpen] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [testRunOpen, setTestRunOpen] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [showValidationFeedback, setShowValidationFeedback] = useState(false);
  const { toast } = useToast();

  // Validation status for header
  const [validationStatus, setValidationStatus] = useState<'idle' | 'passed' | 'warning' | 'error'>('idle');

  // AI Suggestions
  const { suggestions, isLoading: isSuggestionsLoading, error: suggestionsError, refresh: refreshSuggestions } = useWorkflowSuggestions(
    nodes.map(n => ({ id: n.id, type: n.type, position: { x: n.x, y: n.y }, config: n.config })),
    edges.map(e => ({ id: e.id, fromNodeId: e.fromNodeId, fromPort: e.fromPort, toNodeId: e.toNodeId, toPort: e.toPort })),
    nodes.length > 0 // Only enabled when there are nodes
  );

  // Load example workflow
  const loadExampleWorkflow = useCallback((example?: WorkflowExample) => {
    if (!fabricCanvas) return;

    // Clear canvas
    fabricCanvas.clear();

    const exampleNodes: WorkflowNode[] = example?.nodes.map(node => {
      const fabricObj = createNodeObject(
        node.type as WorkflowNode['type'], 
        node.position.x, 
        node.position.y, 
        node.id
      );
      fabricCanvas.add(fabricObj);

      return {
        id: node.id,
        type: node.type as WorkflowNode['type'],
        x: node.position.x,
        y: node.position.y,
        config: node.data,
        fabricObject: fabricObj,
      };
    }) || [
      {
        id: '1',
        type: 'analyze' as const,
        x: 100,
        y: 200,
        config: { label: 'Analyze Data' },
        fabricObject: createNodeObject('analyze', 100, 200, '1'),
      },
      {
        id: '2',
        type: 'classify' as const,
        x: 350,
        y: 200,
        config: { label: 'Classify' },
        fabricObject: createNodeObject('classify', 350, 200, '2'),
      },
      {
        id: '3',
        type: 'notify_teams' as const,
        x: 600,
        y: 200,
        config: { label: 'Notify Teams' },
        fabricObject: createNodeObject('notify_teams', 600, 200, '3'),
      },
    ];

    // Add default nodes if no example provided
    if (!example) {
      exampleNodes.forEach(node => {
        if (node.fabricObject) {
          fabricCanvas.add(node.fabricObject);
        }
      });
    }

    setNodes(exampleNodes);
    setIsDirty(true);
    fabricCanvas.renderAll();

    toast({
      title: "Example loaded",
      description: `${exampleNodes.length} nodes added to canvas`,
    });
  }, [fabricCanvas, toast]);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: window.innerWidth - 720, // Account for sidebars
      height: window.innerHeight - 180,
      backgroundColor: "#0a0a0a",
      selection: true,
    });

    // Enhanced grid background
    const gridSize = 24;
    for (let i = 0; i < (canvas.width || 0) / gridSize; i++) {
      canvas.add(new Line([i * gridSize, 0, i * gridSize, canvas.height || 0], {
        stroke: 'rgba(255, 215, 0, 0.05)',
        strokeWidth: 1,
        selectable: false,
        evented: false,
      }));
    }
    for (let i = 0; i < (canvas.height || 0) / gridSize; i++) {
      canvas.add(new Line([0, i * gridSize, canvas.width || 0, i * gridSize], {
        stroke: 'rgba(58, 182, 255, 0.05)',
        strokeWidth: 1,
        selectable: false,
        evented: false,
      }));
    }

    setFabricCanvas(canvas);

    // Load workflow if provided
    if (workflowId) {
      loadWorkflow(workflowId, canvas);
    }

    // Handle selection
    canvas.on('selection:created', (e) => {
      const selected = e.selected?.[0];
      if (selected && (selected as any).nodeId) {
        const node = nodes?.find(n => n.id === (selected as any).nodeId);
        if (node) setSelectedNode(node);
      }
    });

    canvas.on('selection:updated', (e) => {
      const selected = e.selected?.[0];
      if (selected && (selected as any).nodeId) {
        const node = nodes?.find(n => n.id === (selected as any).nodeId);
        if (node) setSelectedNode(node);
      }
    });

    canvas.on('selection:cleared', () => {
      setSelectedNode(null);
    });

    // Handle window resize
    const handleResize = () => {
      canvas.setWidth(window.innerWidth - 720);
      canvas.setHeight(window.innerHeight - 180);
      canvas.renderAll();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
    };
  }, [workflowId]);

  const loadWorkflow = async (wfId: string, canvas: FabricCanvas) => {
    try {
      const { data: nodesData, error: nodesError } = await supabase
        .from('workflow_nodes')
        .select('*')
        .eq('workflow_id', wfId);

      if (nodesError) throw nodesError;

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
      toast({
        title: "Failed to load workflow",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const createNodeObject = (type: string, x: number, y: number, nodeId: string): FabricObject => {
    const colors: Record<string, string> = {
      analyze: "#3AB6FF",
      classify: "#A78BFA",
      mcp_tool: "#FFD700",
      notify_teams: "#60A5FA",
      create_ticket_jira: "#3B82F6",
      write_salesforce: "#22D3EE",
      generate_report: "#FFD700",
    };

    const labels: Record<string, string> = {
      analyze: "Analyze",
      classify: "Classify",
      mcp_tool: "MCP Tool",
      notify_teams: "Notify Teams",
      create_ticket_jira: "Create Jira",
      write_salesforce: "Salesforce",
      generate_report: "Report",
    };

    // Create node group
    const group = new FabricObject();
    
    // Main rectangle with glow
    const rect = new Rect({
      width: 180,
      height: 90,
      fill: colors[type] || "#3AB6FF",
      stroke: "white",
      strokeWidth: 2,
      rx: 16,
      ry: 16,
    });

    // Label
    const text = new Text(labels[type] || type, {
      fontSize: 15,
      fill: "black",
      fontFamily: "Inter",
      fontWeight: "700",
      originX: "center",
      originY: "center",
      top: 45,
      left: 90,
    });

    // Connection ports (visual indicators)
    const inputPort = new FabricCircle({
      radius: 6,
      fill: "#3AB6FF",
      stroke: "white",
      strokeWidth: 2,
      left: -6,
      top: 40,
    });

    const outputPort = new FabricCircle({
      radius: 6,
      fill: "#FFD700",
      stroke: "white",
      strokeWidth: 2,
      left: 174,
      top: 40,
    });

    // Store metadata
    (group as any).nodeId = nodeId;
    (group as any).nodeType = type;
    group.left = x;
    group.top = y;

    return group;
  };

  const handleAddNode = useCallback((type: WorkflowNode['type']) => {
    if (!fabricCanvas) return;

    const nodeId = crypto.randomUUID();
    const x = 200 + nodes.length * 60;
    const y = 150 + (nodes.length % 3) * 120;

    const fabricObj = createNodeObject(type, x, y, nodeId);
    fabricCanvas.add(fabricObj);
    fabricCanvas.renderAll();

    const newNode: WorkflowNode = {
      id: nodeId,
      type,
      x,
      y,
      config: {},
      fabricObject: fabricObj,
    };

    setNodes(prev => [...prev, newNode]);
    setIsDirty(true);

    toast({
      title: "Node added",
      description: `${type} node added to workflow`,
    });
  }, [fabricCanvas, nodes, toast]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let wfId = currentWorkflowId;
      
      if (!wfId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Authentication required');

        const { data: workflow, error } = await supabase
          .from('workflows')
          .insert({
            system_id: systemId,
            name: `Workflow ${new Date().toLocaleString()}`,
            status: 'draft',
            created_by: user.id,
          })
          .select()
          .maybeSingle();

        if (error || !workflow) throw error || new Error('Failed to create workflow');
        wfId = workflow.id;
        setCurrentWorkflowId(wfId);
      }

      // Save nodes
      await supabase.from('workflow_nodes').delete().eq('workflow_id', wfId);
      
      if (nodes.length > 0) {
        const nodesToInsert = nodes.map(node => ({
          id: node.id,
          workflow_id: wfId,
          type: node.type,
          x: node.x,
          y: node.y,
          config: node.config,
        }));

        const { error } = await supabase.from('workflow_nodes').insert(nodesToInsert);
        if (error) throw error;
      }

      setIsDirty(false);
      toast({
        title: "Workflow saved",
        description: `${nodes.length} nodes saved successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidate = async () => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (nodes.length === 0) {
      errors.push("Workflow has no nodes");
    }

    if (nodes.length > 1 && edges.length === 0) {
      warnings.push("Nodes are not connected - workflow will execute all nodes in parallel");
    }

    const hasActionNode = nodes.some(n => 
      ['notify_teams', 'mcp_tool', 'create_ticket_jira', 'write_salesforce'].includes(n.type)
    );

    // Check configurations
    nodes.forEach(node => {
      if (node.type === 'analyze' && !node.config?.model) {
        warnings.push(`"${node.type}" node missing model configuration`);
      }
      if (node.type === 'classify' && (!node.config?.labels || node.config.labels.length === 0)) {
        warnings.push(`"${node.type}" node missing classification labels`);
      }
    });

    if (errors.length === 0 && warnings.length === 0) {
      suggestions.push("Consider adding error handling nodes");
      suggestions.push("Test with sample data before deploying");
    }

    const result = getValidationResult(nodes.length, hasActionNode, edges.length > 0);

    setValidationResult({ errors, warnings, suggestions, ...result });
    setShowValidationFeedback(true);
    setValidationStatus(errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'passed');
    setValidationOpen(true);

    // Auto-hide feedback after 5 seconds
    setTimeout(() => setShowValidationFeedback(false), 5000);
  };

  const handleTestRun = async (dryRun: boolean) => {
    if (!currentWorkflowId) {
      toast({
        title: "Save required",
        description: "Please save the workflow before testing",
        variant: "destructive",
      });
      return;
    }

    setIsTestRunning(true);
    setTestResult(null);

    try {
      const data = await invokeEdgeFunction('workflow-run', {
        workflowId: currentWorkflowId,
        testInput: { message: "Test workflow execution" },
        dryRun
      });

      setTestResult({ ...data, dryRun });

      if (data.success) {
        toast({
          title: "Test run successful",
          description: `Executed ${data.nodesExecuted} nodes in ${data.durationMs}ms`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Test run failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsTestRunning(false);
    }
  };

  const handleZoomIn = () => {
    if (!fabricCanvas) return;
    const zoom = fabricCanvas.getZoom();
    fabricCanvas.setZoom(zoom * 1.2);
    fabricCanvas.renderAll();
  };

  const handleZoomOut = () => {
    if (!fabricCanvas) return;
    const zoom = fabricCanvas.getZoom();
    fabricCanvas.setZoom(zoom / 1.2);
    fabricCanvas.renderAll();
  };

  const handleFitToScreen = () => {
    if (!fabricCanvas) return;
    fabricCanvas.setZoom(1);
    fabricCanvas.viewportCenterObject(nodes?.[0]?.fabricObject || new FabricObject());
    fabricCanvas.renderAll();
  };

  const getConnectionData = () => {
    if (!selectedNode) return { upstream: [], downstream: [] };
    
    const upstream = edges
      .filter(e => e.toNodeId === selectedNode.id)
      .map(e => nodes?.find(n => n.id === e.fromNodeId))
      .filter(Boolean) as WorkflowNode[];

    const downstream = edges
      .filter(e => e.fromNodeId === selectedNode.id)
      .map(e => nodes?.find(n => n.id === e.toNodeId))
      .filter(Boolean) as WorkflowNode[];

    return { upstream, downstream };
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Simplified Header */}
      <div className="border-b border-border/50 bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className="gap-2 h-8"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleValidate}
              className="gap-2 h-8"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Validate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTestRunOpen(true)}
              disabled={!currentWorkflowId}
              className="gap-2 h-8"
            >
              <Play className="h-3.5 w-3.5" />
              Test
            </Button>
            <WorkflowExamplesDropdown onSelectExample={loadExampleWorkflow} />
          </div>

          {/* Right: Status */}
          <div className="flex items-center gap-2">
            {isDirty && (
              <Badge variant="outline" className="h-6 text-xs">
                Unsaved
              </Badge>
            )}
            <Badge variant="secondary" className="h-6 text-xs">
              {nodes.length} nodes
            </Badge>
          </div>
        </div>
      </div>

      {/* Three-Zone Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Node Library */}
        <EnhancedWorkflowPalette onAddNode={handleAddNode} />

        {/* Center: Canvas */}
        <div className="flex-1 relative bg-[#0a0a0a] overflow-hidden">
          <canvas ref={canvasRef} />
          
          {/* Canvas Controls */}
          <div className="absolute bottom-6 right-6 flex flex-col gap-2">
            <Button size="icon" variant="secondary" onClick={handleZoomIn} className="rounded-full shadow-lg">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="secondary" onClick={handleZoomOut} className="rounded-full shadow-lg">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="secondary" onClick={handleFitToScreen} className="rounded-full shadow-lg">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Empty State with Enhanced Placeholder */}
          {nodes.length === 0 && <EmptyCanvasPlaceholder onLoadExample={() => loadExampleWorkflow()} />}

          {/* Validation Feedback */}
          {showValidationFeedback && validationResult && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-md px-4">
              <EnhancedValidationFeedback 
                result={getValidationResult(
                  nodes.length,
                  nodes.some(n => ['notify_teams', 'mcp_tool', 'create_ticket_jira', 'write_salesforce'].includes(n.type)),
                  edges.length > 0
                )}
              />
            </div>
          )}
        </div>

        {/* Right Sidebar: AI Suggestions & Node Inspector */}
        <div className="w-72 border-l border-border/50 bg-background overflow-y-auto flex flex-col gap-3 p-3">
          {/* AI Suggestions Panel */}
          <WorkflowAISuggestions
            suggestions={suggestions}
            isLoading={isSuggestionsLoading}
            error={suggestionsError}
            onRefresh={refreshSuggestions}
            onAddNode={(nodeType) => {
              const typeMap: Record<string, WorkflowNode['type']> = {
                'Analyze': 'analyze',
                'Classify': 'classify',
                'Notify Teams': 'notify_teams',
                'MCP Tool Call': 'mcp_tool',
                'Create Jira Ticket': 'create_ticket_jira',
                'Write Salesforce': 'write_salesforce',
                'Generate Report': 'generate_report'
              };
              const mappedType = typeMap[nodeType] || 'analyze';
              handleAddNode(mappedType);
              toast({
                title: "Node Added",
                description: `Added ${nodeType} from AI suggestion`,
              });
            }}
          />

          {/* Node Inspector */}
          {selectedNode && (
            <div className="mt-auto pt-3 border-t border-border/50">
              <NodeInspector
                node={selectedNode}
                onClose={() => setSelectedNode(null)}
                onUpdate={(config) => {
                  setNodes(prev => prev.map(n => 
                    n.id === selectedNode.id ? { ...n, config } : n
                  ));
                  setIsDirty(true);
                }}
                connections={getConnectionData()}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {validationResult && (
        <ValidationModal
          open={validationOpen}
          onClose={() => setValidationOpen(false)}
          result={validationResult}
        />
      )}

      <TestRunModal
        open={testRunOpen}
        onClose={() => setTestRunOpen(false)}
        onRun={handleTestRun}
        result={testResult}
        isRunning={isTestRunning}
      />
    </div>
  );
}

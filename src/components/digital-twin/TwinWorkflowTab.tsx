import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Play, GitBranch, Brain, UserCheck, Plug, Database, Bell, StopCircle } from "lucide-react";
import type { DigitalTwin, DigitalTwinNode } from "@/types/digitalTwin";

interface TwinWorkflowTabProps {
  twin: DigitalTwin;
}

export function TwinWorkflowTab({ twin }: TwinWorkflowTabProps) {
  const [selectedNode, setSelectedNode] = useState<DigitalTwinNode | null>(null);
  const nodes = twin.config.workflow?.nodes || [];
  const entryNodeId = twin.config.workflow?.entryPoint;

  function getNodeIcon(type: string) {
    switch (type) {
      case "trigger":
        return Play;
      case "action":
        return GitBranch;
      case "decision":
        return Brain;
      case "human_in_loop":
        return UserCheck;
      case "transform":
        return Database;
      case "condition":
        return GitBranch;
      case "end":
        return StopCircle;
      default:
        return Plug;
    }
  }

  function getNodeColor(type: string) {
    switch (type) {
      case "trigger":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "decision":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      case "human_in_loop":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20";
      case "action":
        return "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20";
      case "transform":
        return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20";
      case "end":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
    }
  }

  function getInputNodeNames(node: DigitalTwinNode): string[] {
    const inputFrom = node.config.inputFrom;
    if (!inputFrom || !Array.isArray(inputFrom)) return [];
    return inputFrom
      .map((id) => nodes.find((n) => n.id === id)?.name || id)
      .filter(Boolean);
  }

  function getOutputNodeNames(node: DigitalTwinNode): string[] {
    const outputTo = node.config.outputTo;
    if (!outputTo || !Array.isArray(outputTo)) return [];
    return outputTo
      .map((id) => nodes.find((n) => n.id === id)?.name || id)
      .filter(Boolean);
  }

  if (nodes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <GitBranch className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Workflow Defined</h3>
          <p className="text-muted-foreground">
            This digital twin does not have any workflow nodes configured
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Workflow Blueprint</h3>
          <p className="text-sm text-muted-foreground">
            {nodes.length} node{nodes.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        {entryNodeId && (
          <Badge variant="outline">
            Entry: {nodes.find((n) => n.id === entryNodeId)?.name || entryNodeId}
          </Badge>
        )}
      </div>

      {/* Node Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {nodes.map((node) => {
          const Icon = getNodeIcon(node.type);
          const isEntry = node.id === entryNodeId;

          return (
            <Card
              key={node.id}
              className={`cursor-pointer transition-all hover:shadow-md border-2 ${getNodeColor(
                node.type
              )}`}
              onClick={() => setSelectedNode(node)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    <CardTitle className="text-base">{node.name}</CardTitle>
                  </div>
                  {isEntry && (
                    <Badge variant="secondary" className="text-xs">
                      Entry
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <Badge variant="outline" className="text-xs">
                    {node.type.replace(/_/g, " ")}
                  </Badge>
                </div>
                {node.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {node.description}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Node Details Sheet */}
      <Sheet open={!!selectedNode} onOpenChange={() => setSelectedNode(null)}>
        <SheetContent className="overflow-y-auto">
          {selectedNode && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {(() => {
                    const Icon = getNodeIcon(selectedNode.type);
                    return <Icon className="h-5 w-5" />;
                  })()}
                  {selectedNode.name}
                </SheetTitle>
                <SheetDescription>
                  <Badge variant="outline">{selectedNode.type.replace(/_/g, " ")}</Badge>
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                {selectedNode.description && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedNode.description}
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold mb-2">Node ID</h4>
                  <code className="text-xs bg-muted px-2 py-1 rounded block">
                    {selectedNode.id}
                  </code>
                </div>

                {getInputNodeNames(selectedNode).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Input From</h4>
                    <div className="space-y-1">
                      {getInputNodeNames(selectedNode).map((name, i) => (
                        <div key={i} className="text-sm text-muted-foreground">
                          → {name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {getOutputNodeNames(selectedNode).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Output To</h4>
                    <div className="space-y-1">
                      {getOutputNodeNames(selectedNode).map((name, i) => (
                        <div key={i} className="text-sm text-muted-foreground">
                          → {name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedNode.humanInLoop && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Human-in-Loop</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Type:</span>{" "}
                        <Badge variant="outline">{selectedNode.humanInLoop.type}</Badge>
                      </div>
                      {selectedNode.humanInLoop.assignedTo && (
                        <div>
                          <span className="text-muted-foreground">Assigned To:</span>{" "}
                          {selectedNode.humanInLoop.assignedTo}
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Instructions:</span>
                        <p className="mt-1 text-muted-foreground">
                          {selectedNode.humanInLoop.instructions}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {Object.keys(selectedNode.config).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Configuration</h4>
                    <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                      {JSON.stringify(selectedNode.config, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

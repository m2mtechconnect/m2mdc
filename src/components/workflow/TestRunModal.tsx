import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, Download, Terminal, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface TestRunModalProps {
  open: boolean;
  onClose: () => void;
  onRun: (dryRun: boolean) => Promise<void>;
  result: any | null;
  isRunning: boolean;
}

export function TestRunModal({ open, onClose, onRun, result, isRunning }: TestRunModalProps) {
  const [dryRun, setDryRun] = useState(true);

  const handleRun = async () => {
    await onRun(dryRun);
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-[#3AB6FF]" />
            Workflow Test Run
          </DialogTitle>
          <DialogDescription>
            Execute your workflow and view real-time results
          </DialogDescription>
        </DialogHeader>

        {/* Controls */}
        <div className="flex items-center justify-between py-3 border-y border-border">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch 
                id="dryRun" 
                checked={dryRun} 
                onCheckedChange={setDryRun}
                disabled={isRunning}
              />
              <Label htmlFor="dryRun" className="text-sm cursor-pointer">
                Dry Run Mode
              </Label>
            </div>
            {dryRun && (
              <Badge variant="outline" className="text-xs">
                No external actions will be performed
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleRun}
              disabled={isRunning}
              className="gap-2 bg-[#FFD700] text-black hover:bg-[#FFD700]/90"
              size="sm"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Test
                </>
              )}
            </Button>
            {result && (
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Download Logs
              </Button>
            )}
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-hidden">
          {!result && !isRunning ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Terminal className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Click "Run Test" to execute your workflow</p>
              </div>
            </div>
          ) : isRunning ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4 max-w-md">
                <Loader2 className="h-12 w-12 animate-spin text-[#3AB6FF] mx-auto" />
                <div>
                  <h3 className="font-semibold">Executing Workflow...</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Running nodes and collecting results
                  </p>
                </div>
                <Progress value={45} className="h-2" />
              </div>
            </div>
          ) : (
            <Tabs defaultValue="summary" className="h-full flex flex-col">
              <TabsList className="mx-4">
                <TabsTrigger value="summary" className="text-xs">Summary</TabsTrigger>
                <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
                <TabsTrigger value="logs" className="text-xs">Logs</TabsTrigger>
                <TabsTrigger value="metrics" className="text-xs">Metrics</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto px-4 py-4">
                <TabsContent value="summary" className="mt-0 space-y-4">
                  {/* Status Card */}
                  <Card className={`p-4 ${result.success ? 'border-green-500/50 bg-green-500/5' : 'border-destructive/50 bg-destructive/5'}`}>
                    <div className="flex items-center gap-3">
                      {result.success ? (
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                      ) : (
                        <XCircle className="h-8 w-8 text-destructive" />
                      )}
                      <div>
                        <h3 className="font-semibold">
                          {result.success ? 'Test Run Successful' : 'Test Run Failed'}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {result.success ? 
                            `Executed ${result.nodesExecuted || 0} nodes successfully` : 
                            result.error || 'Workflow execution failed'
                          }
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-4 gap-4">
                    <Card className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">Nodes</div>
                      <div className="text-2xl font-bold text-[#3AB6FF]">
                        {result.nodesExecuted || 0}
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">Duration</div>
                      <div className="text-2xl font-bold text-[#FFD700]">
                        {formatDuration(result.durationMs || 0)}
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">Success Rate</div>
                      <div className="text-2xl font-bold text-green-500">
                        {result.success ? '100%' : '0%'}
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">Mode</div>
                      <div className="text-sm font-bold">
                        {result.dryRun ? 'Dry Run' : 'Live'}
                      </div>
                    </Card>
                  </div>

                  {/* Output */}
                  {result.output && (
                    <div>
                      <h3 className="font-semibold text-sm mb-2">Output</h3>
                      <Card className="p-4 bg-muted">
                        <pre className="text-xs font-mono overflow-x-auto">
                          {JSON.stringify(result.output, null, 2)}
                        </pre>
                      </Card>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="timeline" className="mt-0 space-y-3">
                  <h3 className="font-semibold text-sm">Execution Timeline</h3>
                  {result.timeline?.map((event: any, idx: number) => (
                    <Card key={idx} className="p-3 relative pl-8">
                      <div className="absolute left-3 top-3 h-2 w-2 rounded-full bg-[#3AB6FF]" />
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{event.nodeName}</div>
                          <div className="text-xs text-muted-foreground mt-1">{event.action}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDuration(event.duration)}
                          </Badge>
                          {event.success ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                      </div>
                    </Card>
                  )) || (
                    <p className="text-sm text-muted-foreground text-center py-8">No timeline data available</p>
                  )}
                </TabsContent>

                <TabsContent value="logs" className="mt-0">
                  <Card className="p-4 bg-black">
                    <pre className="text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">
                      {result.logs || 'No logs available'}
                    </pre>
                  </Card>
                </TabsContent>

                <TabsContent value="metrics" className="mt-0 space-y-4">
                  <h3 className="font-semibold text-sm">Performance Metrics</h3>
                  
                  {result.metrics?.ragLatency && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">RAG Retrieval Latency</span>
                        <span className="text-sm font-medium text-[#3AB6FF]">
                          {formatDuration(result.metrics.ragLatency)}
                        </span>
                      </div>
                      <Progress value={Math.min(result.metrics.ragLatency / 50, 100)} className="h-2" />
                    </div>
                  )}

                  {result.metrics?.nodeLatencies && Object.entries(result.metrics.nodeLatencies).map(([node, latency]: [string, any]) => (
                    <div key={node}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">{node}</span>
                        <span className="text-sm font-medium">{formatDuration(latency)}</span>
                      </div>
                      <Progress value={Math.min(latency / 20, 100)} className="h-2" />
                    </div>
                  ))}
                </TabsContent>
              </div>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

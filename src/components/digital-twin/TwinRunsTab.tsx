import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Activity, Loader2, ChevronRight, Clock } from "lucide-react";
import { toast } from "sonner";
import { listTwinRuns, getTwinRun } from "@/lib/digitalTwin/api";
import type { TwinRunSummary, TwinRunDetail } from "@/lib/digitalTwin/api";

interface TwinRunsTabProps {
  twinId: string;
  twinSlug: string;
}

export function TwinRunsTab({ twinId, twinSlug }: TwinRunsTabProps) {
  const [runs, setRuns] = useState<TwinRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<TwinRunDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    loadRuns();
  }, [twinId]);

  async function loadRuns() {
    try {
      setLoading(true);
      const result = await listTwinRuns({
        twinId,
        limit: 50,
      });
      setRuns(result.runs);
    } catch (error) {
      console.error("Error loading runs:", error);
      toast.error("Failed to load runs");
    } finally {
      setLoading(false);
    }
  }

  async function loadRunDetail(runId: string) {
    try {
      setLoadingDetail(true);
      const result = await getTwinRun({ runId });
      setSelectedRun(result.run);
    } catch (error) {
      console.error("Error loading run detail:", error);
      toast.error("Failed to load run details");
    } finally {
      setLoadingDetail(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "pending_human":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "failed":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      case "running":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Runs Yet</h3>
          <p className="text-muted-foreground">
            This digital twin has not been executed yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Execution History</h3>
          <p className="text-sm text-muted-foreground">
            {runs.length} run{runs.length !== 1 ? "s" : ""} recorded
          </p>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Run ID</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => (
              <TableRow key={run.id}>
                <TableCell>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {run.run_id?.slice(0, 8) || run.id.slice(0, 8)}
                  </code>
                </TableCell>
                <TableCell className="font-medium">{run.event_id}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(run.status)}>{run.status}</Badge>
                </TableCell>
                <TableCell>
                  {run.duration_ms ? (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {(run.duration_ms / 1000).toFixed(2)}s
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(run.created_at).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => loadRunDetail(run.run_id || run.id)}
                  >
                    View
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Run Detail Sheet */}
      <Sheet open={!!selectedRun} onOpenChange={() => setSelectedRun(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-2xl">
          {loadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            selectedRun && (
              <>
                <SheetHeader>
                  <SheetTitle>Run Details</SheetTitle>
                  <SheetDescription>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {selectedRun.run_id}
                    </code>
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {/* Status and Event */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <Badge className={getStatusColor(selectedRun.status)}>
                        {selectedRun.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Event:</span>
                      <span className="text-sm font-medium">{selectedRun.event_id}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Created:</span>
                      <span className="text-sm">
                        {new Date(selectedRun.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Logs */}
                  {selectedRun.logs && selectedRun.logs.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3">Execution Logs</h4>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {selectedRun.logs.map((log: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-3 bg-muted rounded text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-blue-600 dark:text-blue-400">
                                {log.nodeId}
                              </span>
                              <span className="text-muted-foreground">
                                {log.timestamp
                                  ? new Date(log.timestamp).toLocaleTimeString()
                                  : ""}
                              </span>
                            </div>
                            <p className="text-muted-foreground">{log.message}</p>
                            {log.level && (
                              <Badge variant="outline" className="text-xs">
                                {log.level}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* State Changes */}
                  {selectedRun.state_changes && selectedRun.state_changes.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3">State Changes</h4>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {selectedRun.state_changes.map((change: any, idx: number) => (
                          <div key={idx} className="p-3 bg-muted rounded">
                            <div className="text-xs font-mono mb-2 text-blue-600 dark:text-blue-400">
                              {change.nodeId}
                            </div>
                            <pre className="text-xs overflow-x-auto">
                              {JSON.stringify(change.stateAfter, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Twin Info */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Twin Information</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name:</span>{" "}
                        {selectedRun.twin?.name}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Slug:</span>{" "}
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {selectedRun.twin?.slug}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

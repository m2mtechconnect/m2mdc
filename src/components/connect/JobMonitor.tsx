import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Job, JobStatus, jobQueue } from "@/lib/jobQueue";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/status-badge";

export default function JobMonitor() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [circuitBreakers, setCircuitBreakers] = useState<Array<{
    source: string;
    failures: number;
    isOpen: boolean;
  }>>([]);

  useEffect(() => {
    // Initial load
    setJobs(jobQueue.getAllJobs());
    setCircuitBreakers(jobQueue.getAllCircuitBreakers());

    // Poll for job updates
    const interval = setInterval(() => {
      setJobs(jobQueue.getAllJobs());
      setCircuitBreakers(jobQueue.getAllCircuitBreakers());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const retryAllFailed = async () => {
    await jobQueue.retryAllDeadLetterJobs();
    toast.success("All failed jobs have been queued for retry");
  };

  const getStatusIcon = (status: JobStatus) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-primary" />;
      case "running":
        return <Clock className="h-4 w-4 text-secondary animate-pulse" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "dead-letter":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: JobStatus) => {
    const variants: Record<JobStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Pending", variant: "outline" },
      running: { label: "Running", variant: "secondary" },
      success: { label: "Success", variant: "default" },
      failed: { label: "Failed", variant: "destructive" },
      "dead-letter": { label: "Dead Letter", variant: "destructive" },
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const pendingJobs = jobs.filter(j => j.status === "pending").length;
  const runningJobs = jobs.filter(j => j.status === "running").length;
  const deadLetterJobs = jobs.filter(j => j.status === "dead-letter").length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 card-gap">
        <Card className="section-padding">
          <div className="text-h2 mb-1">{pendingJobs}</div>
          <div className="text-caption text-muted-foreground">Pending</div>
        </Card>
        <Card className="section-padding">
          <div className="text-h2 text-secondary mb-1">{runningJobs}</div>
          <div className="text-caption text-muted-foreground">Running</div>
        </Card>
        <Card className="section-padding">
          <div className="text-h2 text-primary mb-1">
            {jobs.filter(j => j.status === "success").length}
          </div>
          <div className="text-caption text-muted-foreground">Completed</div>
        </Card>
        <Card className="section-padding">
          <div className="text-h2 text-destructive mb-1">{deadLetterJobs}</div>
          <div className="text-caption text-muted-foreground">Failed</div>
        </Card>
      </div>

      {/* Circuit Breakers */}
      {circuitBreakers.length > 0 && (
        <Card className="section-padding">
          <h3 className="text-h3 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-secondary" />
            Circuit Breakers
          </h3>
          <div className="space-y-2">
            {circuitBreakers.map((breaker) => (
              <div
                key={breaker.source}
                className="flex items-center justify-between p-3 rounded-lg border border-border"
              >
                <div>
                  <div className="font-medium text-caption">{breaker.source}</div>
                  <div className="text-caption text-muted-foreground">
                    {breaker.failures} consecutive failures
                  </div>
                </div>
                <Badge variant={breaker.isOpen ? "destructive" : "outline"}>
                  {breaker.isOpen ? "Open" : "Closed"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Dead Letter Queue */}
      {deadLetterJobs > 0 && (
        <Card className="section-padding border-destructive/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-h3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Dead Letter Queue ({deadLetterJobs})
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={retryAllFailed}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry All
            </Button>
          </div>
          <div className="space-y-2">
            {jobs
              .filter(j => j.status === "dead-letter")
              .slice(0, 5)
              .map((job) => (
                <div
                  key={job.id}
                  className="p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-caption">{job.source}</div>
                      <div className="text-caption text-muted-foreground">
                        {job.type} • {job.retries}/{job.maxRetries} retries
                      </div>
                    </div>
                    <StatusBadge status={job.status} />
                  </div>
                  {job.error && (
                    <div className="text-caption text-destructive mt-2">
                      {job.error}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Active Jobs */}
      <Card className="section-padding">
        <h3 className="text-h3 mb-4">Active Jobs</h3>
        <div className="space-y-3">
          {jobs
            .filter(j => j.status === "running" || j.status === "pending")
            .slice(0, 10)
            .map((job) => (
              <div
                key={job.id}
                className="p-4 rounded-lg border border-border"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(job.status)}
                    <div>
                      <div className="font-medium text-caption">{job.source}</div>
                      <div className="text-caption text-muted-foreground">
                        {job.type}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={job.status} />
                </div>
                {job.status === "running" && (
                  <Progress value={65} className="h-1" />
                )}
                {job.retries > 0 && (
                  <div className="text-caption text-muted-foreground mt-2">
                    Retry {job.retries}/{job.maxRetries}
                  </div>
                )}
              </div>
            ))}
          {jobs.filter(j => j.status === "running" || j.status === "pending").length === 0 && (
            <div className="empty-state py-8">
              <CheckCircle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-caption text-muted-foreground">No active jobs</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

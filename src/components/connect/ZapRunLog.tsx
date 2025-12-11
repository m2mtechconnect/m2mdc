import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

interface ZapRun {
  id: string;
  zapName: string;
  trigger: string;
  status: "success" | "failed" | "running";
  timestamp: string;
  duration: string;
  recordsProcessed: number;
  error?: string;
  details?: Array<{
    step: string;
    status: "success" | "failed";
    message: string;
  }>;
}

/**
 * Data Centre Integration Run Log
 * Real-world DC operations automation examples
 */
const dcIntegrationRuns: ZapRun[] = [
  {
    id: "run-001",
    zapName: "DCIM → Thermal Alert Workflow",
    trigger: "Rack inlet temp > 27°C",
    status: "success",
    timestamp: "3 minutes ago",
    duration: "0.8s",
    recordsProcessed: 1,
    details: [
      { step: "Trigger: DCIM Telemetry", status: "success", message: "Rack R-14 inlet temp 27.4°C detected via BMS API" },
      { step: "Evaluate Threshold", status: "success", message: "ASHRAE A1 warning threshold (27°C) exceeded" },
      { step: "Dispatch Alert", status: "success", message: "Thermal alert sent to ops@datacenter.local, Slack #noc-alerts" },
    ],
  },
  {
    id: "run-002",
    zapName: "Power Monitor → UPS Health Check",
    trigger: "Battery discharge event",
    status: "success",
    timestamp: "8 minutes ago",
    duration: "1.4s",
    recordsProcessed: 1,
    details: [
      { step: "Trigger: UPS Controller", status: "success", message: "UPS-Bank-2 voltage dip: 478V → 471V (1.5%)" },
      { step: "Battery Assessment", status: "success", message: "Battery health 94%, runtime 38 min at current load" },
      { step: "Log Event", status: "success", message: "Power event logged to CMDB, no escalation required" },
    ],
  },
  {
    id: "run-003",
    zapName: "GPU Scheduler → Workload Rebalance",
    trigger: "Cluster utilization imbalance",
    status: "failed",
    timestamp: "15 minutes ago",
    duration: "2.3s",
    recordsProcessed: 0,
    error: "Scheduler lock contention: retry in 60s",
    details: [
      { step: "Trigger: GPU Telemetry", status: "success", message: "Cluster A: 94% util, Cluster B: 52% util (Δ42%)" },
      { step: "Generate Migration Plan", status: "success", message: "Identified 3 jobs for migration (est. 12 GPU-hours)" },
      { step: "Execute Migration", status: "failed", message: "Scheduler lock held by priority job, retry queued" },
    ],
  },
  {
    id: "run-004",
    zapName: "Carbon Monitor → Grid Signal Response",
    trigger: "Grid carbon intensity spike",
    status: "success",
    timestamp: "22 minutes ago",
    duration: "0.6s",
    recordsProcessed: 1,
    details: [
      { step: "Trigger: WattTime API", status: "success", message: "CA-QC grid intensity: 1.2 → 8.4 gCO₂/kWh (import event)" },
      { step: "Evaluate Response", status: "success", message: "Defer non-critical batch jobs per carbon policy" },
      { step: "Update Dashboard", status: "success", message: "Carbon intensity widget updated, ops notified" },
    ],
  },
];

export default function ZapRunLog() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-primary" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "running":
        return <Clock className="h-4 w-4 text-secondary animate-pulse" />;
      default:
        return null;
    }
  };

  return (
    <Card className="section-padding">
      <h3 className="text-h3 mb-4">Recent Integration Runs</h3>
      <div className="space-y-3">
        {dcIntegrationRuns.map((run) => (
          <div key={run.id} className="border border-border rounded-lg overflow-hidden">
            <div
              className="p-4 cursor-pointer hover:bg-muted/30 transition-smooth"
              onClick={() => setExpandedId(expandedId === run.id ? null : run.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(run.status)}
                  <div>
                    <div className="font-medium text-caption">{run.zapName}</div>
                    <div className="text-caption text-muted-foreground">{run.trigger}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={run.status} />
                  {expandedId === run.id ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 text-caption text-muted-foreground">
                <span>{run.timestamp}</span>
                <span>•</span>
                <span>{run.duration}</span>
                <span>•</span>
                <span>{run.recordsProcessed} record{run.recordsProcessed !== 1 ? 's' : ''}</span>
              </div>
              {run.error && (
                <div className="text-caption text-destructive mt-2">{run.error}</div>
              )}
            </div>

            {/* Expanded Details */}
            {expandedId === run.id && run.details && (
              <div className="px-4 pb-4 pt-2 bg-muted/20 border-t border-border">
                <div className="space-y-2">
                  {run.details.map((detail, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded bg-card border border-border"
                    >
                      {getStatusIcon(detail.status)}
                      <div className="flex-1">
                        <div className="font-medium text-caption mb-1">{detail.step}</div>
                        <div className="text-caption text-muted-foreground">
                          {detail.message}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

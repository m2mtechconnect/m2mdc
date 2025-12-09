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

const mockZapRuns: ZapRun[] = [
  {
    id: "zap-001",
    zapName: "Gmail → Document Index",
    trigger: "New Email Received",
    status: "success",
    timestamp: "2 minutes ago",
    duration: "1.2s",
    recordsProcessed: 1,
    details: [
      { step: "Trigger: Gmail", status: "success", message: "Email received from support@example.com" },
      { step: "Extract Attachments", status: "success", message: "1 PDF file extracted" },
      { step: "Index Document", status: "success", message: "Document indexed successfully" },
    ],
  },
  {
    id: "zap-002",
    zapName: "Zendesk → Support Index",
    trigger: "New Support Ticket",
    status: "success",
    timestamp: "5 minutes ago",
    duration: "0.8s",
    recordsProcessed: 1,
    details: [
      { step: "Trigger: Zendesk", status: "success", message: "Ticket #12345 created" },
      { step: "Extract Content", status: "success", message: "Ticket content extracted" },
      { step: "Index", status: "success", message: "Ticket indexed for search" },
    ],
  },
  {
    id: "zap-003",
    zapName: "Sheets → Data Sync",
    trigger: "New Row Added",
    status: "failed",
    timestamp: "12 minutes ago",
    duration: "2.1s",
    recordsProcessed: 0,
    error: "API rate limit exceeded",
    details: [
      { step: "Trigger: Google Sheets", status: "success", message: "New row detected" },
      { step: "Validate Data", status: "success", message: "Data validation passed" },
      { step: "Sync to Database", status: "failed", message: "Rate limit exceeded (429)" },
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
      <h3 className="text-h3 mb-4">Recent Zap Runs</h3>
      <div className="space-y-3">
        {mockZapRuns.map((run) => (
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

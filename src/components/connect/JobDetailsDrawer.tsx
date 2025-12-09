import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Clock, RefreshCw, Database, FileText } from "lucide-react";

interface JobDetailsDrawerProps {
  jobId: string;
  onClose: () => void;
}

const jobDetails = {
  "job-001": {
    id: "job-001",
    source: "Google Drive",
    status: "success",
    startTime: "2024-01-15 14:32:15",
    endTime: "2024-01-15 14:32:17",
    duration: "2.3s",
    docsProcessed: 342,
    docsAdded: 320,
    docsUpdated: 22,
    docsFailed: 0,
    logs: [
      { time: "14:32:15", level: "info", message: "Started sync job for Google Drive" },
      { time: "14:32:15", level: "info", message: "Fetching file list..." },
      { time: "14:32:16", level: "info", message: "Processing 342 documents" },
      { time: "14:32:16", level: "info", message: "Embedding and indexing chunks" },
      { time: "14:32:17", level: "success", message: "Sync completed successfully" },
    ],
    sampleDocs: [
      { title: "Q4 Marketing Report.pdf", size: "2.3 MB", status: "indexed" },
      { title: "Product Roadmap 2024.docx", size: "840 KB", status: "indexed" },
      { title: "Team Meeting Notes.txt", size: "12 KB", status: "indexed" },
    ],
  },
};

export default function JobDetailsDrawer({ jobId, onClose }: JobDetailsDrawerProps) {
  const job = jobDetails[jobId as keyof typeof jobDetails] || jobDetails["job-001"];

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Job Details: {job.source}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status Card */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <Badge variant="default">Success</Badge>
              </div>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground mb-1">Start Time</div>
                <div className="font-mono">{job.startTime}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Duration</div>
                <div className="font-mono">{job.duration}</div>
              </div>
            </div>
          </Card>

          {/* Metrics */}
          <div>
            <h3 className="font-bold mb-3">Processing Metrics</h3>
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4">
                <div className="text-2xl font-bold mb-1">{job.docsProcessed}</div>
                <div className="text-xs text-muted-foreground">Total Processed</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold mb-1 text-primary">{job.docsAdded}</div>
                <div className="text-xs text-muted-foreground">Added</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold mb-1 text-secondary">{job.docsUpdated}</div>
                <div className="text-xs text-muted-foreground">Updated</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold mb-1 text-destructive">{job.docsFailed}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </Card>
            </div>
          </div>

          {/* Sample Documents */}
          <div>
            <h3 className="font-bold mb-3">Sample Documents</h3>
            <div className="space-y-2">
              {job.sampleDocs.map((doc, idx) => (
                <Card key={idx} className="p-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{doc.title}</div>
                      <div className="text-xs text-muted-foreground">{doc.size}</div>
                    </div>
                    <Badge variant="outline" className="text-xs">{doc.status}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Logs */}
          <div>
            <h3 className="font-bold mb-3">Job Logs</h3>
            <Card className="p-4">
              <div className="space-y-2 font-mono text-xs">
                {job.logs.map((log, idx) => (
                  <div key={idx} className="flex gap-3">
                    <span className="text-muted-foreground">{log.time}</span>
                    <span className={
                      log.level === "success" ? "text-primary" :
                      log.level === "error" ? "text-destructive" :
                      "text-foreground"
                    }>
                      [{log.level}]
                    </span>
                    <span className="flex-1">{log.message}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

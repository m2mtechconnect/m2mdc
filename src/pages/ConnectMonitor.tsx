import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RefreshCw, AlertCircle, CheckCircle, Clock, Database } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SectionHeader } from "@/components/ui/section-header";
import SyncTable from "@/components/connect/SyncTable";
import JobDetailsDrawer from "@/components/connect/JobDetailsDrawer";
import JobMonitor from "@/components/connect/JobMonitor";

const syncJobs: Array<{
  id: string;
  source: string;
  status: "success" | "running" | "failed";
  docs: number;
  duration: string;
  timestamp: string;
  error: string | null;
}> = [
  { id: "job-001", source: "Google Drive", status: "success", docs: 342, duration: "2.3s", timestamp: "2 min ago", error: null },
  { id: "job-002", source: "Zapier: Zendesk", status: "success", docs: 28, duration: "1.8s", timestamp: "8 min ago", error: null },
  { id: "job-003", source: "Website Crawler", status: "running", docs: 156, duration: "—", timestamp: "12 min ago", error: null },
  { id: "job-004", source: "SharePoint", status: "failed", docs: 0, duration: "0.5s", timestamp: "15 min ago", error: "Authentication expired" },
  { id: "job-005", source: "Zapier: Slack", status: "success", docs: 89, duration: "3.1s", timestamp: "22 min ago", error: null },
];

export default function ConnectMonitor() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const navigate = useNavigate();

  const filteredJobs = syncJobs.filter(job => {
    const matchesSearch = job.source.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    running: syncJobs.filter(j => j.status === "running").length,
    success: syncJobs.filter(j => j.status === "success").length,
    failed: syncJobs.filter(j => j.status === "failed").length,
  };

  return (
    <div className="min-h-screen bg-background section-padding-lg">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <SectionHeader
          title="Sync Monitor"
          description="Real-time status of all data connections and background jobs."
          action={{
            label: "View Health",
            onClick: () => navigate("/connect/health"),
            variant: "outline"
          }}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-secondary" />
              <div>
                <div className="text-2xl font-bold">{stats.running}</div>
                <div className="text-xs text-muted-foreground">Running</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{stats.success}</div>
                <div className="text-xs text-muted-foreground">Succeeded</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div>
                <div className="text-2xl font-bold">{stats.failed}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">12.4k</div>
                <div className="text-xs text-muted-foreground">Total Docs</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search jobs..."
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card z-50">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        {/* Job Monitor */}
        <JobMonitor />

        {/* Sync Jobs Table */}
        <SyncTable jobs={filteredJobs} onJobClick={setSelectedJob} />
      </div>

      {selectedJob && (
        <JobDetailsDrawer
          jobId={selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  );
}

import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RefreshCw, AlertCircle, CheckCircle, Clock, Database, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DCCard, DCSectionHeader } from "@/components/dc-ui";
import { DCKPITile } from "@/components/dc-ui";
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
  const { t } = useTranslation();
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
        <DCSectionHeader
          as="h1"
          title={t("connectMonitor.title")}
          subtitle={t("connectMonitor.subtitle")}
          icon={<Activity className="h-5 w-5 text-primary" />}
          action={
            <Button variant="outline" onClick={() => navigate("/connect/health")}>
              View Health
            </Button>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <DCKPITile
            label="Running"
            value={stats.running}
            icon={<Clock className="h-4 w-4" />}
            status="info"
            size="sm"
          />
          <DCKPITile
            label="Succeeded"
            value={stats.success}
            icon={<CheckCircle className="h-4 w-4" />}
            status="normal"
            size="sm"
          />
          <DCKPITile
            label="Failed"
            value={stats.failed}
            icon={<AlertCircle className="h-4 w-4" />}
            status={stats.failed > 0 ? "critical" : "normal"}
            size="sm"
          />
          <DCKPITile
            label="Total Docs"
            value="12.4k"
            icon={<Database className="h-4 w-4" />}
            status="normal"
            size="sm"
          />
        </div>

        {/* Filters */}
        <DCCard title="Filters" icon={<Search className="h-4 w-4 text-primary" />} noPadding>
          <div className="flex gap-4 items-center p-4">
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
                <SelectItem value="running">{t('connectMonitor.running')}</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">{t('connectMonitor.failed')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </DCCard>

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

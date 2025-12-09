import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, Clock, AlertCircle, Eye } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

interface SyncJob {
  id: string;
  source: string;
  status: "success" | "running" | "failed";
  docs: number;
  duration: string;
  timestamp: string;
  error: string | null;
}

interface SyncTableProps {
  jobs: SyncJob[];
  onJobClick: (jobId: string) => void;
}

export default function SyncTable({ jobs, onJobClick }: SyncTableProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-primary" />;
      case "running":
        return <Clock className="h-4 w-4 text-secondary animate-pulse" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      success: "default",
      running: "secondary",
      failed: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Source</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Documents</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Timestamp</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No sync jobs found
              </TableCell>
            </TableRow>
          ) : (
            jobs.map((job) => (
              <TableRow key={job.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <div className="font-medium">{job.source}</div>
                  {job.error && (
                    <div className="text-xs text-destructive mt-1">{job.error}</div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(job.status)}
                    <StatusBadge status={job.status} />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-mono text-sm">{job.docs.toLocaleString()}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">{job.duration}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">{job.timestamp}</div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onJobClick(job.id)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

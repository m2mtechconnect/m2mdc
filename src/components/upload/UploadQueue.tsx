import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileText, CheckCircle, AlertCircle, X, RefreshCw } from "lucide-react";

interface UploadItem {
  id: string;
  name: string;
  size: string;
  status: "uploading" | "processing" | "success" | "error";
  progress: number;
  error?: string;
}

interface UploadQueueProps {
  items: UploadItem[];
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
}

export default function UploadQueue({ items, onRetry, onCancel }: UploadQueueProps) {
  if (items.length === 0) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-primary" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      default:
        return <FileText className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      uploading: { label: "Uploading", variant: "secondary" as const },
      processing: { label: "Processing", variant: "secondary" as const },
      success: { label: "Complete", variant: "default" as const },
      error: { label: "Failed", variant: "destructive" as const },
    };
    const { label, variant } = config[status as keyof typeof config];
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">Upload Queue ({items.length})</h3>
        <Button variant="ghost" size="sm">
          Clear Completed
        </Button>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="p-3 border border-border rounded-lg">
            <div className="flex items-start gap-3 mb-2">
              {getStatusIcon(item.status)}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{item.name}</div>
                <div className="text-xs text-muted-foreground">{item.size}</div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(item.status)}
                {item.status === "error" ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onRetry(item.id)}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                ) : item.status !== "success" ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onCancel(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
            {(item.status === "uploading" || item.status === "processing") && (
              <Progress value={item.progress} className="h-1" />
            )}
            {item.error && (
              <div className="text-xs text-destructive mt-2">{item.error}</div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
